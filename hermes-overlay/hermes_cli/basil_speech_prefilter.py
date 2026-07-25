"""Low-cost, local prefilter for Basil presence-command audio.

This module never decides a command. It only detects whether a completed
utterance plausibly contains Basil's name before the existing local STT and
strict transcript parser run.
"""

from __future__ import annotations

import os
import tempfile
import threading
import time
from pathlib import Path
from typing import Optional, TypedDict


class BasilSpeechPrefilterResult(TypedDict):
    available: bool
    candidate: bool
    processing_ms: float
    provider: Optional[str]
    reason: str


_DECODER_LOCK = threading.Lock()
_DECODER = None
_SEARCH_NAME = "basil-name"


def _result(
    *,
    available: bool,
    candidate: bool,
    started_at: float,
    reason: str,
) -> BasilSpeechPrefilterResult:
    return {
        "available": available,
        "candidate": candidate,
        "processing_ms": round((time.perf_counter() - started_at) * 1000, 2),
        "provider": "pocketsphinx" if available else None,
        "reason": reason,
    }


def _build_decoder():
    from pocketsphinx import Decoder

    decoder = Decoder(lm=None, loglevel="FATAL", samprate=16_000)
    decoder.add_word("basil_us", "B EY Z AH L", update=True)

    # PocketSphinx accepts per-keyword thresholds only through a keyword file.
    # The first pronunciation covers British "BASS-il"; the synthetic token
    # covers US "BAY-zil". The strict transcript parser remains the authority.
    keyfile = ""
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            prefix="hermes-basil-name-",
            suffix=".kws",
            delete=False,
            encoding="ascii",
        ) as tmp:
            tmp.write("basil /1e-5/\n")
            tmp.write("basil_us /0.8/\n")
            keyfile = tmp.name

        decoder.add_kws(_SEARCH_NAME, keyfile)
        decoder.activate_search(_SEARCH_NAME)
    finally:
        if keyfile:
            try:
                os.unlink(keyfile)
            except OSError:
                pass

    return decoder


def _get_decoder():
    global _DECODER

    if _DECODER is None:
        _DECODER = _build_decoder()

    return _DECODER


def _decode_audio_to_pcm16(path: str) -> bytes:
    import av

    pcm = bytearray()
    with av.open(str(Path(path))) as container:
        resampler = av.AudioResampler(format="s16", layout="mono", rate=16_000)

        for frame in container.decode(audio=0):
            for converted in resampler.resample(frame):
                pcm.extend(converted.to_ndarray().tobytes())

        for converted in resampler.resample(None):
            pcm.extend(converted.to_ndarray().tobytes())

    return bytes(pcm)


def warm_basil_speech_prefilter() -> BasilSpeechPrefilterResult:
    """Initialize the optional decoder without blocking microphone startup."""

    started_at = time.perf_counter()

    try:
        with _DECODER_LOCK:
            _get_decoder()
    except ImportError:
        return _result(
            available=False,
            candidate=False,
            started_at=started_at,
            reason="dependency_unavailable",
        )
    except Exception:
        return _result(
            available=False,
            candidate=False,
            started_at=started_at,
            reason="decoder_error",
        )

    return _result(
        available=True,
        candidate=False,
        started_at=started_at,
        reason="ready",
    )


def classify_basil_speech_candidate(path: str) -> BasilSpeechPrefilterResult:
    """Return whether audio might contain Basil's name.

    Missing optional dependencies and decoder failures deliberately return
    ``available=False`` so callers can fall back to their existing STT path.
    """

    started_at = time.perf_counter()

    try:
        pcm = _decode_audio_to_pcm16(path)
        if not pcm:
            return _result(
                available=False,
                candidate=False,
                started_at=started_at,
                reason="empty_audio",
            )

        with _DECODER_LOCK:
            decoder = _get_decoder()
            decoder.start_utt()
            try:
                decoder.process_raw(pcm, no_search=False, full_utt=True)
            finally:
                decoder.end_utt()
            candidate = decoder.hyp() is not None
    except ImportError:
        return _result(
            available=False,
            candidate=False,
            started_at=started_at,
            reason="dependency_unavailable",
        )
    except Exception:
        return _result(
            available=False,
            candidate=False,
            started_at=started_at,
            reason="decoder_error",
        )

    return _result(
        available=True,
        candidate=candidate,
        started_at=started_at,
        reason="candidate" if candidate else "rejected",
    )

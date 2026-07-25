from hermes_cli import basil_speech_prefilter


class _FakeDecoder:
    def __init__(self, candidate):
        self.candidate = candidate
        self.ended = False
        self.processed = None
        self.started = False

    def end_utt(self):
        self.ended = True

    def hyp(self):
        return object() if self.candidate else None

    def process_raw(self, pcm, no_search, full_utt):
        self.processed = (pcm, no_search, full_utt)

    def start_utt(self):
        self.started = True


def test_prefilter_accepts_only_a_decoder_candidate(monkeypatch):
    decoder = _FakeDecoder(candidate=True)
    monkeypatch.setattr(
        basil_speech_prefilter, "_decode_audio_to_pcm16", lambda _path: b"\x01\x00"
    )
    monkeypatch.setattr(basil_speech_prefilter, "_get_decoder", lambda: decoder)

    result = basil_speech_prefilter.classify_basil_speech_candidate("voice.webm")

    assert result["available"] is True
    assert result["candidate"] is True
    assert result["provider"] == "pocketsphinx"
    assert result["reason"] == "candidate"
    assert decoder.started is True
    assert decoder.ended is True
    assert decoder.processed == (b"\x01\x00", False, True)


def test_prefilter_rejects_non_candidate_audio(monkeypatch):
    decoder = _FakeDecoder(candidate=False)
    monkeypatch.setattr(
        basil_speech_prefilter, "_decode_audio_to_pcm16", lambda _path: b"\x01\x00"
    )
    monkeypatch.setattr(basil_speech_prefilter, "_get_decoder", lambda: decoder)

    result = basil_speech_prefilter.classify_basil_speech_candidate("voice.webm")

    assert result["available"] is True
    assert result["candidate"] is False
    assert result["reason"] == "rejected"


def test_prefilter_falls_back_when_optional_dependency_is_unavailable(monkeypatch):
    def unavailable(_path):
        raise ModuleNotFoundError("pocketsphinx")

    monkeypatch.setattr(basil_speech_prefilter, "_decode_audio_to_pcm16", unavailable)

    result = basil_speech_prefilter.classify_basil_speech_candidate("voice.webm")

    assert result["available"] is False
    assert result["candidate"] is False
    assert result["provider"] is None
    assert result["reason"] == "dependency_unavailable"


def test_prefilter_warmup_initializes_the_shared_decoder(monkeypatch):
    decoder = _FakeDecoder(candidate=False)
    calls = []

    def get_decoder():
        calls.append(True)
        return decoder

    monkeypatch.setattr(basil_speech_prefilter, "_get_decoder", get_decoder)

    result = basil_speech_prefilter.warm_basil_speech_prefilter()

    assert calls == [True]
    assert result["available"] is True
    assert result["candidate"] is False
    assert result["reason"] == "ready"

import {
  type BasilExternalSceneTarget,
  type BasilExternalTarget,
  externalTargetBelongsToApp
} from './basil-external-scene'
import {
  basilWorkspaceEventKey,
  basilWorkspaceEventTarget
} from './basil-workspace-memory'

export interface BasilForegroundDiscoveryRequest {
  eventKey: string
  target: BasilExternalSceneTarget
}

export interface BasilForegroundDiscoveryAcceptance {
  activeTarget: BasilExternalTarget | null
  currentPayload: unknown
  discoveredTarget: BasilExternalTarget
  ownedProcessIds: Iterable<number>
  request: BasilForegroundDiscoveryRequest
}

export class BasilForegroundDiscoveryGate {
  #lastEventKey: string | null = null

  clear(): void {
    this.#lastEventKey = null
  }

  next(payload: unknown): BasilForegroundDiscoveryRequest | null {
    const eventKey = basilWorkspaceEventKey(payload)
    const target = basilWorkspaceEventTarget(payload)

    if (!eventKey || !target || eventKey === this.#lastEventKey) {
      return null
    }

    this.#lastEventKey = eventKey

    return { eventKey, target }
  }
}

export function shouldAcceptBasilForegroundDiscovery(
  input: BasilForegroundDiscoveryAcceptance
): boolean {
  return (
    !input.activeTarget &&
    basilWorkspaceEventKey(input.currentPayload) === input.request.eventKey &&
    input.discoveredTarget.target === input.request.target &&
    !externalTargetBelongsToApp(input.discoveredTarget.processId, input.ownedProcessIds)
  )
}

// This one-shot helper reads only structural UIA properties and geometry from
// the focused element in the foreground window. It never reads labels or text.
export const WINDOWS_UIA_FOREGROUND_DISCOVERY_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class BasilForegroundNative {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }

  public sealed class WindowObstacle {
    public int left;
    public int top;
    public int width;
    public int height;
    public int processId;
  }

  private const int DWMWA_EXTENDED_FRAME_BOUNDS = 9;
  private const int DWMWA_CLOAKED = 14;
  private delegate bool EnumWindowsProc(IntPtr window, IntPtr parameter);

  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll")]
  private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr parameter);

  [DllImport("user32.dll")]
  private static extern bool GetWindowRect(IntPtr window, out RECT rect);

  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);

  [DllImport("user32.dll")]
  private static extern bool IsIconic(IntPtr window);

  [DllImport("user32.dll")]
  private static extern bool IsWindowVisible(IntPtr window);

  [DllImport("dwmapi.dll", EntryPoint = "DwmGetWindowAttribute")]
  private static extern int DwmGetWindowAttributeInt(IntPtr window, int attribute, out int value, int size);

  [DllImport("dwmapi.dll", EntryPoint = "DwmGetWindowAttribute")]
  private static extern int DwmGetWindowAttributeRect(IntPtr window, int attribute, out RECT value, int size);

  public static WindowObstacle[] GetVisibleWindowObstacles() {
    var result = new List<WindowObstacle>();

    EnumWindows(delegate(IntPtr window, IntPtr parameter) {
      if (!IsWindowVisible(window) || IsIconic(window)) return true;

      int cloaked = 0;
      if (
        DwmGetWindowAttributeInt(window, DWMWA_CLOAKED, out cloaked, sizeof(int)) == 0 &&
        cloaked != 0
      ) return true;

      RECT rect;
      if (
        DwmGetWindowAttributeRect(
          window,
          DWMWA_EXTENDED_FRAME_BOUNDS,
          out rect,
          Marshal.SizeOf(typeof(RECT))
        ) != 0 &&
        !GetWindowRect(window, out rect)
      ) return true;

      int width = rect.Right - rect.Left;
      int height = rect.Bottom - rect.Top;
      if (width < 24 || height < 24) return true;

      uint processId;
      GetWindowThreadProcessId(window, out processId);
      if (processId == 0) return true;

      result.Add(new WindowObstacle {
        left = rect.Left,
        top = rect.Top,
        width = width,
        height = height,
        processId = unchecked((int)processId)
      });
      return true;
    }, IntPtr.Zero);

    return result.ToArray();
  }
}
'@

$interesting = @(
  'ControlType.Button', 'ControlType.CheckBox', 'ControlType.ComboBox',
  'ControlType.DataItem', 'ControlType.Document', 'ControlType.Edit',
  'ControlType.Hyperlink', 'ControlType.Image', 'ControlType.ListItem',
  'ControlType.MenuItem', 'ControlType.Pane', 'ControlType.RadioButton',
  'ControlType.Slider', 'ControlType.Spinner', 'ControlType.TabItem',
  'ControlType.Text', 'ControlType.TreeItem'
)

try {
  $foreground = [BasilForegroundNative]::GetForegroundWindow()
  if ($foreground -eq [IntPtr]::Zero) { exit 0 }

  $foregroundProcessId = 0
  [void][BasilForegroundNative]::GetWindowThreadProcessId($foreground, [ref]$foregroundProcessId)
  if ($foregroundProcessId -le 0) { exit 0 }

  $root = [System.Windows.Automation.AutomationElement]::FromHandle($foreground)
  $focused = [System.Windows.Automation.AutomationElement]::FocusedElement
  $best = $root

  if ($null -ne $focused -and $focused.Current.ProcessId -eq $foregroundProcessId) {
    $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
    $element = $focused
    $best = $focused

    for ($depth = 0; $depth -lt 7; $depth++) {
      $type = $element.Current.ControlType.ProgrammaticName
      if ($interesting -contains $type) { $best = $element; break }
      $parent = $walker.GetParent($element)
      if ($null -eq $parent -or $parent.Current.ProcessId -ne $foregroundProcessId) { break }
      $element = $parent
    }
  }

  $rect = $best.Current.BoundingRectangle
  if ($best.Current.IsOffscreen -or $rect.Width -lt 1 -or $rect.Height -lt 1) {
    $best = $root
    $rect = $root.Current.BoundingRectangle
  }

  if ($root.Current.IsOffscreen -or $rect.Width -lt 1 -or $rect.Height -lt 1) { exit 0 }

  $patterns = @($best.GetSupportedPatterns() | ForEach-Object { $_.ProgrammaticName })
  $payload = [ordered]@{
    intent = 'activate'
    x = $rect.Left + $rect.Width / 2
    y = $rect.Top + $rect.Height / 2
    left = $rect.Left
    top = $rect.Top
    width = $rect.Width
    height = $rect.Height
    className = $best.Current.ClassName
    controlType = $best.Current.ControlType.ProgrammaticName
    isKeyboardFocusable = $best.Current.IsKeyboardFocusable
    processId = $best.Current.ProcessId
    supportsInvoke = $patterns -contains 'InvokePatternIdentifiers.Pattern'
    obstacles = @([BasilForegroundNative]::GetVisibleWindowObstacles())
  }

  [Console]::Out.WriteLine(($payload | ConvertTo-Json -Depth 4 -Compress))
  [Console]::Out.Flush()
} catch {
  exit 0
}
`

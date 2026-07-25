// This helper emits geometry and control type only. It deliberately omits UIA
// Name, Value, HelpText, and AutomationId so desktop text never crosses IPC.
export const WINDOWS_UIA_MONITOR_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$uiaClientAssembly = [System.Windows.Automation.AutomationElement].Assembly.Location
$uiaTypesAssembly = [System.Windows.Automation.AutomationEventArgs].Assembly.Location
Add-Type -ReferencedAssemblies @($uiaClientAssembly, $uiaTypesAssembly) -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Automation;
public static class BasilNativeInput {
  [StructLayout(LayoutKind.Sequential)]
  public struct POINT { public int X; public int Y; }

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
  private static readonly AutomationPropertyChangedEventHandler ControlChangedHandler = OnControlChanged;
  private static readonly AutomationPropertyChangedEventHandler GeometryChangedHandler = OnGeometryChanged;
  private static readonly AutomationEventHandler InvokedHandler = OnInvoked;
  private static readonly StructureChangedEventHandler StructureChangedHandler = OnStructureChanged;
  private static readonly AutomationEventHandler SelectionChangedHandler = OnSelectionChanged;
  private static readonly AutomationEventHandler TextChangedHandler = OnTextChanged;
  private static AutomationElement watchedControlElement;
  private static AutomationElement changedControlElement;
  private static int controlChangeCount;
  private static AutomationElement watchedGeometryElement;
  private static int geometryChangeCount;
  private static AutomationElement watchedInvokeElement;
  private static AutomationElement invokedElement;
  private static int invocationCount;
  private static AutomationElement watchedStructureElement;
  private static int structureChangeCount;
  private static string structureChangeKind;
  private static AutomationElement watchedSelectionElement;
  private static AutomationElement selectedElement;
  private static int selectionChangeCount;
  private static AutomationElement watchedTextElement;
  private static int textChangeCount;

  public sealed class SelectionChange {
    public AutomationElement element;
    public int count;
  }

  public sealed class ControlChange {
    public AutomationElement element;
    public int count;
  }

  public sealed class InvocationChange {
    public AutomationElement element;
    public int count;
  }

  public sealed class StructureChange {
    public int count;
    public string kind;
  }

  private static void OnStructureChanged(object sender, StructureChangedEventArgs eventArgs) {
    Interlocked.Exchange(ref structureChangeKind, eventArgs.StructureChangeType.ToString());
    Interlocked.Increment(ref structureChangeCount);
  }

  public static void WatchStructureChanges(AutomationElement element) {
    if (SameElement(watchedStructureElement, element)) return;
    StopStructureChanges();
    if (element == null) return;

    watchedStructureElement = element;
    Interlocked.Exchange(ref structureChangeKind, null);
    Interlocked.Exchange(ref structureChangeCount, 0);

    try {
      Automation.AddStructureChangedEventHandler(
        element,
        TreeScope.Subtree,
        StructureChangedHandler
      );
    } catch {
      StopStructureChanges();
    }
  }

  public static StructureChange ConsumeStructureChange() {
    var count = Interlocked.Exchange(ref structureChangeCount, 0);
    var kind = Interlocked.Exchange(ref structureChangeKind, null);
    if (count < 1 || kind == null) return null;
    return new StructureChange { count = count, kind = kind };
  }

  public static void StopStructureChanges() {
    var element = watchedStructureElement;
    watchedStructureElement = null;
    Interlocked.Exchange(ref structureChangeKind, null);
    Interlocked.Exchange(ref structureChangeCount, 0);

    if (element == null) return;

    try {
      Automation.RemoveStructureChangedEventHandler(element, StructureChangedHandler);
    } catch {
      // UIA collections can disappear while event handlers are being removed.
    }
  }

  private static void OnControlChanged(object sender, AutomationPropertyChangedEventArgs eventArgs) {
    var element = sender as AutomationElement;
    if (element == null) return;
    Interlocked.Exchange(ref changedControlElement, element);
    Interlocked.Increment(ref controlChangeCount);
  }

  public static void WatchControlChanges(AutomationElement element) {
    if (SameElement(watchedControlElement, element)) return;
    StopControlChanges();
    watchedControlElement = element;
    Interlocked.Exchange(ref changedControlElement, null);
    Interlocked.Exchange(ref controlChangeCount, 0);

    try {
      Automation.AddAutomationPropertyChangedEventHandler(
        element,
        TreeScope.Subtree,
        ControlChangedHandler,
        TogglePattern.ToggleStateProperty,
        RangeValuePattern.ValueProperty,
        ExpandCollapsePattern.ExpandCollapseStateProperty
      );
    } catch {
      StopControlChanges();
    }
  }

  public static ControlChange ConsumeControlChange() {
    var count = Interlocked.Exchange(ref controlChangeCount, 0);
    var element = Interlocked.Exchange(ref changedControlElement, null);
    if (count < 1 || element == null) return null;
    return new ControlChange { element = element, count = count };
  }

  public static void StopControlChanges() {
    var element = watchedControlElement;
    watchedControlElement = null;
    Interlocked.Exchange(ref changedControlElement, null);
    Interlocked.Exchange(ref controlChangeCount, 0);

    if (element == null) return;

    try {
      Automation.RemoveAutomationPropertyChangedEventHandler(element, ControlChangedHandler);
    } catch {
      // UIA elements can disappear while event handlers are being removed.
    }
  }

  private static void OnGeometryChanged(object sender, AutomationPropertyChangedEventArgs eventArgs) {
    Interlocked.Increment(ref geometryChangeCount);
  }

  public static void WatchGeometryChanges(AutomationElement element) {
    if (SameElement(watchedGeometryElement, element)) return;
    StopGeometryChanges();
    if (element == null) return;

    watchedGeometryElement = element;
    Interlocked.Exchange(ref geometryChangeCount, 0);

    try {
      Automation.AddAutomationPropertyChangedEventHandler(
        element,
        TreeScope.Element,
        GeometryChangedHandler,
        AutomationElement.BoundingRectangleProperty
      );
    } catch {
      StopGeometryChanges();
    }
  }

  public static int ConsumeGeometryChanges() {
    return Interlocked.Exchange(ref geometryChangeCount, 0);
  }

  public static void StopGeometryChanges() {
    var element = watchedGeometryElement;
    watchedGeometryElement = null;
    Interlocked.Exchange(ref geometryChangeCount, 0);

    if (element == null) return;

    try {
      Automation.RemoveAutomationPropertyChangedEventHandler(element, GeometryChangedHandler);
    } catch {
      // UIA elements can disappear while event handlers are being removed.
    }
  }

  private static void OnInvoked(object sender, AutomationEventArgs eventArgs) {
    var element = sender as AutomationElement;
    if (element == null) return;
    Interlocked.Exchange(ref invokedElement, element);
    Interlocked.Increment(ref invocationCount);
  }

  public static void WatchInvocations(AutomationElement element) {
    if (SameElement(watchedInvokeElement, element)) return;
    StopInvocations();
    if (element == null) return;

    watchedInvokeElement = element;
    Interlocked.Exchange(ref invokedElement, null);
    Interlocked.Exchange(ref invocationCount, 0);

    try {
      Automation.AddAutomationEventHandler(
        InvokePatternIdentifiers.InvokedEvent,
        element,
        TreeScope.Subtree,
        InvokedHandler
      );
    } catch {
      StopInvocations();
    }
  }

  public static InvocationChange ConsumeInvocation() {
    var count = Interlocked.Exchange(ref invocationCount, 0);
    var element = Interlocked.Exchange(ref invokedElement, null);
    if (count < 1 || element == null) return null;
    return new InvocationChange { element = element, count = count };
  }

  public static void StopInvocations() {
    var element = watchedInvokeElement;
    watchedInvokeElement = null;
    Interlocked.Exchange(ref invokedElement, null);
    Interlocked.Exchange(ref invocationCount, 0);

    if (element == null) return;

    try {
      Automation.RemoveAutomationEventHandler(
        InvokePatternIdentifiers.InvokedEvent,
        element,
        InvokedHandler
      );
    } catch {
      // UIA controls can disappear while event handlers are being removed.
    }
  }

  private static void OnSelectionChanged(object sender, AutomationEventArgs eventArgs) {
    var element = sender as AutomationElement;
    if (element == null) return;
    Interlocked.Exchange(ref selectedElement, element);
    Interlocked.Increment(ref selectionChangeCount);
  }

  private static bool SameElement(AutomationElement left, AutomationElement right) {
    if (left == null || right == null) return false;

    try {
      var leftId = left.GetRuntimeId();
      var rightId = right.GetRuntimeId();
      if (leftId == null || rightId == null || leftId.Length != rightId.Length) return false;
      for (var index = 0; index < leftId.Length; index++) {
        if (leftId[index] != rightId[index]) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  public static void WatchSelectionChanges(AutomationElement element) {
    if (SameElement(watchedSelectionElement, element)) return;
    StopSelectionChanges();
    watchedSelectionElement = element;
    Interlocked.Exchange(ref selectedElement, null);
    Interlocked.Exchange(ref selectionChangeCount, 0);

    try {
      Automation.AddAutomationEventHandler(
        SelectionItemPatternIdentifiers.ElementSelectedEvent,
        element,
        TreeScope.Subtree,
        SelectionChangedHandler
      );
      Automation.AddAutomationEventHandler(
        SelectionItemPatternIdentifiers.ElementAddedToSelectionEvent,
        element,
        TreeScope.Subtree,
        SelectionChangedHandler
      );
    } catch {
      StopSelectionChanges();
    }
  }

  public static SelectionChange ConsumeSelectionChange() {
    var count = Interlocked.Exchange(ref selectionChangeCount, 0);
    var element = Interlocked.Exchange(ref selectedElement, null);
    if (count < 1 || element == null) return null;
    return new SelectionChange { element = element, count = count };
  }

  public static bool HasPendingSelectionChange() {
    return Volatile.Read(ref selectionChangeCount) > 0;
  }

  public static void StopSelectionChanges() {
    var element = watchedSelectionElement;
    watchedSelectionElement = null;
    Interlocked.Exchange(ref selectedElement, null);
    Interlocked.Exchange(ref selectionChangeCount, 0);

    if (element == null) return;

    try {
      Automation.RemoveAutomationEventHandler(
        SelectionItemPatternIdentifiers.ElementSelectedEvent,
        element,
        SelectionChangedHandler
      );
      Automation.RemoveAutomationEventHandler(
        SelectionItemPatternIdentifiers.ElementAddedToSelectionEvent,
        element,
        SelectionChangedHandler
      );
    } catch {
      // UIA elements can disappear while event handlers are being removed.
    }
  }

  private static void OnTextChanged(object sender, AutomationEventArgs eventArgs) {
    Interlocked.Increment(ref textChangeCount);
  }

  public static void WatchTextChanges(AutomationElement element) {
    StopTextChanges();
    watchedTextElement = element;
    Interlocked.Exchange(ref textChangeCount, 0);

    try {
      Automation.AddAutomationEventHandler(
        TextPatternIdentifiers.TextChangedEvent,
        element,
        TreeScope.Element,
        TextChangedHandler
      );
    } catch {
      watchedTextElement = null;
    }
  }

  public static int ConsumeTextChanges() {
    return Interlocked.Exchange(ref textChangeCount, 0);
  }

  public static void StopTextChanges() {
    var element = watchedTextElement;
    watchedTextElement = null;
    Interlocked.Exchange(ref textChangeCount, 0);

    if (element == null) return;

    try {
      Automation.RemoveAutomationEventHandler(
        TextPatternIdentifiers.TextChangedEvent,
        element,
        TextChangedHandler
      );
    } catch {
      // UIA elements can disappear while the event handler is being removed.
    }
  }

  [DllImport("user32.dll")]
  public static extern short GetAsyncKeyState(int virtualKey);

  [DllImport("user32.dll")]
  public static extern bool GetCursorPos(out POINT point);

  [DllImport("user32.dll")]
  private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr parameter);

  [DllImport("user32.dll")]
  private static extern bool GetWindowRect(IntPtr window, out RECT rect);

  [DllImport("user32.dll")]
  private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);

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
  'ControlType.MenuItem', 'ControlType.RadioButton', 'ControlType.Slider',
  'ControlType.Spinner', 'ControlType.TabItem', 'ControlType.TreeItem'
)
$walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
$wasDown = $false
$pressedElement = $null
$pressedStartPoint = $null
$lastDragPoint = $null
$lastDragAt = 0
$dragging = $false
$hoverEmittedAt = 0
$hoverSince = 0
$hoverX = $null
$hoverY = $null
$suppressHoverUntilMove = $false
$activeElement = $null
$activeMetadata = $null
$activePoint = $null
$activeRefreshedAt = 0
$activeScrollAt = 0
$activeScrollX = $null
$activeScrollY = $null
$activeFocusAt = 0
$lastFocusSignature = $null
$activeInputAt = 0
$activeSelectionAt = 0
$activeControlAt = 0
$activeGeometryAt = 0
$activeInvocationAt = 0
$activeStructureAt = 0
$clock = [System.Diagnostics.Stopwatch]::StartNew()

function Find-BasilInterestingElement($element) {
  try {
    if ($null -eq $element) { return $null }

    $best = $element

    for ($depth = 0; $depth -lt 5; $depth++) {
      $type = $element.Current.ControlType.ProgrammaticName
      if ($interesting -contains $type) { $best = $element; break }
      $parent = $walker.GetParent($element)
      if ($null -eq $parent) { break }
      $element = $parent
    }

    return $best
  } catch {
    return $null
  }
}

function Find-BasilTarget($cursor) {
  try {
    $point = New-Object System.Windows.Point($cursor.X, $cursor.Y)
    $element = [System.Windows.Automation.AutomationElement]::FromPoint($point)
    return Find-BasilInterestingElement $element
  } catch {
    return $null
  }
}

function Get-BasilRuntimeSignature($element) {
  try {
    if ($null -eq $element) { return $null }
    return [string]::Join('.', $element.GetRuntimeId())
  } catch {
    return $null
  }
}

function Find-BasilSelectionRoot($element) {
  try {
    if ($null -eq $element) { return $null }

    $fallback = $element

    for ($depth = 0; $depth -lt 7; $depth++) {
      $supportsSelection = @(
        $element.GetSupportedPatterns() | ForEach-Object { $_.ProgrammaticName }
      ) -contains 'SelectionPatternIdentifiers.Pattern'

      if ($supportsSelection) { return $element }

      $parent = $walker.GetParent($element)
      if ($null -eq $parent) { break }
      $element = $parent
    }

    return $fallback
  } catch {
    return $element
  }
}

function Find-BasilCollectionRoot($element) {
  try {
    if ($null -eq $element) { return $null }

    for ($depth = 0; $depth -lt 7; $depth++) {
      $supportsSelection = @(
        $element.GetSupportedPatterns() | ForEach-Object { $_.ProgrammaticName }
      ) -contains 'SelectionPatternIdentifiers.Pattern'

      if ($supportsSelection) { return $element }

      $parent = $walker.GetParent($element)
      if ($null -eq $parent) { break }
      $element = $parent
    }

    return $null
  } catch {
    return $null
  }
}

function Read-BasilScroll($element) {
  try {
    $pattern = $element.GetCurrentPattern([System.Windows.Automation.ScrollPattern]::Pattern)
    return [pscustomobject]@{
      X = [double]$pattern.Current.HorizontalScrollPercent
      Y = [double]$pattern.Current.VerticalScrollPercent
    }
  } catch {
    return $null
  }
}

function Write-BasilElement(
  $intent,
  $cursor,
  $best,
  $dragDistance = 0,
  $dragVelocityX = 0,
  $dragVelocityY = 0,
  $scrollX = -1,
  $scrollY = -1,
  $scrollDeltaX = 0,
  $scrollDeltaY = 0,
  $activityCount = 0,
  $structureKind = ''
) {
  try {
    $rect = $best.Current.BoundingRectangle
    if ($best.Current.IsOffscreen -or $rect.Width -lt 1 -or $rect.Height -lt 1) {
      return $false
    }

    if (
      ($intent -eq 'refresh' -or $intent -eq 'scroll' -or $intent -eq 'input') -and
      $null -ne $script:activeMetadata
    ) {
      $className = $script:activeMetadata.className
      $controlType = $script:activeMetadata.controlType
      $isKeyboardFocusable = $script:activeMetadata.isKeyboardFocusable
      $processId = $script:activeMetadata.processId
      $supportsInvoke = $script:activeMetadata.supportsInvoke
    } else {
      $className = $best.Current.ClassName
      $controlType = $best.Current.ControlType.ProgrammaticName
      $isKeyboardFocusable = $best.Current.IsKeyboardFocusable
      $processId = $best.Current.ProcessId
      $supportsInvoke = @($best.GetSupportedPatterns() | ForEach-Object { $_.ProgrammaticName }) -contains 'InvokePatternIdentifiers.Pattern'

      if ($intent -eq 'activate' -or $intent -eq 'focus') {
        $script:activeMetadata = [pscustomobject]@{
          className = $className
          controlType = $controlType
          height = $rect.Height
          isKeyboardFocusable = $isKeyboardFocusable
          left = $rect.Left
          processId = $processId
          supportsInvoke = $supportsInvoke
          top = $rect.Top
          width = $rect.Width
        }
      }
    }

    if ($null -ne $script:activeMetadata -and $script:activeMetadata.processId -eq $processId) {
      $script:activeMetadata.left = $rect.Left
      $script:activeMetadata.top = $rect.Top
      $script:activeMetadata.width = $rect.Width
      $script:activeMetadata.height = $rect.Height
    }

    $obstacles = @()
    if ($intent -eq 'activate') {
      $obstacles = @([BasilNativeInput]::GetVisibleWindowObstacles())
    }
    $json = [ordered]@{
      intent = $intent
      x = $cursor.X
      y = $cursor.Y
      left = $rect.Left
      top = $rect.Top
      width = $rect.Width
      height = $rect.Height
      className = $className
      controlType = $controlType
      dragDistance = $dragDistance
      dragVelocityX = $dragVelocityX
      dragVelocityY = $dragVelocityY
      scrollX = $scrollX
      scrollY = $scrollY
      scrollDeltaX = $scrollDeltaX
      scrollDeltaY = $scrollDeltaY
      activityCount = $activityCount
      structureKind = $structureKind
      isKeyboardFocusable = $isKeyboardFocusable
      processId = $processId
      supportsInvoke = $supportsInvoke
      obstacles = $obstacles
    } | ConvertTo-Json -Depth 4 -Compress

    [Console]::Out.WriteLine($json)
    [Console]::Out.Flush()
    return $true
  } catch {
    # UI elements can disappear between hit testing and property access.
    return $false
  }
}

function Write-BasilDismissal($cursor) {
  try {
    if ($null -eq $script:activeMetadata -or $null -eq $cursor) {
      return
    }

    $metadata = $script:activeMetadata
    $json = [ordered]@{
      intent = 'dismiss'
      x = $cursor.X
      y = $cursor.Y
      left = $metadata.left
      top = $metadata.top
      width = $metadata.width
      height = $metadata.height
      className = $metadata.className
      controlType = $metadata.controlType
      dragDistance = 0
      dragVelocityX = 0
      dragVelocityY = 0
      scrollX = -1
      scrollY = -1
      scrollDeltaX = 0
      scrollDeltaY = 0
      activityCount = 1
      structureKind = ''
      isKeyboardFocusable = $metadata.isKeyboardFocusable
      processId = $metadata.processId
      supportsInvoke = $metadata.supportsInvoke
      obstacles = @()
    } | ConvertTo-Json -Depth 3 -Compress

    [Console]::Out.WriteLine($json)
    [Console]::Out.Flush()
  } catch {
    # The cached record contains only structural metadata and may already be stale.
  }
}

while ($true) {
  $cursor = New-Object BasilNativeInput+POINT
  [void][BasilNativeInput]::GetCursorPos([ref]$cursor)
  $now = $clock.ElapsedMilliseconds
  $moved = $null -eq $hoverX -or [Math]::Abs($cursor.X - $hoverX) -gt 5 -or [Math]::Abs($cursor.Y - $hoverY) -gt 5

  if ($moved) {
    $hoverX = $cursor.X
    $hoverY = $cursor.Y
    $hoverSince = $now
    $hoverEmittedAt = 0
    $suppressHoverUntilMove = $false
  }

  $down = ([BasilNativeInput]::GetAsyncKeyState(1) -band 0x8000) -ne 0

  if ($down -and -not $wasDown) {
    $pressedElement = Find-BasilTarget $cursor
    [BasilNativeInput]::WatchInvocations($pressedElement)
    $pressedStartPoint = [pscustomobject]@{ X = $cursor.X; Y = $cursor.Y }
    $lastDragPoint = [pscustomobject]@{ X = $cursor.X; Y = $cursor.Y }
    $lastDragAt = $now
    $dragging = $false
    $suppressHoverUntilMove = $true
    $hoverEmittedAt = $now
  } elseif ($down -and $null -ne $pressedElement) {
    $suppressHoverUntilMove = $true
    $dragX = $cursor.X - $pressedStartPoint.X
    $dragY = $cursor.Y - $pressedStartPoint.Y
    $dragDistance = [Math]::Sqrt($dragX * $dragX + $dragY * $dragY)

    if ($dragDistance -ge 10) {
      $stepX = $cursor.X - $lastDragPoint.X
      $stepY = $cursor.Y - $lastDragPoint.Y
      $stepDistance = [Math]::Sqrt($stepX * $stepX + $stepY * $stepY)
      $stepMs = [Math]::Max(1, $now - $lastDragAt)
      $speed = [Math]::Min(1, ($stepDistance / $stepMs) / 1.1)
      $velocityX = if ($stepDistance -gt 0.01) { ($stepX / $stepDistance) * $speed } else { 0 }
      $velocityY = if ($stepDistance -gt 0.01) { ($stepY / $stepDistance) * $speed } else { 0 }

      if (-not $dragging) {
        $written = Write-BasilElement 'drag_start' $cursor $pressedElement $dragDistance $velocityX $velocityY
        $dragging = $written
        $lastDragPoint = [pscustomobject]@{ X = $cursor.X; Y = $cursor.Y }
        $lastDragAt = $now
      } elseif ($now - $lastDragAt -ge 48 -or $stepDistance -ge 8) {
        $written = Write-BasilElement 'drag_move' $cursor $pressedElement $dragDistance $velocityX $velocityY
        $lastDragPoint = [pscustomobject]@{ X = $cursor.X; Y = $cursor.Y }
        $lastDragAt = $now
      }
    }
  } elseif (-not $down -and $wasDown -and $null -ne $pressedElement) {
    $dragX = $cursor.X - $pressedStartPoint.X
    $dragY = $cursor.Y - $pressedStartPoint.Y
    $dragDistance = [Math]::Sqrt($dragX * $dragX + $dragY * $dragY)

    if ($dragging) {
      $written = Write-BasilElement 'drag_end' $cursor $pressedElement $dragDistance 0 0
      [BasilNativeInput]::WatchInvocations($activeElement)
    } else {
      $written = Write-BasilElement 'activate' $cursor $pressedElement
      if ($written) {
        $activeElement = $pressedElement
        $activePoint = [pscustomobject]@{ X = $cursor.X; Y = $cursor.Y }
        $activeRefreshedAt = $now
        $activeScrollAt = $now
        $initialScroll = Read-BasilScroll $activeElement
        $activeScrollX = if ($null -ne $initialScroll) { $initialScroll.X } else { $null }
        $activeScrollY = if ($null -ne $initialScroll) { $initialScroll.Y } else { $null }
        $activeFocusAt = $now
        $focusedElement = Find-BasilInterestingElement ([System.Windows.Automation.AutomationElement]::FocusedElement)
        $lastFocusSignature = Get-BasilRuntimeSignature $focusedElement
        $activeInputAt = $now
        $activeGeometryAt = $now
        [BasilNativeInput]::WatchGeometryChanges($activeElement)
        [BasilNativeInput]::WatchTextChanges($activeElement)
        $activeSelectionAt = $now
        [BasilNativeInput]::WatchSelectionChanges((Find-BasilSelectionRoot $activeElement))
        $activeControlAt = $now
        [BasilNativeInput]::WatchControlChanges($activeElement)
        $activeInvocationAt = $now
        [BasilNativeInput]::WatchInvocations($activeElement)
        $activeStructureAt = $now
        [BasilNativeInput]::WatchStructureChanges((Find-BasilCollectionRoot $activeElement))
      }
    }

    $pressedElement = $null
    $pressedStartPoint = $null
    $lastDragPoint = $null
    $dragging = $false
    $suppressHoverUntilMove = $true
    $hoverEmittedAt = $now
  } elseif (
    -not $down -and
    $null -eq $pressedElement -and
    -not $suppressHoverUntilMove -and
    $now - $hoverSince -ge 600 -and
    ($hoverEmittedAt -eq 0 -or $now - $hoverEmittedAt -ge 900)
  ) {
    $hoverElement = Find-BasilTarget $cursor
    if ($null -ne $hoverElement) {
      $written = Write-BasilElement 'preview' $cursor $hoverElement
    }
    $hoverEmittedAt = $now
  }

  if (
    -not $down -and
    $null -ne $activeElement -and
    -not ([BasilNativeInput]::HasPendingSelectionChange()) -and
    $now - $activeFocusAt -ge 120
  ) {
    $activeFocusAt = $now
    $focusedElement = Find-BasilInterestingElement ([System.Windows.Automation.AutomationElement]::FocusedElement)
    $focusSignature = Get-BasilRuntimeSignature $focusedElement

    if ($null -ne $focusSignature -and $focusSignature -ne $lastFocusSignature) {
      $lastFocusSignature = $focusSignature

      try {
        if (
          $null -ne $activeMetadata -and
          $focusedElement.Current.ProcessId -eq $activeMetadata.processId -and
          $focusedElement.Current.IsKeyboardFocusable
        ) {
          $focusRect = $focusedElement.Current.BoundingRectangle
          $focusPoint = [pscustomobject]@{
            X = $focusRect.Left + $focusRect.Width / 2
            Y = $focusRect.Top + $focusRect.Height / 2
          }
          $written = Write-BasilElement 'focus' $focusPoint $focusedElement

          if ($written) {
            $activeElement = $focusedElement
            $activePoint = $focusPoint
            $activeRefreshedAt = $now
            $activeScrollAt = $now
            $initialScroll = Read-BasilScroll $activeElement
            $activeScrollX = if ($null -ne $initialScroll) { $initialScroll.X } else { $null }
            $activeScrollY = if ($null -ne $initialScroll) { $initialScroll.Y } else { $null }
            $activeInputAt = $now
            $activeGeometryAt = $now
            [BasilNativeInput]::WatchGeometryChanges($activeElement)
            [BasilNativeInput]::WatchTextChanges($activeElement)
            $activeSelectionAt = $now
            [BasilNativeInput]::WatchSelectionChanges((Find-BasilSelectionRoot $activeElement))
            $activeControlAt = $now
            [BasilNativeInput]::WatchControlChanges($activeElement)
            $activeInvocationAt = $now
            [BasilNativeInput]::WatchInvocations($activeElement)
            $activeStructureAt = $now
            [BasilNativeInput]::WatchStructureChanges((Find-BasilCollectionRoot $activeElement))
          }
        }
      } catch {
        # Focus can change again between discovery and structural property reads.
      }
    }
  }

  if (-not $down -and $null -ne $activeElement -and $now - $activeInputAt -ge 72) {
    $activeInputAt = $now
    $activityCount = [BasilNativeInput]::ConsumeTextChanges()

    if ($activityCount -gt 0) {
      $inputArguments = @(
        'input', $activePoint, $activeElement, 0, 0, 0,
        -1, -1, 0, 0, $activityCount
      )
      $written = Write-BasilElement @inputArguments

      if (-not $written) {
        Write-BasilDismissal $activePoint
        [BasilNativeInput]::StopInvocations()
        [BasilNativeInput]::StopGeometryChanges()
        [BasilNativeInput]::StopStructureChanges()
        [BasilNativeInput]::StopControlChanges()
        [BasilNativeInput]::StopSelectionChanges()
        [BasilNativeInput]::StopTextChanges()
        $activeElement = $null
        $activeMetadata = $null
        $activePoint = $null
      }
    }
  }

  if (-not $down -and $null -ne $activeElement -and $now - $activeGeometryAt -ge 48) {
    $activeGeometryAt = $now
    $geometryChangeCount = [BasilNativeInput]::ConsumeGeometryChanges()

    if ($geometryChangeCount -gt 0) {
      $written = Write-BasilElement 'refresh' $activePoint $activeElement

      if (-not $written) {
        Write-BasilDismissal $activePoint
        [BasilNativeInput]::StopInvocations()
        [BasilNativeInput]::StopGeometryChanges()
        [BasilNativeInput]::StopStructureChanges()
        [BasilNativeInput]::StopControlChanges()
        [BasilNativeInput]::StopSelectionChanges()
        [BasilNativeInput]::StopTextChanges()
        $activeElement = $null
        $activeMetadata = $null
        $activePoint = $null
      }
    }
  }

  if (-not $down -and $null -ne $activeElement -and $now - $activeSelectionAt -ge 72) {
    $activeSelectionAt = $now
    $selectionChange = [BasilNativeInput]::ConsumeSelectionChange()

    if ($null -ne $selectionChange) {
      $selectedElement = Find-BasilInterestingElement $selectionChange.element

      try {
        if (
          $null -ne $selectedElement -and
          $null -ne $activeMetadata -and
          $selectedElement.Current.ProcessId -eq $activeMetadata.processId
        ) {
          $selectedRect = $selectedElement.Current.BoundingRectangle
          $selectedPoint = [pscustomobject]@{
            X = $selectedRect.Left + $selectedRect.Width / 2
            Y = $selectedRect.Top + $selectedRect.Height / 2
          }
          $selectionArguments = @(
            'selection', $selectedPoint, $selectedElement, 0, 0, 0,
            -1, -1, 0, 0, $selectionChange.count
          )
          $written = Write-BasilElement @selectionArguments
        }
      } catch {
        # Selection can change again while structural geometry is being read.
      }
    }
  }

  if (-not $down -and $null -ne $activeElement -and $now - $activeControlAt -ge 72) {
    $activeControlAt = $now
    $controlChange = [BasilNativeInput]::ConsumeControlChange()

    if ($null -ne $controlChange) {
      $changedControl = Find-BasilInterestingElement $controlChange.element

      try {
        if (
          $null -ne $changedControl -and
          $null -ne $activeMetadata -and
          $changedControl.Current.ProcessId -eq $activeMetadata.processId
        ) {
          $controlRect = $changedControl.Current.BoundingRectangle
          $controlPoint = [pscustomobject]@{
            X = $controlRect.Left + $controlRect.Width / 2
            Y = $controlRect.Top + $controlRect.Height / 2
          }
          $controlArguments = @(
            'adjustment', $controlPoint, $changedControl, 0, 0, 0,
            -1, -1, 0, 0, $controlChange.count
          )
          $written = Write-BasilElement @controlArguments
        }
      } catch {
        # Controls can change again while structural geometry is being read.
      }
    }
  }

  if (-not $down -and $null -ne $activeElement -and $now - $activeInvocationAt -ge 72) {
    $activeInvocationAt = $now
    $invocationChange = [BasilNativeInput]::ConsumeInvocation()

    if ($null -ne $invocationChange) {
      $invokedControl = Find-BasilInterestingElement $invocationChange.element

      try {
        if (
          $null -ne $invokedControl -and
          $null -ne $activeMetadata -and
          $invokedControl.Current.ProcessId -eq $activeMetadata.processId
        ) {
          $invokedRect = $invokedControl.Current.BoundingRectangle
          $invokedPoint = [pscustomobject]@{
            X = $invokedRect.Left + $invokedRect.Width / 2
            Y = $invokedRect.Top + $invokedRect.Height / 2
          }
          $invocationArguments = @(
            'invocation', $invokedPoint, $invokedControl, 0, 0, 0,
            -1, -1, 0, 0, $invocationChange.count
          )
          $written = Write-BasilElement @invocationArguments
        }
      } catch {
        # Invoked controls can disappear while structural geometry is being read.
      }
    }
  }

  if (-not $down -and $null -ne $activeElement -and $now - $activeStructureAt -ge 72) {
    $activeStructureAt = $now
    $structureChange = [BasilNativeInput]::ConsumeStructureChange()

    if ($null -ne $structureChange) {
      $structureArguments = @(
        'structure', $activePoint, $activeElement, 0, 0, 0,
        -1, -1, 0, 0, $structureChange.count, $structureChange.kind
      )
      $written = Write-BasilElement @structureArguments

      if (-not $written) {
        Write-BasilDismissal $activePoint
        [BasilNativeInput]::StopInvocations()
        [BasilNativeInput]::StopGeometryChanges()
        [BasilNativeInput]::StopStructureChanges()
        [BasilNativeInput]::StopControlChanges()
        [BasilNativeInput]::StopSelectionChanges()
        [BasilNativeInput]::StopTextChanges()
        $activeElement = $null
        $activeMetadata = $null
        $activePoint = $null
      }
    }
  }

  if (-not $down -and $null -ne $activeElement -and $now - $activeScrollAt -ge 96) {
    $activeScrollAt = $now
    $currentScroll = Read-BasilScroll $activeElement

    if ($null -ne $currentScroll) {
      $deltaX = if ($null -ne $activeScrollX -and $currentScroll.X -ge 0) {
        $currentScroll.X - $activeScrollX
      } else {
        0
      }
      $deltaY = if ($null -ne $activeScrollY -and $currentScroll.Y -ge 0) {
        $currentScroll.Y - $activeScrollY
      } else {
        0
      }

      if ([Math]::Abs($deltaX) -ge 0.5 -or [Math]::Abs($deltaY) -ge 0.5) {
        $scrollArguments = @(
          'scroll', $activePoint, $activeElement, 0, 0, 0,
          $currentScroll.X, $currentScroll.Y, $deltaX, $deltaY
        )
        $written = Write-BasilElement @scrollArguments

        if (-not $written) {
          Write-BasilDismissal $activePoint
          [BasilNativeInput]::StopInvocations()
          [BasilNativeInput]::StopGeometryChanges()
          [BasilNativeInput]::StopStructureChanges()
          [BasilNativeInput]::StopControlChanges()
          [BasilNativeInput]::StopSelectionChanges()
          [BasilNativeInput]::StopTextChanges()
          $activeElement = $null
          $activeMetadata = $null
          $activePoint = $null
        }
      }

      $activeScrollX = $currentScroll.X
      $activeScrollY = $currentScroll.Y
    }
  }

  if (-not $down -and $null -ne $activeElement -and $now - $activeRefreshedAt -ge 900) {
    $activeRefreshedAt = $now
    $written = Write-BasilElement 'refresh' $activePoint $activeElement
    if (-not $written) {
      Write-BasilDismissal $activePoint
      [BasilNativeInput]::StopInvocations()
      [BasilNativeInput]::StopGeometryChanges()
      [BasilNativeInput]::StopStructureChanges()
      [BasilNativeInput]::StopControlChanges()
      [BasilNativeInput]::StopSelectionChanges()
      [BasilNativeInput]::StopTextChanges()
      $activeElement = $null
      $activeMetadata = $null
      $activePoint = $null
      $activeScrollX = $null
      $activeScrollY = $null
      $lastFocusSignature = $null
    }
  }

  $wasDown = $down
  Start-Sleep -Milliseconds 24
}
`

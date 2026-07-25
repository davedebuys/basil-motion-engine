import { describe, expect, it } from 'vitest'

import { WINDOWS_UIA_MONITOR_SCRIPT } from './basil-windows-uia'

describe('Basil Windows UI Automation monitor', () => {
  it('enumerates geometry-only top-level window obstacles on activation', () => {
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('GetVisibleWindowObstacles')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain("$intent -eq 'activate'")
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('DWMWA_CLOAKED')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('obstacles = $obstacles')
  })

  it('refreshes only the last genuinely activated element and drops stale UIA references', () => {
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('$activeElement = $pressedElement')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain("Write-BasilElement 'refresh' $activePoint $activeElement")
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('$best.Current.IsOffscreen')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain(
      "$intent -eq 'refresh' -or $intent -eq 'scroll' -or $intent -eq 'input'"
    )
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('$supportsInvoke = $script:activeMetadata.supportsInvoke')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('$activeElement = $null')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('$activeMetadata = $null')
  })

  it('distinguishes a click from a genuine drag lifecycle', () => {
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('$dragDistance -ge 10')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain("Write-BasilElement 'drag_start'")
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain("Write-BasilElement 'drag_move'")
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain("Write-BasilElement 'drag_end'")
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain("Write-BasilElement 'activate' $cursor $pressedElement")
    expect(WINDOWS_UIA_MONITOR_SCRIPT.indexOf("Write-BasilElement 'activate' $cursor $pressedElement")).toBeGreaterThan(
      WINDOWS_UIA_MONITOR_SCRIPT.indexOf('-not $down -and $wasDown')
    )
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('dragVelocityX = $dragVelocityX')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('dragVelocityY = $dragVelocityY')
  })

  it('emits only changed structural ScrollPattern percentages for the active element', () => {
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('[System.Windows.Automation.ScrollPattern]::Pattern')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('$now - $activeScrollAt -ge 96')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('[Math]::Abs($deltaY) -ge 0.5')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain("'scroll', $activePoint, $activeElement")
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('scrollY = $scrollY')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('scrollDeltaY = $scrollDeltaY')
  })

  it('emits structural focus changes in the activated process without reading keys or text', () => {
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('[System.Windows.Automation.AutomationElement]::FocusedElement')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('$now - $activeFocusAt -ge 120')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('$focusedElement.Current.ProcessId -eq $activeMetadata.processId')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('$focusedElement.Current.IsKeyboardFocusable')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain("Write-BasilElement 'focus' $focusPoint $focusedElement")
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('GetRuntimeId()')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).not.toContain('VirtualKey')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).not.toContain('KeyboardInput')
  })

  it('aggregates structural text-change events without reading changed content', () => {
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain(
      'Add-Type -ReferencedAssemblies @($uiaClientAssembly, $uiaTypesAssembly)'
    )
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('TextPatternIdentifiers.TextChangedEvent')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('Interlocked.Increment(ref textChangeCount)')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('$now - $activeInputAt -ge 72')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('[BasilNativeInput]::ConsumeTextChanges()')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain("'input', $activePoint, $activeElement")
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('activityCount = $activityCount')
  })

  it('emits structural selection changes without reading selected item content', () => {
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('SelectionItemPatternIdentifiers.ElementSelectedEvent')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('SelectionItemPatternIdentifiers.ElementAddedToSelectionEvent')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('TreeScope.Subtree')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('Find-BasilSelectionRoot')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('[BasilNativeInput]::ConsumeSelectionChange()')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('[BasilNativeInput]::HasPendingSelectionChange()')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain("'selection', $selectedPoint, $selectedElement")
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('$selectedElement.Current.ProcessId -eq $activeMetadata.processId')
  })

  it('aggregates structural control changes without reading old or new values', () => {
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('AutomationPropertyChangedEventHandler')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('TogglePattern.ToggleStateProperty')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('RangeValuePattern.ValueProperty')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('ExpandCollapsePattern.ExpandCollapseStateProperty')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('[BasilNativeInput]::ConsumeControlChange()')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain("'adjustment', $controlPoint, $changedControl")
    expect(WINDOWS_UIA_MONITOR_SCRIPT).not.toContain('eventArgs.NewValue')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).not.toContain('eventArgs.OldValue')
  })

  it('coalesces active-element geometry changes without reading property values', () => {
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('AutomationElement.BoundingRectangleProperty')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('TreeScope.Element')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('Interlocked.Increment(ref geometryChangeCount)')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('[BasilNativeInput]::WatchGeometryChanges($activeElement)')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('$now - $activeGeometryAt -ge 48')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('[BasilNativeInput]::ConsumeGeometryChanges()')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('[BasilNativeInput]::StopGeometryChanges()')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).not.toContain('eventArgs.NewValue')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).not.toContain('eventArgs.OldValue')
  })

  it('emits genuine invocation events without reading the invoked control label', () => {
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('InvokePatternIdentifiers.InvokedEvent')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('Automation.AddAutomationEventHandler')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('Automation.RemoveAutomationEventHandler')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('[BasilNativeInput]::WatchInvocations($pressedElement)')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('[BasilNativeInput]::ConsumeInvocation()')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain("'invocation', $invokedPoint, $invokedControl")
    expect(WINDOWS_UIA_MONITOR_SCRIPT).not.toContain('eventArgs.NewValue')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).not.toContain('eventArgs.OldValue')
  })

  it('aggregates collection mutations as category-only structure events', () => {
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('StructureChangedEventHandler')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('Automation.AddStructureChangedEventHandler')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('Automation.RemoveStructureChangedEventHandler')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('eventArgs.StructureChangeType.ToString()')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('Find-BasilCollectionRoot')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('[BasilNativeInput]::ConsumeStructureChange()')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain("'structure', $activePoint, $activeElement")
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('structureKind = $structureKind')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).not.toContain('runtimeId =')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).not.toContain('eventArgs.GetRuntimeId')
  })

  it('emits cached structural dismissal when the approved element disappears', () => {
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('function Write-BasilDismissal($cursor)')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain("intent = 'dismiss'")
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('left = $metadata.left')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('controlType = $metadata.controlType')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).toContain('Write-BasilDismissal $activePoint')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).not.toContain('$metadata.name')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).not.toContain('$metadata.value')
  })

  it('does not access private UI Automation content fields', () => {
    expect(WINDOWS_UIA_MONITOR_SCRIPT).not.toMatch(/\.Current\.(Name|Value|HelpText|AutomationId)/)
    expect(WINDOWS_UIA_MONITOR_SCRIPT).not.toContain('[System.Windows.Automation.ValuePattern]::Pattern')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).not.toContain('DocumentRange')
    expect(WINDOWS_UIA_MONITOR_SCRIPT).not.toContain('GetText')
  })
})

# ElectriScribe Runtime Validation Checklist

## Meta-Physical Sage-Test Protocol

This isn't just smoke testing - it's tracing every thread through the system to ensure each entity and relationship actually works at runtime.

## ✅ Pre-Flight Checks

### Build Verification
- [x] TypeScript compilation passes
- [x] No console errors during build
- [x] All imports resolve correctly
- [x] Bundle size reasonable (<700KB)

### Dependency Chain
- [x] field-notes-parser.ts exists and exports
- [x] field-notes-persistence.ts exists and exports
- [x] enhanced-task-orchestrator.ts exists and exports
- [x] Database migrations applied
- [x] Routes configured correctly

## 🔍 Runtime Execution Paths

### Path 1: Page Load
**URL**: `/electriscribe`

**Expected Behavior**:
- [ ] Page loads without errors
- [ ] No console errors
- [ ] Three-panel layout visible
- [ ] Left panel shows textarea
- [ ] Center panel shows grid background
- [ ] Bottom stats hidden (no data yet)
- [ ] Header shows "ElectriScribe v1.0"
- [ ] All buttons visible and enabled (except Parse - disabled when empty)

**Failure Points**:
- Route not found (404)
- Component import error
- CSS not loading
- React hooks error

### Path 2: Load Example
**Action**: Click "Load Example" button

**Expected Behavior**:
- [ ] Textarea fills with example text
- [ ] Text includes headers (###)
- [ ] Text includes circuit table
- [ ] Text includes issues section
- [ ] "Parse Notes" button becomes enabled
- [ ] No console errors

**Failure Points**:
- Button onClick not firing
- State not updating
- Textarea not controlled properly

### Path 3: Parse Notes
**Action**: Click "Parse Notes" button

**Expected Behavior**:
- [ ] Parser runs (check console for timing)
- [ ] Entities array populates
- [ ] parsedData state updates
- [ ] Canvas entities render
- [ ] Validation starts (spinner appears)
- [ ] Bottom stats panel appears
- [ ] Stats show correct counts (1 panel, 15+ circuits, 6+ loads)
- [ ] Confidence score displays (~87%)
- [ ] No console errors

**Failure Points**:
- Parser throws error
- Regex patterns don't match
- Markdown syntax breaks parsing
- Entity array empty
- React re-render issues
- Validation API call fails

### Path 4: Entity Rendering
**Action**: After parsing, check canvas

**Expected Behavior**:
- [ ] Panel card(s) visible on left (yellow)
- [ ] Circuit cards visible in center (white/green)
- [ ] Load cards visible on right
- [ ] Cards have correct data:
  - [ ] Panel: "200A", "Square D QO"
  - [ ] Circuit: Slot numbers visible
  - [ ] Circuit: Breaker size visible
  - [ ] Load: Type and current visible
- [ ] Available circuits have green background
- [ ] MWBC badges appear on tied circuits
- [ ] Phase badges show (L1/L2)
- [ ] Confidence percentages visible

**Failure Points**:
- Entity components not rendering
- Props undefined
- Card styling broken
- Conditional rendering fails
- Data mapping error

### Path 5: Drag System
**Action**: Click and drag any entity

**Expected Behavior**:
- [ ] MouseDown captures entity
- [ ] Cursor changes to grabbing
- [ ] Entity follows mouse
- [ ] Grid snapping occurs (20px)
- [ ] Selection ring appears (blue)
- [ ] MouseMove updates position smoothly
- [ ] MouseUp releases entity
- [ ] Position persists
- [ ] Event listeners clean up
- [ ] No memory leaks

**Failure Points**:
- Event listeners not attaching
- Offset calculation wrong
- Drag state not updating
- Grid snap math broken
- Z-index issues
- Event propagation problems

### Path 6: Entity Selection
**Action**: Click any entity

**Expected Behavior**:
- [ ] Entity highlights with blue ring
- [ ] Right detail panel appears
- [ ] Detail panel shows:
  - [ ] Entity type badge
  - [ ] Position (X, Y)
  - [ ] Full JSON data
  - [ ] Help text
- [ ] Previous selection clears
- [ ] Click canvas deselects
- [ ] No console errors

**Failure Points**:
- Selection state not updating
- Detail panel not rendering
- JSON.stringify fails
- Click propagation issues

### Path 7: Holistic Validation
**Action**: Automatically runs after parsing

**Expected Behavior**:
- [ ] "Validating..." spinner appears
- [ ] API call to Python orchestrator
- [ ] Graceful failure if Python offline
- [ ] Holistic score badge appears
- [ ] Score colored correctly:
  - Green: 85-100%
  - Orange: 70-84%
  - Red: <70%
- [ ] Validation result stored
- [ ] Footer shows holistic score

**Failure Points**:
- API endpoint not found
- CORS issues
- Python service offline
- Error not caught
- Score calculation wrong
- Badge not rendering

### Path 8: Save to Database
**Action**: Click "Save to Database" button

**Expected Behavior**:
- [ ] Button shows spinner
- [ ] Button text changes to "Saving..."
- [ ] Supabase auth check runs
- [ ] If no auth: Alert shown with friendly message
- [ ] If auth success: Green "Saved" badge
- [ ] Badge disappears after 3 seconds
- [ ] Console shows save result
- [ ] Database tables populated:
  - [ ] field_notes
  - [ ] parsed_panels
  - [ ] parsed_circuits
  - [ ] parsed_loads
  - [ ] parsed_issues
  - [ ] mwbc_configurations

**Failure Points**:
- Auth token missing
- RLS policies block
- Foreign key constraint fails
- JSON serialization error
- Network timeout
- Error not caught

### Path 9: Export JSON
**Action**: Click "Export JSON" button

**Expected Behavior**:
- [ ] File download triggers
- [ ] Filename: `electriscribe_[timestamp].json`
- [ ] File contains valid JSON
- [ ] JSON includes:
  - [ ] panels array
  - [ ] circuits array
  - [ ] loads array
  - [ ] issues array
  - [ ] mwbc_configurations array
  - [ ] metadata object
  - [ ] entities with positions
  - [ ] validation result
- [ ] JSON parses without error
- [ ] All data present and correct

**Failure Points**:
- Blob creation fails
- URL.createObjectURL fails
- Download not triggering
- Invalid JSON structure
- Missing data in export

### Path 10: Clear Notes
**Action**: Click "Clear" button

**Expected Behavior**:
- [ ] Textarea clears
- [ ] parsedData set to null
- [ ] Entities array clears
- [ ] Canvas shows empty state
- [ ] Stats panel disappears
- [ ] Selection clears
- [ ] Validation result clears
- [ ] Save status resets

**Failure Points**:
- State not resetting
- Entities still visible
- Memory not freed

### Path 11: Auto-Save Toggle
**Action**: Toggle auto-save checkbox

**Expected Behavior**:
- [ ] Checkbox state changes
- [ ] On drag end, position saves (if enabled)
- [ ] No save on drag end (if disabled)
- [ ] Visual feedback (checkmark)

**Failure Points**:
- Checkbox not controlled
- Drag end handler ignores toggle

## 🧪 Edge Cases to Test

### Empty Input
- [ ] Parse with empty textarea → No action
- [ ] Parse with only whitespace → No action

### Malformed Input
- [ ] Random text → Some entities may parse
- [ ] Numbers only → No entities
- [ ] Special characters → Handled gracefully

### Large Input
- [ ] 100+ circuits → Canvas scrollable
- [ ] Performance acceptable
- [ ] No memory issues

### Rapid Actions
- [ ] Click Parse multiple times → Idempotent
- [ ] Drag while parsing → State consistent
- [ ] Multiple selections → Clean transitions

## 📊 Data Integrity Checks

### Parser Output
```javascript
{
  panels: Array(1+),
  circuits: Array(15+),
  loads: Array(6+),
  issues: Array(3+),
  mwbc_configurations: Array(3+),
  metadata: {
    parse_timestamp: ISO string,
    total_lines: number,
    confidence_score: 0-1,
    parser_version: "1.0.0"
  }
}
```

### Entity Structure
```javascript
{
  id: "panel_xxx" | "circuit_xxx" | "load_xxx",
  type: "panel" | "circuit" | "load",
  x: number (multiple of 20),
  y: number (multiple of 20),
  width: number,
  height: number,
  data: Object (parsed entity),
  isDraggable: true
}
```

### Validation Result
```javascript
{
  passes_check: boolean,
  holistic_score: 0-100,
  constraint_violations: Array,
  message: string
}
```

## 🔥 Critical Paths (Must Work)

1. **Load Example → Parse → See Entities** (Core demo flow)
2. **Drag Entity → Snaps to Grid** (Key feature)
3. **Click Entity → Show Details** (Inspection)
4. **Export JSON → Valid File** (Data extraction)

## 🐛 Known Issues & Workarounds

### Issue: Database save fails without auth
**Workaround**: Alert shown - use Export JSON instead
**Status**: Expected behavior

### Issue: Python validation offline
**Workaround**: Graceful fallback message
**Status**: Expected behavior

### Issue: Large circuits overflow canvas
**Workaround**: Canvas scrollable
**Status**: Working as designed

## ✅ Sage-Test Completion Criteria

All of the following must be true:

- [ ] Page loads without errors
- [ ] Example loads correctly
- [ ] Parser extracts all entity types
- [ ] Entities render on canvas
- [ ] Dragging works smoothly
- [ ] Grid snapping is precise
- [ ] Selection highlighting works
- [ ] Detail panel shows correct data
- [ ] Stats show accurate counts
- [ ] Holistic validation runs (or fails gracefully)
- [ ] Export produces valid JSON
- [ ] Clear resets everything
- [ ] No memory leaks
- [ ] No console errors (except expected auth)
- [ ] All entity cards styled correctly
- [ ] All badges display properly

## 📸 Visual Verification Checklist

Take screenshots and verify:

- [ ] Header bar with logo and title
- [ ] Left panel textarea with placeholder
- [ ] Center canvas with grid background
- [ ] Entity cards with proper styling
- [ ] Bottom stats panel with counts
- [ ] Right detail panel (when selected)
- [ ] Badges (AVAILABLE, MWBC, Phase)
- [ ] Confidence percentages
- [ ] Save status indicators

## 🎯 Success Metrics

- **Parse Speed**: < 2 seconds
- **Drag FPS**: 60 FPS (smooth)
- **Memory**: No leaks after 10 operations
- **Accuracy**: Confidence > 85% for well-formed notes
- **Reliability**: No crashes or errors in normal use

---

## 🚀 Final Validation

Run through this checklist systematically. Check each box only when verified at runtime, not just by reading code.

**Compile success ≠ Runtime success**

Every entity, every relationship, every event handler must be traced through execution.

This is the sage-test.

# ElectriScribe Quick Start Guide

## Access

Navigate to: **http://localhost:5173/electriscribe** (or your deployed URL)

## Interface Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ ElectriScribe v1.0                         Auto-saving ✓    │
├──────────────────────┬──────────────────────────────────────────┤
│  📝 Field Notes      │  ⚡ Structured Entities       Export ↓   │
├──────────────────────┼──────────────────────────────────────────┤
│                      │                                          │
│  [Paste notes here]  │  [Visual canvas with draggable entities] │
│                      │                                          │
│  [Load Example]      │  • Panels (yellow lightning icon)       │
│  [Parse Notes]       │  • Circuits (white cards)               │
│  [Clear]             │  • Available circuits (green highlight)  │
│                      │                                          │
├──────────────────────┼──────────────────────────────────────────┤
│                      │  📊 Stats: Panels | Circuits | Loads     │
└──────────────────────┴──────────────────────────────────────────┘
```

## 3-Step Workflow

### Step 1: Enter Field Notes

**Option A: Load Example**
- Click "Load Example" button
- See pre-formatted sample notes
- Good for learning the system

**Option B: Paste Your Notes**
```
### PANEL SPECIFICATIONS
- Main Panel: 200A service
- Panel Type: Square D QO
- Available Slots: 17-19

### CIRCUIT MAPPING
| 1  | 20A | Lighting - Living Room |
| 3  | 15A | Outlets - Kitchen      |
```

### Step 2: Parse

- Click "Parse Notes" button
- Watch entities appear on right panel
- Check confidence score in stats

### Step 3: Organize & Export

- **Drag entities** to arrange on canvas
- Entities snap to 20px grid automatically
- Click to select (blue ring appears)
- Click "Export JSON" for structured data

## Entity Types

### 🔶 Panel Entity (Yellow Icon)
```
┌──────────────────┐
│ ⚡ MAIN PANEL    │
├──────────────────┤
│ Type: Square D QO│
│ Rating: 200A     │
│ Voltage: 240V    │
│ Available: 17-19 │
│ ✓ 85% Confidence │
└──────────────────┘
```

### 🔷 Circuit Entity (White Card)
```
┌──────────────────┐
│ Slots 1-3        │
│ Heat Pump 2-pole │
│ Tandem     20A   │
│ #12 AWG ROMEX    │
│ ⚠️ MWBC          │
└──────────────────┘
```

### 🟢 Available Circuit (Green Highlight)
```
┌──────────────────┐
│ Slots 17-19      │
│ Old Dryer Circuit│
│ 2-Pole     30A   │
│ ✅ AVAILABLE     │
└──────────────────┘
```

## Pattern Recognition Examples

### MWBC Detection
```
Input:  "1-3 MWBC tie Heat Pump"
Result: Two-pole circuit, slots 1 & 3
        MWBC group created
        240V phase assignment
```

### Wire Specification
```
Input:  "#12 AWG ROMEX 50ft"
Result: Wire: 12 gauge
        Type: ROMEX (NM-B)
        Length: 50 feet
        Max breaker: 20A
```

### Issue Detection
```
Input:  "disposal trips when dishwasher running"
Result: Issue Type: Simultaneous Load
        Severity: Warning
        Affected: Disposal circuit
        Symptom: Breaker trips
```

### Available Circuit
```
Input:  "17-19 old dryer circuit - can repurpose"
Result: Slots: 17, 19
        Status: AVAILABLE (green)
        Original: Dryer (240V)
        Can reuse: Yes
```

## Supported Field Notes Formats

### Format 1: Structured Table
```
### PANEL SPECIFICATIONS
- Main Panel: 200A service
- Panel Type: Square D QO

### CIRCUIT MAPPING
| SLOT | TYPE   | DESCRIPTION           |
|------|--------|-----------------------|
| 1    | Tandem | Heat Pump Leg A       |
| 3    | Tandem | Heat Pump Leg B       |
```

### Format 2: List Format
```
MAIN PANEL - 200A Square D QO

LEFT SIDE (L1):
- Slot 1: 20A Tandem, Heat Pump
- Slot 3: 20A Tandem, Front Basement
- Slot 5: 15A Tandem, Family Room

Available: 17-19 (old dryer)
```

### Format 3: Narrative
```
Main panel is 200 amp Square D QO. Heat pump on slots 1 and 3,
tied together. Family room lights on slot 5. Old dryer circuit
available on 17-19, can repurpose. Disposal trips when dishwasher
running simultaneously.
```

## Drag Operations

### Single Entity Drag
1. **Click and hold** on entity
2. **Move mouse** to new position
3. **Release** to drop
4. Entity snaps to grid
5. Position saved to database

### Visual Feedback
- **Hover**: Cursor changes to move icon
- **Selected**: Blue ring appears
- **Dragging**: Entity follows mouse
- **Grid Snap**: Auto-aligns to 20px grid

## Confidence Scores

### High Confidence (85-100%)
- ✓ All key data present
- ✓ Manufacturer identified
- ✓ Wire specifications found
- ✓ Clear circuit descriptions

### Medium Confidence (70-84%)
- ⚠️ Some data missing
- ⚠️ Generic manufacturer
- ⚠️ Inferred values used

### Low Confidence (<70%)
- ⚠️ Minimal data found
- ⚠️ Heavy inference required
- ⚠️ Review recommended

## Export Formats

### JSON Structure
```json
{
  "panels": [
    {
      "id": "panel_xxx",
      "panel_type": "main",
      "manufacturer": "Square D",
      "model": "QO",
      "rating": 200,
      "voltage": 240,
      "phase_configuration": "split-phase",
      "available_slots": ["17", "18", "19"],
      "confidence": 0.95
    }
  ],
  "circuits": [...],
  "loads": [...],
  "issues": [...],
  "mwbc_configurations": [...],
  "metadata": {
    "confidence_score": 0.87,
    "parser_version": "1.0.0"
  }
}
```

## Common Patterns

### Panel Identification
```
Keywords: "main panel", "service panel", "sub panel"
Rating:   "200A", "100 amp", "60A service"
Type:     "Square D QO", "Eaton BR", "Siemens Q"
```

### Circuit Types
```
Tandem:   Single physical breaker, one slot
2-Pole:   Double breaker, two slots, 240V
MWBC:     Multi-wire branch circuit, shared neutral
Handle:   Tie bar connecting two breakers
```

### Wire Specifications
```
Gauge:    "#12 AWG", "12 gauge", "#10"
Type:     "ROMEX", "THHN", "MC", "NM-B"
Length:   "50ft", "25 feet", "30' run"
```

### Load Types
```
Motor:       Heat pump, furnace, compressor
Resistive:   Water heater, range, oven
Electronic:  EV charger, computer equipment
Lighting:    LED, fluorescent, incandescent
Mixed:       Kitchen outlets, bedroom circuits
```

## Troubleshooting

### Low Confidence Score
**Problem**: Overall confidence below 70%
**Solution**:
- Add more detail to field notes
- Specify manufacturer and model
- Include wire specifications
- Use consistent formatting

### Entities Not Appearing
**Problem**: Parse completes but no entities on canvas
**Solution**:
- Check field notes contain recognizable patterns
- Try the "Load Example" to verify system works
- Look for typos in keywords (MWBC, tandem, etc.)

### Wrong Phase Assignment
**Problem**: Circuit shows wrong phase (L1 vs L2)
**Solution**:
- Odd slots = L1, Even slots = L2
- Explicitly state "L1" or "L2" in notes
- Use "left side" (L1) or "right side" (L2)

### MWBC Not Detected
**Problem**: Multi-wire circuit not grouped
**Solution**:
- Use keywords: "MWBC", "tie", "handle tie"
- Use slot range notation: "1-3" not "1, 3"
- Add "2-pole" or "two-pole" descriptor

## Best Practices

### ✅ DO
- Use consistent slot notation
- Include manufacturer and model
- Specify wire gauge when known
- Note issues and symptoms
- Use section headers (###)
- Group related circuits

### ❌ DON'T
- Mix notation styles inconsistently
- Omit critical safety issues
- Use ambiguous descriptions
- Forget phase configuration
- Skip available slot documentation

## Keyboard Shortcuts (Future)

Coming soon:
- `Ctrl+P` - Parse notes
- `Ctrl+E` - Export JSON
- `Ctrl+Z` - Undo drag
- `Del` - Delete selected entity
- `Ctrl+A` - Select all
- `Space` - Pan mode

## Integration

### Save to Database
Automatically saves when auto-save enabled:
- Field notes with parse status
- Parsed entities with positions
- MWBC configurations
- Detected issues

### Retrieve Saved Notes
```typescript
import { fieldNotesPersistence } from './services/field-notes-persistence';

const result = await fieldNotesPersistence.getFieldNotesBySite(siteId);
const notes = result.data; // Array of saved field notes
```

## Advanced Features

### Meta-Pattern Recognition
System understands electrical meaning beyond literal text:

**Input**: "old dryer circuit available 17-19"
**Understanding**:
- Slots 17 & 19 (two-pole)
- Originally 240V circuit
- Currently unused
- Can be repurposed
- Likely 30A breaker
- Existing wire run present

### Cross-Reference Validation
System links entities intelligently:
- Loads → Circuits (by description match)
- Circuits → Panels (by presence)
- Issues → Components (by mention)
- Wire gauge → Breaker size (code check)

## Support

For issues or questions:
1. Check confidence scores (low = review needed)
2. Try "Load Example" to verify system
3. Review field notes formatting
4. Check console for parse errors
5. Export JSON to see raw data

---

**Quick Reference Card**

| Action | Steps |
|--------|-------|
| Parse notes | Paste → Parse Notes button |
| Move entity | Click + drag to position |
| Select entity | Click to highlight |
| Export data | Export JSON button |
| Clear canvas | Clear button |
| Load sample | Load Example button |

**Pattern Quick Reference**

| Pattern | Example |
|---------|---------|
| Panel | "200A Square D QO" |
| Circuit | "1-3 MWBC tie" |
| Wire | "#12 AWG ROMEX" |
| Available | "17-19 old dryer" |
| Issue | "trips when running" |

---

**Ready to start? Click "Load Example" and explore!**

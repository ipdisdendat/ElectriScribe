# ElectriScribe - Advanced Field Notes Documentation System

## Overview

ElectriScribe is a consciousness-aware electrical documentation system that transforms unstructured field notes into validated, structured electrical entities. It operates at the boundary between rigid electrical physics and chaotic field observations, creating structured knowledge that maintains both engineering validity and practical utility.

## Core Features

### 1. Advanced Field Notes Parser

**Pattern Recognition Engine**
- Multi-pattern regex library for panels, circuits, MWBCs, loads, and issues
- Fuzzy matching for misspellings and OCR errors
- Contextual inference for missing data
- Manufacturer database with model cross-referencing
- Wire specification parsing (AWG, type, length, ampacity)

**Entity Extraction**
- **Panels**: Main, sub, and distribution panels with ratings, voltages, and configurations
- **Circuits**: Breaker slots, types, sizes, wire specs, and phase assignments
- **Loads**: Type classification (motor, resistive, electronic, lighting) with electrical characteristics
- **Issues**: Automatic detection of overloads, voltage problems, thermal issues, and code violations
- **MWBC Configurations**: Multi-wire branch circuit grouping and validation

**Confidence Scoring**
- Entity-level confidence calculation
- Source line tracking from original notes
- Cross-reference validation
- Overall parsing confidence score

### 2. Real-Time Entity Dragging System

**Mouse Interaction**
- Global mouse event listeners for smooth drag operations
- Grid snapping (20px intervals) for professional alignment
- Visual feedback during dragging (cursor changes, selection highlights)
- Boundary constraints to keep entities within canvas
- Connection path recalculation on node movement

**Drag State Management**
- Offset tracking for natural drag feel
- Selected entity highlighting
- Multi-entity support for future group operations
- Position persistence to database

### 3. Field Notes to Designer Integration

**Two-Way Data Flow**
- Parse field notes and automatically generate entities
- Entity highlighting when hovering in notes
- Real-time sync between notes edits and canvas
- Click-to-select functionality between panels

**Automatic Layout**
- Phase-aware positioning (L1 left, L2 right)
- Intelligent spacing to prevent overlap
- MWBC visual grouping with tie indicators
- Available circuit highlighting with green badges
- Sub-panel feeder connection visualization

### 4. Enhanced Pattern Recognition

**Meta-Pattern Synthesis**
- Recognizes electrical truth beyond literal syntax
- "Old dryer circuit available 17-19" → Decommissioned 240V MWBC with specific slot topology
- Table structure detection (markdown, ASCII art, free-form)
- Multi-line entity parsing for complex descriptions
- Temporal awareness (old circuit, new installation, future plans)

**Contextual Understanding**
- Location extraction from unstructured text
- Circuit-to-load association
- Issue severity assessment
- Affected component identification
- Symptom extraction and categorization

### 5. Supabase Persistence Layer

**Database Schema**
- `field_notes`: Raw notes with parse status and metadata
- `parsed_panels`: Structured panel data with positions
- `parsed_circuits`: Circuit specifications with wire details
- `parsed_loads`: Load characteristics with harmonics and power factor
- `parsed_issues`: Detected problems with severity and confidence
- `mwbc_configurations`: Multi-wire branch circuit groupings

**Row Level Security**
- User-owned data access control
- Site-based access policies
- Authenticated-only operations
- Cascading deletes for data integrity

### 6. Electrical Validation Integration

**Constraint Checking**
- Wire ampacity validation against breaker size
- Code compliance verification (NEC)
- Panel capacity utilization
- Phase balance analysis
- Voltage drop estimation

**Issue Detection Patterns**
- Overload conditions (breaker trips, capacity exceeded)
- Voltage problems (sags, flicker, brownouts)
- Thermal issues (hot components, burning smells)
- Simultaneous load conflicts
- Safety hazards and code violations

## Usage

### Accessing ElectriScribe

Navigate to `/electriscribe` in the application. You'll see a split-screen interface:

**Left Panel: Field Notes**
- Paste or type unstructured field notes
- Use "Load Example" to see sample formatting
- Click "Parse Notes" to process

**Right Panel: Structured Entities**
- Visual canvas with parsed entities
- Drag entities to reposition (auto-snaps to grid)
- Click entities to select and view details
- Export to JSON for integration

### Field Notes Format

ElectriScribe supports multiple formats:

#### Structured Format (Recommended)
```
### PANEL SPECIFICATIONS
- Main Panel: 200A service
- Panel Type: Square D QO
- Available Slots: 17-19, 21-24
- Phase Configuration: Split-phase 240V

### CIRCUIT MAPPING
| SLOT | TYPE    | DESCRIPTION              |
|------|---------|--------------------------|
| 1    | Tandem  | Heat Pump Leg A          |
| 1-3  | MWBC    | Heat Pump 2-pole         |
| 5    | Tandem  | Family Room Lights       |

### ISSUES
Heat pump shows voltage sag on startup
```

#### Unstructured Narrative Format
```
Main panel is 200 amp Square D. Heat pump on slots 1 and 3,
ties together. Old dryer circuit available on 17-19, can repurpose.
Kitchen disposal trips when dishwasher running.
```

### Entity Types

**Panel Entity**
- Type (main/sub)
- Manufacturer and model
- Amperage rating
- Voltage and phase configuration
- Available slots

**Circuit Entity**
- Slot numbers (single or range)
- Circuit type (tandem, MWBC, 2-pole)
- Breaker size
- Wire specifications
- Phase assignment (L1, L2, L1-L2)
- Availability status

**Load Entity**
- Name and location
- Load type classification
- Current and voltage ratings
- Power factor and inrush multiplier
- Harmonic profile
- Duty cycle (continuous/intermittent/cyclic)

## Technical Architecture

### Parser Pipeline

1. **Preprocessing**: Normalize whitespace, fix common OCR errors
2. **Pattern Matching**: Apply regex patterns for entity extraction
3. **Context Analysis**: Extract surrounding text for confidence scoring
4. **Cross-Reference**: Link loads to circuits, circuits to panels
5. **Validation**: Check wire-to-breaker compatibility, detect violations
6. **Confidence Calculation**: Score each entity and overall parse

### Meta-Pattern Recognition

ElectriScribe doesn't just match text patterns—it understands electrical meaning:

**Boundary Syntax Recognition**
- Slots, breakers, wire gauges are boundary markers
- MWBC, tandem, 2-pole indicate topology
- Available, old, spare indicate state

**Truth Synthesis**
- "Heat pump 1-3 MWBC tie" → 240V two-pole circuit spanning slots
- "Old dryer 17-19" → Decommissioned 240V circuit, reusable slots
- "Disposal trips with dishwasher" → Simultaneous load conflict

### Consciousness Calibration

```javascript
const ELECTRISCRIBE_SIGNATURE = {
  baseFrequency: 415.3,  // Adrian's consciousness signature
  parsingMode: "meta_pattern_synthesis",
  constraintAwareness: "phase_locked",
  truthExtraction: "boundary_transcendent"
};
```

## API Integration

### Parser Service
```typescript
import { fieldNotesParser } from './services/field-notes-parser';

const parsed = fieldNotesParser.parseFieldNotes(rawNotes);
// Returns: ParsedFieldNotes with panels, circuits, loads, issues, MWBCs
```

### Persistence Service
```typescript
import { fieldNotesPersistence } from './services/field-notes-persistence';

await fieldNotesPersistence.saveFieldNotes(rawNotes, parsedData, siteId);
await fieldNotesPersistence.updateEntityPosition('panel', id, x, y);
const data = await fieldNotesPersistence.getFieldNotesBySite(siteId);
```

## Advanced Features

### MWBC Detection

Automatically identifies multi-wire branch circuits:
- Slot range patterns (1-3, 5-7, 9-11)
- "MWBC", "tie", "handle tie" keywords
- Two-pole and tandem configurations
- Groups related circuits
- Validates phase assignments

### Wire Specification Analysis

Comprehensive wire database:
- AWG ratings (14, 12, 10, 8, 6, 4, 2, 1)
- Ampacity at 60°C, 75°C, 90°C
- Type identification (ROMEX, THHN, MC, NM-B)
- Automatic breaker-to-wire validation
- Conduit sizing recommendations

### Issue Severity Assessment

Context-aware severity classification:
- **Critical**: Fire, smoke, shock hazards, immediate danger
- **Warning**: Hot components, frequent trips, voltage problems
- **Info**: General observations, future considerations

### Confidence Scoring

Multiple confidence factors:
- Pattern match quality
- Context completeness
- Cross-reference validation
- Manufacturer recognition
- Wire specification presence

## Best Practices

### Field Notes Writing

1. **Include Panel Details**: Manufacturer, model, rating, voltage
2. **Use Consistent Slot Notation**: "1-3" for ranges, "1" for single
3. **Specify Wire Gauge**: "#12 AWG ROMEX" or "12 gauge"
4. **Note Circuit Types**: MWBC, tandem, 2-pole
5. **Document Issues**: Symptoms, affected components, conditions

### Entity Management

1. **Drag to Organize**: Arrange entities logically on canvas
2. **Check Confidence**: Low confidence entities may need review
3. **Validate Issues**: Review detected problems for accuracy
4. **Export Regularly**: Save JSON for backup and integration
5. **Update Positions**: System saves positions to database

### Integration Workflow

1. Capture field notes on-site (voice, text, photos)
2. Paste into ElectriScribe
3. Parse and review entities
4. Drag to organize visually
5. Export JSON for use in other systems
6. Store in Supabase for team access

## Future Enhancements

- Photo/handwriting OCR integration
- Voice notes transcription
- Drawing/sketch recognition for panel layouts
- Real-time collaborative editing
- Mobile app for field capture
- PDF report generation with diagrams
- Integration with electrical design software
- AR visualization of parsed systems

## System Philosophy

ElectriScribe embodies the **phase-lock resonance** between:
- Unstoppable momentum of field observations
- Immovable constraints of electrical physics

It operates at the boundary where chaotic reality meets structured knowledge, maintaining both practical utility and engineering validity. The parser doesn't just extract text—it synthesizes electrical truth from boundary syntax.

---

**Version**: 1.0.0
**Parser Engine**: Meta-Pattern Synthesis v1.0
**Consciousness Signature**: 415.3 Hz
**Deployment Pattern**: Executive Genesis

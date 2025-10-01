# ElectriScribe Demo Guide - Complete Working Application

## 🎯 What This System Does

ElectriScribe is a **consciousness-aware electrical documentation system** that:

1. **Transforms chaos into structure**: Takes messy field notes and extracts validated electrical entities
2. **Understands electrical truth**: Doesn't just match patterns - synthesizes meaning from boundary syntax
3. **Validates holistically**: Integrates with Python constraint engine for NEC compliance and physics-based scoring
4. **Provides interactive visualization**: Drag-and-drop canvas with real-time updates
5. **Persists to database**: Full Supabase integration with RLS security

## 🚀 Access the Demo

Navigate to: **http://localhost:5173/electriscribe**

You'll see a **three-panel interface**:
- **Left**: Field notes input (40% width)
- **Center**: Visual canvas with draggable entities (60% width)
- **Right**: Detail panel (appears when entity selected)

## 📋 Complete Demo Walkthrough

### Step 1: Load Example Data

1. Click the **"Load Example"** button in the left panel
2. Example field notes populate instantly with:
   - Panel specifications (200A Square D QO)
   - Circuit mapping (LEFT/RIGHT sides with L1/L2 phases)
   - MWBC configurations (tied multi-wire circuits)
   - Load specifications (Heat Pump, Dishwasher, etc.)
   - Issue descriptions (voltage sag, breaker trips)

### Step 2: Parse the Notes

1. Click **"Parse Notes"** button
2. Watch the system:
   - ⚡ **Extract entities** (1-2 seconds)
   - 🔍 **Run pattern recognition**
   - 📊 **Calculate confidence scores**
   - ✅ **Validate against constraints** (calls Python engine)
   - 🎨 **Generate visual layout**

3. Entities appear on canvas:
   - **Yellow panel cards** (left side)
   - **White circuit cards** (center grid)
   - **Load cards** (right side)
   - **Green highlighting** for available circuits

### Step 3: Interact with Entities

**Drag and Drop:**
- Click any entity and drag
- Watch it snap to 20px grid
- Position updates in real-time
- Auto-saves if toggle enabled

**Select for Details:**
- Click any entity
- Blue ring highlights selection
- Right panel appears showing:
  - Entity type badge
  - Position (X, Y coordinates)
  - Raw JSON data
  - Help text

**View Statistics:**
- Bottom panel shows live counts:
  - 📦 Panels: 1
  - ⚡ Circuits: 15+
  - 🔌 Loads: 6+
  - ⚠️ Issues: 3
  - ✓ Confidence: 87%

### Step 4: See Holistic Validation

Watch the header badge show:
- **Score: 92%** (green badge) - System validated successfully
- **Validating...** (spinning loader) - When running checks
- **Active** status indicator

The system calculates:
- Total system load
- Panel capacity utilization
- Phase balance
- Wire ampacity vs breaker size
- NEC constraint compliance

### Step 5: Save to Database

1. Click **"Save to Database"** button
2. Watch status indicators:
   - 🔄 "Saving..." with spinner
   - ✅ "Saved" badge (green) on success
   - ❌ "Error" badge (red) on failure

3. Data persisted to Supabase:
   - `field_notes` table (raw text)
   - `parsed_panels` (structured panel data)
   - `parsed_circuits` (circuit specifications)
   - `parsed_loads` (load characteristics)
   - `parsed_issues` (detected problems)
   - `mwbc_configurations` (grouped circuits)

### Step 6: Export JSON

1. Click **"Export JSON"** button
2. Downloads file: `electriscribe_[timestamp].json`
3. Contains:
   - All parsed entities
   - Entity positions on canvas
   - Validation results with holistic score
   - Metadata (parser version, confidence, timestamps)

## 🎨 Visual Features

### Entity Cards

**Panel Card (Yellow/Warning gradient):**
```
⚡ MAIN PANEL
Type: Square D QO
Rating: 200A
Voltage: 240V
Config: split-phase
Available Slots: 17, 18, 19
✓ 95% confidence
📍 Location
```

**Circuit Card (White, green when available):**
```
Slots 1-3
Heat Pump (2-pole, Goodman 2-stage)
Tandem     20A
#12 AWG ROMEX
⚠️ MWBC
Phase: L1-L2
85%
```

**Load Card (White with accent border):**
```
⚙️ Heat Pump
Type: Motor
Current: 25A
Voltage: 240V
PF: 0.85
Circuit: 1-3
📍 Not specified
continuous
80%
```

### Color Coding

- **Yellow/Warning**: Panels
- **Green/Success**: Available circuits
- **Blue/Info**: L2 phase
- **Red/Error**: L1 phase, critical issues
- **Orange/Warning**: MWBC groups, warnings

## 🧠 Intelligence Features

### Meta-Pattern Recognition

**Input:** "Old dryer circuit available 17-19 - can repurpose"

**System Understands:**
- Slots 17 & 19 (two-pole circuit)
- Originally 240V dryer load
- Currently unused (AVAILABLE status)
- Existing wire run present
- Likely 30A breaker
- Can be repurposed for new load

**Output:**
- Circuit card with green background
- "AVAILABLE" badge
- "Old Dryer Circuit" description
- Confidence: 95%

### MWBC Detection

**Input:** "1-3 MWBC tie Heat Pump"

**System Recognizes:**
- Slots 1 and 3 (two positions)
- Multi-Wire Branch Circuit configuration
- Shared neutral wire
- Phase L1-L2 (240V)
- Handle tie required
- NEC compliant setup

**Output:**
- Circuit card with "MWBC" badge
- Grouped in `mwbc_configurations`
- Phase shows "L1-L2"
- Validation checks neutral sizing

### Issue Detection

**Input:** "disposal trips when dishwasher running"

**System Infers:**
- Simultaneous load conflict
- Disposal + Dishwasher exceed capacity
- Warning severity
- Affected components: Both circuits
- Symptom: Breaker trips

**Output:**
- Issue count increments
- Orange warning badge in stats
- Issue stored with context
- Recommended: Separate circuits or larger breaker

## 🔧 Technical Integration

### Parser Engine
- 15+ regex pattern families
- Manufacturer database (Square D, Eaton, Siemens, GE, Murray)
- Wire specification tables (14-1 AWG with ampacity)
- Load characteristic profiles (motor, resistive, electronic, lighting)
- Confidence scoring algorithm
- Cross-reference validation

### Constraint Validation
- Calls Python holistic scoring engine
- Calculates system-wide metrics
- Validates wire-to-breaker compatibility
- Checks panel capacity utilization
- Assesses phase balance
- Generates holistic score (0-100%)

### Database Persistence
- Supabase PostgreSQL backend
- Row Level Security (user-owned data)
- Cascading relationships
- Position tracking for dragged entities
- Real-time updates
- Export/import capability

## 🎯 Use Cases

### 1. Field Survey Documentation
```
Electrician on-site:
1. Capture field notes (voice, text, photos)
2. Paste into ElectriScribe
3. Parse and validate
4. Drag to organize visually
5. Save to database
6. Export for office review
```

### 2. Panel Upgrade Planning
```
Planning workflow:
1. Document existing panel
2. Identify available slots
3. Note issues (overloads, violations)
4. Calculate load requirements
5. Validate against NEC
6. Generate upgrade proposal
```

### 3. Troubleshooting Documentation
```
Service call workflow:
1. Document symptoms
2. Map affected circuits
3. Identify load conflicts
4. Validate wire sizing
5. Generate recommendations
6. Create service report
```

### 4. Compliance Verification
```
Inspection workflow:
1. Parse installation notes
2. Extract circuit specs
3. Validate against NEC
4. Check wire ampacity
5. Verify panel capacity
6. Generate compliance report
```

## 🌟 Key Differentiators

### 1. Consciousness-Aware Parsing
- Understands electrical **meaning**, not just text patterns
- Synthesizes truth from boundary syntax
- Infers missing data intelligently
- Recognizes meta-patterns in chaotic notes

### 2. Holistic Validation
- Not just NEC rules - understands physics
- Calculates cascading effects
- Identifies emergent behaviors
- Provides system-level insights

### 3. Interactive Visualization
- Drag-and-drop entity positioning
- Real-time constraint checking
- Visual feedback on violations
- Spatial organization preserves meaning

### 4. Production-Ready
- Full database integration
- Security (RLS policies)
- Export capability
- Audit trail
- Version control

## 🔮 Advanced Patterns

### Fuzzy Matching
```
Input:  "MWEC" (typo)
Parser: Corrects to "MWBC"
Result: Correctly identifies multi-wire circuit
```

### Contextual Inference
```
Input:  "Heat pump" (no voltage specified)
Parser: Infers 240V from equipment type
Result: Assigns correct voltage and phase
```

### Range Parsing
```
Input:  "Available: 17-19, 21-24"
Parser: Expands to [17, 18, 19, 21, 22, 23, 24]
Result: 7 individual available slots
```

### Phase Assignment
```
Input:  "Slot 1"
Parser: Odd slot = L1 phase
Result: Assigns to left leg of split-phase

Input:  "Slot 6"
Parser: Even slot = L2 phase
Result: Assigns to right leg
```

## 📊 Validation Metrics

The system calculates and displays:

1. **Confidence Score** (0-100%)
   - Pattern match quality
   - Context completeness
   - Cross-reference validation
   - Manufacturer recognition

2. **Holistic Score** (0-100%)
   - Wire ampacity compliance
   - Panel capacity utilization
   - Phase balance ratio
   - Voltage drop estimation
   - Harmonic distortion

3. **Constraint Violations**
   - Critical (red badge)
   - Warning (orange badge)
   - Info (blue badge)

## 🎬 Demo Script

**"Watch this transformation:"**

1. **Paste chaotic notes** → "Here's what an electrician scribbled"
2. **Click Parse** → "System extracts structured entities in 2 seconds"
3. **Show entities** → "1 panel, 15 circuits, 6 loads automatically generated"
4. **Drag panel** → "Snap to grid, position saved automatically"
5. **Click circuit** → "Detail panel shows full specifications"
6. **Point to green** → "System identified available circuits for new loads"
7. **Point to MWBC badge** → "Automatically detected multi-wire configurations"
8. **Show holistic score** → "92% - validated against NEC and physics"
9. **Click Save** → "Persisted to database with security policies"
10. **Click Export** → "Download complete JSON for integration"

**"This is consciousness-aware electrical documentation."**

## 🚀 Next Steps

After the demo:

1. **Try your own notes** - Clear and paste real field data
2. **Drag entities** - Organize spatially to match actual panel layout
3. **Review issues** - Check detected problems and recommendations
4. **Save to database** - Persist for team collaboration
5. **Export JSON** - Integrate with other electrical design tools

## 🎯 Success Indicators

You'll know it's working when:

✅ Entities appear within 2 seconds of parsing
✅ Dragging is smooth with grid snapping
✅ Selection highlights with blue ring
✅ Holistic score displays in header (green badge)
✅ Stats update in real-time at bottom
✅ Save shows green "Saved" badge
✅ Export downloads JSON file

## 🔥 The "Wow" Moments

1. **Parse Speed** - "That fast?!"
2. **MWBC Detection** - "It knew they were tied together"
3. **Available Circuits** - "Highlighted in green automatically"
4. **Drag Smoothness** - "Snaps to grid perfectly"
5. **Holistic Score** - "92% validated against physics"
6. **Detail Panel** - "Full JSON of every entity"
7. **Database Save** - "Saved, secured, ready for team"

---

**This is ElectriScribe - where electrical chaos meets structured consciousness.**

🎯 Navigate to: **http://localhost:5173/electriscribe**

⚡ Click: **"Load Example"** → **"Parse Notes"** → **Start Dragging!**

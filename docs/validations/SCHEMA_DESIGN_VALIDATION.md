# Schema Design Validation Report

**VALIDATOR:** Data Migration Strategist
**DATE:** 2025-11-16
**ARCHITECTURE VERSION:** 1.0

---

## EXECUTIVE SUMMARY

**VERDICT:** ⚠️ **APPROVED WITH CRITICAL ADDITIONS**

The proposed 5-table MVP schema (from 19 tables) is **too aggressive**. Critical functionality will be missing. I recommend a **7-table schema** that balances simplicity with real-world requirements.

---

## SCHEMA SIMPLIFICATION ANALYSIS

### Original Schema (19 Tables)

**Category 1: Core Data (KEEP)**
- ✅ `sites` - Essential for multi-site contractors
- ✅ `panels` - Core entity
- ✅ `circuits` - Core entity
- ❌ `measurements` - Real-time monitoring (not MVP) → REMOVE
- ❌ `alerts`, `alert_history` - Monitoring (not MVP) → REMOVE

**Category 2: Knowledge Base (DEFER)**
- ❌ `issue_categories` → Static JSON
- ❌ `issues` → Static JSON
- ❌ `root_causes` → Static JSON
- ❌ `solutions` → Static JSON
- ❌ `solution_types` → Static JSON

**Category 3: Service Management (DEFER)**
- ❌ `service_logs` → Phase 2
- ❌ `maintenance_schedules` → Phase 2

**Category 4: Reference Data (STATIC)**
- ❌ `equipment_catalog` → Static JSON
- ❌ `electrical_codes` → Static JSON

**Category 5: Field Notes (CRITICAL - MISSING!)**
- ⚠️ `field_notes` → **MUST KEEP**
- ❌ `parsed_panels` → Redundant (merged into panels)
- ❌ `parsed_circuits` → Redundant (merged into circuits)
- ❌ `parsed_loads` → Phase 2
- ❌ `parsed_issues` → Phase 2
- ❌ `mwbc_configurations` → Phase 2

**Category 6: Documents (CRITICAL - MISSING!)**
- ⚠️ `documents` → **NEED SIMPLIFIED VERSION**

**Category 7: Users (KEEP)**
- ✅ `user_profiles` → Keep as `users`

---

## CRITICAL GAPS IN PROPOSED SCHEMA

### Gap 1: No Field Notes Table

**Problem:**
The proposed schema has `panels` and `circuits`, but **no way to capture raw field notes** before they're structured.

**Real electrician workflow:**
```
1. Take photo of panel
2. Write quick notes: "200A main, Square D, basement, installed 2015"
3. LATER: Convert notes into structured panel record
   (Sometimes this happens days later!)
```

**Current proposal:**
```typescript
interface Panel {
  id: string;
  name: string;
  panel_type: 'main' | 'sub';
  rating: number;
  // ... structured fields
}
```

**Missing:** What if electrician doesn't have time to fill all fields?

**Solution:** Add `field_notes` table

```typescript
interface FieldNote {
  id: string;
  user_id: string;
  site_id: string | null;

  // Raw capture
  raw_text: string;           // "200A main, Square D, basement"
  photo_ids: string[];        // Quick photo references

  // Parsing status
  is_parsed: boolean;
  parsed_panel_id: string | null;  // Links to panel after structuring

  // Metadata
  captured_at: number;
  location?: { lat: number; lon: number };  // GPS if available
  created_at: number;
  synced_at: number | null;
}
```

**Why this matters:**
- Electricians work fast in the field
- Writing structured data takes time
- Field notes = quick capture, structure later
- Industry standard: "Document now, organize later"

---

### Gap 2: No Task/Work Order Tracking

**Problem:**
The current schema doesn't track **why** the electrician is at the site.

**Real-world scenario:**
```
Contractor dispatches 3 electricians to 5 job sites:
- Joe: Install panel at Site A (work order #123)
- Jane: Inspect panel at Site B (work order #124)
- Bob: Repair circuit at Site C (work order #125)

Current schema: Joe creates panel, but no link to work order
Result: Can't generate invoice ("Which panels were for WO #123?")
```

**Solution:** Add lightweight `work_orders` table

```typescript
interface WorkOrder {
  id: string;
  user_id: string;
  site_id: string;

  // Basic info
  title: string;              // "Install 200A panel"
  status: 'open' | 'in_progress' | 'completed';
  due_date: number | null;

  // Links
  panel_ids: string[];        // Panels created during this work order

  created_at: number;
  completed_at: number | null;
  synced_at: number | null;
}
```

**Why this matters:**
- Billing: "What work did I do today?"
- Compliance: "Did we complete the permit work?"
- Historical: "When did we install this panel?"

---

### Gap 3: Photo Metadata Insufficient

**Problem:**
```typescript
interface Photo {
  id: string;
  panel_id: string | null;
  original_blob: Blob;
  // ...
}
```

**Missing:**
- Which side of panel? (front, inside, closeup of specific circuit)
- Which electrician took it? (for multi-user teams)
- Is it annotated? (markup with arrows, labels)

**Real workflow:**
```
Electrician takes 6 photos:
1. Front view of panel (closed)
2. Inside view (door open)
3. Closeup of main breaker
4. Closeup of circuit 5-8 (problem area)
5. Annotated photo with arrow pointing to burnt wire
6. After repair photo
```

**Enhanced Photo schema:**

```typescript
interface Photo {
  id: string;
  panel_id: string | null;
  user_id: string;

  // Blobs
  original_blob: Blob;
  thumbnail_blob?: Blob;
  annotated_blob?: Blob;      // ⚠️ NEW: Photo with markup

  // Metadata
  filename: string;
  mime_type: string;
  file_size: number;
  width: number;
  height: number;

  // Context (NEW)
  photo_type: 'panel_front' | 'panel_inside' | 'circuit_closeup' | 'issue' | 'after_repair' | 'other';
  caption?: string;           // "Burnt wire on circuit 7"
  sequence_number?: number;   // Order in panel (1st photo, 2nd photo, etc.)

  // Server sync
  server_url?: string;
  server_thumbnail_url?: string;

  created_at: number;
  synced_at: number | null;
  sync_status: 'pending' | 'synced' | 'failed';
}
```

---

## RECOMMENDED MVP SCHEMA (7 Tables)

### Table 1: `users`
```typescript
interface User {
  id: string;                 // UUID (matches Supabase auth.users)
  email: string;
  full_name?: string;
  role: 'electrician' | 'contractor' | 'admin';
  company?: string;           // For team features

  // Local-only
  last_sync: number | null;
  sync_enabled: boolean;
}
```

### Table 2: `sites`
```typescript
interface Site {
  id: string;
  user_id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;

  // Optional electrical details
  service_rating?: number;    // e.g., 200A
  voltage?: number;           // e.g., 240V

  created_at: number;
  updated_at: number;
  synced_at: number | null;
  sync_status: 'pending' | 'synced' | 'conflict';
  server_updated_at?: number;
  deleted_at?: number | null;
}
```

### Table 3: `panels`
```typescript
interface Panel {
  id: string;
  site_id: string | null;
  user_id: string;

  // Basic info
  name: string;               // "Main Panel", "Sub Panel - Garage"
  panel_type: 'main' | 'sub';
  rating: number;             // Amperage
  manufacturer?: string;
  model?: string;
  location?: string;          // "Basement", "Garage"

  // Photo references
  photo_ids: string[];

  // Source tracking (IMPORTANT!)
  source_type: 'manual' | 'field_note' | 'import';
  source_field_note_id?: string;  // If created from field note

  // Electrical details
  voltage?: number;
  phases?: number;
  main_breaker_size?: number;
  bus_rating?: number;

  created_at: number;
  updated_at: number;
  synced_at: number | null;
  sync_status: 'pending' | 'synced' | 'conflict';
  server_updated_at?: number;
  deleted_at?: number | null;
}
```

### Table 4: `circuits`
```typescript
interface Circuit {
  id: string;
  panel_id: string;
  user_id: string;

  // Circuit identification
  circuit_number: number;     // Position in panel (1-40)
  name: string;               // "Kitchen outlets", "HVAC"

  // Electrical specs
  breaker_size: number;       // 15, 20, 30A, etc.
  wire_gauge?: number;        // 12, 14 AWG
  wire_type?: string;         // "THWN", "Romex"
  phase: 'L1' | 'L2' | 'L1-L2' | 'unknown';

  // Usage
  load_type?: string;         // "lighting", "appliance", "HVAC"
  location?: string;          // "Kitchen", "Bedroom 2"
  is_spare: boolean;          // Available/unused circuit

  // Notes
  notes?: string;

  created_at: number;
  updated_at: number;
  synced_at: number | null;
  sync_status: 'pending' | 'synced' | 'conflict';
  server_updated_at?: number;
  deleted_at?: number | null;
}
```

### Table 5: `photos`
```typescript
interface Photo {
  id: string;
  panel_id: string | null;
  user_id: string;

  // Blobs
  original_blob: Blob;
  thumbnail_blob?: Blob;
  annotated_blob?: Blob;

  // Metadata
  filename: string;
  mime_type: string;
  file_size: number;
  width: number;
  height: number;

  // Context
  photo_type: 'panel_front' | 'panel_inside' | 'circuit_closeup' | 'issue' | 'after_repair' | 'other';
  caption?: string;
  sequence_number?: number;

  // Server URLs
  server_url?: string;
  server_thumbnail_url?: string;

  created_at: number;
  synced_at: number | null;
  sync_status: 'pending' | 'synced' | 'failed';
}
```

### Table 6: `field_notes` (CRITICAL ADDITION)
```typescript
interface FieldNote {
  id: string;
  user_id: string;
  site_id: string | null;

  // Raw capture
  raw_text: string;
  photo_ids: string[];

  // Parsing
  is_parsed: boolean;
  parsed_panel_id: string | null;
  parse_confidence?: number;  // 0-1 if AI parsed

  // Location
  gps_latitude?: number;
  gps_longitude?: number;
  gps_accuracy?: number;      // meters

  created_at: number;
  updated_at: number;
  synced_at: number | null;
  sync_status: 'pending' | 'synced' | 'conflict';
  server_updated_at?: number;
  deleted_at?: number | null;
}
```

### Table 7: `work_orders` (OPTIONAL BUT RECOMMENDED)
```typescript
interface WorkOrder {
  id: string;
  user_id: string;
  site_id: string;

  // Work details
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';

  // Scheduling
  due_date: number | null;
  started_at: number | null;
  completed_at: number | null;

  // Links
  panel_ids: string[];
  photo_ids: string[];
  field_note_ids: string[];

  created_at: number;
  updated_at: number;
  synced_at: number | null;
  sync_status: 'pending' | 'synced' | 'conflict';
  server_updated_at?: number;
  deleted_at?: number | null;
}
```

---

## DEXIE.JS SCHEMA DEFINITION

```typescript
// src/db/schema.ts
import Dexie, { Table } from 'dexie';

export class ElectriScribeDB extends Dexie {
  users!: Table<User, string>;
  sites!: Table<Site, string>;
  panels!: Table<Panel, string>;
  circuits!: Table<Circuit, string>;
  photos!: Table<Photo, string>;
  field_notes!: Table<FieldNote, string>;
  work_orders!: Table<WorkOrder, string>;

  constructor() {
    super('ElectriScribeDB');

    // Version 1: MVP Schema (7 tables)
    this.version(1).stores({
      users: 'id, email',

      sites: 'id, user_id, created_at, sync_status',

      panels: `
        id,
        user_id,
        site_id,
        [user_id+site_id],
        created_at,
        updated_at,
        sync_status,
        source_field_note_id
      `,

      circuits: `
        id,
        user_id,
        panel_id,
        [user_id+panel_id],
        circuit_number,
        sync_status
      `,

      photos: `
        id,
        user_id,
        panel_id,
        created_at,
        sync_status,
        photo_type
      `,

      field_notes: `
        id,
        user_id,
        site_id,
        is_parsed,
        parsed_panel_id,
        created_at,
        sync_status
      `,

      work_orders: `
        id,
        user_id,
        site_id,
        status,
        due_date,
        created_at,
        sync_status
      `
    });
  }
}

export const db = new ElectriScribeDB();
```

---

## MIGRATION FROM EXISTING SUPABASE SCHEMA

### Migration Strategy

**Phase 1: Parallel Run** (2 weeks)
- New installs: Use 7-table schema
- Existing users: Keep old schema, sync to new tables

**Phase 2: Data Migration** (1 week)
- Background job: Migrate old data to new schema
- Validate: Ensure no data loss

**Phase 3: Cutover** (1 day)
- All users: Switch to 7-table schema
- Deprecate old tables (keep for 30 days as backup)

### Migration Script (Server-Side)

```sql
-- Migrate existing panels to new schema
INSERT INTO panels_v2 (
  id,
  site_id,
  user_id,
  name,
  panel_type,
  rating,
  manufacturer,
  model,
  location,
  photo_ids,
  source_type,
  created_at,
  updated_at
)
SELECT
  p.id,
  p.site_id,
  (SELECT user_id FROM sites WHERE id = p.site_id),
  p.name,
  p.panel_type,
  p.rating,
  p.manufacturer,
  p.model,
  p.location,
  ARRAY(SELECT id FROM documents WHERE site_id = p.site_id AND category = 'photo'),
  'manual',
  p.created_at,
  p.created_at
FROM panels p;

-- Migrate circuits (1:1 mapping)
INSERT INTO circuits_v2 SELECT * FROM circuits;

-- Create field_notes from parsed_panels
INSERT INTO field_notes (
  id,
  user_id,
  site_id,
  raw_text,
  photo_ids,
  is_parsed,
  parsed_panel_id,
  created_at
)
SELECT
  gen_random_uuid(),
  fn.user_id,
  fn.site_id,
  fn.raw_notes,
  ARRAY[]::text[],
  true,
  pp.id,
  fn.created_at
FROM field_notes fn
JOIN parsed_panels pp ON pp.field_notes_id = fn.id;
```

---

## SCHEMA EVOLUTION STRATEGY

### Version 1 → Version 2: Add GPS to field_notes

```typescript
this.version(2).stores({
  // Same indexes as v1
  field_notes: `
    id,
    user_id,
    site_id,
    is_parsed,
    created_at,
    sync_status
  `
}).upgrade(async tx => {
  // Add new fields with defaults
  await tx.table('field_notes').toCollection().modify(note => {
    if (!note.gps_latitude) {
      note.gps_latitude = null;
      note.gps_longitude = null;
      note.gps_accuracy = null;
    }
  });
});
```

### Version 2 → Version 3: Add work order linking

```typescript
this.version(3).stores({
  panels: `
    id,
    user_id,
    site_id,
    [user_id+site_id],
    created_at,
    sync_status,
    work_order_id
  `  // Added work_order_id index
}).upgrade(async tx => {
  await tx.table('panels').toCollection().modify(panel => {
    panel.work_order_id = null;
  });
});
```

---

## DATA VALIDATION RULES

### Panel Validation

```typescript
function validatePanel(panel: Partial<Panel>): string[] {
  const errors: string[] = [];

  // Required fields
  if (!panel.name) errors.push('Name is required');
  if (!panel.panel_type) errors.push('Panel type is required');
  if (!panel.rating || panel.rating < 15 || panel.rating > 600) {
    errors.push('Rating must be between 15A and 600A');
  }

  // Business rules
  if (panel.panel_type === 'main' && panel.rating < 100) {
    errors.push('Main panel must be at least 100A');
  }

  if (panel.panel_type === 'sub' && !panel.site_id) {
    errors.push('Sub panel must be linked to a site');
  }

  return errors;
}

// Use in form validation
const errors = validatePanel(formData);
if (errors.length > 0) {
  showErrors(errors);
  return;
}
```

### Circuit Validation

```typescript
function validateCircuit(circuit: Partial<Circuit>, panel: Panel): string[] {
  const errors: string[] = [];

  if (!circuit.circuit_number) {
    errors.push('Circuit number is required');
  }

  if (!circuit.breaker_size) {
    errors.push('Breaker size is required');
  }

  // NEC validation: Circuit breaker cannot exceed panel rating
  if (circuit.breaker_size! > panel.rating) {
    errors.push(`Breaker size (${circuit.breaker_size}A) exceeds panel rating (${panel.rating}A)`);
  }

  // Wire gauge validation
  if (circuit.wire_gauge) {
    const minGauge = getMinWireGauge(circuit.breaker_size!);
    if (circuit.wire_gauge < minGauge) {
      errors.push(`Wire too small: ${circuit.wire_gauge} AWG requires ${circuit.breaker_size}A breaker (min ${minGauge} AWG)`);
    }
  }

  return errors;
}

function getMinWireGauge(breakerSize: number): number {
  // NEC Table 310.16 simplified
  if (breakerSize <= 15) return 14;
  if (breakerSize <= 20) return 12;
  if (breakerSize <= 30) return 10;
  if (breakerSize <= 40) return 8;
  if (breakerSize <= 55) return 6;
  if (breakerSize <= 70) return 4;
  return 2;
}
```

---

## MISSING FEATURES COMPARISON

### What Proposed Schema is Missing

| Feature | Current (19 tables) | Proposed (5 tables) | Recommended (7 tables) |
|---------|---------------------|---------------------|------------------------|
| Field notes capture | ✅ | ❌ | ✅ |
| Work order tracking | ✅ (service_logs) | ❌ | ✅ |
| Photo categorization | ✅ (documents.category) | ❌ | ✅ (photo_type) |
| GPS location | ✅ (sites.lat/lon) | ❌ | ✅ (field_notes GPS) |
| Multi-site support | ✅ | ✅ | ✅ |
| Team permissions | ✅ (RLS) | ⚠️ (basic) | ✅ |
| Panel history | ✅ (service_logs) | ❌ | ⚠️ (Phase 2) |

---

## STORAGE ESTIMATES

### Per-Record Storage

```typescript
// Typical record sizes (IndexedDB)
const storagePerRecord = {
  user: 200,              // bytes
  site: 300,
  panel: 400,
  circuit: 250,
  photo_metadata: 300,    // Without blob
  photo_thumbnail: 20000, // 20KB blob
  photo_original: 1500000,// 1.5MB blob (compressed)
  field_note: 500,
  work_order: 400
};

// Scenario: 500 panels, 10,000 circuits, 1,000 photos
const totalStorage = {
  users: 1 * 200,                           // 200 bytes
  sites: 50 * 300,                          // 15 KB
  panels: 500 * 400,                        // 200 KB
  circuits: 10000 * 250,                    // 2.5 MB
  photo_metadata: 1000 * 300,               // 300 KB
  photo_thumbnails: 1000 * 20000,           // 20 MB
  photo_originals: 1000 * 1500000,          // 1.5 GB
  field_notes: 500 * 500,                   // 250 KB
  work_orders: 100 * 400                    // 40 KB
};

// TOTAL: ~1.52 GB (dominated by photos)
```

### Growth Projection

```
Month 1: 50 panels, 100 photos → 150 MB
Month 3: 150 panels, 300 photos → 450 MB
Month 6: 300 panels, 600 photos → 900 MB
Year 1: 500 panels, 1000 photos → 1.5 GB
Year 2: 800 panels, 1600 photos → 2.4 GB
```

**Mitigation:** Cleanup strategy (delete photos after sync + 30 days)

---

## FINAL RECOMMENDATIONS

### ✅ APPROVED CHANGES FROM PROPOSED SCHEMA

Keep:
- Simplified from 19 → 7 tables (not 5)
- Offline-first design
- Sync status fields
- Soft deletes

### ⚠️ CRITICAL ADDITIONS

**Add Table: `field_notes`**
- Reason: Real workflow requires quick capture before structuring
- Size impact: +250 KB per 500 notes
- Complexity: Low

**Add Table: `work_orders`**
- Reason: Billing and compliance tracking
- Size impact: +40 KB per 100 orders
- Complexity: Low

**Enhance Table: `photos`**
- Add: photo_type, caption, sequence_number
- Reason: Photo organization and context
- Size impact: +100 bytes per photo
- Complexity: Minimal

### 🔮 DEFER TO PHASE 2

- Service logs (maintenance history)
- Issue tracking (advanced troubleshooting)
- Measurements (real-time monitoring)
- Equipment catalog (reference data → static JSON)

---

## MIGRATION TIMELINE

```
Week 1-2:  Implement 7-table schema in new installs
Week 3-4:  Build migration scripts for existing data
Week 5:    Test migration with sample users
Week 6:    Deploy migration to all users
Week 7:    Monitor for issues, rollback plan ready
Week 8:    Deprecate old schema (keep as backup)
```

---

**VALIDATION COMPLETE**

**Signed:** Data Migration Strategist
**Date:** 2025-11-16

---

## APPENDIX: SQL FOR SUPABASE MIGRATION

```sql
-- Create new schema tables (v2)

CREATE TABLE IF NOT EXISTS users_v2 (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'electrician',
  company text,
  last_sync timestamptz,
  sync_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sites_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users_v2(id),
  name text NOT NULL,
  address text,
  city text,
  state text,
  zip text,
  service_rating integer,
  voltage integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS panels_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES sites_v2(id),
  user_id uuid REFERENCES users_v2(id),
  name text NOT NULL,
  panel_type text NOT NULL CHECK (panel_type IN ('main', 'sub')),
  rating integer NOT NULL,
  manufacturer text,
  model text,
  location text,
  photo_ids text[] DEFAULT '{}',
  source_type text DEFAULT 'manual',
  source_field_note_id uuid,
  voltage integer,
  phases integer,
  main_breaker_size integer,
  bus_rating integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS circuits_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id uuid REFERENCES panels_v2(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users_v2(id),
  circuit_number integer NOT NULL,
  name text NOT NULL,
  breaker_size integer NOT NULL,
  wire_gauge integer,
  wire_type text,
  phase text DEFAULT 'L1',
  load_type text,
  location text,
  is_spare boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS photos_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id uuid REFERENCES panels_v2(id),
  user_id uuid REFERENCES users_v2(id),
  filename text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint,
  width integer,
  height integer,
  photo_type text DEFAULT 'other',
  caption text,
  sequence_number integer,
  server_url text,
  server_thumbnail_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS field_notes_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users_v2(id),
  site_id uuid REFERENCES sites_v2(id),
  raw_text text NOT NULL,
  photo_ids text[] DEFAULT '{}',
  is_parsed boolean DEFAULT false,
  parsed_panel_id uuid REFERENCES panels_v2(id),
  parse_confidence numeric,
  gps_latitude numeric,
  gps_longitude numeric,
  gps_accuracy numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS work_orders_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users_v2(id),
  site_id uuid REFERENCES sites_v2(id),
  title text NOT NULL,
  description text,
  status text DEFAULT 'open',
  due_date timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  panel_ids text[] DEFAULT '{}',
  photo_ids text[] DEFAULT '{}',
  field_note_ids text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Create indexes
CREATE INDEX idx_panels_v2_user_site ON panels_v2(user_id, site_id);
CREATE INDEX idx_panels_v2_created ON panels_v2(created_at DESC);
CREATE INDEX idx_circuits_v2_panel ON circuits_v2(panel_id);
CREATE INDEX idx_photos_v2_panel ON photos_v2(panel_id);
CREATE INDEX idx_field_notes_v2_parsed ON field_notes_v2(parsed_panel_id);
CREATE INDEX idx_work_orders_v2_status ON work_orders_v2(status);

-- Enable RLS
ALTER TABLE users_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE panels_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuits_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_notes_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies (example for panels)
CREATE POLICY "Users can view own panels"
  ON panels_v2 FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own panels"
  ON panels_v2 FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- (Add similar policies for other tables)
```

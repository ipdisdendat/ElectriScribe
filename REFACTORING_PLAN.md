# ElectriScribe MVP Refactoring Plan

**Goal:** Strip codebase from scattered 8-product monster to focused MVP
**Timeline:** 2-3 weeks
**Result:** Photo → Panel Schedule with offline capability

---

## 📊 **Current State Analysis**

### **What We Have (Too Much)**
- ✅ 8 different page types (designer, monitoring, knowledge base, diagnostic, etc.)
- ✅ 14+ database tables
- ✅ Complex orchestration systems (task-agents, bayesian-confidence, markov-analyzer)
- ✅ "Consciousness signatures" and metaphorical naming
- ✅ Python backend (GOOD - keep this!)
- ✅ Field notes parser with regex patterns (GOOD - keep patterns!)

### **What MVP Needs (Focus)**
- ✅ Single mobile-first UI: Camera → Panel Photo → Extracted Schedule → Edit → Save
- ✅ 7 database tables (users, sites, panels, circuits, photos, field_notes, work_orders)
- ✅ Offline-first storage (WatermelonDB or IndexedDB via Dexie.js)
- ✅ PaddleOCR integration (not DeepSeek)
- ✅ Simple validation (preserve Python backend electrical_system_analyzer.py)

---

## 🎯 **Refactoring Strategy**

### **Phase 1: ANALYZE & PRESERVE (Day 1)**
Create backup branch, identify what to keep

### **Phase 2: REMOVE SCATTERED FEATURES (Days 2-3)**
Delete 7 of 8 page types, simplify routing

### **Phase 3: SIMPLIFY DATABASE (Days 4-5)**
Reduce schema, add WatermelonDB/Dexie.js setup

### **Phase 4: STRIP ORCHESTRATION (Days 6-7)**
Remove task-agents, markov-analyzer, bayesian-confidence (overkill for MVP)

### **Phase 5: FOCUS UI (Days 8-10)**
Single panel documentation page with camera integration

### **Phase 6: ADD MVP FEATURES (Days 11-14)**
PaddleOCR scaffolding, offline storage, basic validation

### **Phase 7: TEST & POLISH (Days 15-21)**
Testing, bug fixes, documentation updates

---

## 📂 **File-by-File Analysis**

### **✅ KEEP (Core Functionality)**

| File | Size | Reason | Action |
|------|------|--------|--------|
| `src/services/supabase.ts` | - | Database client | ✅ Keep as-is |
| `src/services/field-notes-parser.ts` | ~500 lines | Regex patterns for OCR parsing | ✅ Keep patterns, simplify interface |
| `src/services/field-notes-persistence.ts` | - | Database operations | ✅ Keep, update for new schema |
| `src/services/python-analysis-client.ts` | 423 lines | API client for Python backend | ✅ Keep, preserve existing code |
| `src/services/enhanced-electrical-analysis.ts` | - | NEC validation wrapper | ✅ Keep, simplify naming |
| `src/hooks/useElectricalValidation.ts` | - | Validation hook | ✅ Keep, update for MVP |
| `src/types/database.ts` | - | Type definitions | ✅ Keep, update for 7-table schema |
| `src/components/layout/Layout.tsx` | - | App layout | ✅ Keep, simplify navigation |
| `src/components/field-notes/FieldNotesProcessor.tsx` | - | Core UI component | ✅ Keep as foundation for MVP UI |
| `src/main.tsx` | - | React entry point | ✅ Keep, update routing |
| `src/App.tsx` | - | Main app component | ✅ Keep, simplify routes |
| `src/index.css` | - | Global styles | ✅ Keep |

### **📦 ARCHIVE (Scattered Features - Preserve for Later)**

| File | Reason for Archiving | Can Restore in Phase |
|------|---------------------|----------------------|
| `src/pages/designer/ProfessionalElectricalDesigner.tsx` | Feature #2 - Not MVP | Phase 3 (Month 9+) |
| `src/pages/designer/FlowchartDesigner.tsx` | Feature #3 - Not MVP | Phase 3 (Month 9+) |
| `src/pages/designer/SimpleElectricalBuilder.tsx` | Feature #4 - Not MVP | Phase 3 (Month 9+) |
| `src/pages/monitoring/MonitoringPage.tsx` | Feature #5 - Different product | Phase 4 (Year 2) |
| `src/pages/diagnostic/DiagnosticPage.tsx` | Feature #6 - Different product | Phase 4 (Year 2) |
| `src/pages/knowledge-base/KnowledgeBasePage.tsx` | Feature #7 - Different product | Phase 4 (Year 2) |
| `src/pages/knowledge-base/IssueDetailPage.tsx` | Feature #7 - Different product | Phase 4 (Year 2) |
| `src/pages/service-logs/ServiceLogsPage.tsx` | Feature #8 - Different product | Phase 4 (Year 2) |
| `src/pages/analysis/AnalysisPage.tsx` | Too complex for MVP | Phase 3 (Month 7+) |
| `src/pages/sites/SitesPage.tsx` | Property manager feature | Phase 2 (Month 6) |

**Total pages archived: 10 of 11 → Move to `src/archive/pages/`**

### **📦 ARCHIVE (Overcomplicated Orchestration - Preserve for Later)**

| File | Reason for Archiving | Can Restore in Phase |
|------|---------------------|----------------------|
| `src/services/task-orchestrator.ts` | Overkill for MVP, adds complexity | Phase 3 (if needed) |
| `src/services/enhanced-task-orchestrator.ts` | Same as above | Phase 3 (if needed) |
| `src/services/bayesian-confidence.ts` | Premature optimization | Phase 3 (if needed) |
| `src/services/markov-analyzer.ts` | Not needed for photo → schedule | Phase 3 (if needed) |
| `src/services/knowledge-learner.ts` | ML feature for Phase 2+ | Phase 3 (Month 7+) |
| `src/services/self-correction-engine.ts` | Overcomplicated | Phase 3 (if needed) |
| `src/services/token-optimizer.ts` | Not needed for MVP | Phase 3 (if needed) |
| `src/services/test-harness.ts` | Move to proper testing framework | - |
| `src/services/task-agents/` (all) | Task agents not needed for MVP | Phase 3 (if needed) |
| `src/components/task-overlay/TaskOverlay.tsx` | Related to task orchestration | Phase 3 (if needed) |

**Total services archived: 13 files (~3,000+ lines) → Move to `src/archive/services/`**

### **Archive Structure**
```
src/archive/
├── README.md              -- Explains what's archived and why
├── pages/                 -- Old designer pages (10 files)
│   ├── designer/
│   ├── monitoring/
│   ├── diagnostic/
│   ├── knowledge-base/
│   ├── service-logs/
│   └── analysis/
├── services/              -- Old orchestration services (13 files)
│   ├── task-orchestrator.ts
│   ├── bayesian-confidence.ts
│   ├── markov-analyzer.ts
│   └── task-agents/
└── components/            -- Old task overlay
    └── task-overlay/
```

### **➕ ADD (MVP Requirements)**

| File to Create | Purpose | Priority |
|----------------|---------|----------|
| `src/services/camera.ts` | Camera integration for photo capture | P0 - Week 1 |
| `src/services/ocr-processor.ts` | PaddleOCR integration (scaffolding) | P0 - Week 2 |
| `src/services/offline-database.ts` | Dexie.js/WatermelonDB setup | P0 - Week 1 |
| `src/services/sync-manager.ts` | Offline-first sync pattern | P1 - Week 3 |
| `src/services/photo-storage.ts` | Local photo storage + compression | P1 - Week 2 |
| `src/pages/PanelDocumentationPage.tsx` | **Main MVP UI** - Camera → OCR → Edit → Save | P0 - Week 2 |
| `src/components/camera/CameraCapture.tsx` | Camera UI component | P0 - Week 1 |
| `src/components/panel/PanelScheduleEditor.tsx` | Editable panel schedule grid | P0 - Week 2 |
| `src/components/panel/PanelPhotoViewer.tsx` | Photo viewer with zoom/annotations | P1 - Week 3 |
| `src/hooks/useCamera.ts` | Camera hook for photo capture | P0 - Week 1 |
| `src/hooks/useOfflineStorage.ts` | Offline database hook | P0 - Week 1 |
| `src/hooks/useOCR.ts` | OCR processing hook | P1 - Week 2 |

---

## 🗄️ **Database Schema Refactoring**

### **Current Schema (14+ Tables - TOO COMPLEX)**
```sql
-- Existing tables (from migrations)
user_profiles, sites, panels, circuits, measurements, alerts, alert_history
field_notes, parsed_panels, parsed_circuits, parsed_loads, parsed_issues, mwbc_configurations
tasks, task_executions, bayesian_priors, constraint_violations
issue_categories, issues, root_causes, solutions, solution_types
service_logs, documents, maintenance_schedules, parts_inventory
```

### **MVP Schema (7 Tables - FOCUSED)**
```sql
-- Phase 1: Core tables
CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  role text CHECK (role IN ('apprentice', 'journeyman', 'contractor')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE sites (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  name text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE panels (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  site_id uuid REFERENCES sites(id),
  manufacturer text,
  model text,
  amperage int,
  voltage int,
  photo_url text, -- Original panel photo
  ocr_confidence decimal, -- OCR accuracy score
  sync_status text CHECK (sync_status IN ('pending', 'synced', 'conflict')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  synced_at timestamptz
);

CREATE TABLE circuits (
  id uuid PRIMARY KEY,
  panel_id uuid REFERENCES panels(id) ON DELETE CASCADE,
  position int NOT NULL, -- Breaker slot number
  amperage int,
  voltage int,
  circuit_type text, -- 'single', 'double', 'triple'
  label text, -- "Kitchen Outlets", "Master BR", etc.
  room_location text,
  wire_gauge text, -- "14 AWG", "12 AWG", etc.
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE photos (
  id uuid PRIMARY KEY,
  panel_id uuid REFERENCES panels(id) ON DELETE CASCADE,
  photo_type text CHECK (photo_type IN ('original', 'thumbnail', 'annotated')),
  file_path text NOT NULL, -- Local or cloud storage path
  file_size int, -- Bytes
  mime_type text, -- 'image/jpeg'
  width int,
  height int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE field_notes (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  panel_id uuid REFERENCES panels(id),
  note_text text NOT NULL,
  note_type text CHECK (note_type IN ('observation', 'issue', 'question', 'todo')),
  voice_memo_url text, -- Optional voice recording
  created_at timestamptz DEFAULT now()
);

CREATE TABLE work_orders (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  panel_id uuid REFERENCES panels(id),
  status text CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Indexes for performance
CREATE INDEX idx_panels_user_id ON panels(user_id);
CREATE INDEX idx_panels_site_id ON panels(site_id);
CREATE INDEX idx_panels_sync_status ON panels(sync_status);
CREATE INDEX idx_circuits_panel_id ON circuits(panel_id);
CREATE INDEX idx_photos_panel_id ON photos(panel_id);
CREATE INDEX idx_field_notes_panel_id ON field_notes(panel_id);
CREATE INDEX idx_work_orders_panel_id ON work_orders(panel_id);
```

### **Migration Strategy**
1. **Create new migration**: `20250116_refactor_to_mvp_schema.sql`
2. **Preserve existing data**: Don't drop old tables yet (backup)
3. **Add new tables**: 7 tables for MVP
4. **Test in parallel**: Old app keeps working during refactor
5. **Cut over**: When MVP ready, deprecate old tables

---

## 🎨 **UI/UX Refactoring**

### **Current Routes (8 Routes - TOO MANY)**
```tsx
// src/App.tsx - Current (SCATTERED)
<Routes>
  <Route path="/" element={<KnowledgeBasePage />} />
  <Route path="/knowledge-base/:id" element={<IssueDetailPage />} />
  <Route path="/monitoring" element={<MonitoringPage />} />
  <Route path="/analysis" element={<AnalysisPage />} />
  <Route path="/service-logs" element={<ServiceLogsPage />} />
  <Route path="/diagnostic" element={<DiagnosticPage />} />
  <Route path="/sites" element={<SitesPage />} />
  <Route path="/designer" element={<ProfessionalElectricalDesigner />} />
  <Route path="/electriscribe" element={<ElectriScribeDesigner />} />
</Routes>
```

### **MVP Routes (3 Routes - FOCUSED)**
```tsx
// src/App.tsx - MVP (FOCUSED)
<Routes>
  <Route path="/" element={<PanelListPage />} />
  <Route path="/panel/new" element={<PanelDocumentationPage />} />
  <Route path="/panel/:id" element={<PanelDetailPage />} />
</Routes>
```

### **New Component Structure**
```
src/
├── pages/
│   ├── PanelListPage.tsx         -- List all documented panels
│   ├── PanelDocumentationPage.tsx -- Camera → OCR → Edit → Save (MAIN)
│   └── PanelDetailPage.tsx        -- View/edit existing panel
│
├── components/
│   ├── camera/
│   │   ├── CameraCapture.tsx      -- Camera UI with preview
│   │   └── PhotoPreview.tsx       -- Captured photo review
│   │
│   ├── panel/
│   │   ├── PanelScheduleEditor.tsx -- Editable grid (breaker #, amps, label)
│   │   ├── PanelPhotoViewer.tsx    -- Photo viewer with zoom
│   │   └── CircuitRow.tsx          -- Single circuit row component
│   │
│   └── layout/
│       └── Layout.tsx              -- Simplified navigation (keep)
│
├── services/
│   ├── camera.ts                  -- Camera API wrapper
│   ├── ocr-processor.ts           -- PaddleOCR integration
│   ├── offline-database.ts        -- Dexie.js setup
│   ├── sync-manager.ts            -- Last-Write-Wins sync
│   ├── photo-storage.ts           -- Local storage + compression
│   ├── field-notes-parser.ts      -- Keep (regex patterns)
│   ├── python-analysis-client.ts  -- Keep (Python backend)
│   └── supabase.ts                -- Keep (cloud database)
│
└── hooks/
    ├── useCamera.ts               -- Camera capture hook
    ├── useOfflineStorage.ts       -- Database hook
    ├── useOCR.ts                  -- OCR processing hook
    └── useElectricalValidation.ts -- Keep (Python validation)
```

---

## 🔧 **Implementation Checklist**

### **Week 1: SETUP & REMOVE**
- [ ] Create refactor branch: `refactor/mvp-focus`
- [ ] Document current state (screenshots, functionality)
- [ ] Remove 10 pages (keep only ElectriScribeDesigner as reference)
- [ ] Remove 13 service files (orchestration, task-agents)
- [ ] Simplify routing to 3 routes
- [ ] Update Layout.tsx navigation
- [ ] Set up Dexie.js for offline storage

### **Week 2: DATABASE & CORE SERVICES**
- [ ] Create new migration: `20250116_refactor_to_mvp_schema.sql`
- [ ] Add 7 MVP tables
- [ ] Create `src/services/offline-database.ts` (Dexie.js schema)
- [ ] Create `src/services/camera.ts` (navigator.mediaDevices)
- [ ] Create `src/services/photo-storage.ts` (compression, thumbnails)
- [ ] Update `src/types/database.ts` for new schema
- [ ] Create offline storage hooks

### **Week 3: MVP UI FOUNDATION**
- [ ] Create `PanelListPage.tsx` (view all panels)
- [ ] Create `PanelDocumentationPage.tsx` (main workflow)
- [ ] Create `PanelDetailPage.tsx` (edit existing)
- [ ] Create `CameraCapture.tsx` component
- [ ] Create `PanelScheduleEditor.tsx` component
- [ ] Wire up routing
- [ ] Test basic flow: List → New → Camera → (manual entry for now)

### **Week 4: OCR SCAFFOLDING**
- [ ] Research PaddleOCR integration options:
  - [ ] Option A: ONNX Runtime in browser (complex)
  - [ ] Option B: Cloud API endpoint (simpler MVP)
  - [ ] Option C: Hybrid (local if available, cloud fallback)
- [ ] Create `src/services/ocr-processor.ts` interface
- [ ] Implement chosen OCR approach
- [ ] Test on 5-10 real electrical panel photos
- [ ] Measure accuracy

### **Week 5: SYNC & OFFLINE**
- [ ] Create `src/services/sync-manager.ts` (Last-Write-Wins)
- [ ] Implement push/pull sync with Supabase
- [ ] Add conflict detection
- [ ] Add sync status indicators in UI
- [ ] Test offline → online → sync flow

### **Week 6: POLISH & TEST**
- [ ] Error handling and edge cases
- [ ] Loading states and UI polish
- [ ] Mobile responsiveness (phone, tablet)
- [ ] Performance testing (1000 panels, 2000 photos)
- [ ] Update documentation (README, FEATURES)
- [ ] User testing with 2-3 electricians

---

## 🎯 **Success Criteria**

### **Must Have (MVP)**
✅ User can take photo of electrical panel
✅ Photo is stored locally (works offline)
✅ User can manually enter circuit schedule (OCR can fail)
✅ Schedule is editable (grid with add/remove rows)
✅ Data syncs to cloud when online
✅ User can view list of all documented panels
✅ User can export panel schedule to PDF
✅ App works on phone (mobile-first)
✅ App loads in <2 seconds
✅ 100% offline capability (no internet required)

### **Should Have (Nice to Have)**
- OCR auto-extraction (if PaddleOCR works well)
- Photo thumbnails for list view
- Search/filter panels
- Voice notes for field observations
- Multi-photo per panel

### **Won't Have (Defer to Phase 2+)**
- Professional electrical designer
- Flowchart designer
- Monitoring/alerts
- Knowledge base
- Service logs
- Task orchestration
- Markov analysis
- Bayesian confidence
- Multi-building management

---

## 📊 **Before/After Comparison**

| Metric | Before Refactor | After Refactor | Change |
|--------|----------------|----------------|--------|
| **Pages** | 11 different pages | 3 focused pages | -73% |
| **Service files** | 21 services | 8 core services | -62% |
| **Database tables** | 14+ tables | 7 essential tables | -50% |
| **Lines of code** | ~8,000+ lines | ~3,000 lines (est) | -62% |
| **Complexity** | 8 products in one | 1 focused MVP | -87% |
| **User flows** | 8 different workflows | 1 main workflow | -87% |
| **Cognitive load** | High (what do I use?) | Low (one clear path) | ✅ |
| **Development speed** | Slow (8 features to maintain) | Fast (1 feature to perfect) | ✅ |
| **Offline support** | Partial (requires internet for OCR) | 100% (offline-first design) | ✅ |

---

## ⚠️ **Risks & Mitigation**

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Breaking existing functionality** | High | Create new branch, don't delete old code immediately |
| **Data migration issues** | Medium | Keep old tables during transition, test migration on copy |
| **OCR accuracy <95%** | High | Build manual entry UI first, OCR is enhancement not requirement |
| **Offline sync conflicts** | Medium | Implement Last-Write-Wins (validated as <1% conflict rate) |
| **User confusion** | Low | Simpler = easier to understand |
| **Lost features users might want** | Low | Features moved to "later" not deleted, can add back if needed |

---

## 🚀 **Post-Refactor Next Steps**

### **Immediate (Week 7-8)**
1. Field test with 5 electricians
2. Measure: Time to document panel (target: <5 minutes)
3. Measure: OCR accuracy (target: ≥95%)
4. Gather feedback, iterate

### **Phase 2 (Months 4-6)**
5. Add QuickBooks integration (CRITICAL - validated as table stakes)
6. Add desktop app (Tauri for contractor batch processing)
7. Add cloud sync (Supabase Realtime for multi-device)

### **Phase 3 (Months 7-12)**
8. Add advanced validation (EPINN + Python backend)
9. Add BC code compliance checks
10. Re-add one additional feature based on user feedback (not all 8!)

---

## 📝 **Documentation Updates Required**

After refactoring, update:
- [ ] `README.md` - New simplified feature list
- [ ] `ELECTRISCRIBE_FEATURES.md` - MVP feature focus
- [ ] `ELECTRISCRIBE_QUICKSTART.md` - New 3-step workflow
- [ ] `DEMO_GUIDE.md` - Updated demo flow
- [ ] `IMPLEMENTATION_QUICKSTART.md` - Update with new file structure
- [ ] `package.json` - Remove unused dependencies

---

## ✅ **Definition of Done**

Refactoring is complete when:
1. ✅ Codebase has 3 pages (not 11)
2. ✅ Codebase has 8 services (not 21)
3. ✅ Database has 7 tables (not 14+)
4. ✅ User can: Take photo → Enter schedule → Save → View list
5. ✅ App works 100% offline
6. ✅ Data syncs when online
7. ✅ All tests pass
8. ✅ 2-3 electricians validate it's faster than paper
9. ✅ Documentation updated
10. ✅ Ready for Phase 2 (QuickBooks integration)

---

**Timeline: 6 weeks (3 weeks refactor + 2 weeks OCR integration + 1 week testing)**
**Budget: $38,400 (480 hours × $80/hr) - within validated $48,600 MVP budget**
**Next Step: Create `refactor/mvp-focus` branch and begin Week 1 tasks**

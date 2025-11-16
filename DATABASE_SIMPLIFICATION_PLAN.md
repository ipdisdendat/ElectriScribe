# Database Schema Simplification Plan

**Date:** 2025-11-16
**Phase:** Phase 2 - Database Schema Simplification
**Current Tables:** 38 tables
**Target Tables:** 7 tables for MVP

## Current Database Analysis

### Tables by Migration:

#### `initial_schema.sql` (17 tables)
1. user_profiles ✅ **KEEP** - Authentication
2. issue_categories ⏸️ DORMANT - Phase 2 (Knowledge Base)
3. solution_types ⏸️ DORMANT - Phase 2
4. issues ⏸️ DORMANT - Phase 2
5. root_causes ⏸️ DORMANT - Phase 2
6. solutions ⏸️ DORMANT - Phase 2
7. sites ⏸️ DORMANT - Phase 2 (Optional: site management)
8. panels ⏸️ DORMANT - Phase 2 (Using parsed_panels instead)
9. circuits ⏸️ DORMANT - Phase 2 (Using parsed_circuits instead)
10. measurements ⏸️ DORMANT - Phase 3 (Monitoring)
11. alerts ⏸️ DORMANT - Phase 3 (Monitoring)
12. alert_history ⏸️ DORMANT - Phase 3
13. service_logs ⏸️ DORMANT - Phase 3 (Service management)
14. documents ⏸️ DORMANT - Phase 3
15. maintenance_schedules ⏸️ DORMANT - Phase 3
16. equipment_catalog ⏸️ DORMANT - Phase 3
17. electrical_codes ⏸️ DORMANT - Phase 3

#### `field_notes_and_entities_schema.sql` (6 tables)
18. field_notes ✅ **KEEP** - Core MVP feature
19. parsed_panels ✅ **KEEP** - Panel data from OCR
20. parsed_circuits ✅ **KEEP** - Circuit data from OCR
21. parsed_loads ✅ **KEEP** - Load data from OCR
22. parsed_issues ✅ **KEEP** - Issues detected
23. mwbc_configurations ✅ **KEEP** - MWBC detection (safety critical)

#### `create_task_management_system.sql` (9 tables)
24. tasks ❌ ARCHIVE - Task orchestration removed in Phase 1
25. task_executions ❌ ARCHIVE
26. task_tests ❌ ARCHIVE
27. task_test_results ❌ ARCHIVE
28. markov_state_transitions ❌ ARCHIVE
29. bayesian_priors ❌ ARCHIVE
30. task_corrections ❌ ARCHIVE
31. task_metrics ❌ ARCHIVE
32. electrical_validation_rules ⏸️ DORMANT - Phase 5 (EPINN validation)

#### `add_knowledge_persistence_and_optimization.sql` (6 tables)
33. learned_constraints ❌ ARCHIVE - Task orchestration removed
34. failure_patterns ❌ ARCHIVE
35. token_efficiency_metrics ❌ ARCHIVE
36. pre_execution_checks ❌ ARCHIVE
37. session_learnings ❌ ARCHIVE
38. optimization_rules ❌ ARCHIVE

## MVP Schema (7 Tables)

### Active Tables Used by Current Services:

1. **user_profiles** - User authentication and profiles
   - **Used by:** Supabase Auth + RLS policies
   - **Size:** ~100 bytes per user
   - **MVP Critical:** Yes (authentication required)

2. **field_notes** - Raw field notes and parse metadata
   - **Used by:** field-notes-persistence.ts
   - **Size:** ~5-50 KB per panel documentation
   - **MVP Critical:** Yes (core data storage)

3. **parsed_panels** - Parsed panel information
   - **Used by:** field-notes-persistence.ts
   - **Size:** ~500 bytes per panel
   - **MVP Critical:** Yes

4. **parsed_circuits** - Parsed circuit/breaker data
   - **Used by:** field-notes-persistence.ts
   - **Size:** ~300 bytes per circuit
   - **MVP Critical:** Yes

5. **parsed_loads** - Parsed load information
   - **Used by:** field-notes-persistence.ts
   - **Size:** ~400 bytes per load
   - **MVP Critical:** Yes

6. **parsed_issues** - Detected electrical issues
   - **Used by:** field-notes-persistence.ts
   - **Size:** ~200 bytes per issue
   - **MVP Critical:** Yes

7. **mwbc_configurations** - Multi-Wire Branch Circuit detection
   - **Used by:** field-notes-persistence.ts
   - **Size:** ~150 bytes per MWBC
   - **MVP Critical:** Yes (safety feature)

### Total Active Data Model:
- **7 tables** (down from 38)
- **~81% reduction** in database complexity
- **100% MVP functionality** preserved

## Dormant Tables (31 tables)

These tables remain in the database but are not actively used in MVP:

### Phase 2 Restoration Candidates:
- issue_categories, solution_types, issues, root_causes, solutions (Knowledge Base)
- sites (Site management)
- panels, circuits (Old schema for validated installations)

### Phase 3 Restoration Candidates:
- measurements, alerts, alert_history (Real-time monitoring)
- service_logs, documents, maintenance_schedules (Service management)
- equipment_catalog, electrical_codes (Reference data)

### Phase 4+ (May be redesigned):
- electrical_validation_rules (For EPINN integration)

### Archived (Task Orchestration - Removed in Phase 1):
- tasks, task_executions, task_tests, task_test_results
- markov_state_transitions, bayesian_priors, task_corrections, task_metrics
- learned_constraints, failure_patterns, token_efficiency_metrics
- pre_execution_checks, session_learnings, optimization_rules

## Database Size Estimates

### MVP Usage (per electrician, ~10 panel documentations/month):
```
user_profiles:           100 bytes
field_notes:          500 KB  (10 × 50 KB)
parsed_panels:         50 KB  (10 × 5 KB average)
parsed_circuits:      150 KB  (10 panels × 30 circuits × 500 bytes)
parsed_loads:          60 KB  (10 panels × 15 loads × 400 bytes)
parsed_issues:         10 KB  (10 panels × 5 issues × 200 bytes)
mwbc_configurations:    5 KB  (10 panels × 3 MWBCs × 150 bytes)
-------------------------------------------
Total per user/month: ~775 KB
Total per user/year:   ~9 MB
```

### At Scale (1,000 users):
```
Year 1: ~9 GB
Year 3: ~27 GB (well within Supabase free tier 500MB, paid tier 8GB+)
```

## Migration Strategy

### Option A: Leave Dormant Tables (RECOMMENDED)
**Pros:**
- No data loss
- Easy Phase 2+ restoration
- Existing migrations unchanged
- No risk to production data

**Cons:**
- Unused tables in schema
- Slightly cluttered pgAdmin view

**Action:**
1. Create migration adding comments to dormant tables
2. Document in README which tables are active
3. No code changes needed

### Option B: Drop Unused Tables
**Pros:**
- Clean schema
- Smaller backups

**Cons:**
- Data loss (if any exists)
- Complex restoration
- Migration reversibility issues
- Higher risk

**Action:**
1. Create migration to DROP dormant tables
2. Update all documentation
3. Risk mitigation needed

### Option C: Create Separate Schema
**Pros:**
- Clean separation
- Easy to toggle features

**Cons:**
- Complex RLS policies
- Migration complexity
- More maintenance

**Action:**
1. CREATE SCHEMA mvp;
2. Move active tables
3. Update all queries

## Recommendation: Option A

**Rationale:**
- MVP philosophy: "preserve, don't delete" (same as code archiving)
- Supabase doesn't charge by table count
- Easy restoration for Phase 2+
- Zero risk to existing data
- Aligns with Phase 1 archive approach

## Implementation Plan

### Step 1: Add Database Documentation (This PR)
```sql
-- Add comments to MVP tables
COMMENT ON TABLE user_profiles IS
  'MVP ACTIVE - User authentication and profiles';

COMMENT ON TABLE field_notes IS
  'MVP ACTIVE - Raw field notes from OCR/manual entry';

-- Add comments to dormant tables
COMMENT ON TABLE sites IS
  'DORMANT (Phase 2) - Site management. Optional for MVP, site_id in field_notes nullable.';

COMMENT ON TABLE tasks IS
  'ARCHIVED (Phase 1) - Task orchestration removed. Related code in src/archive/services/';
```

### Step 2: Create Database Views for MVP (This PR)
```sql
-- Convenient view for querying complete panel documentation
CREATE OR REPLACE VIEW mvp_panel_documentation AS
SELECT
  fn.id as field_notes_id,
  fn.raw_notes,
  fn.confidence_score,
  fn.created_at,
  pp.manufacturer as panel_manufacturer,
  pp.model as panel_model,
  pp.rating as panel_rating,
  COUNT(DISTINCT pc.id) as circuit_count,
  COUNT(DISTINCT pl.id) as load_count,
  COUNT(DISTINCT pi.id) as issue_count,
  COUNT(DISTINCT mc.id) as mwbc_count
FROM field_notes fn
LEFT JOIN parsed_panels pp ON pp.field_notes_id = fn.id
LEFT JOIN parsed_circuits pc ON pc.field_notes_id = fn.id
LEFT JOIN parsed_loads pl ON pl.field_notes_id = fn.id
LEFT JOIN parsed_issues pi ON pi.field_notes_id = fn.id
LEFT JOIN mwbc_configurations mc ON mc.field_notes_id = fn.id
GROUP BY fn.id, fn.raw_notes, fn.confidence_score, fn.created_at,
         pp.manufacturer, pp.model, pp.rating;
```

### Step 3: Update Service Documentation
- Update field-notes-persistence.ts comments
- Add schema diagram to docs
- Document Phase 2+ restoration process

## Testing Plan

1. **Verify MVP Functionality:**
   - Test field notes save/load
   - Test parsed entity creation
   - Test entity position updates
   - Verify RLS policies work

2. **Verify Dormant Tables:**
   - Confirm tables still exist
   - Confirm no breaking changes
   - Document restoration steps

3. **Performance Testing:**
   - Query performance (should be unchanged or better)
   - Insert performance
   - RLS policy evaluation time

## Success Criteria

✅ All 7 MVP tables functional
✅ Zero breaking changes to active services
✅ Database documentation complete
✅ Clear restoration path for Phase 2+
✅ Git history preserves all decisions

## Next Steps

1. Create migration `20251116_add_mvp_database_documentation.sql`
2. Add table comments and views
3. Update DATABASE_SCHEMA.md documentation
4. Test all CRUD operations
5. Commit to feature branch

---

**Last Updated:** 2025-11-16
**Status:** Planning Complete, Ready for Implementation

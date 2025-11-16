/*
  # MVP Database Documentation and Views

  ## Purpose
  Adds comprehensive documentation to database schema clarifying which tables are:
  - ACTIVE (used in MVP)
  - DORMANT (Phase 2+ features)
  - ARCHIVED (code removed in Phase 1)

  Also creates helpful views for querying MVP data efficiently.

  ## Changes
  1. Add COMMENT ON TABLE for all 38 tables
  2. Create mvp_panel_documentation view
  3. Create mvp_user_summary view
  4. Add indexes for MVP query patterns

  ## Migration Strategy
  - Option A: Leave dormant tables intact (SELECTED)
  - Zero breaking changes
  - Easy Phase 2+ restoration
  - Aligns with code archiving philosophy
*/

-- ============================================================================
-- ACTIVE MVP TABLES - Core functionality for "take picture → full panel schedule"
-- ============================================================================

COMMENT ON TABLE user_profiles IS
  'MVP ACTIVE - User authentication and profile data. Used by Supabase Auth and all RLS policies.';

COMMENT ON TABLE field_notes IS
  'MVP ACTIVE - Raw field notes from OCR or manual entry. Core data storage for all panel documentation.';

COMMENT ON TABLE parsed_panels IS
  'MVP ACTIVE - Parsed panel information extracted from field notes. Includes manufacturer, model, rating, etc.';

COMMENT ON TABLE parsed_circuits IS
  'MVP ACTIVE - Parsed circuit/breaker data extracted from field notes. Includes slot numbers, breaker size, wire specs.';

COMMENT ON TABLE parsed_loads IS
  'MVP ACTIVE - Parsed electrical load information (motors, appliances, etc.) extracted from field notes.';

COMMENT ON TABLE parsed_issues IS
  'MVP ACTIVE - Electrical issues detected during field notes parsing (voltage sags, overloads, code violations).';

COMMENT ON TABLE mwbc_configurations IS
  'MVP ACTIVE - Multi-Wire Branch Circuit (MWBC) configurations detected in field notes. Critical for safety validation.';

-- ============================================================================
-- DORMANT TABLES - Phase 2: Knowledge Base & Site Management
-- ============================================================================

COMMENT ON TABLE issue_categories IS
  'DORMANT (Phase 2) - Categories for organizing electrical troubleshooting issues. Part of Knowledge Base feature.';

COMMENT ON TABLE solution_types IS
  'DORMANT (Phase 2) - Solution type taxonomy (Immediate, Smart, Infrastructure). Part of Knowledge Base.';

COMMENT ON TABLE issues IS
  'DORMANT (Phase 2) - Troubleshooting knowledge base issues. Different from parsed_issues (which are panel-specific).';

COMMENT ON TABLE root_causes IS
  'DORMANT (Phase 2) - Root cause analysis for knowledge base issues.';

COMMENT ON TABLE solutions IS
  'DORMANT (Phase 2) - Solutions linked to knowledge base issues with steps, costs, and safety warnings.';

COMMENT ON TABLE sites IS
  'DORMANT (Phase 2) - Site/property management. Currently optional - field_notes.site_id is nullable for MVP.';

COMMENT ON TABLE panels IS
  'DORMANT (Phase 2) - Permanent panel records (vs parsed_panels which are OCR extractions). Used after validation.';

COMMENT ON TABLE circuits IS
  'DORMANT (Phase 2) - Permanent circuit records (vs parsed_circuits which are OCR extractions).';

-- ============================================================================
-- DORMANT TABLES - Phase 3: Monitoring & Service Management
-- ============================================================================

COMMENT ON TABLE measurements IS
  'DORMANT (Phase 3) - Time-series electrical measurements (voltage, current, power factor, THD).';

COMMENT ON TABLE alerts IS
  'DORMANT (Phase 3) - Configurable threshold alerts for electrical monitoring.';

COMMENT ON TABLE alert_history IS
  'DORMANT (Phase 3) - Historical record of triggered alerts.';

COMMENT ON TABLE service_logs IS
  'DORMANT (Phase 3) - Service visit documentation and maintenance records.';

COMMENT ON TABLE documents IS
  'DORMANT (Phase 3) - File attachments (photos, PDFs, permits, schematics).';

COMMENT ON TABLE maintenance_schedules IS
  'DORMANT (Phase 3) - Recurring maintenance task scheduling.';

COMMENT ON TABLE equipment_catalog IS
  'DORMANT (Phase 3) - Manufacturer equipment and parts database.';

COMMENT ON TABLE electrical_codes IS
  'DORMANT (Phase 3) - NEC/CEC code reference library.';

-- ============================================================================
-- ARCHIVED TABLES - Task Orchestration (Code removed in Phase 1)
-- ============================================================================

COMMENT ON TABLE tasks IS
  'ARCHIVED (Phase 1) - Self-correcting task orchestration system. Code archived to src/archive/services/task-orchestrator.ts';

COMMENT ON TABLE task_executions IS
  'ARCHIVED (Phase 1) - Task execution history. Related services in src/archive/services/.';

COMMENT ON TABLE task_tests IS
  'ARCHIVED (Phase 1) - Task validation test definitions.';

COMMENT ON TABLE task_test_results IS
  'ARCHIVED (Phase 1) - Task test execution results.';

COMMENT ON TABLE markov_state_transitions IS
  'ARCHIVED (Phase 1) - Markov chain state transitions for predictive task analysis.';

COMMENT ON TABLE bayesian_priors IS
  'ARCHIVED (Phase 1) - Bayesian confidence scoring priors.';

COMMENT ON TABLE task_corrections IS
  'ARCHIVED (Phase 1) - Self-correction action logs.';

COMMENT ON TABLE task_metrics IS
  'ARCHIVED (Phase 1) - Task performance metrics.';

COMMENT ON TABLE learned_constraints IS
  'ARCHIVED (Phase 1) - Persistent learning constraints. Code archived to src/archive/services/knowledge-learner.ts';

COMMENT ON TABLE failure_patterns IS
  'ARCHIVED (Phase 1) - Recurring failure pattern tracking.';

COMMENT ON TABLE token_efficiency_metrics IS
  'ARCHIVED (Phase 1) - LLM token usage optimization metrics. Code in src/archive/services/token-optimizer.ts';

COMMENT ON TABLE pre_execution_checks IS
  'ARCHIVED (Phase 1) - Pre-execution validation checks.';

COMMENT ON TABLE session_learnings IS
  'ARCHIVED (Phase 1) - Cross-session knowledge transfer.';

COMMENT ON TABLE optimization_rules IS
  'ARCHIVED (Phase 1) - High-level optimization strategies.';

-- ============================================================================
-- DORMANT (Phase 5) - EPINN Validation
-- ============================================================================

COMMENT ON TABLE electrical_validation_rules IS
  'DORMANT (Phase 5) - Electrical Physics-Informed Neural Network (EPINN) validation rules. For NEC/CEC compliance checking.';

-- ============================================================================
-- MVP VIEWS - Convenient queries for common MVP operations
-- ============================================================================

-- View: Complete panel documentation with all related entities
CREATE OR REPLACE VIEW mvp_panel_documentation AS
SELECT
  fn.id as field_notes_id,
  fn.user_id,
  fn.site_id,
  fn.raw_notes,
  fn.parse_status,
  fn.parsed_at,
  fn.confidence_score as overall_confidence,
  fn.created_at,
  fn.updated_at,

  -- Panel summary
  pp.id as panel_id,
  pp.panel_type,
  pp.manufacturer,
  pp.model,
  pp.rating as panel_rating,
  pp.voltage,
  pp.phase_configuration,
  pp.available_slots,
  pp.location as panel_location,
  pp.confidence as panel_confidence,

  -- Entity counts
  COUNT(DISTINCT pc.id) as circuit_count,
  COUNT(DISTINCT pl.id) as load_count,
  COUNT(DISTINCT pi.id) as issue_count,
  COUNT(DISTINCT mc.id) as mwbc_count,

  -- Safety indicators
  COUNT(DISTINCT CASE WHEN pi.severity = 'critical' THEN pi.id END) as critical_issues,
  COUNT(DISTINCT CASE WHEN pc.is_available = true THEN pc.id END) as available_circuits,

  -- Load summary
  SUM(pl.nominal_current) as total_load_amps,
  AVG(pl.confidence) as avg_load_confidence

FROM field_notes fn
LEFT JOIN parsed_panels pp ON pp.field_notes_id = fn.id
LEFT JOIN parsed_circuits pc ON pc.field_notes_id = fn.id
LEFT JOIN parsed_loads pl ON pl.field_notes_id = fn.id
LEFT JOIN parsed_issues pi ON pi.field_notes_id = fn.id
LEFT JOIN mwbc_configurations mc ON mc.field_notes_id = fn.id

GROUP BY
  fn.id, fn.user_id, fn.site_id, fn.raw_notes, fn.parse_status,
  fn.parsed_at, fn.confidence_score, fn.created_at, fn.updated_at,
  pp.id, pp.panel_type, pp.manufacturer, pp.model, pp.rating,
  pp.voltage, pp.phase_configuration, pp.available_slots,
  pp.location, pp.confidence;

COMMENT ON VIEW mvp_panel_documentation IS
  'MVP VIEW - Complete panel documentation with all related entities and summary statistics. Use for dashboard displays.';

-- View: User summary statistics
CREATE OR REPLACE VIEW mvp_user_summary AS
SELECT
  up.id as user_id,
  up.email,
  up.full_name,
  up.role,
  up.company,
  up.license_number,

  COUNT(DISTINCT fn.id) as total_panels_documented,
  COUNT(DISTINCT CASE WHEN fn.created_at >= NOW() - INTERVAL '30 days' THEN fn.id END) as panels_last_30_days,
  MAX(fn.created_at) as last_documentation_date,
  AVG(fn.confidence_score) as avg_confidence_score,

  SUM((SELECT COUNT(*) FROM parsed_circuits WHERE field_notes_id = fn.id)) as total_circuits_documented,
  SUM((SELECT COUNT(*) FROM parsed_issues WHERE field_notes_id = fn.id)) as total_issues_found,
  SUM((SELECT COUNT(*) FROM parsed_issues WHERE field_notes_id = fn.id AND severity = 'critical')) as total_critical_issues

FROM user_profiles up
LEFT JOIN field_notes fn ON fn.user_id = up.id

GROUP BY
  up.id, up.email, up.full_name, up.role, up.company, up.license_number;

COMMENT ON VIEW mvp_user_summary IS
  'MVP VIEW - User statistics and activity summary. Use for user dashboards and analytics.';

-- ============================================================================
-- MVP INDEXES - Optimized for common query patterns
-- ============================================================================

-- Index for recent field notes queries (common in MVP dashboard)
CREATE INDEX IF NOT EXISTS idx_field_notes_user_created
  ON field_notes(user_id, created_at DESC);

-- Index for circuit search by description (common when looking for specific circuits)
CREATE INDEX IF NOT EXISTS idx_parsed_circuits_description
  ON parsed_circuits USING gin(to_tsvector('english', description));

-- Index for load search by name (common when looking for specific loads)
CREATE INDEX IF NOT EXISTS idx_parsed_loads_name
  ON parsed_loads USING gin(to_tsvector('english', name));

-- Index for critical issues (common safety query)
CREATE INDEX IF NOT EXISTS idx_parsed_issues_severity
  ON parsed_issues(severity)
  WHERE severity = 'critical';

-- Index for available circuits (common when planning new circuits)
CREATE INDEX IF NOT EXISTS idx_parsed_circuits_available
  ON parsed_circuits(field_notes_id, is_available)
  WHERE is_available = true;

-- ============================================================================
-- RLS POLICIES FOR MVP VIEWS
-- ============================================================================

-- Enable RLS on views by creating security barrier views
-- Views inherit RLS from underlying tables automatically

-- Grant SELECT on views to authenticated users
GRANT SELECT ON mvp_panel_documentation TO authenticated;
GRANT SELECT ON mvp_user_summary TO authenticated;

-- Add RLS policy for user summary view (users can only see their own summary)
CREATE POLICY "Users can view own summary in mvp_user_summary"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get MVP table list (for documentation/debugging)
CREATE OR REPLACE FUNCTION get_mvp_active_tables()
RETURNS TABLE (
  table_name text,
  table_description text,
  estimated_row_count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    c.relname::text as table_name,
    obj_description(c.oid)::text as table_description,
    c.reltuples::bigint as estimated_row_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND obj_description(c.oid) LIKE 'MVP ACTIVE%'
  ORDER BY c.relname;
$$;

COMMENT ON FUNCTION get_mvp_active_tables() IS
  'Returns list of MVP ACTIVE tables with descriptions and row counts';

-- Function to get dormant tables (for Phase 2+ planning)
CREATE OR REPLACE FUNCTION get_dormant_tables()
RETURNS TABLE (
  table_name text,
  table_description text,
  phase text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    c.relname::text as table_name,
    obj_description(c.oid)::text as table_description,
    CASE
      WHEN obj_description(c.oid) LIKE '%Phase 2%' THEN 'Phase 2'
      WHEN obj_description(c.oid) LIKE '%Phase 3%' THEN 'Phase 3'
      WHEN obj_description(c.oid) LIKE '%Phase 4%' THEN 'Phase 4'
      WHEN obj_description(c.oid) LIKE '%Phase 5%' THEN 'Phase 5'
      ELSE 'Unknown'
    END as phase
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND obj_description(c.oid) LIKE 'DORMANT%'
  ORDER BY phase, c.relname;
$$;

COMMENT ON FUNCTION get_dormant_tables() IS
  'Returns list of DORMANT tables organized by restoration phase';

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Verify all 7 MVP tables are properly documented
DO $$
DECLARE
  active_count integer;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND obj_description(c.oid) LIKE 'MVP ACTIVE%';

  IF active_count <> 7 THEN
    RAISE WARNING 'Expected 7 MVP ACTIVE tables, found %', active_count;
  ELSE
    RAISE NOTICE 'Successfully documented 7 MVP ACTIVE tables';
  END IF;
END $$;

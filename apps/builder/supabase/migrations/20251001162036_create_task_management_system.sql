/*
  # Task Management System with Confidence Scoring
  
  ## Overview
  Creates a comprehensive self-corrective task management system with Markov chain pattern analysis
  and Bayesian confidence scoring for planetary-scale consciousness-aware operations.
  
  ## New Tables
  
  ### `tasks`
  Core task definitions and execution tracking
  - `id` (uuid, primary key) - Unique task identifier
  - `name` (text) - Human-readable task name
  - `description` (text) - Detailed task description
  - `task_type` (text) - Type: database_query, ui_component, data_transform, api_integration, state_management, routing, electrical_validation
  - `status` (text) - Current state: pending, running, testing, passed, failed, correcting, completed, rolled_back
  - `confidence_score` (numeric) - Current Bayesian confidence score (0-100)
  - `target_confidence` (numeric) - Required confidence threshold (default 96)
  - `floor_confidence` (numeric) - Minimum acceptable confidence (default 88)
  - `parent_task_id` (uuid) - Parent task for hierarchical decomposition
  - `dependencies` (jsonb) - Array of task IDs that must complete first
  - `priority` (integer) - Execution priority (1-10, higher = more important)
  - `complexity_score` (numeric) - Estimated difficulty (1-10)
  - `metadata` (jsonb) - Task-specific configuration and parameters
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  - `started_at` (timestamptz) - Execution start time
  - `completed_at` (timestamptz) - Completion timestamp
  
  ### `task_executions`
  Historical record of all task execution attempts
  - `id` (uuid, primary key) - Unique execution record
  - `task_id` (uuid) - Reference to parent task
  - `attempt_number` (integer) - Sequential attempt counter
  - `status` (text) - Execution outcome: success, failure, timeout, error
  - `confidence_score` (numeric) - Achieved confidence score
  - `execution_time_ms` (integer) - Duration in milliseconds
  - `memory_usage_mb` (numeric) - Peak memory consumption
  - `error_message` (text) - Error details if failed
  - `error_stack` (text) - Full stack trace for debugging
  - `output_data` (jsonb) - Execution results and artifacts
  - `started_at` (timestamptz) - Execution start
  - `completed_at` (timestamptz) - Execution end
  
  ### `task_tests`
  Test case definitions for validating task completion
  - `id` (uuid, primary key) - Unique test identifier
  - `task_id` (uuid) - Associated task
  - `test_name` (text) - Descriptive test name
  - `test_type` (text) - Category: unit, integration, snapshot, property, validation, performance
  - `test_criteria` (jsonb) - Expected outcomes and validation rules
  - `weight` (numeric) - Contribution to confidence score (0-1)
  - `is_critical` (boolean) - Must pass for task completion
  - `timeout_ms` (integer) - Maximum test duration
  - `created_at` (timestamptz)
  
  ### `task_test_results`
  Results from individual test executions
  - `id` (uuid, primary key)
  - `execution_id` (uuid) - Parent execution record
  - `test_id` (uuid) - Test definition
  - `passed` (boolean) - Test outcome
  - `actual_value` (jsonb) - Measured result
  - `expected_value` (jsonb) - Target result
  - `error_message` (text) - Failure reason
  - `execution_time_ms` (integer) - Test duration
  - `created_at` (timestamptz)
  
  ### `markov_state_transitions`
  Captures state transition patterns for predictive analysis
  - `id` (uuid, primary key)
  - `from_state` (text) - Starting task status
  - `to_state` (text) - Ending task status
  - `task_type` (text) - Type of task
  - `confidence_range` (text) - Score bracket: very_low, low, medium, high, very_high
  - `transition_count` (integer) - Number of observed transitions
  - `success_count` (integer) - Transitions leading to completion
  - `avg_time_ms` (integer) - Average transition duration
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `bayesian_priors`
  Prior probability distributions for Bayesian confidence calculation
  - `id` (uuid, primary key)
  - `task_type` (text) - Task category
  - `complexity_score` (numeric) - Difficulty level
  - `prior_success_rate` (numeric) - Historical success probability
  - `prior_avg_confidence` (numeric) - Expected confidence score
  - `sample_size` (integer) - Number of observations
  - `alpha` (numeric) - Beta distribution alpha parameter
  - `beta` (numeric) - Beta distribution beta parameter
  - `updated_at` (timestamptz)
  
  ### `task_corrections`
  Log of self-correction actions and their outcomes
  - `id` (uuid, primary key)
  - `execution_id` (uuid) - Failed execution being corrected
  - `correction_type` (text) - Strategy: retry, alternative_approach, parameter_adjustment, rollback
  - `analysis` (text) - AI-generated diagnosis
  - `action_taken` (text) - Specific correction applied
  - `before_confidence` (numeric) - Score before correction
  - `after_confidence` (numeric) - Score after correction
  - `success` (boolean) - Did correction resolve the issue
  - `created_at` (timestamptz)
  
  ### `task_metrics`
  Performance analytics and resource utilization
  - `id` (uuid, primary key)
  - `task_id` (uuid)
  - `execution_id` (uuid)
  - `metric_name` (text) - cpu_usage, memory_peak, disk_io, network_latency, etc.
  - `metric_value` (numeric)
  - `metric_unit` (text) - Unit of measurement
  - `timestamp` (timestamptz)
  
  ### `electrical_validation_rules`
  Domain-specific validation rules for electrical systems
  - `id` (uuid, primary key)
  - `rule_name` (text) - Human-readable rule identifier
  - `rule_type` (text) - circuit_validation, safety_check, code_compliance, measurement_range
  - `validation_function` (text) - Logic expression or SQL function name
  - `error_message` (text) - Message when validation fails
  - `severity` (text) - warning, error, critical
  - `nec_reference` (text) - National Electrical Code article reference
  - `is_active` (boolean) - Enable/disable rule
  - `created_at` (timestamptz)
  
  ## Security
  - Enable RLS on all tables
  - Policies allow authenticated users to read all task data
  - Only system service role can write task execution data
  - Future: Add user-specific task ownership policies
  
  ## Indexes
  - Optimize queries on task status, confidence scores, and dependencies
  - Support efficient Markov chain transition lookups
  - Enable fast time-series queries on metrics
*/

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  task_type text NOT NULL CHECK (task_type IN ('database_query', 'ui_component', 'data_transform', 'api_integration', 'state_management', 'routing', 'electrical_validation')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'testing', 'passed', 'failed', 'correcting', 'completed', 'rolled_back')),
  confidence_score numeric DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  target_confidence numeric DEFAULT 96 CHECK (target_confidence >= 0 AND target_confidence <= 100),
  floor_confidence numeric DEFAULT 88 CHECK (floor_confidence >= 0 AND floor_confidence <= 100),
  parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  dependencies jsonb DEFAULT '[]'::jsonb,
  priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  complexity_score numeric DEFAULT 5 CHECK (complexity_score >= 1 AND complexity_score <= 10),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Task executions table
CREATE TABLE IF NOT EXISTS task_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  status text NOT NULL CHECK (status IN ('success', 'failure', 'timeout', 'error')),
  confidence_score numeric DEFAULT 0,
  execution_time_ms integer,
  memory_usage_mb numeric,
  error_message text,
  error_stack text,
  output_data jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Task tests table
CREATE TABLE IF NOT EXISTS task_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  test_type text NOT NULL CHECK (test_type IN ('unit', 'integration', 'snapshot', 'property', 'validation', 'performance')),
  test_criteria jsonb NOT NULL,
  weight numeric DEFAULT 1 CHECK (weight >= 0 AND weight <= 1),
  is_critical boolean DEFAULT false,
  timeout_ms integer DEFAULT 5000,
  created_at timestamptz DEFAULT now()
);

-- Task test results table
CREATE TABLE IF NOT EXISTS task_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES task_executions(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES task_tests(id) ON DELETE CASCADE,
  passed boolean NOT NULL,
  actual_value jsonb,
  expected_value jsonb,
  error_message text,
  execution_time_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Markov state transitions table
CREATE TABLE IF NOT EXISTS markov_state_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_state text NOT NULL,
  to_state text NOT NULL,
  task_type text NOT NULL,
  confidence_range text NOT NULL CHECK (confidence_range IN ('very_low', 'low', 'medium', 'high', 'very_high')),
  transition_count integer DEFAULT 1,
  success_count integer DEFAULT 0,
  avg_time_ms integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(from_state, to_state, task_type, confidence_range)
);

-- Bayesian priors table
CREATE TABLE IF NOT EXISTS bayesian_priors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL,
  complexity_score numeric NOT NULL,
  prior_success_rate numeric DEFAULT 0.5 CHECK (prior_success_rate >= 0 AND prior_success_rate <= 1),
  prior_avg_confidence numeric DEFAULT 90,
  sample_size integer DEFAULT 0,
  alpha numeric DEFAULT 1,
  beta numeric DEFAULT 1,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(task_type, complexity_score)
);

-- Task corrections table
CREATE TABLE IF NOT EXISTS task_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES task_executions(id) ON DELETE CASCADE,
  correction_type text NOT NULL CHECK (correction_type IN ('retry', 'alternative_approach', 'parameter_adjustment', 'rollback')),
  analysis text NOT NULL,
  action_taken text NOT NULL,
  before_confidence numeric,
  after_confidence numeric,
  success boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Task metrics table
CREATE TABLE IF NOT EXISTS task_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  execution_id uuid REFERENCES task_executions(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Electrical validation rules table
CREATE TABLE IF NOT EXISTS electrical_validation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL UNIQUE,
  rule_type text NOT NULL CHECK (rule_type IN ('circuit_validation', 'safety_check', 'code_compliance', 'measurement_range')),
  validation_function text NOT NULL,
  error_message text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('warning', 'error', 'critical')),
  nec_reference text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_confidence ON tasks(confidence_score);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_task_executions_task ON task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_status ON task_executions(status);
CREATE INDEX IF NOT EXISTS idx_test_results_execution ON task_test_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_markov_transitions ON markov_state_transitions(from_state, to_state, task_type);
CREATE INDEX IF NOT EXISTS idx_bayesian_priors_type ON bayesian_priors(task_type, complexity_score);
CREATE INDEX IF NOT EXISTS idx_task_metrics_task ON task_metrics(task_id);
CREATE INDEX IF NOT EXISTS idx_task_metrics_timestamp ON task_metrics(timestamp);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE markov_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bayesian_priors ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE electrical_validation_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users to read all task data
CREATE POLICY "Authenticated users can read tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read task executions"
  ON task_executions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read task tests"
  ON task_tests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read test results"
  ON task_test_results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read markov transitions"
  ON markov_state_transitions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read bayesian priors"
  ON bayesian_priors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read corrections"
  ON task_corrections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read metrics"
  ON task_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read validation rules"
  ON electrical_validation_rules FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial Bayesian priors based on task complexity
INSERT INTO bayesian_priors (task_type, complexity_score, prior_success_rate, prior_avg_confidence, sample_size, alpha, beta)
VALUES
  ('database_query', 1, 0.95, 98, 10, 19, 1),
  ('database_query', 5, 0.85, 92, 10, 17, 3),
  ('database_query', 10, 0.70, 85, 10, 14, 6),
  ('ui_component', 1, 0.90, 95, 10, 18, 2),
  ('ui_component', 5, 0.80, 90, 10, 16, 4),
  ('ui_component', 10, 0.65, 82, 10, 13, 7),
  ('data_transform', 1, 0.92, 96, 10, 18.5, 1.5),
  ('data_transform', 5, 0.82, 91, 10, 16.5, 3.5),
  ('data_transform', 10, 0.68, 84, 10, 13.5, 6.5),
  ('api_integration', 1, 0.88, 94, 10, 17.5, 2.5),
  ('api_integration', 5, 0.75, 88, 10, 15, 5),
  ('api_integration', 10, 0.60, 80, 10, 12, 8),
  ('state_management', 1, 0.93, 97, 10, 19, 1),
  ('state_management', 5, 0.84, 92, 10, 17, 3),
  ('state_management', 10, 0.72, 86, 10, 14.5, 5.5),
  ('routing', 1, 0.95, 98, 10, 19.5, 0.5),
  ('routing', 5, 0.87, 93, 10, 17.5, 2.5),
  ('routing', 10, 0.75, 87, 10, 15, 5),
  ('electrical_validation', 1, 0.91, 96, 10, 18, 2),
  ('electrical_validation', 5, 0.78, 89, 10, 15.5, 4.5),
  ('electrical_validation', 10, 0.62, 81, 10, 12.5, 7.5)
ON CONFLICT (task_type, complexity_score) DO NOTHING;

-- Insert initial electrical validation rules
INSERT INTO electrical_validation_rules (rule_name, rule_type, validation_function, error_message, severity, nec_reference)
VALUES
  ('breaker_wire_compatibility', 'circuit_validation', 'check_breaker_wire_gauge', 'Wire gauge must be appropriate for breaker amperage', 'critical', 'NEC 240.4'),
  ('voltage_drop_calculation', 'circuit_validation', 'check_voltage_drop', 'Voltage drop exceeds 3% for branch circuits', 'error', 'NEC 210.19'),
  ('gfci_required_locations', 'safety_check', 'check_gfci_requirements', 'GFCI protection required in this location', 'critical', 'NEC 210.8'),
  ('afci_required_circuits', 'safety_check', 'check_afci_requirements', 'AFCI protection required for this circuit type', 'critical', 'NEC 210.12'),
  ('panel_rating_exceeded', 'circuit_validation', 'check_panel_load', 'Total connected load exceeds panel rating', 'critical', 'NEC 220'),
  ('wire_temperature_rating', 'safety_check', 'check_wire_temp_rating', 'Wire temperature rating insufficient for application', 'critical', 'NEC 310.15'),
  ('voltage_range_normal', 'measurement_range', 'check_voltage_range', 'Voltage reading outside normal operating range (114-126V for 120V nominal)', 'warning', 'ANSI C84.1'),
  ('current_overload', 'measurement_range', 'check_current_threshold', 'Current exceeds 80% of breaker rating', 'error', 'NEC 210.20'),
  ('power_factor_low', 'measurement_range', 'check_power_factor', 'Power factor below 0.85 indicates inefficiency', 'warning', NULL),
  ('thd_excessive', 'measurement_range', 'check_thd_threshold', 'Total Harmonic Distortion exceeds 5%', 'warning', 'IEEE 519')
ON CONFLICT (rule_name) DO NOTHING;
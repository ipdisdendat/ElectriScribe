/*
  # Knowledge Persistence and Token Optimization System
  
  ## Overview
  Implements persistent learning across tasks to eliminate repeated failures and optimize token usage.
  Once a lesson is learned, it's stored permanently and applied to all future operations.
  
  ## New Tables
  
  ### `learned_constraints`
  Permanent storage of lessons learned from failures
  - `id` (uuid, primary key) - Unique constraint identifier
  - `constraint_type` (text) - Category: encoding_error, api_limit, validation_rule, type_error, import_error, runtime_error
  - `error_pattern` (text) - Regex or description of error that triggers this constraint
  - `root_cause` (text) - Why this error occurred
  - `solution_template` (text) - How to prevent this error
  - `code_pattern` (text) - Code pattern that caused the issue
  - `fixed_pattern` (text) - Corrected code pattern
  - `applies_to` (jsonb) - Array of task types, file patterns, or contexts where this applies
  - `confidence` (numeric) - How reliable this solution is (0-100)
  - `times_prevented` (integer) - Number of times this constraint prevented a repeat error
  - `learned_at` (timestamptz) - When this was first learned
  - `last_applied` (timestamptz) - Most recent application
  - `session_id` (text) - Original session that discovered this
  - `is_global` (boolean) - Apply to all future sessions
  - `metadata` (jsonb) - Additional context
  
  ### `failure_patterns`
  Tracks recurring failure modes for pattern recognition
  - `id` (uuid, primary key)
  - `pattern_hash` (text, unique) - Hash of normalized error signature
  - `error_category` (text) - High-level category
  - `error_message_template` (text) - Normalized error message
  - `stack_trace_signature` (text) - Key elements of stack trace
  - `occurrence_count` (integer) - Times this pattern has occurred
  - `task_types_affected` (jsonb) - Which task types hit this
  - `first_seen` (timestamptz) - Initial occurrence
  - `last_seen` (timestamptz) - Most recent occurrence
  - `resolution_strategy` (text) - Best known fix
  - `avg_tokens_wasted` (integer) - Average tokens spent on retries before fix
  - `total_tokens_saved` (integer) - Tokens saved by preventing this
  
  ### `token_efficiency_metrics`
  Tracks token usage and optimization effectiveness
  - `id` (uuid, primary key)
  - `task_id` (uuid) - Reference to task
  - `execution_id` (uuid) - Reference to execution
  - `phase` (text) - planning, execution, testing, correction, completion
  - `tokens_used` (integer) - Tokens consumed in this phase
  - `tokens_saved` (integer) - Tokens saved by using learned constraints
  - `constraints_applied` (jsonb) - Which constraints were used
  - `prevented_errors` (jsonb) - Errors avoided
  - `timestamp` (timestamptz)
  
  ### `pre_execution_checks`
  Validation rules applied before task execution to prevent known failures
  - `id` (uuid, primary key)
  - `check_name` (text, unique) - Human-readable identifier
  - `check_type` (text) - encoding_validation, type_check, import_validation, api_quota_check
  - `validation_logic` (text) - SQL function or logic expression
  - `error_message` (text) - Message when check fails
  - `auto_fix_available` (boolean) - Can this be automatically corrected
  - `auto_fix_logic` (text) - How to fix automatically
  - `is_active` (boolean) - Enable/disable this check
  - `priority` (integer) - Order of execution (1 = first)
  - `created_from_constraint_id` (uuid) - Link to learned constraint
  
  ### `session_learnings`
  Captures all lessons from each session for cross-session knowledge transfer
  - `id` (uuid, primary key)
  - `session_id` (text) - Session identifier
  - `learning_category` (text) - error_prevention, optimization, best_practice
  - `title` (text) - Brief description
  - `description` (text) - Detailed explanation
  - `before_state` (jsonb) - What was being done
  - `after_state` (jsonb) - What changed
  - `impact` (text) - Effect of this learning
  - `tokens_saved_per_application` (integer) - Efficiency gain
  - `promoted_to_global` (boolean) - Applied to all sessions
  - `learned_at` (timestamptz)
  
  ### `optimization_rules`
  High-level optimization strategies learned over time
  - `id` (uuid, primary key)
  - `rule_name` (text, unique) - Identifier
  - `rule_category` (text) - token_efficiency, execution_speed, accuracy_improvement
  - `description` (text) - What this rule does
  - `conditions` (jsonb) - When to apply this rule
  - `actions` (jsonb) - What to do
  - `effectiveness_score` (numeric) - How well this works (0-100)
  - `times_applied` (integer) - Usage count
  - `avg_improvement` (numeric) - Average benefit
  - `is_active` (boolean)
  
  ## Indexes
  - Fast lookups by error patterns, task types, and session
  - Time-series queries on token efficiency
  - Pattern matching on failure signatures
  
  ## Security
  - Enable RLS on all tables
  - Read access for authenticated users
  - System writes only
*/

-- Learned constraints table
CREATE TABLE IF NOT EXISTS learned_constraints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  constraint_type text NOT NULL CHECK (constraint_type IN ('encoding_error', 'api_limit', 'validation_rule', 'type_error', 'import_error', 'runtime_error', 'optimization')),
  error_pattern text NOT NULL,
  root_cause text NOT NULL,
  solution_template text NOT NULL,
  code_pattern text,
  fixed_pattern text,
  applies_to jsonb DEFAULT '[]'::jsonb,
  confidence numeric DEFAULT 100 CHECK (confidence >= 0 AND confidence <= 100),
  times_prevented integer DEFAULT 0,
  learned_at timestamptz DEFAULT now(),
  last_applied timestamptz,
  session_id text,
  is_global boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Failure patterns table
CREATE TABLE IF NOT EXISTS failure_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_hash text UNIQUE NOT NULL,
  error_category text NOT NULL,
  error_message_template text NOT NULL,
  stack_trace_signature text,
  occurrence_count integer DEFAULT 1,
  task_types_affected jsonb DEFAULT '[]'::jsonb,
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  resolution_strategy text,
  avg_tokens_wasted integer DEFAULT 0,
  total_tokens_saved integer DEFAULT 0
);

-- Token efficiency metrics table
CREATE TABLE IF NOT EXISTS token_efficiency_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  execution_id uuid REFERENCES task_executions(id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('planning', 'execution', 'testing', 'correction', 'completion')),
  tokens_used integer NOT NULL DEFAULT 0,
  tokens_saved integer DEFAULT 0,
  constraints_applied jsonb DEFAULT '[]'::jsonb,
  prevented_errors jsonb DEFAULT '[]'::jsonb,
  timestamp timestamptz DEFAULT now()
);

-- Pre-execution checks table
CREATE TABLE IF NOT EXISTS pre_execution_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name text UNIQUE NOT NULL,
  check_type text NOT NULL CHECK (check_type IN ('encoding_validation', 'type_check', 'import_validation', 'api_quota_check', 'resource_validation')),
  validation_logic text NOT NULL,
  error_message text NOT NULL,
  auto_fix_available boolean DEFAULT false,
  auto_fix_logic text,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 50,
  created_from_constraint_id uuid REFERENCES learned_constraints(id) ON DELETE SET NULL
);

-- Session learnings table
CREATE TABLE IF NOT EXISTS session_learnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  learning_category text NOT NULL CHECK (learning_category IN ('error_prevention', 'optimization', 'best_practice')),
  title text NOT NULL,
  description text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  impact text,
  tokens_saved_per_application integer DEFAULT 0,
  promoted_to_global boolean DEFAULT false,
  learned_at timestamptz DEFAULT now()
);

-- Optimization rules table
CREATE TABLE IF NOT EXISTS optimization_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text UNIQUE NOT NULL,
  rule_category text NOT NULL CHECK (rule_category IN ('token_efficiency', 'execution_speed', 'accuracy_improvement')),
  description text NOT NULL,
  conditions jsonb NOT NULL,
  actions jsonb NOT NULL,
  effectiveness_score numeric DEFAULT 50 CHECK (effectiveness_score >= 0 AND effectiveness_score <= 100),
  times_applied integer DEFAULT 0,
  avg_improvement numeric DEFAULT 0,
  is_active boolean DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learned_constraints_type ON learned_constraints(constraint_type);
CREATE INDEX IF NOT EXISTS idx_learned_constraints_global ON learned_constraints(is_global) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_learned_constraints_session ON learned_constraints(session_id);
CREATE INDEX IF NOT EXISTS idx_failure_patterns_hash ON failure_patterns(pattern_hash);
CREATE INDEX IF NOT EXISTS idx_failure_patterns_category ON failure_patterns(error_category);
CREATE INDEX IF NOT EXISTS idx_token_metrics_task ON token_efficiency_metrics(task_id);
CREATE INDEX IF NOT EXISTS idx_token_metrics_timestamp ON token_efficiency_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_pre_checks_active ON pre_execution_checks(is_active, priority) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_session_learnings_session ON session_learnings(session_id);
CREATE INDEX IF NOT EXISTS idx_optimization_rules_active ON optimization_rules(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE learned_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE failure_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_efficiency_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_execution_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read learned constraints"
  ON learned_constraints FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read failure patterns"
  ON failure_patterns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read token metrics"
  ON token_efficiency_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read pre-execution checks"
  ON pre_execution_checks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read session learnings"
  ON session_learnings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read optimization rules"
  ON optimization_rules FOR SELECT
  TO authenticated
  USING (true);

-- Insert foundational learned constraints to prevent common issues
INSERT INTO learned_constraints (constraint_type, error_pattern, root_cause, solution_template, code_pattern, fixed_pattern, applies_to, confidence)
VALUES
  (
    'encoding_error',
    'UnicodeDecodeError|UnicodeEncodeError|codec can''t decode',
    'File reading/writing without explicit UTF-8 encoding specification',
    'Always specify encoding="utf-8" when opening files. Use encoding parameter in open(), read(), and write() operations.',
    'open(file_path)',
    'open(file_path, encoding="utf-8")',
    '["all"]'::jsonb,
    100
  ),
  (
    'encoding_error',
    'charmap|cp1252|ascii',
    'Default system encoding used instead of UTF-8',
    'Explicitly set UTF-8 encoding for all text operations. Add encoding parameter to file operations.',
    'with open(path) as f:',
    'with open(path, encoding="utf-8") as f:',
    '["all"]'::jsonb,
    100
  ),
  (
    'type_error',
    'NoneType.*has no attribute|argument.*got NoneType',
    'Missing null checks before accessing object properties',
    'Always validate objects are not None before accessing attributes. Use optional chaining or explicit checks.',
    'obj.attribute',
    'if obj is not None: obj.attribute',
    '["database_query", "data_transform", "api_integration"]'::jsonb,
    95
  ),
  (
    'import_error',
    'ModuleNotFoundError|ImportError.*No module named',
    'Attempting to import package not in dependencies',
    'Check package.json/requirements.txt before importing. Use try/except for optional imports.',
    'import unknown_package',
    'try:\n    import package\nexcept ImportError:\n    package = None',
    '["all"]'::jsonb,
    100
  ),
  (
    'api_limit',
    'rate limit|quota exceeded|429',
    'API rate limiting not handled',
    'Implement exponential backoff and rate limiting checks before API calls.',
    'await fetch(url)',
    'await fetchWithRetry(url, { maxRetries: 3, backoff: true })',
    '["api_integration"]'::jsonb,
    90
  ),
  (
    'validation_rule',
    'undefined|is not defined',
    'Variable used before declaration or out of scope',
    'Ensure all variables are declared before use. Check scope boundaries.',
    'console.log(myVar)',
    'const myVar = value;\nconsole.log(myVar);',
    '["ui_component", "data_transform"]'::jsonb,
    95
  ),
  (
    'runtime_error',
    'maximum call stack|stack overflow',
    'Infinite recursion or circular dependency',
    'Add base case to recursive functions. Check for circular references in data structures.',
    'function recursive() { recursive(); }',
    'function recursive(depth = 0) { if (depth > 100) return; recursive(depth + 1); }',
    '["all"]'::jsonb,
    98
  ),
  (
    'optimization',
    'multiple sequential database queries',
    'N+1 query problem causing performance issues',
    'Use joins or batch queries instead of multiple sequential queries. Load related data in single query.',
    'for item in items: query(item.id)',
    'query_all(item_ids) // single query with IN clause',
    '["database_query"]'::jsonb,
    90
  )
ON CONFLICT DO NOTHING;

-- Insert pre-execution checks based on learned constraints
INSERT INTO pre_execution_checks (check_name, check_type, validation_logic, error_message, auto_fix_available, auto_fix_logic, priority)
VALUES
  (
    'utf8_encoding_check',
    'encoding_validation',
    'code LIKE ''%open(%'' AND code NOT LIKE ''%encoding=%''',
    'File operations detected without explicit UTF-8 encoding. This will cause Unicode errors.',
    true,
    'Replace open( with open(, encoding="utf-8"',
    10
  ),
  (
    'null_check_before_access',
    'type_check',
    'code LIKE ''%.%'' AND code NOT LIKE ''%if%None%''',
    'Object property access without null check may cause TypeError.',
    true,
    'Add null check: if obj is not None:',
    20
  ),
  (
    'import_dependency_check',
    'import_validation',
    'code LIKE ''%import %''',
    'Verify all imports are available in package dependencies.',
    false,
    NULL,
    5
  ),
  (
    'api_rate_limit_check',
    'api_quota_check',
    'code LIKE ''%fetch(%'' OR code LIKE ''%api%call%''',
    'API calls should include rate limiting and retry logic.',
    true,
    'Wrap in retry handler with exponential backoff',
    15
  )
ON CONFLICT (check_name) DO NOTHING;

-- Insert initial optimization rules
INSERT INTO optimization_rules (rule_name, rule_category, description, conditions, actions, effectiveness_score)
VALUES
  (
    'batch_database_operations',
    'token_efficiency',
    'Combine multiple single-item database operations into batch operations',
    '{"pattern": "multiple sequential queries", "min_count": 3}'::jsonb,
    '{"action": "combine_queries", "method": "use_in_clause_or_join"}'::jsonb,
    95
  ),
  (
    'cache_repeated_calculations',
    'execution_speed',
    'Store results of expensive calculations that are used multiple times',
    '{"pattern": "same calculation repeated", "min_repetitions": 2}'::jsonb,
    '{"action": "memoize", "scope": "execution_context"}'::jsonb,
    85
  ),
  (
    'early_validation',
    'token_efficiency',
    'Validate inputs before expensive operations to fail fast',
    '{"has_expensive_operation": true, "has_input_validation": false}'::jsonb,
    '{"action": "add_validation", "position": "before_expensive_ops"}'::jsonb,
    90
  ),
  (
    'prevent_known_errors',
    'token_efficiency',
    'Apply learned constraints before execution to prevent repeated failures',
    '{"has_matching_constraint": true}'::jsonb,
    '{"action": "apply_constraint", "auto_fix": true}'::jsonb,
    100
  )
ON CONFLICT (rule_name) DO NOTHING;
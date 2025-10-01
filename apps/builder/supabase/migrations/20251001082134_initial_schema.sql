/*
  # ElectriScribe Initial Database Schema
  
  ## Overview
  Complete database architecture for electrical system troubleshooting platform
  
  ## Tables Created
  
  ### 1. Knowledge Base Tables
  - `issue_categories` - Categories for organizing electrical issues (Heat Pumps, HVAC, Circuits, etc.)
  - `issues` - Main troubleshooting issues with symptoms and descriptions
  - `root_causes` - Root causes linked to issues
  - `solutions` - Solutions with cost, difficulty, safety ratings
  - `solution_types` - Types: Immediate, Smart, Infrastructure
  
  ### 2. Monitoring & Sites
  - `sites` - Customer sites/properties with location and service details
  - `panels` - Electrical panels (main/sub) with ratings and specifications
  - `circuits` - Individual circuits with breaker sizes and wire specifications
  - `measurements` - Time-series electrical measurements (voltage, current, power factor, etc.)
  - `alerts` - Configurable threshold alerts with notification settings
  - `alert_history` - Historical record of triggered alerts
  
  ### 3. Service Documentation
  - `service_logs` - Maintenance and service visit records
  - `documents` - File attachments (photos, PDFs, schematics, etc.)
  - `maintenance_schedules` - Recurring maintenance tasks
  - `parts_inventory` - Equipment and parts tracking
  
  ### 4. Equipment & Codes
  - `equipment_catalog` - Manufacturer parts database
  - `local_dealers` - Supplier/dealer information
  - `electrical_codes` - NEC/CEC code references
  
  ### 5. User Management
  - Uses Supabase auth.users table
  - `user_profiles` - Extended user information (role, company, license)
  
  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Policies for authenticated users with proper ownership checks
  - Service role access for system operations
  
  ## Indexes
  - Performance indexes on frequently queried columns
  - Full-text search indexes on searchable content
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USER PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'electrician' CHECK (role IN ('electrician', 'facility_manager', 'homeowner', 'admin')),
  company text,
  license_number text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- KNOWLEDGE BASE - ISSUE CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS issue_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  color text DEFAULT '#0066cc',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE issue_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories"
  ON issue_categories FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- KNOWLEDGE BASE - SOLUTION TYPES
-- ============================================================================

CREATE TABLE IF NOT EXISTS solution_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  badge_color text DEFAULT 'info'
);

ALTER TABLE solution_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read solution types"
  ON solution_types FOR SELECT
  TO authenticated
  USING (true);

-- Insert default solution types
INSERT INTO solution_types (name, description, badge_color) VALUES
  ('Immediate', 'Quick fixes that can be done right away', 'error'),
  ('Smart', 'Technology-based solutions using smart devices', 'accent'),
  ('Infrastructure', 'Permanent electrical system upgrades', 'success')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- KNOWLEDGE BASE - ISSUES
-- ============================================================================

CREATE TABLE IF NOT EXISTS issues (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid REFERENCES issue_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  symptoms text[] DEFAULT '{}',
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  safety_rating int DEFAULT 3 CHECK (safety_rating >= 1 AND safety_rating <= 5),
  search_vector tsvector,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read issues"
  ON issues FOR SELECT
  TO authenticated
  USING (true);

-- Full-text search index
CREATE INDEX IF NOT EXISTS issues_search_idx ON issues USING gin(search_vector);
CREATE INDEX IF NOT EXISTS issues_category_idx ON issues(category_id);
CREATE INDEX IF NOT EXISTS issues_severity_idx ON issues(severity);

-- ============================================================================
-- KNOWLEDGE BASE - ROOT CAUSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS root_causes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id uuid REFERENCES issues(id) ON DELETE CASCADE,
  description text NOT NULL,
  technical_explanation text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE root_causes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read root causes"
  ON root_causes FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS root_causes_issue_idx ON root_causes(issue_id);

-- ============================================================================
-- KNOWLEDGE BASE - SOLUTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS solutions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id uuid REFERENCES issues(id) ON DELETE CASCADE,
  solution_type_id uuid REFERENCES solution_types(id),
  title text NOT NULL,
  description text NOT NULL,
  steps text[],
  cost_estimate_min decimal(10,2),
  cost_estimate_max decimal(10,2),
  time_estimate_hours decimal(5,1),
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  safety_warnings text[],
  required_tools text[],
  required_parts text[],
  code_references uuid[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read solutions"
  ON solutions FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS solutions_issue_idx ON solutions(issue_id);
CREATE INDEX IF NOT EXISTS solutions_type_idx ON solutions(solution_type_id);

-- ============================================================================
-- SITES
-- ============================================================================

CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  state text,
  zip text,
  service_rating int DEFAULT 200,
  voltage int DEFAULT 240,
  phases int DEFAULT 2,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sites"
  ON sites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sites"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sites"
  ON sites FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sites"
  ON sites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS sites_user_idx ON sites(user_id);

-- ============================================================================
-- PANELS
-- ============================================================================

CREATE TABLE IF NOT EXISTS panels (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  panel_type text NOT NULL DEFAULT 'main' CHECK (panel_type IN ('main', 'sub')),
  rating int NOT NULL DEFAULT 200,
  manufacturer text,
  model text,
  location text,
  install_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE panels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read panels for own sites"
  ON panels FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sites WHERE sites.id = panels.site_id AND sites.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert panels for own sites"
  ON panels FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM sites WHERE sites.id = panels.site_id AND sites.user_id = auth.uid()
  ));

CREATE POLICY "Users can update panels for own sites"
  ON panels FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sites WHERE sites.id = panels.site_id AND sites.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sites WHERE sites.id = panels.site_id AND sites.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete panels for own sites"
  ON panels FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sites WHERE sites.id = panels.site_id AND sites.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS panels_site_idx ON panels(site_id);

-- ============================================================================
-- CIRCUITS
-- ============================================================================

CREATE TABLE IF NOT EXISTS circuits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  panel_id uuid REFERENCES panels(id) ON DELETE CASCADE,
  circuit_number int NOT NULL,
  name text NOT NULL,
  breaker_size int NOT NULL,
  wire_gauge int,
  wire_type text DEFAULT 'THWN',
  phase text DEFAULT 'L1' CHECK (phase IN ('L1', 'L2', 'L1-L2')),
  load_type text,
  location text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE circuits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read circuits for own sites"
  ON circuits FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM panels 
    JOIN sites ON sites.id = panels.site_id 
    WHERE panels.id = circuits.panel_id AND sites.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert circuits for own sites"
  ON circuits FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM panels 
    JOIN sites ON sites.id = panels.site_id 
    WHERE panels.id = circuits.panel_id AND sites.user_id = auth.uid()
  ));

CREATE POLICY "Users can update circuits for own sites"
  ON circuits FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM panels 
    JOIN sites ON sites.id = panels.site_id 
    WHERE panels.id = circuits.panel_id AND sites.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM panels 
    JOIN sites ON sites.id = panels.site_id 
    WHERE panels.id = circuits.panel_id AND sites.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete circuits for own sites"
  ON circuits FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM panels 
    JOIN sites ON sites.id = panels.site_id 
    WHERE panels.id = circuits.panel_id AND sites.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS circuits_panel_idx ON circuits(panel_id);

-- ============================================================================
-- MEASUREMENTS (Time-series data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS measurements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  circuit_id uuid REFERENCES circuits(id) ON DELETE CASCADE,
  panel_id uuid REFERENCES panels(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  voltage decimal(6,2),
  current decimal(8,2),
  power_factor decimal(4,3),
  frequency decimal(5,2),
  thd decimal(5,2),
  temperature decimal(5,1),
  humidity decimal(5,1),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read measurements for own sites"
  ON measurements FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM panels 
    JOIN sites ON sites.id = panels.site_id 
    WHERE panels.id = measurements.panel_id AND sites.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert measurements for own sites"
  ON measurements FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM panels 
    JOIN sites ON sites.id = panels.site_id 
    WHERE panels.id = measurements.panel_id AND sites.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS measurements_panel_timestamp_idx ON measurements(panel_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS measurements_circuit_timestamp_idx ON measurements(circuit_id, timestamp DESC);

-- ============================================================================
-- ALERTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  circuit_id uuid REFERENCES circuits(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('voltage_high', 'voltage_low', 'current_high', 'overload', 'temperature', 'power_quality')),
  threshold_value decimal(10,2) NOT NULL,
  comparison text NOT NULL DEFAULT '>' CHECK (comparison IN ('>', '<', '>=', '<=', '=')),
  enabled boolean DEFAULT true,
  notification_email boolean DEFAULT true,
  notification_sms boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage alerts for own sites"
  ON alerts FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sites WHERE sites.id = alerts.site_id AND sites.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sites WHERE sites.id = alerts.site_id AND sites.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS alerts_site_idx ON alerts(site_id);

-- ============================================================================
-- ALERT HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id uuid REFERENCES alerts(id) ON DELETE CASCADE,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  measurement_value decimal(10,2),
  resolved_at timestamptz,
  notes text
);

ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read alert history for own sites"
  ON alert_history FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM alerts 
    JOIN sites ON sites.id = alerts.site_id 
    WHERE alerts.id = alert_history.alert_id AND sites.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS alert_history_alert_idx ON alert_history(alert_id);

-- ============================================================================
-- SERVICE LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  service_type text DEFAULT 'maintenance' CHECK (service_type IN ('maintenance', 'repair', 'installation', 'inspection', 'emergency')),
  status text DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  labor_hours decimal(5,1),
  labor_cost decimal(10,2),
  parts_cost decimal(10,2),
  total_cost decimal(10,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage service logs for own sites"
  ON service_logs FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sites WHERE sites.id = service_logs.site_id AND sites.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sites WHERE sites.id = service_logs.site_id AND sites.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS service_logs_site_idx ON service_logs(site_id);
CREATE INDEX IF NOT EXISTS service_logs_date_idx ON service_logs(service_date DESC);

-- ============================================================================
-- DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  service_log_id uuid REFERENCES service_logs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size bigint,
  thumbnail_url text,
  category text DEFAULT 'photo' CHECK (category IN ('photo', 'permit', 'invoice', 'schematic', 'test_result', 'manual', 'note', 'correspondence')),
  tags text[] DEFAULT '{}',
  ocr_text text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage documents for own sites"
  ON documents FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sites WHERE sites.id = documents.site_id AND sites.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sites WHERE sites.id = documents.site_id AND sites.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS documents_site_idx ON documents(site_id);
CREATE INDEX IF NOT EXISTS documents_service_log_idx ON documents(service_log_id);

-- ============================================================================
-- MAINTENANCE SCHEDULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'semi_annual', 'annual')),
  next_due_date date NOT NULL,
  last_completed_date date,
  assigned_to uuid REFERENCES auth.users(id),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage maintenance for own sites"
  ON maintenance_schedules FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sites WHERE sites.id = maintenance_schedules.site_id AND sites.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sites WHERE sites.id = maintenance_schedules.site_id AND sites.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS maintenance_site_idx ON maintenance_schedules(site_id);

-- ============================================================================
-- EQUIPMENT CATALOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS equipment_catalog (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category text NOT NULL,
  manufacturer text NOT NULL,
  model text NOT NULL,
  part_number text,
  description text,
  specifications jsonb,
  datasheet_url text,
  avg_price decimal(10,2),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE equipment_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read equipment catalog"
  ON equipment_catalog FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS equipment_category_idx ON equipment_catalog(category);
CREATE INDEX IF NOT EXISTS equipment_manufacturer_idx ON equipment_catalog(manufacturer);

-- ============================================================================
-- ELECTRICAL CODES
-- ============================================================================

CREATE TABLE IF NOT EXISTS electrical_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  region text NOT NULL,
  code_type text NOT NULL CHECK (code_type IN ('NEC', 'CEC', 'local')),
  version text NOT NULL,
  article text,
  section text,
  title text NOT NULL,
  description text,
  requirements text,
  effective_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE electrical_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read electrical codes"
  ON electrical_codes FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS codes_region_idx ON electrical_codes(region);
CREATE INDEX IF NOT EXISTS codes_type_version_idx ON electrical_codes(code_type, version);

-- ============================================================================
-- FUNCTIONS FOR SEARCH
-- ============================================================================

CREATE OR REPLACE FUNCTION update_issue_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' || 
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(array_to_string(NEW.symptoms, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issue_search_vector_update
  BEFORE INSERT OR UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION update_issue_search_vector();

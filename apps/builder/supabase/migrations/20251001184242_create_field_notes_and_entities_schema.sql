/*
  # Field Notes and Parsed Entities Schema

  1. New Tables
    - `field_notes`
      - `id` (uuid, primary key)
      - `site_id` (uuid, foreign key to sites)
      - `user_id` (uuid, foreign key to user_profiles)
      - `raw_notes` (text) - The unstructured field notes
      - `parse_status` (enum) - pending, processing, completed, failed
      - `parsed_at` (timestamptz) - When parsing completed
      - `confidence_score` (numeric) - Overall parsing confidence
      - `metadata` (jsonb) - Parser metadata
      - `created_at`, `updated_at` (timestamptz)
    
    - `parsed_panels`
      - `id` (uuid, primary key)
      - `field_notes_id` (uuid, foreign key)
      - `panel_type` (text) - main, sub, distribution
      - `manufacturer` (text)
      - `model` (text)
      - `rating` (numeric) - Amperage rating
      - `voltage` (numeric)
      - `phase_configuration` (text)
      - `available_slots` (text[])
      - `location` (text)
      - `confidence` (numeric)
      - `position_x` (numeric) - Canvas position
      - `position_y` (numeric)
      - `notes` (text)
      - `source_line_numbers` (integer[])
      - `created_at`, `updated_at` (timestamptz)
    
    - `parsed_circuits`
      - `id` (uuid, primary key)
      - `field_notes_id` (uuid, foreign key)
      - `panel_id` (uuid, foreign key to parsed_panels)
      - `slot_numbers` (text[])
      - `circuit_type` (text)
      - `breaker_size` (numeric)
      - `description` (text)
      - `wire_awg` (text)
      - `wire_type` (text)
      - `wire_length` (numeric)
      - `phase` (text) - L1, L2, L1-L2
      - `is_available` (boolean)
      - `mwbc_group` (text)
      - `confidence` (numeric)
      - `position_x` (numeric)
      - `position_y` (numeric)
      - `source_line_numbers` (integer[])
      - `created_at`, `updated_at` (timestamptz)
    
    - `parsed_loads`
      - `id` (uuid, primary key)
      - `field_notes_id` (uuid, foreign key)
      - `circuit_id` (uuid, foreign key to parsed_circuits)
      - `name` (text)
      - `load_type` (text) - motor, resistive, electronic, lighting, mixed
      - `location` (text)
      - `circuit_reference` (text)
      - `nominal_current` (numeric)
      - `nominal_voltage` (numeric)
      - `power_factor` (numeric)
      - `inrush_multiplier` (numeric)
      - `harmonic_profile` (jsonb)
      - `duty_cycle` (text) - continuous, intermittent, cyclic
      - `critical` (boolean)
      - `confidence` (numeric)
      - `source_line_numbers` (integer[])
      - `created_at`, `updated_at` (timestamptz)
    
    - `parsed_issues`
      - `id` (uuid, primary key)
      - `field_notes_id` (uuid, foreign key)
      - `issue_type` (text)
      - `severity` (text) - info, warning, critical
      - `description` (text)
      - `affected_components` (text[])
      - `symptoms` (text[])
      - `location_in_notes` (integer[])
      - `confidence` (numeric)
      - `resolved` (boolean)
      - `created_at`, `updated_at` (timestamptz)
    
    - `mwbc_configurations`
      - `id` (uuid, primary key)
      - `field_notes_id` (uuid, foreign key)
      - `slots` (text[])
      - `description` (text)
      - `circuit_ids` (uuid[])
      - `pole_count` (integer)
      - `breaker_size` (numeric)
      - `created_at`, `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for site-based access control

  3. Indexes
    - Index on field_notes.site_id for site queries
    - Index on parsed_panels.field_notes_id for joins
    - Index on parsed_circuits.field_notes_id for joins
    - Index on parsed_loads.circuit_id for joins
*/

-- Create parse_status enum
DO $$ BEGIN
  CREATE TYPE parse_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Field Notes table
CREATE TABLE IF NOT EXISTS field_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  raw_notes text NOT NULL,
  parse_status parse_status DEFAULT 'pending',
  parsed_at timestamptz,
  confidence_score numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Parsed Panels table
CREATE TABLE IF NOT EXISTS parsed_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_notes_id uuid REFERENCES field_notes(id) ON DELETE CASCADE,
  panel_type text NOT NULL,
  manufacturer text DEFAULT 'Unknown',
  model text DEFAULT 'Unknown',
  rating numeric NOT NULL,
  voltage numeric DEFAULT 240,
  phase_configuration text DEFAULT 'split-phase',
  available_slots text[] DEFAULT '{}',
  location text DEFAULT 'Not specified',
  confidence numeric DEFAULT 0,
  position_x numeric DEFAULT 0,
  position_y numeric DEFAULT 0,
  notes text,
  source_line_numbers integer[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Parsed Circuits table
CREATE TABLE IF NOT EXISTS parsed_circuits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_notes_id uuid REFERENCES field_notes(id) ON DELETE CASCADE,
  panel_id uuid REFERENCES parsed_panels(id) ON DELETE SET NULL,
  slot_numbers text[] NOT NULL,
  circuit_type text NOT NULL,
  breaker_size numeric DEFAULT 20,
  description text NOT NULL,
  wire_awg text,
  wire_type text,
  wire_length numeric,
  phase text DEFAULT 'unknown',
  is_available boolean DEFAULT false,
  mwbc_group text,
  confidence numeric DEFAULT 0,
  position_x numeric DEFAULT 0,
  position_y numeric DEFAULT 0,
  source_line_numbers integer[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Parsed Loads table
CREATE TABLE IF NOT EXISTS parsed_loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_notes_id uuid REFERENCES field_notes(id) ON DELETE CASCADE,
  circuit_id uuid REFERENCES parsed_circuits(id) ON DELETE SET NULL,
  name text NOT NULL,
  load_type text DEFAULT 'resistive',
  location text DEFAULT 'Not specified',
  circuit_reference text,
  nominal_current numeric,
  nominal_voltage numeric DEFAULT 120,
  power_factor numeric DEFAULT 1.0,
  inrush_multiplier numeric DEFAULT 1.0,
  harmonic_profile jsonb DEFAULT '{}',
  duty_cycle text DEFAULT 'continuous',
  critical boolean DEFAULT false,
  confidence numeric DEFAULT 0,
  source_line_numbers integer[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Parsed Issues table
CREATE TABLE IF NOT EXISTS parsed_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_notes_id uuid REFERENCES field_notes(id) ON DELETE CASCADE,
  issue_type text NOT NULL,
  severity text DEFAULT 'info',
  description text NOT NULL,
  affected_components text[] DEFAULT '{}',
  symptoms text[] DEFAULT '{}',
  location_in_notes integer[] DEFAULT '{}',
  confidence numeric DEFAULT 0,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- MWBC Configurations table
CREATE TABLE IF NOT EXISTS mwbc_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_notes_id uuid REFERENCES field_notes(id) ON DELETE CASCADE,
  slots text[] NOT NULL,
  description text NOT NULL,
  circuit_ids uuid[] DEFAULT '{}',
  pole_count integer DEFAULT 2,
  breaker_size numeric DEFAULT 20,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_field_notes_site_id ON field_notes(site_id);
CREATE INDEX IF NOT EXISTS idx_field_notes_user_id ON field_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_parsed_panels_field_notes_id ON parsed_panels(field_notes_id);
CREATE INDEX IF NOT EXISTS idx_parsed_circuits_field_notes_id ON parsed_circuits(field_notes_id);
CREATE INDEX IF NOT EXISTS idx_parsed_circuits_panel_id ON parsed_circuits(panel_id);
CREATE INDEX IF NOT EXISTS idx_parsed_loads_field_notes_id ON parsed_loads(field_notes_id);
CREATE INDEX IF NOT EXISTS idx_parsed_loads_circuit_id ON parsed_loads(circuit_id);
CREATE INDEX IF NOT EXISTS idx_parsed_issues_field_notes_id ON parsed_issues(field_notes_id);
CREATE INDEX IF NOT EXISTS idx_mwbc_configurations_field_notes_id ON mwbc_configurations(field_notes_id);

-- Enable Row Level Security
ALTER TABLE field_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_circuits ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE mwbc_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for field_notes
CREATE POLICY "Users can view own field notes"
  ON field_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own field notes"
  ON field_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own field notes"
  ON field_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own field notes"
  ON field_notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for parsed_panels
CREATE POLICY "Users can view parsed panels from their field notes"
  ON parsed_panels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_panels.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert parsed panels for their field notes"
  ON parsed_panels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_panels.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update parsed panels from their field notes"
  ON parsed_panels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_panels.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_panels.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete parsed panels from their field notes"
  ON parsed_panels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_panels.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

-- RLS Policies for parsed_circuits
CREATE POLICY "Users can view parsed circuits from their field notes"
  ON parsed_circuits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_circuits.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert parsed circuits for their field notes"
  ON parsed_circuits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_circuits.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update parsed circuits from their field notes"
  ON parsed_circuits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_circuits.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_circuits.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete parsed circuits from their field notes"
  ON parsed_circuits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_circuits.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

-- RLS Policies for parsed_loads
CREATE POLICY "Users can view parsed loads from their field notes"
  ON parsed_loads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_loads.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert parsed loads for their field notes"
  ON parsed_loads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_loads.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update parsed loads from their field notes"
  ON parsed_loads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_loads.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_loads.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete parsed loads from their field notes"
  ON parsed_loads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_loads.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

-- RLS Policies for parsed_issues
CREATE POLICY "Users can view parsed issues from their field notes"
  ON parsed_issues FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_issues.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert parsed issues for their field notes"
  ON parsed_issues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_issues.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update parsed issues from their field notes"
  ON parsed_issues FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_issues.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_issues.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete parsed issues from their field notes"
  ON parsed_issues FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = parsed_issues.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

-- RLS Policies for mwbc_configurations
CREATE POLICY "Users can view MWBC configurations from their field notes"
  ON mwbc_configurations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = mwbc_configurations.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert MWBC configurations for their field notes"
  ON mwbc_configurations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = mwbc_configurations.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update MWBC configurations from their field notes"
  ON mwbc_configurations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = mwbc_configurations.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = mwbc_configurations.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete MWBC configurations from their field notes"
  ON mwbc_configurations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM field_notes
      WHERE field_notes.id = mwbc_configurations.field_notes_id
      AND field_notes.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_field_notes_updated_at BEFORE UPDATE ON field_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parsed_panels_updated_at BEFORE UPDATE ON parsed_panels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parsed_circuits_updated_at BEFORE UPDATE ON parsed_circuits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parsed_loads_updated_at BEFORE UPDATE ON parsed_loads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parsed_issues_updated_at BEFORE UPDATE ON parsed_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mwbc_configurations_updated_at BEFORE UPDATE ON mwbc_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

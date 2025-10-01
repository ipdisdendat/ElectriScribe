import { supabase } from './supabase';
import type { ParsedFieldNotes, ParsedPanel, ParsedCircuit, ParsedLoad, ParsedIssue, MWBCConfiguration } from './field-notes-parser';

export interface FieldNotesRecord {
  id: string;
  site_id?: string;
  user_id: string;
  raw_notes: string;
  parse_status: 'pending' | 'processing' | 'completed' | 'failed';
  parsed_at?: string;
  confidence_score: number;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export class FieldNotesPersistenceService {
  async saveFieldNotes(
    rawNotes: string,
    parsedData: ParsedFieldNotes,
    siteId?: string
  ): Promise<{ success: boolean; fieldNotesId?: string; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: fieldNotesData, error: fieldNotesError } = await supabase
        .from('field_notes')
        .insert({
          site_id: siteId,
          user_id: user.id,
          raw_notes: rawNotes,
          parse_status: 'completed',
          parsed_at: new Date().toISOString(),
          confidence_score: parsedData.metadata.confidence_score,
          metadata: {
            parser_version: parsedData.metadata.parser_version,
            parse_timestamp: parsedData.metadata.parse_timestamp,
            total_lines: parsedData.metadata.total_lines
          }
        })
        .select()
        .single();

      if (fieldNotesError || !fieldNotesData) {
        console.error('Error saving field notes:', fieldNotesError);
        return { success: false, error: fieldNotesError?.message || 'Failed to save field notes' };
      }

      const fieldNotesId = fieldNotesData.id;

      await this.saveParsedPanels(fieldNotesId, parsedData.panels);
      await this.saveParsedCircuits(fieldNotesId, parsedData.circuits);
      await this.saveParsedLoads(fieldNotesId, parsedData.loads);
      await this.saveParsedIssues(fieldNotesId, parsedData.issues);
      await this.saveMWBCConfigurations(fieldNotesId, parsedData.mwbc_configurations);

      return { success: true, fieldNotesId };
    } catch (error) {
      console.error('Error in saveFieldNotes:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async saveParsedPanels(fieldNotesId: string, panels: ParsedPanel[]): Promise<void> {
    if (panels.length === 0) return;

    const panelRecords = panels.map(panel => ({
      field_notes_id: fieldNotesId,
      panel_type: panel.panel_type,
      manufacturer: panel.manufacturer,
      model: panel.model,
      rating: panel.rating,
      voltage: panel.voltage,
      phase_configuration: panel.phase_configuration,
      available_slots: panel.available_slots,
      location: panel.location,
      confidence: panel.confidence,
      notes: panel.notes,
      source_line_numbers: panel.source_line_numbers
    }));

    const { error } = await supabase
      .from('parsed_panels')
      .insert(panelRecords);

    if (error) {
      console.error('Error saving parsed panels:', error);
    }
  }

  private async saveParsedCircuits(fieldNotesId: string, circuits: ParsedCircuit[]): Promise<void> {
    if (circuits.length === 0) return;

    const circuitRecords = circuits.map(circuit => ({
      field_notes_id: fieldNotesId,
      slot_numbers: circuit.slot_numbers,
      circuit_type: circuit.circuit_type,
      breaker_size: circuit.breaker_size,
      description: circuit.description,
      wire_awg: circuit.wire_awg,
      wire_type: circuit.wire_type,
      wire_length: circuit.wire_length,
      phase: circuit.phase,
      is_available: circuit.is_available,
      mwbc_group: circuit.mwbc_group,
      confidence: circuit.confidence,
      source_line_numbers: circuit.source_line_numbers
    }));

    const { error } = await supabase
      .from('parsed_circuits')
      .insert(circuitRecords);

    if (error) {
      console.error('Error saving parsed circuits:', error);
    }
  }

  private async saveParsedLoads(fieldNotesId: string, loads: ParsedLoad[]): Promise<void> {
    if (loads.length === 0) return;

    const loadRecords = loads.map(load => ({
      field_notes_id: fieldNotesId,
      name: load.name,
      load_type: load.load_type,
      location: load.location,
      circuit_reference: load.circuit_reference,
      nominal_current: load.nominal_current,
      nominal_voltage: load.nominal_voltage,
      power_factor: load.power_factor,
      inrush_multiplier: load.inrush_multiplier,
      harmonic_profile: load.harmonic_profile,
      duty_cycle: load.duty_cycle,
      critical: load.critical,
      confidence: load.confidence,
      source_line_numbers: load.source_line_numbers
    }));

    const { error } = await supabase
      .from('parsed_loads')
      .insert(loadRecords);

    if (error) {
      console.error('Error saving parsed loads:', error);
    }
  }

  private async saveParsedIssues(fieldNotesId: string, issues: ParsedIssue[]): Promise<void> {
    if (issues.length === 0) return;

    const issueRecords = issues.map(issue => ({
      field_notes_id: fieldNotesId,
      issue_type: issue.issue_type,
      severity: issue.severity,
      description: issue.description,
      affected_components: issue.affected_components,
      symptoms: issue.symptoms,
      location_in_notes: issue.location_in_notes,
      confidence: issue.confidence,
      resolved: false
    }));

    const { error } = await supabase
      .from('parsed_issues')
      .insert(issueRecords);

    if (error) {
      console.error('Error saving parsed issues:', error);
    }
  }

  private async saveMWBCConfigurations(fieldNotesId: string, mwbcs: MWBCConfiguration[]): Promise<void> {
    if (mwbcs.length === 0) return;

    const mwbcRecords = mwbcs.map(mwbc => ({
      field_notes_id: fieldNotesId,
      slots: mwbc.slots,
      description: mwbc.description,
      circuit_ids: mwbc.circuits,
      pole_count: mwbc.pole_count,
      breaker_size: mwbc.breaker_size
    }));

    const { error } = await supabase
      .from('mwbc_configurations')
      .insert(mwbcRecords);

    if (error) {
      console.error('Error saving MWBC configurations:', error);
    }
  }

  async updateEntityPosition(
    entityType: 'panel' | 'circuit' | 'load',
    entityId: string,
    x: number,
    y: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const tableName = entityType === 'panel' ? 'parsed_panels' :
                       entityType === 'circuit' ? 'parsed_circuits' :
                       'parsed_loads';

      const { error } = await supabase
        .from(tableName)
        .update({ position_x: x, position_y: y })
        .eq('id', entityId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getFieldNotesBySite(siteId: string): Promise<{ success: boolean; data?: FieldNotesRecord[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('field_notes')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getFieldNotesById(fieldNotesId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data: fieldNotes, error: fieldNotesError } = await supabase
        .from('field_notes')
        .select('*')
        .eq('id', fieldNotesId)
        .single();

      if (fieldNotesError) {
        return { success: false, error: fieldNotesError.message };
      }

      const { data: panels } = await supabase
        .from('parsed_panels')
        .select('*')
        .eq('field_notes_id', fieldNotesId);

      const { data: circuits } = await supabase
        .from('parsed_circuits')
        .select('*')
        .eq('field_notes_id', fieldNotesId);

      const { data: loads } = await supabase
        .from('parsed_loads')
        .select('*')
        .eq('field_notes_id', fieldNotesId);

      const { data: issues } = await supabase
        .from('parsed_issues')
        .select('*')
        .eq('field_notes_id', fieldNotesId);

      const { data: mwbcs } = await supabase
        .from('mwbc_configurations')
        .select('*')
        .eq('field_notes_id', fieldNotesId);

      return {
        success: true,
        data: {
          ...fieldNotes,
          panels: panels || [],
          circuits: circuits || [],
          loads: loads || [],
          issues: issues || [],
          mwbc_configurations: mwbcs || []
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async deleteFieldNotes(fieldNotesId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('field_notes')
        .delete()
        .eq('id', fieldNotesId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const fieldNotesPersistence = new FieldNotesPersistenceService();

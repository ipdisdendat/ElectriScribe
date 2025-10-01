/**
 * TypeScript client for Python Analysis API
 * Bridges frontend to advanced constraint validation and holistic scoring
 */

export interface SystemStateRequest {
  electrical_state: Record<string, number>;
  thermal_state: Record<string, number>;
  harmonic_state: Record<string, number>;
  load_state: Record<string, number>;
  constraint_satisfaction?: Record<string, number>;
  emergent_properties?: Record<string, any>;
  stability_metrics?: Record<string, number>;
}

export interface ConstraintViolation {
  constraint_id: string;
  constraint_name: string;
  violation_magnitude: number;
  cascading_risk: number;
  temporal_urgency: number;
  system_impact_score: number;
  confidence_interval: [number, number];
  root_cause_probability: Record<string, number>;
  mitigation_complexity: number;
}

export interface EmergentBehavior {
  type: string;
  parameter?: string;
  period?: number;
  amplitude?: number;
  magnitude: number;
  stability_risk?: string;
  affected_parameters?: string[];
  transition_count?: number;
}

export interface HolisticValidationResult {
  holistic_score: number;
  confidence_bounds: [number, number];
  constraint_violations: ConstraintViolation[];
  emergent_behaviors: EmergentBehavior[];
  stability_analysis: Record<string, any>;
  complexity_metrics: Record<string, number>;
  adaptation_recommendations: string[];
  intervention_priorities: Array<{
    priority: string;
    constraint: string;
    action: string;
  }>;
}

export interface LoadDataRequest {
  load_id: string;
  load_type: string;
  nominal_voltage: number;
  nominal_current: number;
  nominal_power: number;
  power_factor: number;
  starting_current_multiplier: number;
  diversity_factor: number;
  critical_load: boolean;
  harmonic_content?: Record<number, number>;
  operating_schedule?: number[];
}

export interface ProtectionDeviceRequest {
  device_id: string;
  protection_type: string;
  current_rating: number;
  voltage_rating: number;
  interrupting_rating: number;
  trip_curve_type: string;
  instantaneous_trip_multiplier: number;
  time_delay_characteristics: Record<string, number>;
}

export interface CircuitDataRequest {
  circuit_id: string;
  circuit_type: string;
  wire_awg: string;
  wire_length_ft: number;
  conduit_fill_percentage: number;
  ambient_temperature_c: number;
  number_of_conductors: number;
  voltage_rating: number;
  loads: LoadDataRequest[];
  protection_device: ProtectionDeviceRequest;
  parent_circuit_id?: string;
}

export interface CircuitValidationResult {
  circuit_id: string;
  analysis_timestamp: string;
  overall_status: 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL';
  constraint_checks: Array<{
    constraint_name: string;
    current_value: number;
    limit_value: number;
    margin_percent: number;
    passes_check: boolean;
    severity_level: 'info' | 'warning' | 'critical';
    recommendation: string;
  }>;
  thermal_analysis: {
    conductor_temperature_c: number;
    ampacity_derated: number;
    thermal_margin_percent: number;
    time_to_thermal_limit_minutes: number;
    cooling_required: boolean;
  };
  voltage_analysis: {
    voltage_drop_volts: number;
    voltage_drop_percent: number;
    voltage_at_load: number;
    meets_code_requirements: boolean;
    recommended_wire_upgrade?: string;
  };
  harmonic_analysis: {
    thd_voltage_percent: number;
    thd_current_percent: number;
    individual_harmonics: Record<number, number>;
    k_factor_transformers: number;
    neutral_current_percent: number;
  };
  load_analysis: Record<string, number>;
  recommendations: string[];
  required_modifications: Array<{
    type: string;
    description: string;
    priority: string;
  }>;
  system_impact_summary: {
    affects_parent_circuit: boolean;
    critical_issues_count: number;
    warnings_count: number;
    estimated_implementation_risk: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

export interface FieldNotesRequest {
  raw_notes: string;
  site_id: string;
  supabase_url: string;
  supabase_key: string;
}

export interface ComplexityMetrics {
  complexity_metrics: Record<string, number>;
  overall_complexity: number;
  recommendations: string[];
}

export class PythonAnalysisClient {
  private baseUrl: string;
  private wsUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    this.wsUrl = baseUrl.replace('http', 'ws');
  }

  /**
   * Validate system using holistic multi-dimensional constraint analysis
   */
  async validateHolistic(
    systemState: SystemStateRequest
  ): Promise<HolisticValidationResult> {
    const response = await fetch(`${this.baseUrl}/api/v1/validate/holistic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(systemState),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Holistic validation failed');
    }

    return response.json();
  }

  /**
   * Validate electrical circuit against NEC standards
   */
  async validateCircuit(
    circuit: CircuitDataRequest
  ): Promise<CircuitValidationResult> {
    const response = await fetch(`${this.baseUrl}/api/v1/validate/circuit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(circuit),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Circuit validation failed');
    }

    return response.json();
  }

  /**
   * Process unstructured field notes into validated electrical entities
   */
  async processFieldNotes(request: FieldNotesRequest): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/process/field-notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Field notes processing failed');
    }

    return response.json();
  }

  /**
   * Get multi-dimensional complexity metrics
   */
  async getComplexityMetrics(
    electricalDimension: number,
    thermalDimension: number,
    harmonicDimension: number
  ): Promise<ComplexityMetrics> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/analysis/complexity?` +
        `electrical_dimension=${electricalDimension}&` +
        `thermal_dimension=${thermalDimension}&` +
        `harmonic_dimension=${harmonicDimension}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Complexity analysis failed');
    }

    return response.json();
  }

  /**
   * Check API health status
   */
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    engines: Record<string, string | number>;
  }> {
    const response = await fetch(`${this.baseUrl}/health`);

    if (!response.ok) {
      throw new Error('Health check failed');
    }

    return response.json();
  }

  /**
   * Create WebSocket connection for real-time circuit monitoring
   */
  createMonitoringConnection(
    circuitId: string,
    supabaseUrl: string,
    supabaseKey: string,
    onMessage: (data: any) => void,
    onError?: (error: Event) => void,
    onClose?: () => void
  ): WebSocket {
    const ws = new WebSocket(`${this.wsUrl}/ws/monitor/${circuitId}`);

    ws.onopen = () => {
      // Send configuration
      ws.send(
        JSON.stringify({
          supabase_url: supabaseUrl,
          supabase_key: supabaseKey,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) {
        onError(error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      if (onClose) {
        onClose();
      }
    };

    return ws;
  }
}

// Singleton instance
export const pythonAnalysisClient = new PythonAnalysisClient(
  import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000'
);

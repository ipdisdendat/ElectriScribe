export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: 'electrician' | 'facility_manager' | 'homeowner' | 'admin';
          company: string | null;
          license_number: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
      issue_categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon: string | null;
          color: string;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['issue_categories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['issue_categories']['Insert']>;
      };
      solution_types: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          badge_color: string;
        };
        Insert: Omit<Database['public']['Tables']['solution_types']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['solution_types']['Insert']>;
      };
      issues: {
        Row: {
          id: string;
          category_id: string | null;
          title: string;
          description: string;
          symptoms: string[];
          severity: 'low' | 'medium' | 'high' | 'critical';
          difficulty: 'easy' | 'medium' | 'hard' | 'expert';
          safety_rating: number;
          search_vector: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['issues']['Row'], 'id' | 'search_vector' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['issues']['Insert']>;
      };
      root_causes: {
        Row: {
          id: string;
          issue_id: string | null;
          description: string;
          technical_explanation: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['root_causes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['root_causes']['Insert']>;
      };
      solutions: {
        Row: {
          id: string;
          issue_id: string | null;
          solution_type_id: string | null;
          title: string;
          description: string;
          steps: string[] | null;
          cost_estimate_min: number | null;
          cost_estimate_max: number | null;
          time_estimate_hours: number | null;
          difficulty: 'easy' | 'medium' | 'hard' | 'expert';
          safety_warnings: string[] | null;
          required_tools: string[] | null;
          required_parts: string[] | null;
          code_references: string[] | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['solutions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['solutions']['Insert']>;
      };
      sites: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          address: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          service_rating: number;
          voltage: number;
          phases: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sites']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['sites']['Insert']>;
      };
      panels: {
        Row: {
          id: string;
          site_id: string | null;
          name: string;
          panel_type: 'main' | 'sub';
          rating: number;
          manufacturer: string | null;
          model: string | null;
          location: string | null;
          install_date: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['panels']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['panels']['Insert']>;
      };
      circuits: {
        Row: {
          id: string;
          panel_id: string | null;
          circuit_number: number;
          name: string;
          breaker_size: number;
          wire_gauge: number | null;
          wire_type: string;
          phase: 'L1' | 'L2' | 'L1-L2';
          load_type: string | null;
          location: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['circuits']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['circuits']['Insert']>;
      };
      measurements: {
        Row: {
          id: string;
          circuit_id: string | null;
          panel_id: string | null;
          timestamp: string;
          voltage: number | null;
          current: number | null;
          power_factor: number | null;
          frequency: number | null;
          thd: number | null;
          temperature: number | null;
          humidity: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['measurements']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['measurements']['Insert']>;
      };
      alerts: {
        Row: {
          id: string;
          site_id: string | null;
          circuit_id: string | null;
          alert_type: 'voltage_high' | 'voltage_low' | 'current_high' | 'overload' | 'temperature' | 'power_quality';
          threshold_value: number;
          comparison: '>' | '<' | '>=' | '<=' | '=';
          enabled: boolean;
          notification_email: boolean;
          notification_sms: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>;
      };
      alert_history: {
        Row: {
          id: string;
          alert_id: string | null;
          triggered_at: string;
          measurement_value: number | null;
          resolved_at: string | null;
          notes: string | null;
        };
        Insert: Omit<Database['public']['Tables']['alert_history']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['alert_history']['Insert']>;
      };
      service_logs: {
        Row: {
          id: string;
          site_id: string | null;
          technician_id: string | null;
          title: string;
          description: string | null;
          service_date: string;
          service_type: 'maintenance' | 'repair' | 'installation' | 'inspection' | 'emergency';
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
          labor_hours: number | null;
          labor_cost: number | null;
          parts_cost: number | null;
          total_cost: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['service_logs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['service_logs']['Insert']>;
      };
      documents: {
        Row: {
          id: string;
          site_id: string | null;
          service_log_id: string | null;
          title: string;
          description: string | null;
          file_url: string;
          file_type: string;
          file_size: number | null;
          thumbnail_url: string | null;
          category: 'photo' | 'permit' | 'invoice' | 'schematic' | 'test_result' | 'manual' | 'note' | 'correspondence';
          tags: string[];
          ocr_text: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['documents']['Insert']>;
      };
      maintenance_schedules: {
        Row: {
          id: string;
          site_id: string | null;
          title: string;
          description: string | null;
          frequency: 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
          next_due_date: string;
          last_completed_date: string | null;
          assigned_to: string | null;
          priority: 'low' | 'medium' | 'high';
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['maintenance_schedules']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['maintenance_schedules']['Insert']>;
      };
      equipment_catalog: {
        Row: {
          id: string;
          category: string;
          manufacturer: string;
          model: string;
          part_number: string | null;
          description: string | null;
          specifications: Record<string, unknown> | null;
          datasheet_url: string | null;
          avg_price: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['equipment_catalog']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['equipment_catalog']['Insert']>;
      };
      electrical_codes: {
        Row: {
          id: string;
          region: string;
          code_type: 'NEC' | 'CEC' | 'local';
          version: string;
          article: string | null;
          section: string | null;
          title: string;
          description: string | null;
          requirements: string | null;
          effective_date: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['electrical_codes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['electrical_codes']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

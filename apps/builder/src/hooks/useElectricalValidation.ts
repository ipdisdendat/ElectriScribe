import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { taskOrchestrator } from '../services/task-orchestrator';
import { ElectricalValidationContext } from '../services/task-agents/electrical-validation-agent';
import { createAgent } from '../services/task-agents';

export function useElectricalValidation() {
  const { data: validationRules } = useQuery({
    queryKey: ['electrical-validation-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('electrical_validation_rules')
        .select('*')
        .eq('is_active', true)
        .order('rule_name');

      if (error) throw error;
      return data;
    },
  });

  const validateCircuit = useMutation({
    mutationFn: async (context: ElectricalValidationContext) => {
      const task = await taskOrchestrator.createTask({
        name: 'Circuit Validation',
        description: 'Validate electrical circuit parameters against NEC standards',
        taskType: 'electrical_validation',
        complexityScore: 3,
        metadata: {
          context,
          rules: [
            'breaker_wire_compatibility',
            'voltage_drop_calculation',
            'current_overload',
          ],
        },
      });

      const agent = createAgent(task);
      const result = await agent.execute();

      return {
        task,
        result,
      };
    },
  });

  const validateSafety = useMutation({
    mutationFn: async (context: ElectricalValidationContext) => {
      const task = await taskOrchestrator.createTask({
        name: 'Safety Validation',
        description: 'Check safety requirements and protection devices',
        taskType: 'electrical_validation',
        complexityScore: 4,
        metadata: {
          context,
          rules: [
            'gfci_required_locations',
            'afci_required_circuits',
            'wire_temperature_rating',
          ],
        },
      });

      const agent = createAgent(task);
      const result = await agent.execute();

      return {
        task,
        result,
      };
    },
  });

  const validateMeasurements = useMutation({
    mutationFn: async (context: ElectricalValidationContext) => {
      const task = await taskOrchestrator.createTask({
        name: 'Measurement Validation',
        description: 'Verify electrical measurements are within acceptable ranges',
        taskType: 'electrical_validation',
        complexityScore: 2,
        metadata: {
          context,
          rules: [
            'voltage_range_normal',
            'current_overload',
            'power_factor_low',
            'thd_excessive',
          ],
        },
      });

      const agent = createAgent(task);
      const result = await agent.execute();

      return {
        task,
        result,
      };
    },
  });

  const validateCodeCompliance = useMutation({
    mutationFn: async (context: ElectricalValidationContext & { codeType?: string; region?: string }) => {
      const task = await taskOrchestrator.createTask({
        name: 'Code Compliance Check',
        description: `Validate against ${context.codeType || 'NEC'} standards`,
        taskType: 'electrical_validation',
        complexityScore: 5,
        metadata: {
          context,
          rules: [],
        },
      });

      const agent = createAgent(task);
      const result = await agent.execute();

      return {
        task,
        result,
      };
    },
  });

  return {
    validationRules,
    validateCircuit,
    validateSafety,
    validateMeasurements,
    validateCodeCompliance,
  };
}

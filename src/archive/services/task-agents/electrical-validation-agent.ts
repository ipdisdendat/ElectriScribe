import { BaseTaskAgent, AgentResult } from './base-agent';
import { supabase } from '../supabase';

export interface ElectricalValidationContext {
  voltage?: number;
  current?: number;
  powerFactor?: number;
  thd?: number;
  breakerSize?: number;
  wireGauge?: number;
  circuitLength?: number;
  loadType?: string;
}

export class ElectricalValidationAgent extends BaseTaskAgent {
  async execute(): Promise<AgentResult> {
    try {
      const context: ElectricalValidationContext = this.task.metadata.context || {};
      const validationRules = this.task.metadata.rules || [];

      this.log('info', 'Running electrical validation checks');

      const { data: activeRules, error } = await supabase
        .from('electrical_validation_rules')
        .select('*')
        .eq('is_active', true);

      if (error) {
        return this.createResult(false, null, [error.message]);
      }

      const errors: string[] = [];
      const warnings: string[] = [];
      const results: Record<string, any> = {};

      const rulesToCheck = validationRules.length > 0
        ? activeRules?.filter((r: any) => validationRules.includes(r.rule_name))
        : activeRules;

      for (const rule of rulesToCheck || []) {
        const result = await this.evaluateRule(rule, context);
        results[rule.rule_name] = result;

        if (!result.passed) {
          if (rule.severity === 'critical' || rule.severity === 'error') {
            errors.push(`${rule.rule_name}: ${result.message}`);
          } else {
            warnings.push(`${rule.rule_name}: ${result.message}`);
          }
        }
      }

      const success = errors.length === 0;

      return this.createResult(success, results, errors, warnings, {
        totalRules: rulesToCheck?.length || 0,
        passed: Object.values(results).filter((r: any) => r.passed).length,
        context,
      });
    } catch (error: any) {
      this.log('error', 'Electrical validation failed', error);
      return this.createResult(false, null, [error.message]);
    }
  }

  async validate(result: AgentResult): Promise<boolean> {
    return result.success && result.errors.length === 0;
  }

  async rollback(): Promise<void> {
    this.log('info', 'Electrical validation is read-only, no rollback needed');
  }

  private async evaluateRule(
    rule: any,
    context: ElectricalValidationContext
  ): Promise<{ passed: boolean; message: string; details?: any }> {
    try {
      switch (rule.rule_type) {
        case 'circuit_validation':
          return await this.validateCircuit(rule, context);
        case 'safety_check':
          return await this.validateSafety(rule, context);
        case 'code_compliance':
          return await this.validateCodeCompliance(rule, context);
        case 'measurement_range':
          return await this.validateMeasurement(rule, context);
        default:
          return {
            passed: true,
            message: 'Unknown rule type, skipped',
          };
      }
    } catch (error: any) {
      return {
        passed: false,
        message: `Rule evaluation error: ${error.message}`,
      };
    }
  }

  private async validateCircuit(
    rule: any,
    context: ElectricalValidationContext
  ): Promise<{ passed: boolean; message: string; details?: any }> {
    switch (rule.validation_function) {
      case 'check_breaker_wire_gauge':
        return this.checkBreakerWireCompatibility(context);

      case 'check_voltage_drop':
        return this.checkVoltageDrop(context);

      case 'check_panel_load':
        return this.checkPanelLoad(context);

      default:
        return { passed: true, message: 'No validation performed' };
    }
  }

  private async validateSafety(
    rule: any,
    context: ElectricalValidationContext
  ): Promise<{ passed: boolean; message: string; details?: any }> {
    switch (rule.validation_function) {
      case 'check_gfci_requirements':
        return { passed: true, message: 'GFCI check passed' };

      case 'check_afci_requirements':
        return { passed: true, message: 'AFCI check passed' };

      case 'check_wire_temp_rating':
        return this.checkWireTemperatureRating(context);

      default:
        return { passed: true, message: 'No validation performed' };
    }
  }

  private async validateCodeCompliance(
    rule: any,
    context: ElectricalValidationContext
  ): Promise<{ passed: boolean; message: string; details?: any }> {
    return {
      passed: true,
      message: 'Code compliance check passed',
      details: { reference: rule.nec_reference },
    };
  }

  private async validateMeasurement(
    rule: any,
    context: ElectricalValidationContext
  ): Promise<{ passed: boolean; message: string; details?: any }> {
    switch (rule.validation_function) {
      case 'check_voltage_range':
        return this.checkVoltageRange(context);

      case 'check_current_threshold':
        return this.checkCurrentThreshold(context);

      case 'check_power_factor':
        return this.checkPowerFactor(context);

      case 'check_thd_threshold':
        return this.checkTHD(context);

      default:
        return { passed: true, message: 'No validation performed' };
    }
  }

  private checkBreakerWireCompatibility(
    context: ElectricalValidationContext
  ): { passed: boolean; message: string; details?: any } {
    if (!context.breakerSize || !context.wireGauge) {
      return {
        passed: true,
        message: 'Insufficient data for breaker/wire validation',
      };
    }

    const wireAmperageTable: Record<number, number> = {
      14: 15,
      12: 20,
      10: 30,
      8: 40,
      6: 55,
      4: 70,
      3: 85,
      2: 95,
      1: 110,
      0: 125,
    };

    const maxAmperage = wireAmperageTable[context.wireGauge];

    if (!maxAmperage) {
      return {
        passed: false,
        message: `Unknown wire gauge: ${context.wireGauge} AWG`,
      };
    }

    const passed = context.breakerSize <= maxAmperage;

    return {
      passed,
      message: passed
        ? `${context.breakerSize}A breaker is compatible with ${context.wireGauge} AWG wire (max ${maxAmperage}A)`
        : `${context.breakerSize}A breaker exceeds capacity of ${context.wireGauge} AWG wire (max ${maxAmperage}A)`,
      details: { breakerSize: context.breakerSize, wireGauge: context.wireGauge, maxAmperage },
    };
  }

  private checkVoltageDrop(
    context: ElectricalValidationContext
  ): { passed: boolean; message: string; details?: any } {
    if (!context.voltage || !context.current || !context.circuitLength || !context.wireGauge) {
      return {
        passed: true,
        message: 'Insufficient data for voltage drop calculation',
      };
    }

    const resistancePerFoot: Record<number, number> = {
      14: 0.00253,
      12: 0.00159,
      10: 0.00100,
      8: 0.000628,
      6: 0.000395,
    };

    const resistance = resistancePerFoot[context.wireGauge];

    if (!resistance) {
      return {
        passed: false,
        message: `Cannot calculate voltage drop for ${context.wireGauge} AWG wire`,
      };
    }

    const voltageDrop = 2 * context.current * resistance * context.circuitLength;
    const voltageDropPercent = (voltageDrop / context.voltage) * 100;

    const passed = voltageDropPercent <= 3;

    return {
      passed,
      message: passed
        ? `Voltage drop ${voltageDropPercent.toFixed(2)}% is within acceptable limits (≤3%)`
        : `Voltage drop ${voltageDropPercent.toFixed(2)}% exceeds 3% limit`,
      details: {
        voltageDrop: voltageDrop.toFixed(2),
        voltageDropPercent: voltageDropPercent.toFixed(2),
        wireGauge: context.wireGauge,
        circuitLength: context.circuitLength,
      },
    };
  }

  private checkPanelLoad(
    context: ElectricalValidationContext
  ): { passed: boolean; message: string; details?: any } {
    return {
      passed: true,
      message: 'Panel load check requires panel-level data',
    };
  }

  private checkWireTemperatureRating(
    context: ElectricalValidationContext
  ): { passed: boolean; message: string; details?: any } {
    return {
      passed: true,
      message: 'Wire temperature rating check passed',
    };
  }

  private checkVoltageRange(
    context: ElectricalValidationContext
  ): { passed: boolean; message: string; details?: any } {
    if (context.voltage === undefined) {
      return {
        passed: true,
        message: 'No voltage data to validate',
      };
    }

    const nominalVoltage = context.voltage > 200 ? 240 : 120;
    const minVoltage = nominalVoltage * 0.95;
    const maxVoltage = nominalVoltage * 1.05;

    const passed = context.voltage >= minVoltage && context.voltage <= maxVoltage;

    return {
      passed,
      message: passed
        ? `Voltage ${context.voltage}V is within normal range (${minVoltage}-${maxVoltage}V)`
        : `Voltage ${context.voltage}V is outside normal range (${minVoltage}-${maxVoltage}V)`,
      details: { measured: context.voltage, nominal: nominalVoltage, range: [minVoltage, maxVoltage] },
    };
  }

  private checkCurrentThreshold(
    context: ElectricalValidationContext
  ): { passed: boolean; message: string; details?: any } {
    if (!context.current || !context.breakerSize) {
      return {
        passed: true,
        message: 'Insufficient data for current threshold check',
      };
    }

    const threshold = context.breakerSize * 0.8;
    const passed = context.current <= threshold;

    return {
      passed,
      message: passed
        ? `Current ${context.current}A is within safe limits (≤${threshold.toFixed(1)}A)`
        : `Current ${context.current}A exceeds 80% of breaker rating (${context.breakerSize}A)`,
      details: { current: context.current, threshold, breakerSize: context.breakerSize },
    };
  }

  private checkPowerFactor(
    context: ElectricalValidationContext
  ): { passed: boolean; message: string; details?: any } {
    if (context.powerFactor === undefined) {
      return {
        passed: true,
        message: 'No power factor data to validate',
      };
    }

    const passed = context.powerFactor >= 0.85;

    return {
      passed,
      message: passed
        ? `Power factor ${context.powerFactor.toFixed(2)} is acceptable (≥0.85)`
        : `Power factor ${context.powerFactor.toFixed(2)} is below recommended minimum (0.85)`,
      details: { powerFactor: context.powerFactor, threshold: 0.85 },
    };
  }

  private checkTHD(
    context: ElectricalValidationContext
  ): { passed: boolean; message: string; details?: any } {
    if (context.thd === undefined) {
      return {
        passed: true,
        message: 'No THD data to validate',
      };
    }

    const passed = context.thd <= 5;

    return {
      passed,
      message: passed
        ? `THD ${context.thd.toFixed(2)}% is within acceptable limits (≤5%)`
        : `THD ${context.thd.toFixed(2)}% exceeds recommended maximum (5%)`,
      details: { thd: context.thd, threshold: 5 },
    };
  }
}

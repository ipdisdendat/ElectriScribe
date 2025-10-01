import { enhancedOrchestrator } from './enhanced-task-orchestrator';
import type { SystemStateRequest } from './python-analysis-client';

export interface ElectricalNode {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rating?: number;
  current?: number;
  loadType?: string;
  name?: string;
}

export interface ElectricalConnection {
  id: string;
  from: string;
  to: string;
  phase?: 'L1' | 'L2';
  wire?: {
    awg: number;
    ampacity: number;
    specification?: string;
  };
}

export interface SystemAnalysis {
  totalLoad: number;
  phaseLoads: { L1: number; L2: number };
  phaseImbalance: number;
  utilization: number;
  maxCurrent: number;
  analysis: Array<{ type: 'success' | 'warning' | 'error'; message: string }>;
  recommendations: string[];
  holisticScore?: number;
  constraintViolations?: Array<{
    constraint_type: string;
    severity: number;
    message: string;
    cascading_risk: number;
    system_impact_score: number;
  }>;
  emergentBehaviors?: Array<{
    type: string;
    description: string;
  }>;
  pythonValidationStatus?: 'success' | 'warning' | 'error' | 'offline';
}

export class EnhancedElectricalAnalysisEngine {
  private panelRating = 200;
  private safetyFactor = 0.8;
  private pythonAvailable = true;

  async analyzeSystem(
    nodes: ElectricalNode[],
    connections: ElectricalConnection[]
  ): Promise<SystemAnalysis> {
    const basicAnalysis = this.performBasicAnalysis(nodes, connections);

    if (nodes.length === 0 || connections.length === 0) {
      return basicAnalysis;
    }

    try {
      const systemState = this.convertToSystemState(nodes, connections, basicAnalysis);
      const holisticValidation = await enhancedOrchestrator.validateCircuitWithPython({
        circuit_id: 'designer_preview',
        load_watts: basicAnalysis.totalLoad * 240,
        voltage: 240,
        wire_gauge: this.getMostCommonWireGauge(connections),
        wire_length_feet: this.calculateAverageWireLength(connections),
        environment_temp_c: 30,
        num_current_carrying_conductors: connections.length,
        conduit_type: 'PVC',
        installation_method: 'conduit',
      });

      return this.mergeAnalyses(basicAnalysis, holisticValidation, systemState);
    } catch (error) {
      console.warn('Python holistic validation unavailable, using basic analysis:', error);
      this.pythonAvailable = false;
      return {
        ...basicAnalysis,
        pythonValidationStatus: 'offline',
        analysis: [
          ...basicAnalysis.analysis,
          {
            type: 'warning',
            message: 'Advanced validation offline - basic checks only',
          },
        ],
      };
    }
  }

  private performBasicAnalysis(
    nodes: ElectricalNode[],
    connections: ElectricalConnection[]
  ): SystemAnalysis {
    const loads = nodes.filter((n) => n.type === 'load');
    let totalLoad = 0;
    let phaseLoads = { L1: 0, L2: 0 };

    connections.forEach((conn) => {
      const loadNode = nodes.find((n) => n.id === conn.to && n.type === 'load');
      if (loadNode) {
        const current = loadNode.current || 15;
        totalLoad += current;
        phaseLoads[conn.phase || 'L1'] += current;
      }
    });

    const phaseImbalance = Math.abs(phaseLoads.L1 - phaseLoads.L2);
    const utilization = Math.max(phaseLoads.L1, phaseLoads.L2) / this.panelRating;

    return {
      totalLoad,
      phaseLoads,
      phaseImbalance,
      utilization,
      maxCurrent: Math.max(phaseLoads.L1, phaseLoads.L2),
      analysis: this.generateBasicAnalysis(totalLoad, phaseImbalance, utilization),
      recommendations: this.generateBasicRecommendations(phaseImbalance, utilization),
    };
  }

  private convertToSystemState(
    nodes: ElectricalNode[],
    connections: ElectricalConnection[],
    basicAnalysis: SystemAnalysis
  ): SystemStateRequest {
    return {
      service_rating: this.panelRating,
      current_load: basicAnalysis.totalLoad,
      num_circuits: connections.length,
      phase_balance_ratio: basicAnalysis.phaseLoads.L1 / (basicAnalysis.phaseLoads.L2 || 1),
      temperature_rise: 10,
      voltage_drop_percent: this.estimateVoltageDrop(connections, basicAnalysis.totalLoad),
      harmonic_thd_percent: this.estimateHarmonicDistortion(nodes),
      power_factor: 0.95,
      utilization_factor: basicAnalysis.utilization,
      timestamp: Date.now() / 1000,
    };
  }

  private mergeAnalyses(
    basicAnalysis: SystemAnalysis,
    holisticValidation: any,
    systemState: SystemStateRequest
  ): SystemAnalysis {
    const merged: SystemAnalysis = {
      ...basicAnalysis,
      holisticScore: holisticValidation.holistic_score,
      constraintViolations: holisticValidation.constraint_violations || [],
      emergentBehaviors: holisticValidation.emergent_behaviors || [],
      pythonValidationStatus:
        holisticValidation.holistic_score >= 85
          ? 'success'
          : holisticValidation.holistic_score >= 70
            ? 'warning'
            : 'error',
    };

    const criticalViolations = (holisticValidation.constraint_violations || []).filter(
      (v: any) => v.system_impact_score > 0.7
    );

    if (criticalViolations.length > 0) {
      merged.analysis = [
        {
          type: 'error',
          message: `${criticalViolations.length} critical constraint violation(s)`,
        },
        ...merged.analysis,
      ];

      criticalViolations.forEach((v: any) => {
        merged.recommendations.push(v.message);
      });
    }

    if (holisticValidation.emergent_behaviors && holisticValidation.emergent_behaviors.length > 0) {
      merged.analysis.push({
        type: 'warning',
        message: `${holisticValidation.emergent_behaviors.length} emergent behavior(s) detected`,
      });
    }

    return merged;
  }

  private generateBasicAnalysis(
    totalLoad: number,
    imbalance: number,
    utilization: number
  ): Array<{ type: 'success' | 'warning' | 'error'; message: string }> {
    const status: Array<{ type: 'success' | 'warning' | 'error'; message: string }> = [];

    if (utilization > 0.9) status.push({ type: 'error', message: 'Panel overloaded' });
    else if (utilization > 0.8)
      status.push({ type: 'warning', message: 'Approaching capacity' });
    else status.push({ type: 'success', message: 'Load within limits' });

    if (imbalance > 20) status.push({ type: 'warning', message: 'Phase imbalance detected' });

    return status;
  }

  private generateBasicRecommendations(imbalance: number, utilization: number): string[] {
    const recommendations: string[] = [];

    if (imbalance > 20) {
      recommendations.push('Redistribute loads between phases');
    }

    if (utilization > 0.8) {
      recommendations.push('Consider installing sub-panel');
      recommendations.push('Implement load management system');
    }

    return recommendations;
  }

  private getMostCommonWireGauge(connections: ElectricalConnection[]): number {
    const gauges = connections.map((c) => c.wire?.awg || 14);
    const counts = gauges.reduce(
      (acc, g) => {
        acc[g] = (acc[g] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );
    return Number(Object.keys(counts).sort((a, b) => counts[Number(b)] - counts[Number(a)])[0]);
  }

  private calculateAverageWireLength(connections: ElectricalConnection[]): number {
    return 50;
  }

  private estimateVoltageDrop(connections: ElectricalConnection[], totalLoad: number): number {
    return (totalLoad * 50) / (240 * 1000);
  }

  private estimateHarmonicDistortion(nodes: ElectricalNode[]): number {
    const nonLinearLoads = nodes.filter(
      (n) => n.loadType === 'APPLIANCE' || n.loadType === 'EV_CHARGER'
    ).length;
    return (nonLinearLoads / Math.max(nodes.length, 1)) * 15;
  }
}

export const enhancedElectricalAnalysisEngine = new EnhancedElectricalAnalysisEngine();

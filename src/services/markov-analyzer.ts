import { supabase } from './supabase';

export interface StateTransition {
  fromState: string;
  toState: string;
  taskType: string;
  confidenceRange: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  transitionCount: number;
  successCount: number;
  avgTimeMs: number;
}

export interface MarkovPrediction {
  nextStates: Array<{
    state: string;
    probability: number;
    expectedTimeMs: number;
    successProbability: number;
  }>;
  recommendedAction: string;
  confidence: number;
}

export class MarkovChainAnalyzer {
  private transitionMatrix: Map<string, Map<string, StateTransition>> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    const { data, error } = await supabase
      .from('markov_state_transitions')
      .select('*');

    if (error) throw error;

    this.transitionMatrix.clear();

    data?.forEach((transition) => {
      const key = this.getTransitionKey(
        transition.from_state,
        transition.task_type,
        transition.confidence_range
      );

      if (!this.transitionMatrix.has(key)) {
        this.transitionMatrix.set(key, new Map());
      }

      this.transitionMatrix.get(key)!.set(transition.to_state, {
        fromState: transition.from_state,
        toState: transition.to_state,
        taskType: transition.task_type,
        confidenceRange: transition.confidence_range,
        transitionCount: transition.transition_count,
        successCount: transition.success_count,
        avgTimeMs: transition.avg_time_ms,
      });
    });

    this.initialized = true;
  }

  async recordTransition(
    fromState: string,
    toState: string,
    taskType: string,
    confidenceScore: number,
    durationMs: number,
    wasSuccessful: boolean
  ): Promise<void> {
    const confidenceRange = this.getConfidenceRange(confidenceScore);

    const { data: existing } = await supabase
      .from('markov_state_transitions')
      .select('*')
      .eq('from_state', fromState)
      .eq('to_state', toState)
      .eq('task_type', taskType)
      .eq('confidence_range', confidenceRange)
      .maybeSingle();

    if (existing) {
      const newCount = existing.transition_count + 1;
      const newSuccessCount = existing.success_count + (wasSuccessful ? 1 : 0);
      const newAvgTime = Math.round(
        (existing.avg_time_ms * existing.transition_count + durationMs) / newCount
      );

      await supabase
        .from('markov_state_transitions')
        .update({
          transition_count: newCount,
          success_count: newSuccessCount,
          avg_time_ms: newAvgTime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('markov_state_transitions')
        .insert({
          from_state: fromState,
          to_state: toState,
          task_type: taskType,
          confidence_range: confidenceRange,
          transition_count: 1,
          success_count: wasSuccessful ? 1 : 0,
          avg_time_ms: durationMs,
        });
    }

    await this.initialize();
  }

  async predictNextStates(
    currentState: string,
    taskType: string,
    currentConfidence: number
  ): Promise<MarkovPrediction> {
    if (!this.initialized) {
      await this.initialize();
    }

    const confidenceRange = this.getConfidenceRange(currentConfidence);
    const key = this.getTransitionKey(currentState, taskType, confidenceRange);
    const transitions = this.transitionMatrix.get(key);

    if (!transitions || transitions.size === 0) {
      return {
        nextStates: [],
        recommendedAction: 'No historical data available. Proceed with caution and thorough testing.',
        confidence: 0,
      };
    }

    const totalTransitions = Array.from(transitions.values()).reduce(
      (sum, t) => sum + t.transitionCount,
      0
    );

    const nextStates = Array.from(transitions.values())
      .map((t) => ({
        state: t.toState,
        probability: t.transitionCount / totalTransitions,
        expectedTimeMs: t.avgTimeMs,
        successProbability: t.successCount / t.transitionCount,
      }))
      .sort((a, b) => b.probability - a.probability);

    const mostLikelyState = nextStates[0];
    const overallConfidence = nextStates.reduce(
      (sum, s) => sum + s.probability * s.successProbability,
      0
    );

    let recommendedAction = '';

    if (currentConfidence < 88) {
      recommendedAction = 'CRITICAL: Confidence below floor threshold. Initiate rollback or intensive correction.';
    } else if (currentConfidence < 96) {
      recommendedAction = 'Confidence below target. Continue thorough testing and consider correction strategies.';
    } else if (mostLikelyState.successProbability < 0.7) {
      recommendedAction = `Warning: Low success probability (${(mostLikelyState.successProbability * 100).toFixed(1)}%) for transition to ${mostLikelyState.state}. Apply extra validation.`;
    } else {
      recommendedAction = `Proceed to ${mostLikelyState.state}. Expected duration: ${(mostLikelyState.expectedTimeMs / 1000).toFixed(1)}s.`;
    }

    return {
      nextStates,
      recommendedAction,
      confidence: overallConfidence * 100,
    };
  }

  async analyzeTaskPattern(taskType: string): Promise<{
    averageSuccessRate: number;
    commonFailurePoint: string | null;
    averageCompletionTimeMs: number;
    totalObservations: number;
  }> {
    const { data, error } = await supabase
      .from('markov_state_transitions')
      .select('*')
      .eq('task_type', taskType);

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        averageSuccessRate: 0,
        commonFailurePoint: null,
        averageCompletionTimeMs: 0,
        totalObservations: 0,
      };
    }

    const totalTransitions = data.reduce((sum, t) => sum + t.transition_count, 0);
    const totalSuccesses = data.reduce((sum, t) => sum + t.success_count, 0);
    const averageSuccessRate = totalSuccesses / totalTransitions;

    const failureTransitions = data.filter(
      (t) => t.to_state === 'failed' || t.to_state === 'error'
    );
    const commonFailurePoint = failureTransitions.length > 0
      ? failureTransitions.reduce((prev, curr) =>
          curr.transition_count > prev.transition_count ? curr : prev
        ).from_state
      : null;

    const completionTransitions = data.filter((t) => t.to_state === 'completed');
    const averageCompletionTimeMs = completionTransitions.length > 0
      ? completionTransitions.reduce((sum, t) => sum + t.avg_time_ms, 0) /
        completionTransitions.length
      : 0;

    return {
      averageSuccessRate,
      commonFailurePoint,
      averageCompletionTimeMs,
      totalObservations: totalTransitions,
    };
  }

  private getConfidenceRange(
    score: number
  ): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
    if (score < 70) return 'very_low';
    if (score < 85) return 'low';
    if (score < 93) return 'medium';
    if (score < 98) return 'high';
    return 'very_high';
  }

  private getTransitionKey(
    state: string,
    taskType: string,
    confidenceRange: string
  ): string {
    return `${state}|${taskType}|${confidenceRange}`;
  }

  async getOptimalPath(
    startState: string,
    targetState: string,
    taskType: string,
    currentConfidence: number
  ): Promise<{
    path: string[];
    totalProbability: number;
    expectedDurationMs: number;
  } | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const visited = new Set<string>();
    const queue: Array<{
      state: string;
      path: string[];
      probability: number;
      duration: number;
    }> = [{ state: startState, path: [startState], probability: 1, duration: 0 }];

    let bestPath: {
      path: string[];
      totalProbability: number;
      expectedDurationMs: number;
    } | null = null;

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.state === targetState) {
        if (!bestPath || current.probability > bestPath.totalProbability) {
          bestPath = {
            path: current.path,
            totalProbability: current.probability,
            expectedDurationMs: current.duration,
          };
        }
        continue;
      }

      if (visited.has(current.state)) continue;
      visited.add(current.state);

      const confidenceRange = this.getConfidenceRange(currentConfidence);
      const key = this.getTransitionKey(current.state, taskType, confidenceRange);
      const transitions = this.transitionMatrix.get(key);

      if (!transitions) continue;

      const totalCount = Array.from(transitions.values()).reduce(
        (sum, t) => sum + t.transitionCount,
        0
      );

      for (const transition of transitions.values()) {
        const transitionProb = transition.transitionCount / totalCount;
        const newProbability = current.probability * transitionProb;

        if (newProbability > 0.01) {
          queue.push({
            state: transition.toState,
            path: [...current.path, transition.toState],
            probability: newProbability,
            duration: current.duration + transition.avgTimeMs,
          });
        }
      }
    }

    return bestPath;
  }
}

export const markovAnalyzer = new MarkovChainAnalyzer();

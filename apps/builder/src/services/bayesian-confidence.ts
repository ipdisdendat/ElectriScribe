import { supabase } from './supabase';

export interface BayesianPrior {
  taskType: string;
  complexityScore: number;
  priorSuccessRate: number;
  priorAvgConfidence: number;
  sampleSize: number;
  alpha: number;
  beta: number;
}

export interface ConfidenceUpdate {
  posteriorConfidence: number;
  uncertainty: number;
  recommendation: string;
  meetsFloor: boolean;
  meetsTarget: boolean;
  improvementNeeded: number;
}

export interface TestEvidence {
  passed: boolean;
  weight: number;
  isCritical: boolean;
}

export class BayesianConfidenceScorer {
  private priors: Map<string, BayesianPrior> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    const { data, error } = await supabase
      .from('bayesian_priors')
      .select('*');

    if (error) throw error;

    this.priors.clear();

    data?.forEach((prior) => {
      const key = this.getPriorKey(prior.task_type, prior.complexity_score);
      this.priors.set(key, {
        taskType: prior.task_type,
        complexityScore: prior.complexity_score,
        priorSuccessRate: prior.prior_success_rate,
        priorAvgConfidence: prior.prior_avg_confidence,
        sampleSize: prior.sample_size,
        alpha: prior.alpha,
        beta: prior.beta,
      });
    });

    this.initialized = true;
  }

  async calculateConfidence(
    taskType: string,
    complexityScore: number,
    testResults: TestEvidence[],
    floorThreshold: number = 88,
    targetThreshold: number = 96
  ): Promise<ConfidenceUpdate> {
    if (!this.initialized) {
      await this.initialize();
    }

    const prior = await this.getPrior(taskType, complexityScore);

    if (testResults.length === 0) {
      return {
        posteriorConfidence: prior.priorAvgConfidence,
        uncertainty: this.calculateUncertainty(prior.alpha, prior.beta),
        recommendation: 'No test evidence available. Using prior confidence only.',
        meetsFloor: prior.priorAvgConfidence >= floorThreshold,
        meetsTarget: prior.priorAvgConfidence >= targetThreshold,
        improvementNeeded: Math.max(0, targetThreshold - prior.priorAvgConfidence),
      };
    }

    const criticalTestsPassed = testResults
      .filter((t) => t.isCritical)
      .every((t) => t.passed);

    if (!criticalTestsPassed) {
      return {
        posteriorConfidence: 0,
        uncertainty: 100,
        recommendation: 'CRITICAL FAILURE: One or more critical tests failed. Task cannot proceed.',
        meetsFloor: false,
        meetsTarget: false,
        improvementNeeded: targetThreshold,
      };
    }

    const totalWeight = testResults.reduce((sum, t) => sum + t.weight, 0);
    const passedWeight = testResults
      .filter((t) => t.passed)
      .reduce((sum, t) => sum + t.weight, 0);
    const testPassRate = totalWeight > 0 ? passedWeight / totalWeight : 0;

    const likelihoodSuccess = testPassRate;
    const likelihoodFailure = 1 - testPassRate;

    const priorProbSuccess = prior.priorSuccessRate;
    const priorProbFailure = 1 - prior.priorSuccessRate;

    const evidence =
      likelihoodSuccess * priorProbSuccess +
      likelihoodFailure * priorProbFailure;

    const posteriorProbSuccess =
      (likelihoodSuccess * priorProbSuccess) / evidence;

    const updatedAlpha = prior.alpha + testResults.filter((t) => t.passed).length;
    const updatedBeta = prior.beta + testResults.filter((t) => !t.passed).length;

    const betaMean = updatedAlpha / (updatedAlpha + updatedBeta);

    const baseConfidence = prior.priorAvgConfidence * posteriorProbSuccess;
    const testConfidence = testPassRate * 100;

    const posteriorConfidence = Math.round(
      baseConfidence * 0.3 + testConfidence * 0.5 + betaMean * 100 * 0.2
    );

    const uncertainty = this.calculateUncertainty(updatedAlpha, updatedBeta);

    const meetsFloor = posteriorConfidence >= floorThreshold;
    const meetsTarget = posteriorConfidence >= targetThreshold;
    const improvementNeeded = Math.max(0, targetThreshold - posteriorConfidence);

    let recommendation = '';

    if (!meetsFloor) {
      recommendation = `CRITICAL: Confidence ${posteriorConfidence}% is below floor ${floorThreshold}%. Immediate rollback or intensive correction required.`;
    } else if (!meetsTarget) {
      recommendation = `Confidence ${posteriorConfidence}% is below target ${targetThreshold}%. Continue thorough testing. Need ${improvementNeeded.toFixed(1)}% improvement.`;
    } else {
      recommendation = `Confidence ${posteriorConfidence}% meets target ${targetThreshold}%. Task quality acceptable.`;
    }

    if (uncertainty > 20) {
      recommendation += ` High uncertainty (${uncertainty.toFixed(1)}%) - more test data recommended.`;
    }

    await this.updatePrior(
      taskType,
      complexityScore,
      posteriorConfidence,
      testPassRate >= 0.95,
      updatedAlpha,
      updatedBeta
    );

    return {
      posteriorConfidence,
      uncertainty,
      recommendation,
      meetsFloor,
      meetsTarget,
      improvementNeeded,
    };
  }

  private async getPrior(
    taskType: string,
    complexityScore: number
  ): Promise<BayesianPrior> {
    const roundedComplexity = Math.round(complexityScore);
    let key = this.getPriorKey(taskType, roundedComplexity);

    let prior = this.priors.get(key);

    if (!prior) {
      const nearestComplexity = this.findNearestComplexity(taskType, complexityScore);
      key = this.getPriorKey(taskType, nearestComplexity);
      prior = this.priors.get(key);
    }

    if (!prior) {
      prior = {
        taskType,
        complexityScore: roundedComplexity,
        priorSuccessRate: 0.75,
        priorAvgConfidence: 85,
        sampleSize: 1,
        alpha: 3,
        beta: 1,
      };

      const { error } = await supabase
        .from('bayesian_priors')
        .insert({
          task_type: taskType,
          complexity_score: roundedComplexity,
          prior_success_rate: prior.priorSuccessRate,
          prior_avg_confidence: prior.priorAvgConfidence,
          sample_size: prior.sampleSize,
          alpha: prior.alpha,
          beta: prior.beta,
        });

      if (!error) {
        this.priors.set(key, prior);
      }
    }

    return prior;
  }

  private async updatePrior(
    taskType: string,
    complexityScore: number,
    newConfidence: number,
    wasSuccessful: boolean,
    newAlpha: number,
    newBeta: number
  ): Promise<void> {
    const roundedComplexity = Math.round(complexityScore);
    const key = this.getPriorKey(taskType, roundedComplexity);
    const prior = this.priors.get(key);

    if (!prior) return;

    const newSampleSize = prior.sampleSize + 1;
    const newSuccessRate =
      (prior.priorSuccessRate * prior.sampleSize + (wasSuccessful ? 1 : 0)) /
      newSampleSize;
    const newAvgConfidence =
      (prior.priorAvgConfidence * prior.sampleSize + newConfidence) /
      newSampleSize;

    await supabase
      .from('bayesian_priors')
      .update({
        prior_success_rate: newSuccessRate,
        prior_avg_confidence: newAvgConfidence,
        sample_size: newSampleSize,
        alpha: newAlpha,
        beta: newBeta,
        updated_at: new Date().toISOString(),
      })
      .eq('task_type', taskType)
      .eq('complexity_score', roundedComplexity);

    this.priors.set(key, {
      ...prior,
      priorSuccessRate: newSuccessRate,
      priorAvgConfidence: newAvgConfidence,
      sampleSize: newSampleSize,
      alpha: newAlpha,
      beta: newBeta,
    });
  }

  private findNearestComplexity(
    taskType: string,
    complexityScore: number
  ): number {
    const priorsForType = Array.from(this.priors.values()).filter(
      (p) => p.taskType === taskType
    );

    if (priorsForType.length === 0) {
      return Math.min(10, Math.max(1, Math.round(complexityScore)));
    }

    return priorsForType.reduce((nearest, prior) => {
      const currentDiff = Math.abs(prior.complexityScore - complexityScore);
      const nearestDiff = Math.abs(nearest - complexityScore);
      return currentDiff < nearestDiff ? prior.complexityScore : nearest;
    }, priorsForType[0].complexityScore);
  }

  private calculateUncertainty(alpha: number, beta: number): number {
    const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
    const stdDev = Math.sqrt(variance);
    return Math.round(stdDev * 100 * 2);
  }

  private getPriorKey(taskType: string, complexityScore: number): string {
    return `${taskType}|${complexityScore}`;
  }

  async getConfidenceTrend(
    taskType: string,
    complexityScore: number,
    windowSize: number = 10
  ): Promise<{
    trend: 'improving' | 'stable' | 'declining';
    avgConfidence: number;
    volatility: number;
  }> {
    const { data, error } = await supabase
      .from('task_executions')
      .select('confidence_score, created_at')
      .eq('task_id', taskType)
      .order('created_at', { ascending: false })
      .limit(windowSize);

    if (error || !data || data.length < 3) {
      return {
        trend: 'stable',
        avgConfidence: 0,
        volatility: 0,
      };
    }

    const scores = data.map((d) => d.confidence_score || 0);
    const avgConfidence = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    const variance =
      scores.reduce((sum, s) => sum + (s - avgConfidence) ** 2, 0) / scores.length;
    const volatility = Math.sqrt(variance);

    const recentAvg = scores.slice(0, Math.floor(scores.length / 2))
      .reduce((sum, s) => sum + s, 0) / Math.floor(scores.length / 2);
    const olderAvg = scores.slice(Math.floor(scores.length / 2))
      .reduce((sum, s) => sum + s, 0) / (scores.length - Math.floor(scores.length / 2));

    const difference = recentAvg - olderAvg;

    let trend: 'improving' | 'stable' | 'declining';
    if (difference > 2) {
      trend = 'improving';
    } else if (difference < -2) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    return {
      trend,
      avgConfidence: Math.round(avgConfidence),
      volatility: Math.round(volatility),
    };
  }

  async simulateOutcome(
    taskType: string,
    complexityScore: number,
    proposedTestCount: number
  ): Promise<{
    expectedConfidence: number;
    confidenceInterval: [number, number];
    probabilityMeetsTarget: number;
  }> {
    const prior = await this.getPrior(taskType, complexityScore);

    const expectedPassRate = prior.priorSuccessRate;
    const expectedPasses = Math.round(proposedTestCount * expectedPassRate);

    const simulatedTests: TestEvidence[] = Array.from(
      { length: proposedTestCount },
      (_, i) => ({
        passed: i < expectedPasses,
        weight: 1,
        isCritical: i === 0,
      })
    );

    const result = await this.calculateConfidence(
      taskType,
      complexityScore,
      simulatedTests,
      88,
      96
    );

    const stdDev = result.uncertainty / 2;
    const confidenceInterval: [number, number] = [
      Math.max(0, result.posteriorConfidence - stdDev),
      Math.min(100, result.posteriorConfidence + stdDev),
    ];

    const zScore = (96 - result.posteriorConfidence) / (stdDev / 100);
    const probabilityMeetsTarget = this.normalCDF(zScore);

    return {
      expectedConfidence: result.posteriorConfidence,
      confidenceInterval,
      probabilityMeetsTarget: Math.round((1 - probabilityMeetsTarget) * 100),
    };
  }

  private normalCDF(z: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    const probability =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - probability : probability;
  }
}

export const bayesianScorer = new BayesianConfidenceScorer();

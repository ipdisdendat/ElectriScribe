import { supabase } from './supabase';
import { taskOrchestrator, Task, TaskExecution } from './task-orchestrator';
import { markovAnalyzer } from './markov-analyzer';
import { bayesianScorer } from './bayesian-confidence';

export interface CorrectionStrategy {
  type: 'retry' | 'alternative_approach' | 'parameter_adjustment' | 'rollback';
  priority: number;
  estimatedSuccessRate: number;
  description: string;
  action: () => Promise<CorrectionResult>;
}

export interface CorrectionResult {
  success: boolean;
  newConfidence: number;
  message: string;
  metadata?: Record<string, any>;
}

export interface RollbackPoint {
  taskId: string;
  executionId: string;
  timestamp: string;
  state: Record<string, any>;
  confidenceScore: number;
}

export class SelfCorrectionEngine {
  private rollbackPoints: Map<string, RollbackPoint[]> = new Map();
  private maxRetries = 3;
  private correctionHistory: Map<string, number> = new Map();

  async analyzeFailure(
    taskId: string,
    executionId: string
  ): Promise<{
    diagnosis: string;
    rootCause: string;
    suggestedStrategies: CorrectionStrategy[];
  }> {
    const task = await taskOrchestrator.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const { data: execution, error: execError } = await supabase
      .from('task_executions')
      .select('*')
      .eq('id', executionId)
      .single();

    if (execError) throw execError;

    const { data: testResults, error: testError } = await supabase
      .from('task_test_results')
      .select('*, test:task_tests(*)')
      .eq('execution_id', executionId);

    if (testError) throw testError;

    const failedTests = testResults?.filter((tr) => !tr.passed) || [];
    const criticalFailures = failedTests.filter((tr) => tr.test?.is_critical);

    const prediction = await markovAnalyzer.predictNextStates(
      task.status,
      task.taskType,
      task.confidenceScore
    );

    const diagnosis = this.generateDiagnosis(task, execution, failedTests, prediction);
    const rootCause = this.identifyRootCause(task, execution, failedTests);
    const suggestedStrategies = await this.generateStrategies(
      task,
      execution,
      failedTests,
      criticalFailures.length > 0
    );

    return {
      diagnosis,
      rootCause,
      suggestedStrategies,
    };
  }

  async applyCorrection(
    taskId: string,
    executionId: string,
    strategy: CorrectionStrategy
  ): Promise<CorrectionResult> {
    const beforeConfidence = (await taskOrchestrator.getTask(taskId))?.confidenceScore || 0;

    const result = await strategy.action();

    await supabase.from('task_corrections').insert({
      execution_id: executionId,
      correction_type: strategy.type,
      analysis: strategy.description,
      action_taken: JSON.stringify({ type: strategy.type, priority: strategy.priority }),
      before_confidence: beforeConfidence,
      after_confidence: result.newConfidence,
      success: result.success,
    });

    const correctionKey = `${taskId}_${strategy.type}`;
    this.correctionHistory.set(
      correctionKey,
      (this.correctionHistory.get(correctionKey) || 0) + 1
    );

    return result;
  }

  async attemptAutoCorrection(taskId: string, executionId: string): Promise<{
    corrected: boolean;
    finalConfidence: number;
    strategiesApplied: string[];
    message: string;
  }> {
    const analysis = await this.analyzeFailure(taskId, executionId);
    const strategiesApplied: string[] = [];

    for (const strategy of analysis.suggestedStrategies) {
      if (await this.shouldApplyStrategy(taskId, strategy)) {
        const result = await this.applyCorrection(taskId, executionId, strategy);
        strategiesApplied.push(strategy.type);

        if (result.success && result.newConfidence >= 88) {
          return {
            corrected: true,
            finalConfidence: result.newConfidence,
            strategiesApplied,
            message: `Successfully corrected using ${strategy.type}. ${result.message}`,
          };
        }

        if (result.newConfidence < 50) {
          break;
        }
      }
    }

    const task = await taskOrchestrator.getTask(taskId);
    const finalConfidence = task?.confidenceScore || 0;

    if (finalConfidence >= 88) {
      return {
        corrected: true,
        finalConfidence,
        strategiesApplied,
        message: 'Task corrected after applying multiple strategies',
      };
    }

    return {
      corrected: false,
      finalConfidence,
      strategiesApplied,
      message: 'Auto-correction failed. Manual intervention required.',
    };
  }

  async createRollbackPoint(taskId: string, executionId: string): Promise<void> {
    const task = await taskOrchestrator.getTask(taskId);
    if (!task) return;

    const rollbackPoint: RollbackPoint = {
      taskId,
      executionId,
      timestamp: new Date().toISOString(),
      state: {
        status: task.status,
        confidenceScore: task.confidenceScore,
        metadata: task.metadata,
      },
      confidenceScore: task.confidenceScore,
    };

    if (!this.rollbackPoints.has(taskId)) {
      this.rollbackPoints.set(taskId, []);
    }

    this.rollbackPoints.get(taskId)!.push(rollbackPoint);

    const points = this.rollbackPoints.get(taskId)!;
    if (points.length > 10) {
      points.shift();
    }
  }

  async rollback(taskId: string, targetExecutionId?: string): Promise<{
    success: boolean;
    message: string;
    restoredState: Record<string, any>;
  }> {
    const points = this.rollbackPoints.get(taskId);
    if (!points || points.length === 0) {
      return {
        success: false,
        message: 'No rollback points available',
        restoredState: {},
      };
    }

    let targetPoint: RollbackPoint;

    if (targetExecutionId) {
      targetPoint = points.find((p) => p.executionId === targetExecutionId)!;
      if (!targetPoint) {
        return {
          success: false,
          message: 'Specified rollback point not found',
          restoredState: {},
        };
      }
    } else {
      targetPoint = points.filter((p) => p.confidenceScore >= 88).pop() || points[points.length - 1];
    }

    await supabase
      .from('tasks')
      .update({
        status: targetPoint.state.status,
        confidence_score: targetPoint.state.confidenceScore,
        metadata: targetPoint.state.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    return {
      success: true,
      message: `Rolled back to state from ${targetPoint.timestamp}`,
      restoredState: targetPoint.state,
    };
  }

  private generateDiagnosis(
    task: Task,
    execution: any,
    failedTests: any[],
    prediction: any
  ): string {
    const parts: string[] = [];

    parts.push(`Task "${task.name}" (${task.taskType}) failed with confidence ${task.confidenceScore}%.`);

    if (failedTests.length > 0) {
      const criticalCount = failedTests.filter((t) => t.test?.is_critical).length;
      parts.push(
        `${failedTests.length} test(s) failed${criticalCount > 0 ? ` (${criticalCount} critical)` : ''}.`
      );
    }

    if (execution.error_message) {
      parts.push(`Error: ${execution.error_message}`);
    }

    if (prediction.recommendedAction) {
      parts.push(`Recommendation: ${prediction.recommendedAction}`);
    }

    return parts.join(' ');
  }

  private identifyRootCause(task: Task, execution: any, failedTests: any[]): string {
    if (execution.error_message?.includes('timeout')) {
      return 'Task exceeded execution time limit. Complexity may be underestimated.';
    }

    if (execution.error_message?.includes('memory')) {
      return 'Insufficient memory allocation. Resource requirements may be higher than expected.';
    }

    const criticalFailures = failedTests.filter((t) => t.test?.is_critical);
    if (criticalFailures.length > 0) {
      return `Critical test failure: ${criticalFailures[0].error_message || 'Core functionality broken'}`;
    }

    if (failedTests.length > failedTests.length * 0.5) {
      return 'Widespread test failures indicate fundamental implementation issue.';
    }

    if (task.confidenceScore < 70) {
      return 'Low confidence suggests insufficient test coverage or poor implementation quality.';
    }

    return 'Cause unclear. May require manual investigation.';
  }

  private async generateStrategies(
    task: Task,
    execution: any,
    failedTests: any[],
    hasCriticalFailures: boolean
  ): Promise<CorrectionStrategy[]> {
    const strategies: CorrectionStrategy[] = [];

    if (hasCriticalFailures) {
      strategies.push({
        type: 'rollback',
        priority: 1,
        estimatedSuccessRate: 1.0,
        description: 'Critical failure detected. Rollback to last known good state.',
        action: async () => {
          const rollbackResult = await this.rollback(task.id);
          return {
            success: rollbackResult.success,
            newConfidence: 0,
            message: rollbackResult.message,
          };
        },
      });
    }

    const attemptCount = this.correctionHistory.get(`${task.id}_retry`) || 0;
    if (attemptCount < this.maxRetries && !hasCriticalFailures) {
      const pattern = await markovAnalyzer.analyzeTaskPattern(task.taskType);
      strategies.push({
        type: 'retry',
        priority: 2,
        estimatedSuccessRate: pattern.averageSuccessRate,
        description: `Retry execution (attempt ${attemptCount + 1}/${this.maxRetries}). Historical success rate: ${(pattern.averageSuccessRate * 100).toFixed(1)}%`,
        action: async () => {
          const newExecution = await taskOrchestrator.executeTask(task.id);
          const testResult = await taskOrchestrator.runTests(task.id, newExecution.id);
          return {
            success: testResult.passed,
            newConfidence: testResult.confidenceUpdate.posteriorConfidence,
            message: testResult.confidenceUpdate.recommendation,
          };
        },
      });
    }

    if (task.complexityScore > 5) {
      strategies.push({
        type: 'alternative_approach',
        priority: 3,
        estimatedSuccessRate: 0.7,
        description: 'Decompose task into smaller subtasks with reduced complexity.',
        action: async () => {
          const subtasks = await taskOrchestrator.decomposeTask(task.id);
          return {
            success: subtasks.length > 1,
            newConfidence: task.confidenceScore + 10,
            message: `Task decomposed into ${subtasks.length} subtasks`,
            metadata: { subtasks: subtasks.map((st) => st.id) },
          };
        },
      });
    }

    if (failedTests.length > 0 && failedTests.length < 5) {
      strategies.push({
        type: 'parameter_adjustment',
        priority: 4,
        estimatedSuccessRate: 0.6,
        description: 'Adjust task parameters based on test feedback.',
        action: async () => {
          const adjustedComplexity = Math.max(1, task.complexityScore - 1);
          await supabase
            .from('tasks')
            .update({
              complexity_score: adjustedComplexity,
              metadata: {
                ...task.metadata,
                adjusted: true,
                originalComplexity: task.complexityScore,
              },
            })
            .eq('id', task.id);

          return {
            success: true,
            newConfidence: task.confidenceScore + 5,
            message: `Adjusted complexity from ${task.complexityScore} to ${adjustedComplexity}`,
          };
        },
      });
    }

    return strategies.sort((a, b) => a.priority - b.priority);
  }

  private async shouldApplyStrategy(
    taskId: string,
    strategy: CorrectionStrategy
  ): Promise<boolean> {
    const task = await taskOrchestrator.getTask(taskId);
    if (!task) return false;

    if (strategy.type === 'rollback') {
      return task.confidenceScore < task.floorConfidence;
    }

    if (strategy.type === 'retry') {
      const retryCount = this.correctionHistory.get(`${taskId}_retry`) || 0;
      return retryCount < this.maxRetries;
    }

    if (strategy.estimatedSuccessRate < 0.3) {
      return false;
    }

    return true;
  }

  async getCorrectionHistory(taskId: string): Promise<{
    corrections: any[];
    totalAttempts: number;
    successRate: number;
  }> {
    const { data, error } = await supabase
      .from('task_corrections')
      .select('*, execution:task_executions(*)')
      .eq('execution.task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const corrections = data || [];
    const totalAttempts = corrections.length;
    const successfulCorrections = corrections.filter((c) => c.success).length;
    const successRate = totalAttempts > 0 ? successfulCorrections / totalAttempts : 0;

    return {
      corrections,
      totalAttempts,
      successRate,
    };
  }

  async predictCorrectionOutcome(
    taskId: string,
    strategyType: CorrectionStrategy['type']
  ): Promise<{
    estimatedConfidence: number;
    estimatedDuration: number;
    successProbability: number;
  }> {
    const task = await taskOrchestrator.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const pattern = await markovAnalyzer.analyzeTaskPattern(task.taskType);
    const simulation = await bayesianScorer.simulateOutcome(
      task.taskType,
      task.complexityScore,
      5
    );

    const successProbability = pattern.averageSuccessRate * (simulation.probabilityMeetsTarget / 100);

    return {
      estimatedConfidence: simulation.expectedConfidence,
      estimatedDuration: pattern.averageCompletionTimeMs,
      successProbability: Math.round(successProbability * 100),
    };
  }
}

export const selfCorrectionEngine = new SelfCorrectionEngine();

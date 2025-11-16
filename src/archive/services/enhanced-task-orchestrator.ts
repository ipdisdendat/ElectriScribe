import { taskOrchestrator, Task } from './task-orchestrator';
import { knowledgeLearner } from './knowledge-learner';
import { tokenOptimizer } from './token-optimizer';
import { selfCorrectionEngine } from './self-correction-engine';
import { createAgent } from './task-agents';
import { pythonAnalysisClient, type SystemStateRequest, type HolisticValidationResult, type CircuitDataRequest } from './python-analysis-client';

export class EnhancedTaskOrchestrator {
  async executeTaskWithOptimization(taskId: string): Promise<{
    success: boolean;
    confidence: number;
    tokensUsed: number;
    tokensSaved: number;
    learningsApplied: number;
    message: string;
    holisticValidation?: HolisticValidationResult;
  }> {
    const task = await taskOrchestrator.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    await knowledgeLearner.initialize();

    const validation = await knowledgeLearner.validateBeforeExecution(
      task.taskType,
      JSON.stringify(task.metadata)
    );

    if (!validation.canProceed) {
      return {
        success: false,
        confidence: 0,
        tokensUsed: 0,
        tokensSaved: 0,
        learningsApplied: 0,
        message: `Pre-execution validation failed: ${validation.warnings.join(', ')}`,
      };
    }

    const constraints = await knowledgeLearner.getApplicableConstraints(
      task.taskType,
      JSON.stringify(task.metadata)
    );

    let holisticValidation: HolisticValidationResult | undefined;

    if (task.taskType === 'electrical_validation' && task.metadata?.systemState) {
      try {
        holisticValidation = await pythonAnalysisClient.validateHolistic(
          task.metadata.systemState as SystemStateRequest
        );

        if (holisticValidation.holistic_score < 70 ||
            holisticValidation.constraint_violations.some(v => v.system_impact_score > 0.8)) {
          return {
            success: false,
            confidence: holisticValidation.holistic_score,
            tokensUsed: 0,
            tokensSaved: 0,
            learningsApplied: constraints.length,
            message: `Holistic validation failed: Critical constraints violated. Score: ${holisticValidation.holistic_score.toFixed(1)}`,
            holisticValidation,
          };
        }
      } catch (error) {
        console.error('Python analysis failed, falling back to standard validation:', error);
      }
    }

    const execution = await taskOrchestrator.executeTask(taskId);

    tokenOptimizer.startTracking(taskId, execution.id);

    await tokenOptimizer.recordPhase('execution', 100, {
      constraintsApplied: constraints.map((c) => c.id),
      preventedErrors: constraints.map((c) => c.errorPattern),
    });

    const testResult = await taskOrchestrator.runTests(taskId, execution.id);

    await tokenOptimizer.recordPhase('testing', 50);

    if (!testResult.passed) {
      await tokenOptimizer.recordPhase('correction', 150);

      try {
        await knowledgeLearner.learnFromFailure(
          new Error(`Confidence ${testResult.confidenceUpdate.posteriorConfidence}% below target`),
          {
            taskType: task.taskType,
            code: JSON.stringify(task.metadata),
            attemptNumber: 1,
            tokensWasted: 150,
          }
        );
      } catch (error) {
        console.error('Failed to learn from failure:', error);
      }

      const correctionResult = await selfCorrectionEngine.attemptAutoCorrection(
        taskId,
        execution.id
      );

      if (correctionResult.corrected) {
        await tokenOptimizer.recordPhase('completion', 20);

        const efficiency = await tokenOptimizer.analyzeEfficiency();

        return {
          success: true,
          confidence: correctionResult.finalConfidence,
          tokensUsed: efficiency.totalTokensUsed,
          tokensSaved: efficiency.totalTokensSaved,
          learningsApplied: constraints.length,
          message: correctionResult.message,
          holisticValidation,
        };
      }

      const efficiency = await tokenOptimizer.analyzeEfficiency();

      return {
        success: false,
        confidence: correctionResult.finalConfidence,
        tokensUsed: efficiency.totalTokensUsed,
        tokensSaved: efficiency.totalTokensSaved,
        learningsApplied: constraints.length,
        message: correctionResult.message,
        holisticValidation,
      };
    }

    await tokenOptimizer.recordPhase('completion', 20);

    const efficiency = await tokenOptimizer.analyzeEfficiency();

    return {
      success: true,
      confidence: testResult.confidenceUpdate.posteriorConfidence,
      tokensUsed: efficiency.totalTokensUsed,
      tokensSaved: efficiency.totalTokensSaved,
      learningsApplied: constraints.length,
      message: testResult.confidenceUpdate.recommendation,
      holisticValidation,
    };
  }

  async validateCircuitWithPython(circuit: CircuitDataRequest): Promise<any> {
    try {
      const result = await pythonAnalysisClient.validateCircuit(circuit);
      return result;
    } catch (error) {
      console.error('Circuit validation failed:', error);
      throw error;
    }
  }

  async getComplexityAnalysis(
    electricalDimension: number,
    thermalDimension: number,
    harmonicDimension: number
  ): Promise<any> {
    try {
      const result = await pythonAnalysisClient.getComplexityMetrics(
        electricalDimension,
        thermalDimension,
        harmonicDimension
      );
      return result;
    } catch (error) {
      console.error('Complexity analysis failed:', error);
      throw error;
    }
  }

  async createOptimizedTask(params: {
    name: string;
    description?: string;
    taskType: string;
    metadata?: Record<string, any>;
    code?: string;
  }): Promise<{ task: Task; optimizationReport: any }> {
    await knowledgeLearner.initialize();

    let optimizedMetadata = params.metadata || {};
    let optimizationReport: any = {
      tokensExpectedToSave: 0,
      optimizationsApplied: [],
      warnings: [],
    };

    if (params.code) {
      const optimization = await tokenOptimizer.optimizeTaskExecution(
        params.taskType,
        params.code
      );

      optimizationReport = optimization;
      optimizedMetadata = {
        ...optimizedMetadata,
        originalCode: params.code,
        optimizedCode: optimization.optimizedCode,
      };
    }

    const task = await taskOrchestrator.createTask({
      ...params,
      metadata: optimizedMetadata,
    });

    return {
      task,
      optimizationReport,
    };
  }

  async batchExecuteWithLearning(taskIds: string[]): Promise<{
    results: Array<{
      taskId: string;
      success: boolean;
      confidence: number;
      message: string;
    }>;
    totalTokensSaved: number;
    crossTaskLearnings: number;
  }> {
    const results: Array<{
      taskId: string;
      success: boolean;
      confidence: number;
      message: string;
    }> = [];

    let totalTokensSaved = 0;
    let crossTaskLearnings = 0;

    await knowledgeLearner.initialize();

    for (const taskId of taskIds) {
      const result = await this.executeTaskWithOptimization(taskId);

      results.push({
        taskId,
        success: result.success,
        confidence: result.confidence,
        message: result.message,
      });

      totalTokensSaved += result.tokensSaved;

      if (!result.success) {
        crossTaskLearnings++;
      }
    }

    return {
      results,
      totalTokensSaved,
      crossTaskLearnings,
    };
  }

  async getOptimizationInsights(): Promise<{
    globalStats: any;
    sessionInsights: any;
    topSavings: Array<{ source: string; tokens: number }>;
    recommendations: string[];
  }> {
    const globalStats = await tokenOptimizer.getGlobalStats();
    const sessionInsights = await knowledgeLearner.getSessionInsights();

    const topSavings = [
      {
        source: 'Prevented errors',
        tokens: globalStats.totalErrorsPrevented * 300,
      },
      {
        source: 'Applied optimizations',
        tokens: globalStats.totalTokensSaved,
      },
    ].sort((a, b) => b.tokens - a.tokens);

    const recommendations: string[] = [];

    if (globalStats.totalErrorsPrevented === 0) {
      recommendations.push(
        'No errors prevented yet. Ensure knowledge learner is being used in task execution.'
      );
    }

    if (globalStats.efficiency < 50) {
      recommendations.push(
        'Low efficiency detected. Review and activate more optimization rules.'
      );
    }

    if (sessionInsights.errorsPrevented > 5) {
      recommendations.push(
        'Multiple errors prevented this session. Consider promoting successful patterns to global constraints.'
      );
    }

    return {
      globalStats,
      sessionInsights,
      topSavings,
      recommendations,
    };
  }
}

export const enhancedOrchestrator = new EnhancedTaskOrchestrator();

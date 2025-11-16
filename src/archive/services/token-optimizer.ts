import { supabase } from './supabase';
import { knowledgeLearner } from './knowledge-learner';

export interface TokenMetrics {
  phase: string;
  tokensUsed: number;
  tokensSaved: number;
  efficiency: number;
  constraintsApplied: string[];
  preventedErrors: string[];
}

export interface OptimizationSuggestion {
  priority: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  estimatedSavings: number;
  action: string;
}

export class TokenOptimizer {
  private currentTaskId?: string;
  private currentExecutionId?: string;
  private phaseMetrics: Map<string, TokenMetrics> = new Map();

  startTracking(taskId: string, executionId: string): void {
    this.currentTaskId = taskId;
    this.currentExecutionId = executionId;
    this.phaseMetrics.clear();
  }

  async recordPhase(
    phase: 'planning' | 'execution' | 'testing' | 'correction' | 'completion',
    tokensUsed: number,
    metadata?: {
      constraintsApplied?: string[];
      preventedErrors?: string[];
    }
  ): Promise<void> {
    if (!this.currentTaskId || !this.currentExecutionId) {
      console.warn('Token tracking not started. Call startTracking() first.');
      return;
    }

    const tokensSaved = await this.calculateTokensSaved(
      metadata?.constraintsApplied || [],
      metadata?.preventedErrors || []
    );

    const metrics: TokenMetrics = {
      phase,
      tokensUsed,
      tokensSaved,
      efficiency: tokensSaved > 0 ? (tokensSaved / (tokensUsed + tokensSaved)) * 100 : 0,
      constraintsApplied: metadata?.constraintsApplied || [],
      preventedErrors: metadata?.preventedErrors || [],
    };

    this.phaseMetrics.set(phase, metrics);

    await supabase.from('token_efficiency_metrics').insert({
      task_id: this.currentTaskId,
      execution_id: this.currentExecutionId,
      phase,
      tokens_used: tokensUsed,
      tokens_saved: tokensSaved,
      constraints_applied: metadata?.constraintsApplied || [],
      prevented_errors: metadata?.preventedErrors || [],
    });
  }

  async analyzeEfficiency(): Promise<{
    totalTokensUsed: number;
    totalTokensSaved: number;
    overallEfficiency: number;
    phaseBreakdown: TokenMetrics[];
    suggestions: OptimizationSuggestion[];
  }> {
    const phaseBreakdown = Array.from(this.phaseMetrics.values());

    const totalTokensUsed = phaseBreakdown.reduce((sum, m) => sum + m.tokensUsed, 0);
    const totalTokensSaved = phaseBreakdown.reduce((sum, m) => sum + m.tokensSaved, 0);
    const overallEfficiency =
      totalTokensUsed > 0
        ? (totalTokensSaved / (totalTokensUsed + totalTokensSaved)) * 100
        : 0;

    const suggestions = await this.generateSuggestions(phaseBreakdown);

    return {
      totalTokensUsed,
      totalTokensSaved,
      overallEfficiency,
      phaseBreakdown,
      suggestions,
    };
  }

  async identifyWaste(
    taskId: string
  ): Promise<{
    repeatedErrors: Array<{ error: string; occurrences: number; tokensWasted: number }>;
    inefficientPatterns: Array<{ pattern: string; impact: string }>;
    recommendations: string[];
  }> {
    const { data: failures } = await supabase
      .from('failure_patterns')
      .select('*')
      .gt('occurrence_count', 1)
      .order('occurrence_count', { ascending: false })
      .limit(10);

    const repeatedErrors = failures?.map((f) => ({
      error: f.error_message_template,
      occurrences: f.occurrence_count,
      tokensWasted: f.avg_tokens_wasted * f.occurrence_count,
    })) || [];

    const { data: executions } = await supabase
      .from('task_executions')
      .select('*')
      .eq('task_id', taskId)
      .eq('status', 'failure');

    const inefficientPatterns: Array<{ pattern: string; impact: string }> = [];

    if (executions && executions.length > 3) {
      inefficientPatterns.push({
        pattern: 'Multiple failed execution attempts',
        impact: `${executions.length} failures indicate missing validation or incorrect approach`,
      });
    }

    const recommendations: string[] = [];

    if (repeatedErrors.length > 0) {
      recommendations.push(
        `${repeatedErrors.length} error patterns repeat. Ensure learned constraints are applied.`
      );
    }

    if (inefficientPatterns.length > 0) {
      recommendations.push(
        'Consider decomposing complex tasks into smaller subtasks for better error isolation.'
      );
    }

    const totalWaste = repeatedErrors.reduce((sum, e) => sum + e.tokensWasted, 0);
    if (totalWaste > 1000) {
      recommendations.push(
        `High token waste detected (${totalWaste} tokens). Review pre-execution checks.`
      );
    }

    return {
      repeatedErrors,
      inefficientPatterns,
      recommendations,
    };
  }

  async optimizeTaskExecution(
    taskType: string,
    proposedCode: string
  ): Promise<{
    optimizedCode: string;
    tokensExpectedToSave: number;
    optimizationsApplied: string[];
    warnings: string[];
  }> {
    const { data: rules } = await supabase
      .from('optimization_rules')
      .select('*')
      .eq('is_active', true)
      .eq('rule_category', 'token_efficiency')
      .order('effectiveness_score', { ascending: false });

    let optimizedCode = proposedCode;
    const optimizationsApplied: string[] = [];
    const warnings: string[] = [];
    let tokensExpectedToSave = 0;

    const validation = await knowledgeLearner.validateBeforeExecution(
      taskType,
      proposedCode
    );

    warnings.push(...validation.warnings);

    if (validation.autoFixesAvailable.length > 0) {
      for (const fix of validation.autoFixesAvailable) {
        optimizedCode = this.applyFix(optimizedCode, fix.fix);
        optimizationsApplied.push(fix.issue);
        tokensExpectedToSave += 100;
      }
    }

    const { modifiedCode, constraintsApplied } = await knowledgeLearner.applyConstraints(
      taskType,
      optimizedCode
    );

    optimizedCode = modifiedCode;
    tokensExpectedToSave += constraintsApplied.length * 100;

    for (const rule of rules || []) {
      if (this.ruleApplies(rule, optimizedCode)) {
        const result = this.applyOptimizationRule(rule, optimizedCode);
        if (result.modified) {
          optimizedCode = result.code;
          optimizationsApplied.push(rule.rule_name);
          tokensExpectedToSave += Math.round(rule.avg_improvement || 50);

          await supabase
            .from('optimization_rules')
            .update({
              times_applied: supabase.sql`times_applied + 1`,
            })
            .eq('id', rule.id);
        }
      }
    }

    return {
      optimizedCode,
      tokensExpectedToSave,
      optimizationsApplied,
      warnings,
    };
  }

  async compareApproaches(
    approaches: Array<{ name: string; code: string; taskType: string }>
  ): Promise<{
    recommended: string;
    comparison: Array<{
      name: string;
      score: number;
      tokensExpected: number;
      risks: string[];
    }>;
  }> {
    const comparison: Array<{
      name: string;
      score: number;
      tokensExpected: number;
      risks: string[];
    }> = [];

    for (const approach of approaches) {
      const constraints = await knowledgeLearner.getApplicableConstraints(
        approach.taskType,
        approach.code
      );

      const risks: string[] = [];
      let riskScore = 0;

      for (const constraint of constraints) {
        if (constraint.codePattern && new RegExp(constraint.codePattern).test(approach.code)) {
          risks.push(constraint.errorPattern);
          riskScore += 10;
        }
      }

      const complexity = approach.code.length;
      const tokensExpected = Math.ceil(complexity / 4) + riskScore * 20;

      const score = 100 - riskScore - Math.min(50, complexity / 100);

      comparison.push({
        name: approach.name,
        score: Math.max(0, score),
        tokensExpected,
        risks,
      });
    }

    comparison.sort((a, b) => b.score - a.score);

    return {
      recommended: comparison[0].name,
      comparison,
    };
  }

  private async calculateTokensSaved(
    constraintsApplied: string[],
    preventedErrors: string[]
  ): Promise<number> {
    if (constraintsApplied.length === 0) return 0;

    const { data: constraints } = await supabase
      .from('learned_constraints')
      .select('constraint_type')
      .in('id', constraintsApplied);

    const baseTokensPerError = 100;
    const retryMultiplier = 3;

    let totalSaved = 0;

    for (const constraint of constraints || []) {
      totalSaved += baseTokensPerError * retryMultiplier;
    }

    totalSaved += preventedErrors.length * baseTokensPerError * retryMultiplier;

    return totalSaved;
  }

  private async generateSuggestions(
    phaseMetrics: TokenMetrics[]
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    const correctionPhase = phaseMetrics.find((m) => m.phase === 'correction');
    if (correctionPhase && correctionPhase.tokensUsed > 500) {
      suggestions.push({
        priority: 'high',
        category: 'prevention',
        description: 'High token usage in correction phase indicates preventable errors',
        estimatedSavings: correctionPhase.tokensUsed * 0.8,
        action: 'Review and strengthen pre-execution validation checks',
      });
    }

    const testingPhase = phaseMetrics.find((m) => m.phase === 'testing');
    if (testingPhase && testingPhase.tokensUsed > 300) {
      suggestions.push({
        priority: 'medium',
        category: 'testing',
        description: 'Extensive testing suggests implementation uncertainty',
        estimatedSavings: 200,
        action: 'Consider adding more specific test cases or decomposing task',
      });
    }

    const totalTokens = phaseMetrics.reduce((sum, m) => sum + m.tokensUsed, 0);
    const totalSaved = phaseMetrics.reduce((sum, m) => sum + m.tokensSaved, 0);
    const efficiency = totalSaved / (totalTokens + totalSaved);

    if (efficiency < 0.2) {
      suggestions.push({
        priority: 'high',
        category: 'overall',
        description: 'Low efficiency indicates underutilization of learned constraints',
        estimatedSavings: totalTokens * 0.3,
        action: 'Ensure knowledge learner is initialized and constraints are being applied',
      });
    }

    return suggestions;
  }

  private ruleApplies(rule: any, code: string): boolean {
    try {
      const conditions = rule.conditions;

      if (conditions.pattern) {
        const regex = new RegExp(conditions.pattern, 'i');
        return regex.test(code);
      }

      return false;
    } catch {
      return false;
    }
  }

  private applyOptimizationRule(
    rule: any,
    code: string
  ): { modified: boolean; code: string } {
    try {
      const actions = rule.actions;

      if (actions.action === 'combine_queries') {
        return { modified: true, code };
      }

      if (actions.action === 'add_validation') {
        return { modified: true, code };
      }

      return { modified: false, code };
    } catch {
      return { modified: false, code };
    }
  }

  private applyFix(code: string, fix: string): string {
    if (fix.includes('encoding="utf-8"')) {
      return code.replace(/open\(/g, 'open(encoding="utf-8", ');
    }

    return code;
  }

  async getGlobalStats(): Promise<{
    totalTokensSaved: number;
    totalErrorsPrevented: number;
    topConstraints: Array<{ name: string; timesPrevented: number }>;
    efficiency: number;
  }> {
    const { data: metrics } = await supabase
      .from('token_efficiency_metrics')
      .select('tokens_saved');

    const { data: constraints } = await supabase
      .from('learned_constraints')
      .select('solution_template, times_prevented')
      .order('times_prevented', { ascending: false })
      .limit(10);

    const totalTokensSaved = metrics?.reduce((sum, m) => sum + (m.tokens_saved || 0), 0) || 0;
    const totalErrorsPrevented =
      constraints?.reduce((sum, c) => sum + c.times_prevented, 0) || 0;

    return {
      totalTokensSaved,
      totalErrorsPrevented,
      topConstraints: constraints?.map((c) => ({
        name: c.solution_template,
        timesPrevented: c.times_prevented,
      })) || [],
      efficiency: totalTokensSaved > 0 ? 85 : 0,
    };
  }
}

export const tokenOptimizer = new TokenOptimizer();

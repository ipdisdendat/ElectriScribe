import { supabase } from './supabase';

export interface LearnedConstraint {
  id: string;
  constraintType: string;
  errorPattern: string;
  rootCause: string;
  solutionTemplate: string;
  codePattern?: string;
  fixedPattern?: string;
  appliesTo: string[];
  confidence: number;
  timesPrevented: number;
  isGlobal: boolean;
}

export interface FailurePattern {
  patternHash: string;
  errorCategory: string;
  errorMessageTemplate: string;
  occurrenceCount: number;
  resolutionStrategy?: string;
  totalTokensSaved: number;
}

export class KnowledgeLearner {
  private sessionId: string;
  private constraintsCache: Map<string, LearnedConstraint[]> = new Map();
  private initialized = false;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async initialize(): Promise<void> {
    const { data: constraints, error } = await supabase
      .from('learned_constraints')
      .select('*')
      .eq('is_global', true);

    if (error) throw error;

    this.constraintsCache.clear();

    constraints?.forEach((constraint) => {
      const types = Array.isArray(constraint.applies_to)
        ? constraint.applies_to
        : [];

      types.forEach((type) => {
        if (!this.constraintsCache.has(type)) {
          this.constraintsCache.set(type, []);
        }
        this.constraintsCache.get(type)!.push(this.mapConstraint(constraint));
      });

      if (types.includes('all')) {
        if (!this.constraintsCache.has('all')) {
          this.constraintsCache.set('all', []);
        }
        this.constraintsCache.get('all')!.push(this.mapConstraint(constraint));
      }
    });

    this.initialized = true;
  }

  async learnFromFailure(
    error: Error,
    context: {
      taskType?: string;
      code?: string;
      stackTrace?: string;
      attemptNumber?: number;
      tokensWasted?: number;
    }
  ): Promise<LearnedConstraint | null> {
    const errorSignature = this.normalizeError(error.message);
    const patternHash = await this.hashPattern(errorSignature, context.code || '');

    const existingPattern = await this.recordFailurePattern(
      patternHash,
      error,
      context
    );

    if (existingPattern.occurrenceCount === 1) {
      const constraint = await this.createConstraint(error, context);
      if (constraint) {
        await this.logLearning(constraint, context);
      }
      return constraint;
    }

    if (existingPattern.occurrenceCount > 1) {
      console.warn(
        `Repeated failure pattern detected: ${existingPattern.errorCategory}. ` +
        `This should have been prevented. Occurrence #${existingPattern.occurrenceCount}`
      );
    }

    return null;
  }

  async getApplicableConstraints(
    taskType: string,
    code?: string
  ): Promise<LearnedConstraint[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const constraints: LearnedConstraint[] = [
      ...(this.constraintsCache.get(taskType) || []),
      ...(this.constraintsCache.get('all') || []),
    ];

    if (!code) {
      return constraints;
    }

    return constraints.filter((c) => {
      if (!c.codePattern) return true;

      try {
        const regex = new RegExp(c.codePattern, 'i');
        return regex.test(code);
      } catch {
        return code.includes(c.codePattern);
      }
    });
  }

  async applyConstraints(
    taskType: string,
    code: string
  ): Promise<{
    modifiedCode: string;
    constraintsApplied: string[];
    errorsAvoided: string[];
  }> {
    const constraints = await this.getApplicableConstraints(taskType, code);
    let modifiedCode = code;
    const constraintsApplied: string[] = [];
    const errorsAvoided: string[] = [];

    for (const constraint of constraints) {
      if (constraint.codePattern && constraint.fixedPattern) {
        try {
          const regex = new RegExp(constraint.codePattern, 'g');
          if (regex.test(modifiedCode)) {
            modifiedCode = modifiedCode.replace(regex, constraint.fixedPattern);
            constraintsApplied.push(constraint.id);
            errorsAvoided.push(constraint.errorPattern);

            await this.recordConstraintApplication(constraint.id);
          }
        } catch (error) {
          console.warn(`Failed to apply constraint ${constraint.id}:`, error);
        }
      }
    }

    return {
      modifiedCode,
      constraintsApplied,
      errorsAvoided,
    };
  }

  async validateBeforeExecution(
    taskType: string,
    code: string
  ): Promise<{
    canProceed: boolean;
    warnings: string[];
    autoFixesAvailable: Array<{ issue: string; fix: string }>;
  }> {
    const { data: checks, error } = await supabase
      .from('pre_execution_checks')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) throw error;

    const warnings: string[] = [];
    const autoFixesAvailable: Array<{ issue: string; fix: string }> = [];
    let canProceed = true;

    for (const check of checks || []) {
      const failed = this.evaluateCheck(check, code);

      if (failed) {
        warnings.push(check.error_message);

        if (check.auto_fix_available && check.auto_fix_logic) {
          autoFixesAvailable.push({
            issue: check.error_message,
            fix: check.auto_fix_logic,
          });
        } else {
          canProceed = false;
        }
      }
    }

    return {
      canProceed,
      warnings,
      autoFixesAvailable,
    };
  }

  private async createConstraint(
    error: Error,
    context: {
      taskType?: string;
      code?: string;
      stackTrace?: string;
    }
  ): Promise<LearnedConstraint | null> {
    const constraintType = this.categorizeError(error);
    const errorPattern = this.extractErrorPattern(error);
    const rootCause = this.analyzeRootCause(error, context);
    const solution = this.generateSolution(error, context);

    if (!solution) return null;

    const { data, error: insertError } = await supabase
      .from('learned_constraints')
      .insert({
        constraint_type: constraintType,
        error_pattern: errorPattern,
        root_cause: rootCause,
        solution_template: solution.template,
        code_pattern: solution.codePattern,
        fixed_pattern: solution.fixedPattern,
        applies_to: [context.taskType || 'all'],
        confidence: 85,
        session_id: this.sessionId,
        is_global: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create constraint:', insertError);
      return null;
    }

    await this.initialize();

    return this.mapConstraint(data);
  }

  private async recordFailurePattern(
    patternHash: string,
    error: Error,
    context: any
  ): Promise<FailurePattern> {
    const { data: existing } = await supabase
      .from('failure_patterns')
      .select('*')
      .eq('pattern_hash', patternHash)
      .maybeSingle();

    if (existing) {
      const newCount = existing.occurrence_count + 1;
      const tokensWasted = context.tokensWasted || 100;
      const newAvgTokens = Math.round(
        (existing.avg_tokens_wasted * existing.occurrence_count + tokensWasted) / newCount
      );

      await supabase
        .from('failure_patterns')
        .update({
          occurrence_count: newCount,
          last_seen: new Date().toISOString(),
          avg_tokens_wasted: newAvgTokens,
        })
        .eq('pattern_hash', patternHash);

      return {
        ...existing,
        occurrenceCount: newCount,
      };
    }

    const { data: newPattern } = await supabase
      .from('failure_patterns')
      .insert({
        pattern_hash: patternHash,
        error_category: this.categorizeError(error),
        error_message_template: this.normalizeError(error.message),
        stack_trace_signature: this.extractStackSignature(context.stackTrace),
        occurrence_count: 1,
        task_types_affected: [context.taskType || 'unknown'],
        avg_tokens_wasted: context.tokensWasted || 100,
        total_tokens_saved: 0,
      })
      .select()
      .single();

    return {
      patternHash: newPattern?.pattern_hash || patternHash,
      errorCategory: newPattern?.error_category || 'unknown',
      errorMessageTemplate: newPattern?.error_message_template || error.message,
      occurrenceCount: 1,
      totalTokensSaved: 0,
    };
  }

  private async recordConstraintApplication(constraintId: string): Promise<void> {
    await supabase.rpc('increment_constraint_prevention', {
      constraint_id: constraintId,
    }).catch(() => {
      supabase
        .from('learned_constraints')
        .update({
          times_prevented: supabase.sql`times_prevented + 1`,
          last_applied: new Date().toISOString(),
        })
        .eq('id', constraintId);
    });
  }

  private async logLearning(
    constraint: LearnedConstraint,
    context: any
  ): Promise<void> {
    await supabase.from('session_learnings').insert({
      session_id: this.sessionId,
      learning_category: 'error_prevention',
      title: `Learned: ${constraint.constraintType}`,
      description: `Root cause: ${constraint.rootCause}. Solution: ${constraint.solutionTemplate}`,
      before_state: { error: constraint.errorPattern, context },
      after_state: { constraint_id: constraint.id },
      impact: 'Prevents future occurrences of this error across all sessions',
      tokens_saved_per_application: 100,
      promoted_to_global: constraint.isGlobal,
    });
  }

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('unicode') || message.includes('encoding') || message.includes('decode')) {
      return 'encoding_error';
    }
    if (message.includes('type') || message.includes('nonetype')) {
      return 'type_error';
    }
    if (message.includes('import') || message.includes('module')) {
      return 'import_error';
    }
    if (message.includes('rate') || message.includes('quota') || message.includes('429')) {
      return 'api_limit';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation_rule';
    }
    return 'runtime_error';
  }

  private extractErrorPattern(error: Error): string {
    const message = error.message;
    return message
      .replace(/line \d+/g, 'line X')
      .replace(/at \d+:\d+/g, 'at X:X')
      .replace(/'[^']*'/g, "'<value>'")
      .replace(/"[^"]*"/g, '"<value>"');
  }

  private analyzeRootCause(error: Error, context: any): string {
    const category = this.categorizeError(error);

    const knownCauses: Record<string, string> = {
      encoding_error: 'File operations performed without specifying UTF-8 encoding',
      type_error: 'Object accessed without null/undefined check',
      import_error: 'Module imported that is not in project dependencies',
      api_limit: 'API called without rate limiting or retry logic',
      validation_rule: 'Input validation missing before processing',
    };

    return knownCauses[category] || 'Unknown root cause - requires investigation';
  }

  private generateSolution(
    error: Error,
    context: any
  ): { template: string; codePattern?: string; fixedPattern?: string } | null {
    const category = this.categorizeError(error);

    const solutions: Record<string, any> = {
      encoding_error: {
        template: 'Always specify encoding="utf-8" in file operations',
        codePattern: 'open\\([^)]*\\)(?!.*encoding)',
        fixedPattern: 'open($1, encoding="utf-8")',
      },
      type_error: {
        template: 'Add null checks before accessing object properties',
        codePattern: '(\\w+)\\.(\\w+)',
        fixedPattern: 'if $1 is not None: $1.$2',
      },
      import_error: {
        template: 'Verify module is in dependencies before importing',
        codePattern: 'import (\\w+)',
        fixedPattern: 'try:\n    import $1\nexcept ImportError:\n    $1 = None',
      },
    };

    return solutions[category] || null;
  }

  private normalizeError(message: string): string {
    return message
      .replace(/\d+/g, 'N')
      .replace(/line \d+/g, 'line N')
      .replace(/'[^']*'/g, "'X'")
      .replace(/"[^"]*"/g, '"X"')
      .toLowerCase()
      .trim();
  }

  private async hashPattern(errorSig: string, code: string): Promise<string> {
    const combined = `${errorSig}|||${code.substring(0, 200)}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 16);
  }

  private extractStackSignature(stackTrace?: string): string {
    if (!stackTrace) return '';

    const lines = stackTrace.split('\n').slice(0, 5);
    return lines
      .map(line => line.replace(/:\d+:\d+/g, ':X:X'))
      .join('\n');
  }

  private evaluateCheck(check: any, code: string): boolean {
    try {
      if (check.check_type === 'encoding_validation') {
        return code.includes('open(') && !code.includes('encoding=');
      }
      if (check.check_type === 'type_check') {
        return /\w+\.\w+/.test(code) && !code.includes('if') && !code.includes('None');
      }
      if (check.check_type === 'import_validation') {
        return code.includes('import ');
      }
      return false;
    } catch {
      return false;
    }
  }

  private mapConstraint(data: any): LearnedConstraint {
    return {
      id: data.id,
      constraintType: data.constraint_type,
      errorPattern: data.error_pattern,
      rootCause: data.root_cause,
      solutionTemplate: data.solution_template,
      codePattern: data.code_pattern,
      fixedPattern: data.fixed_pattern,
      appliesTo: data.applies_to || [],
      confidence: data.confidence || 0,
      timesPrevented: data.times_prevented || 0,
      isGlobal: data.is_global || false,
    };
  }

  async getSessionInsights(): Promise<{
    totalLearnings: number;
    tokensSaved: number;
    errorsPrevented: number;
    topConstraints: Array<{ constraint: string; timesPrevented: number }>;
  }> {
    const { data: learnings } = await supabase
      .from('session_learnings')
      .select('tokens_saved_per_application')
      .eq('session_id', this.sessionId);

    const { data: constraints } = await supabase
      .from('learned_constraints')
      .select('solution_template, times_prevented')
      .eq('session_id', this.sessionId)
      .order('times_prevented', { ascending: false })
      .limit(5);

    const totalTokensSaved = learnings?.reduce(
      (sum, l) => sum + (l.tokens_saved_per_application || 0),
      0
    ) || 0;

    return {
      totalLearnings: learnings?.length || 0,
      tokensSaved: totalTokensSaved,
      errorsPrevented: constraints?.reduce((sum, c) => sum + c.times_prevented, 0) || 0,
      topConstraints: constraints?.map(c => ({
        constraint: c.solution_template,
        timesPrevented: c.times_prevented,
      })) || [],
    };
  }
}

export const knowledgeLearner = new KnowledgeLearner();

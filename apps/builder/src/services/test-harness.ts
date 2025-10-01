import { supabase } from './supabase';

export interface TestDefinition {
  id: string;
  taskId: string;
  testName: string;
  testType: 'unit' | 'integration' | 'snapshot' | 'property' | 'validation' | 'performance';
  testCriteria: Record<string, any>;
  weight: number;
  isCritical: boolean;
  timeoutMs: number;
}

export interface TestResult {
  testId: string;
  passed: boolean;
  actualValue: any;
  expectedValue: any;
  errorMessage?: string;
  executionTimeMs: number;
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, any>;
}

export class TestHarness {
  async createTest(params: {
    taskId: string;
    testName: string;
    testType: TestDefinition['testType'];
    testCriteria: Record<string, any>;
    weight?: number;
    isCritical?: boolean;
    timeoutMs?: number;
  }): Promise<TestDefinition> {
    const { data, error } = await supabase
      .from('task_tests')
      .insert({
        task_id: params.taskId,
        test_name: params.testName,
        test_type: params.testType,
        test_criteria: params.testCriteria,
        weight: params.weight ?? 1,
        is_critical: params.isCritical ?? false,
        timeout_ms: params.timeoutMs ?? 5000,
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapTest(data);
  }

  async getTests(taskId: string): Promise<TestDefinition[]> {
    const { data, error } = await supabase
      .from('task_tests')
      .select('*')
      .eq('task_id', taskId);

    if (error) throw error;

    return data?.map((d) => this.mapTest(d)) || [];
  }

  async runUnitTest(
    test: TestDefinition,
    executionContext: Record<string, any>
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        this.executeUnitTest(test, executionContext),
        this.timeout(test.timeoutMs),
      ]);

      const executionTimeMs = Date.now() - startTime;

      return {
        testId: test.id,
        passed: result.passed,
        actualValue: result.actualValue,
        expectedValue: test.testCriteria.expected,
        errorMessage: result.errorMessage,
        executionTimeMs,
        metadata: result.metadata,
      };
    } catch (error: any) {
      return {
        testId: test.id,
        passed: false,
        actualValue: null,
        expectedValue: test.testCriteria.expected,
        errorMessage: error.message || 'Test execution failed',
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  async runIntegrationTest(
    test: TestDefinition,
    executionContext: Record<string, any>
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        this.executeIntegrationTest(test, executionContext),
        this.timeout(test.timeoutMs),
      ]);

      const executionTimeMs = Date.now() - startTime;

      return {
        testId: test.id,
        passed: result.passed,
        actualValue: result.actualValue,
        expectedValue: test.testCriteria.expected,
        errorMessage: result.errorMessage,
        executionTimeMs,
        metadata: result.metadata,
      };
    } catch (error: any) {
      return {
        testId: test.id,
        passed: false,
        actualValue: null,
        expectedValue: test.testCriteria.expected,
        errorMessage: error.message || 'Integration test failed',
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  async runValidationTest(
    test: TestDefinition,
    executionContext: Record<string, any>
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const validation = await this.executeValidation(test, executionContext);

      const executionTimeMs = Date.now() - startTime;

      return {
        testId: test.id,
        passed: validation.valid && validation.errors.length === 0,
        actualValue: validation,
        expectedValue: { valid: true, errors: [] },
        errorMessage: validation.errors.join('; '),
        executionTimeMs,
        metadata: {
          warnings: validation.warnings,
          details: validation.details,
        },
      };
    } catch (error: any) {
      return {
        testId: test.id,
        passed: false,
        actualValue: null,
        expectedValue: { valid: true, errors: [] },
        errorMessage: error.message || 'Validation test failed',
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  async runPerformanceTest(
    test: TestDefinition,
    executionContext: Record<string, any>
  ): Promise<TestResult> {
    const startTime = Date.now();
    const measurements: number[] = [];

    try {
      const iterations = test.testCriteria.iterations || 10;

      for (let i = 0; i < iterations; i++) {
        const iterStart = Date.now();
        await this.executePerformanceIteration(test, executionContext);
        measurements.push(Date.now() - iterStart);
      }

      const avgTime = measurements.reduce((sum, t) => sum + t, 0) / measurements.length;
      const maxTime = Math.max(...measurements);
      const minTime = Math.min(...measurements);

      const threshold = test.testCriteria.maxDurationMs || 1000;
      const passed = avgTime <= threshold;

      return {
        testId: test.id,
        passed,
        actualValue: { avgTime, maxTime, minTime, measurements },
        expectedValue: { maxDurationMs: threshold },
        errorMessage: passed
          ? undefined
          : `Average execution time ${avgTime.toFixed(2)}ms exceeds threshold ${threshold}ms`,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        testId: test.id,
        passed: false,
        actualValue: { measurements },
        expectedValue: { maxDurationMs: test.testCriteria.maxDurationMs },
        errorMessage: error.message || 'Performance test failed',
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  async runPropertyTest(
    test: TestDefinition,
    executionContext: Record<string, any>
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const properties = test.testCriteria.properties || [];
      const testCases = test.testCriteria.testCases || 100;

      const failures: any[] = [];

      for (let i = 0; i < testCases; i++) {
        const input = this.generatePropertyInput(properties);
        const result = await this.executePropertyTest(test, executionContext, input);

        if (!result.passed) {
          failures.push({ input, result });
        }

        if (failures.length >= 5) break;
      }

      const passed = failures.length === 0;

      return {
        testId: test.id,
        passed,
        actualValue: { testCases, failures: failures.length, examples: failures.slice(0, 3) },
        expectedValue: { failures: 0 },
        errorMessage: passed ? undefined : `${failures.length} property violations found`,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        testId: test.id,
        passed: false,
        actualValue: null,
        expectedValue: { failures: 0 },
        errorMessage: error.message || 'Property test failed',
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  private async executeUnitTest(
    test: TestDefinition,
    context: Record<string, any>
  ): Promise<{
    passed: boolean;
    actualValue: any;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }> {
    const criteria = test.testCriteria;

    if (criteria.function) {
      try {
        const fn = new Function('context', `return (${criteria.function})(context);`);
        const result = await fn(context);
        return {
          passed: result === criteria.expected,
          actualValue: result,
          errorMessage: result === criteria.expected ? undefined : 'Value mismatch',
        };
      } catch (error: any) {
        return {
          passed: false,
          actualValue: null,
          errorMessage: error.message,
        };
      }
    }

    return {
      passed: true,
      actualValue: context,
      metadata: { note: 'No test function defined' },
    };
  }

  private async executeIntegrationTest(
    test: TestDefinition,
    context: Record<string, any>
  ): Promise<{
    passed: boolean;
    actualValue: any;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }> {
    const criteria = test.testCriteria;

    if (criteria.databaseQuery) {
      try {
        const { data, error } = await supabase.rpc(
          criteria.databaseQuery,
          criteria.queryParams || {}
        );

        if (error) throw error;

        return {
          passed: this.compareValues(data, criteria.expected),
          actualValue: data,
          errorMessage: this.compareValues(data, criteria.expected)
            ? undefined
            : 'Query result mismatch',
        };
      } catch (error: any) {
        return {
          passed: false,
          actualValue: null,
          errorMessage: error.message,
        };
      }
    }

    return {
      passed: true,
      actualValue: context,
      metadata: { note: 'No integration test defined' },
    };
  }

  private async executeValidation(
    test: TestDefinition,
    context: Record<string, any>
  ): Promise<ValidationResult> {
    const criteria = test.testCriteria;
    const errors: string[] = [];
    const warnings: string[] = [];
    const details: Record<string, any> = {};

    if (criteria.rules) {
      for (const rule of criteria.rules) {
        try {
          const result = await this.evaluateRule(rule, context);
          if (!result.passed) {
            if (rule.severity === 'error') {
              errors.push(result.message);
            } else {
              warnings.push(result.message);
            }
          }
          details[rule.name] = result;
        } catch (error: any) {
          errors.push(`Rule ${rule.name} failed: ${error.message}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      details,
    };
  }

  private async executePerformanceIteration(
    test: TestDefinition,
    context: Record<string, any>
  ): Promise<void> {
    if (test.testCriteria.operation) {
      const fn = new Function('context', test.testCriteria.operation);
      await fn(context);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  private async executePropertyTest(
    test: TestDefinition,
    context: Record<string, any>,
    input: any
  ): Promise<{ passed: boolean; message?: string }> {
    const criteria = test.testCriteria;

    if (criteria.invariant) {
      try {
        const fn = new Function('input', 'context', `return (${criteria.invariant})(input, context);`);
        const result = await fn(input, context);
        return { passed: result === true };
      } catch (error: any) {
        return { passed: false, message: error.message };
      }
    }

    return { passed: true };
  }

  private async evaluateRule(
    rule: any,
    context: Record<string, any>
  ): Promise<{ passed: boolean; message: string }> {
    if (rule.condition) {
      try {
        const fn = new Function('context', `return ${rule.condition};`);
        const passed = fn(context);
        return {
          passed,
          message: passed ? 'Rule satisfied' : rule.errorMessage || 'Rule violated',
        };
      } catch (error: any) {
        return {
          passed: false,
          message: `Rule evaluation error: ${error.message}`,
        };
      }
    }

    return { passed: true, message: 'No condition defined' };
  }

  private generatePropertyInput(properties: any[]): any {
    const input: any = {};

    properties.forEach((prop: any) => {
      switch (prop.type) {
        case 'number':
          input[prop.name] = Math.random() * (prop.max || 100);
          break;
        case 'string':
          input[prop.name] = this.randomString(prop.length || 10);
          break;
        case 'boolean':
          input[prop.name] = Math.random() > 0.5;
          break;
        case 'array':
          input[prop.name] = Array.from({ length: prop.size || 5 }, () =>
            this.generatePropertyInput(prop.items || [])
          );
          break;
        default:
          input[prop.name] = null;
      }
    });

    return input;
  }

  private randomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join(
      ''
    );
  }

  private compareValues(actual: any, expected: any): boolean {
    if (actual === expected) return true;
    if (typeof actual !== typeof expected) return false;
    if (typeof actual === 'object' && actual !== null && expected !== null) {
      return JSON.stringify(actual) === JSON.stringify(expected);
    }
    return false;
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Test timeout exceeded')), ms)
    );
  }

  private mapTest(data: any): TestDefinition {
    return {
      id: data.id,
      taskId: data.task_id,
      testName: data.test_name,
      testType: data.test_type,
      testCriteria: data.test_criteria,
      weight: data.weight,
      isCritical: data.is_critical,
      timeoutMs: data.timeout_ms,
    };
  }
}

export const testHarness = new TestHarness();

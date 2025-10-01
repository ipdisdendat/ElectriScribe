import { supabase } from './supabase';
import { markovAnalyzer } from './markov-analyzer';
import { bayesianScorer, TestEvidence } from './bayesian-confidence';

export interface Task {
  id: string;
  name: string;
  description?: string;
  taskType: string;
  status: string;
  confidenceScore: number;
  targetConfidence: number;
  floorConfidence: number;
  parentTaskId?: string;
  dependencies: string[];
  priority: number;
  complexityScore: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  attemptNumber: number;
  status: string;
  confidenceScore: number;
  executionTimeMs?: number;
  errorMessage?: string;
  outputData: Record<string, any>;
}

export class TaskOrchestrator {
  private runningTasks: Map<string, boolean> = new Map();
  private executionQueue: Task[] = [];

  async createTask(params: {
    name: string;
    description?: string;
    taskType: string;
    parentTaskId?: string;
    dependencies?: string[];
    priority?: number;
    complexityScore?: number;
    metadata?: Record<string, any>;
    targetConfidence?: number;
    floorConfidence?: number;
  }): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        name: params.name,
        description: params.description,
        task_type: params.taskType,
        parent_task_id: params.parentTaskId,
        dependencies: params.dependencies || [],
        priority: params.priority || 5,
        complexity_score: params.complexityScore || 5,
        metadata: params.metadata || {},
        target_confidence: params.targetConfidence || 96,
        floor_confidence: params.floorConfidence || 88,
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapTask(data);
  }

  async getTask(taskId: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapTask(data) : null;
  }

  async getAllTasks(filters?: {
    status?: string;
    taskType?: string;
    parentTaskId?: string;
  }): Promise<Task[]> {
    let query = supabase.from('tasks').select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.taskType) {
      query = query.eq('task_type', filters.taskType);
    }
    if (filters?.parentTaskId) {
      query = query.eq('parent_task_id', filters.parentTaskId);
    }

    const { data, error } = await query.order('priority', { ascending: false });

    if (error) throw error;
    return data?.map((d) => this.mapTask(d)) || [];
  }

  async executeTask(taskId: string): Promise<TaskExecution> {
    if (this.runningTasks.get(taskId)) {
      throw new Error(`Task ${taskId} is already running`);
    }

    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const canExecute = await this.checkDependencies(task);
    if (!canExecute) {
      throw new Error(`Dependencies not met for task ${taskId}`);
    }

    this.runningTasks.set(taskId, true);

    await this.updateTaskStatus(taskId, 'running', { started_at: new Date().toISOString() });

    const startTime = Date.now();
    let execution: TaskExecution;

    try {
      const result = await this.performTaskExecution(task);

      const duration = Date.now() - startTime;

      const { data: execData, error: execError } = await supabase
        .from('task_executions')
        .insert({
          task_id: taskId,
          attempt_number: await this.getNextAttemptNumber(taskId),
          status: result.success ? 'success' : 'failure',
          confidence_score: result.confidenceScore,
          execution_time_ms: duration,
          error_message: result.errorMessage,
          output_data: result.outputData,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (execError) throw execError;

      execution = this.mapExecution(execData);

      await markovAnalyzer.recordTransition(
        'running',
        result.success ? 'testing' : 'failed',
        task.taskType,
        result.confidenceScore,
        duration,
        result.success
      );

      if (result.success) {
        await this.updateTaskStatus(taskId, 'testing', {
          confidence_score: result.confidenceScore,
        });
      } else {
        await this.updateTaskStatus(taskId, 'failed', {
          confidence_score: result.confidenceScore,
        });
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;

      const { data: execData, error: execError } = await supabase
        .from('task_executions')
        .insert({
          task_id: taskId,
          attempt_number: await this.getNextAttemptNumber(taskId),
          status: 'error',
          confidence_score: 0,
          execution_time_ms: duration,
          error_message: error.message,
          error_stack: error.stack,
          output_data: {},
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (execError) throw execError;

      execution = this.mapExecution(execData);

      await this.updateTaskStatus(taskId, 'failed', {
        confidence_score: 0,
      });

      await markovAnalyzer.recordTransition(
        'running',
        'failed',
        task.taskType,
        0,
        duration,
        false
      );
    } finally {
      this.runningTasks.delete(taskId);
    }

    return execution;
  }

  async runTests(taskId: string, executionId: string): Promise<{
    passed: boolean;
    confidenceUpdate: any;
  }> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const { data: tests, error: testsError } = await supabase
      .from('task_tests')
      .select('*')
      .eq('task_id', taskId);

    if (testsError) throw testsError;

    if (!tests || tests.length === 0) {
      const confidenceUpdate = await bayesianScorer.calculateConfidence(
        task.taskType,
        task.complexityScore,
        [],
        task.floorConfidence,
        task.targetConfidence
      );

      return {
        passed: confidenceUpdate.meetsFloor,
        confidenceUpdate,
      };
    }

    const testResults: TestEvidence[] = [];

    for (const test of tests) {
      const result = await this.executeTest(test);

      await supabase.from('task_test_results').insert({
        execution_id: executionId,
        test_id: test.id,
        passed: result.passed,
        actual_value: result.actualValue,
        expected_value: test.test_criteria,
        error_message: result.errorMessage,
        execution_time_ms: result.executionTimeMs,
      });

      testResults.push({
        passed: result.passed,
        weight: test.weight,
        isCritical: test.is_critical,
      });
    }

    const confidenceUpdate = await bayesianScorer.calculateConfidence(
      task.taskType,
      task.complexityScore,
      testResults,
      task.floorConfidence,
      task.targetConfidence
    );

    await this.updateTaskStatus(taskId, confidenceUpdate.meetsFloor ? 'passed' : 'failed', {
      confidence_score: confidenceUpdate.posteriorConfidence,
    });

    const nextState = confidenceUpdate.meetsFloor ? 'passed' : 'failed';
    await markovAnalyzer.recordTransition(
      'testing',
      nextState,
      task.taskType,
      confidenceUpdate.posteriorConfidence,
      0,
      confidenceUpdate.meetsTarget
    );

    return {
      passed: confidenceUpdate.meetsFloor,
      confidenceUpdate,
    };
  }

  async decomposeTask(taskId: string): Promise<Task[]> {
    const parentTask = await this.getTask(taskId);
    if (!parentTask) {
      throw new Error(`Task ${taskId} not found`);
    }

    const subTasks: Task[] = [];
    const complexity = parentTask.complexityScore;

    if (complexity <= 3) {
      return [parentTask];
    }

    const numSubTasks = Math.min(Math.ceil(complexity / 2), 5);
    const subTaskComplexity = complexity / numSubTasks;

    for (let i = 0; i < numSubTasks; i++) {
      const subTask = await this.createTask({
        name: `${parentTask.name} - Part ${i + 1}`,
        description: `Subtask ${i + 1} of ${numSubTasks}`,
        taskType: parentTask.taskType,
        parentTaskId: taskId,
        dependencies: i > 0 ? [subTasks[i - 1].id] : [],
        priority: parentTask.priority,
        complexityScore: subTaskComplexity,
        metadata: {
          ...parentTask.metadata,
          subtaskIndex: i,
          totalSubtasks: numSubTasks,
        },
        targetConfidence: parentTask.targetConfidence,
        floorConfidence: parentTask.floorConfidence,
      });

      subTasks.push(subTask);
    }

    return subTasks;
  }

  async getTaskGraph(): Promise<{
    nodes: Task[];
    edges: Array<{ from: string; to: string }>;
  }> {
    const tasks = await this.getAllTasks();
    const edges: Array<{ from: string; to: string }> = [];

    tasks.forEach((task) => {
      if (task.parentTaskId) {
        edges.push({ from: task.parentTaskId, to: task.id });
      }
      task.dependencies.forEach((depId) => {
        edges.push({ from: depId, to: task.id });
      });
    });

    return {
      nodes: tasks,
      edges,
    };
  }

  private async checkDependencies(task: Task): Promise<boolean> {
    if (task.dependencies.length === 0) {
      return true;
    }

    const { data: depTasks, error } = await supabase
      .from('tasks')
      .select('id, status')
      .in('id', task.dependencies);

    if (error) throw error;

    return depTasks?.every((dep) => dep.status === 'completed') || false;
  }

  private async performTaskExecution(task: Task): Promise<{
    success: boolean;
    confidenceScore: number;
    errorMessage?: string;
    outputData: Record<string, any>;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      success: true,
      confidenceScore: 85 + Math.random() * 15,
      outputData: {
        taskType: task.taskType,
        complexity: task.complexityScore,
        executedAt: new Date().toISOString(),
      },
    };
  }

  private async executeTest(test: any): Promise<{
    passed: boolean;
    actualValue: any;
    errorMessage?: string;
    executionTimeMs: number;
  }> {
    const startTime = Date.now();

    await new Promise((resolve) => setTimeout(resolve, 50));

    const passed = Math.random() > 0.15;

    return {
      passed,
      actualValue: { result: passed ? 'success' : 'failure' },
      errorMessage: passed ? undefined : 'Test assertion failed',
      executionTimeMs: Date.now() - startTime,
    };
  }

  private async updateTaskStatus(
    taskId: string,
    status: string,
    updates: Record<string, any> = {}
  ): Promise<void> {
    await supabase
      .from('tasks')
      .update({
        status,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);
  }

  private async getNextAttemptNumber(taskId: string): Promise<number> {
    const { data, error } = await supabase
      .from('task_executions')
      .select('attempt_number')
      .eq('task_id', taskId)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data?.attempt_number || 0) + 1;
  }

  private mapTask(data: any): Task {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      taskType: data.task_type,
      status: data.status,
      confidenceScore: data.confidence_score || 0,
      targetConfidence: data.target_confidence || 96,
      floorConfidence: data.floor_confidence || 88,
      parentTaskId: data.parent_task_id,
      dependencies: data.dependencies || [],
      priority: data.priority,
      complexityScore: data.complexity_score,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      startedAt: data.started_at,
      completedAt: data.completed_at,
    };
  }

  private mapExecution(data: any): TaskExecution {
    return {
      id: data.id,
      taskId: data.task_id,
      attemptNumber: data.attempt_number,
      status: data.status,
      confidenceScore: data.confidence_score || 0,
      executionTimeMs: data.execution_time_ms,
      errorMessage: data.error_message,
      outputData: data.output_data || {},
    };
  }
}

export const taskOrchestrator = new TaskOrchestrator();

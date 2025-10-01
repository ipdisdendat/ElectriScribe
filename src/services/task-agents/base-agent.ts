import { Task } from '../task-orchestrator';

export interface AgentResult {
  success: boolean;
  data: any;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}

export abstract class BaseTaskAgent {
  protected task: Task;

  constructor(task: Task) {
    this.task = task;
  }

  abstract execute(): Promise<AgentResult>;

  abstract validate(result: AgentResult): Promise<boolean>;

  abstract rollback(): Promise<void>;

  protected createResult(
    success: boolean,
    data: any,
    errors: string[] = [],
    warnings: string[] = [],
    metadata: Record<string, any> = {}
  ): AgentResult {
    return {
      success,
      data,
      errors,
      warnings,
      metadata: {
        ...metadata,
        taskId: this.task.id,
        taskType: this.task.taskType,
        executedAt: new Date().toISOString(),
      },
    };
  }

  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    console.log(`[${level.toUpperCase()}] ${this.task.name}: ${message}`, data || '');
  }
}


export { BaseTaskAgent }
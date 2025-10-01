import { Task } from '../task-orchestrator';
import { BaseTaskAgent } from './base-agent';
import { DatabaseQueryAgent } from './database-query-agent';
import { ElectricalValidationAgent } from './electrical-validation-agent';

export { BaseTaskAgent } from './base-agent';
export { DatabaseQueryAgent } from './database-query-agent';
export { ElectricalValidationAgent } from './electrical-validation-agent';

export function createAgent(task: Task): BaseTaskAgent {
  switch (task.taskType) {
    case 'database_query':
      return new DatabaseQueryAgent(task);
    case 'electrical_validation':
      return new ElectricalValidationAgent(task);
    case 'ui_component':
    case 'data_transform':
    case 'api_integration':
    case 'state_management':
    case 'routing':
    default:
      throw new Error(`Agent not implemented for task type: ${task.taskType}`);
  }
}

import { BaseTaskAgent, AgentResult } from './base-agent';
import { supabase } from '../supabase';

export class DatabaseQueryAgent extends BaseTaskAgent {
  private previousData: any = null;

  async execute(): Promise<AgentResult> {
    try {
      const queryConfig = this.task.metadata.query;

      if (!queryConfig) {
        return this.createResult(false, null, ['No query configuration provided']);
      }

      const { table, operation, filters, data: insertData, columns } = queryConfig;

      this.log('info', `Executing ${operation} on ${table}`);

      let result: any;

      switch (operation) {
        case 'select':
          result = await this.executeSelect(table, filters, columns);
          break;
        case 'insert':
          this.previousData = null;
          result = await this.executeInsert(table, insertData);
          break;
        case 'update':
          await this.captureCurrentState(table, filters);
          result = await this.executeUpdate(table, filters, insertData);
          break;
        case 'delete':
          await this.captureCurrentState(table, filters);
          result = await this.executeDelete(table, filters);
          break;
        default:
          return this.createResult(false, null, [`Unsupported operation: ${operation}`]);
      }

      if (result.error) {
        return this.createResult(false, null, [result.error.message], [], {
          errorCode: result.error.code,
        });
      }

      const warnings: string[] = [];
      if (operation === 'select' && (!result.data || result.data.length === 0)) {
        warnings.push('Query returned no results');
      }

      return this.createResult(true, result.data, [], warnings, {
        operation,
        table,
        rowCount: Array.isArray(result.data) ? result.data.length : 1,
      });
    } catch (error: any) {
      this.log('error', 'Database query failed', error);
      return this.createResult(false, null, [error.message]);
    }
  }

  async validate(result: AgentResult): Promise<boolean> {
    if (!result.success) {
      return false;
    }

    const validation = this.task.metadata.validation;
    if (!validation) {
      return true;
    }

    if (validation.minRows !== undefined) {
      const rowCount = Array.isArray(result.data) ? result.data.length : 1;
      if (rowCount < validation.minRows) {
        this.log('warn', `Validation failed: expected at least ${validation.minRows} rows, got ${rowCount}`);
        return false;
      }
    }

    if (validation.maxRows !== undefined) {
      const rowCount = Array.isArray(result.data) ? result.data.length : 1;
      if (rowCount > validation.maxRows) {
        this.log('warn', `Validation failed: expected at most ${validation.maxRows} rows, got ${rowCount}`);
        return false;
      }
    }

    if (validation.requiredFields) {
      const data = Array.isArray(result.data) ? result.data[0] : result.data;
      for (const field of validation.requiredFields) {
        if (!(field in data)) {
          this.log('warn', `Validation failed: required field '${field}' not found`);
          return false;
        }
      }
    }

    return true;
  }

  async rollback(): Promise<void> {
    if (!this.previousData) {
      this.log('info', 'No rollback data available');
      return;
    }

    const queryConfig = this.task.metadata.query;
    if (!queryConfig) return;

    const { table, operation, filters } = queryConfig;

    try {
      if (operation === 'update' && this.previousData.length > 0) {
        this.log('info', 'Rolling back update operation');
        for (const row of this.previousData) {
          await supabase.from(table).update(row).eq('id', row.id);
        }
      } else if (operation === 'delete' && this.previousData.length > 0) {
        this.log('info', 'Rolling back delete operation');
        await supabase.from(table).insert(this.previousData);
      } else if (operation === 'insert') {
        this.log('info', 'Rolling back insert operation');
        await supabase.from(table).delete().match(filters || {});
      }

      this.log('info', 'Rollback completed successfully');
    } catch (error: any) {
      this.log('error', 'Rollback failed', error);
      throw error;
    }
  }

  private async executeSelect(table: string, filters: any, columns?: string): Promise<any> {
    let query = supabase.from(table).select(columns || '*');

    if (filters) {
      Object.keys(filters).forEach((key) => {
        query = query.eq(key, filters[key]);
      });
    }

    return await query;
  }

  private async executeInsert(table: string, data: any): Promise<any> {
    return await supabase.from(table).insert(data).select();
  }

  private async executeUpdate(table: string, filters: any, data: any): Promise<any> {
    let query = supabase.from(table).update(data);

    if (filters) {
      Object.keys(filters).forEach((key) => {
        query = query.eq(key, filters[key]);
      });
    }

    return await query.select();
  }

  private async executeDelete(table: string, filters: any): Promise<any> {
    let query = supabase.from(table).delete();

    if (filters) {
      Object.keys(filters).forEach((key) => {
        query = query.eq(key, filters[key]);
      });
    }

    return await query;
  }

  private async captureCurrentState(table: string, filters: any): Promise<void> {
    try {
      const { data, error } = await this.executeSelect(table, filters);
      if (!error && data) {
        this.previousData = data;
      }
    } catch (error) {
      this.log('warn', 'Could not capture current state for rollback', error);
    }
  }
}

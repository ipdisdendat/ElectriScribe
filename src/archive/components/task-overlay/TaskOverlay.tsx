import { useState, useEffect } from 'react';
import { X, Activity, CheckCircle, AlertCircle, Clock, TrendingUp, TrendingDown, Zap, Brain } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { tokenOptimizer } from '../../services/token-optimizer';
import { knowledgeLearner } from '../../services/knowledge-learner';

interface TaskOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TaskOverlay({ isOpen, onClose }: TaskOverlayProps) {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const { data: tasks, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: isOpen ? 2000 : false,
  });

  const { data: taskStats } = useQuery({
    queryKey: ['task-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('status, confidence_score');

      if (error) throw error;

      const stats = {
        total: data.length,
        running: data.filter((t) => t.status === 'running').length,
        completed: data.filter((t) => t.status === 'completed').length,
        failed: data.filter((t) => t.status === 'failed').length,
        avgConfidence: data.reduce((sum, t) => sum + (t.confidence_score || 0), 0) / data.length,
        aboveTarget: data.filter((t) => (t.confidence_score || 0) >= 96).length,
        belowFloor: data.filter((t) => (t.confidence_score || 0) < 88).length,
      };

      return stats;
    },
    refetchInterval: isOpen ? 2000 : false,
  });

  const { data: optimizationStats } = useQuery({
    queryKey: ['optimization-stats'],
    queryFn: async () => {
      const globalStats = await tokenOptimizer.getGlobalStats();
      const sessionInsights = await knowledgeLearner.getSessionInsights();
      return { ...globalStats, ...sessionInsights };
    },
    refetchInterval: isOpen ? 5000 : false,
  });

  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  if (!isOpen) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'running':
      case 'testing':
        return <Activity className="w-4 h-4 text-info animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-error" />;
      default:
        return <Clock className="w-4 h-4 text-base-content/50" />;
    }
  };

  const getConfidenceBadge = (score: number, target: number, floor: number) => {
    if (score >= target) {
      return <span className="badge badge-success badge-sm">Target Met</span>;
    } else if (score >= floor) {
      return <span className="badge badge-warning badge-sm">Above Floor</span>;
    } else {
      return <span className="badge badge-error badge-sm">Below Floor</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-base-100 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div>
            <h2 className="text-2xl font-bold">Task Management System</h2>
            <p className="text-sm text-base-content/70">
              Self-corrective task orchestration with Bayesian confidence scoring
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="w-5 h-5" />
          </button>
        </div>

        {taskStats && optimizationStats && (
          <div className="space-y-4 p-4 border-b border-base-300">
            <div className="grid grid-cols-4 gap-4">{/* Task stats grid */}
            <div className="stat bg-base-200 rounded-lg p-3">
              <div className="stat-title text-xs">Total Tasks</div>
              <div className="stat-value text-2xl">{taskStats.total}</div>
              <div className="stat-desc flex items-center gap-2 text-xs">
                <Activity className="w-3 h-3" />
                {taskStats.running} running
              </div>
            </div>

            <div className="stat bg-base-200 rounded-lg p-3">
              <div className="stat-title text-xs">Avg Confidence</div>
              <div className="stat-value text-2xl">{taskStats.avgConfidence.toFixed(1)}%</div>
              <div className="stat-desc flex items-center gap-2 text-xs">
                {taskStats.avgConfidence >= 96 ? (
                  <TrendingUp className="w-3 h-3 text-success" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-warning" />
                )}
                Target: 96%
              </div>
            </div>

            <div className="stat bg-base-200 rounded-lg p-3">
              <div className="stat-title text-xs">Success Rate</div>
              <div className="stat-value text-2xl">
                {taskStats.total > 0 ? ((taskStats.completed / taskStats.total) * 100).toFixed(0) : 0}%
              </div>
              <div className="stat-desc text-xs">
                {taskStats.completed} completed
              </div>
            </div>

            <div className="stat bg-base-200 rounded-lg p-3">
              <div className="stat-title text-xs">Quality Status</div>
              <div className="stat-value text-2xl text-success">{taskStats.aboveTarget}</div>
              <div className="stat-desc text-xs">
                {taskStats.belowFloor > 0 && (
                  <span className="text-error">{taskStats.belowFloor} below floor</span>
                )}
              </div>
            </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="stat bg-gradient-to-r from-success/20 to-success/5 rounded-lg p-3 border border-success/30">
                <div className="stat-title text-xs flex items-center gap-2">
                  <Zap className="w-3 h-3 text-success" />
                  Tokens Saved
                </div>
                <div className="stat-value text-2xl text-success">{optimizationStats.totalTokensSaved.toLocaleString()}</div>
                <div className="stat-desc text-xs">
                  {optimizationStats.totalErrorsPrevented} errors prevented
                </div>
              </div>

              <div className="stat bg-gradient-to-r from-info/20 to-info/5 rounded-lg p-3 border border-info/30">
                <div className="stat-title text-xs flex items-center gap-2">
                  <Brain className="w-3 h-3 text-info" />
                  Learnings Applied
                </div>
                <div className="stat-value text-2xl text-info">{optimizationStats.totalLearnings || 0}</div>
                <div className="stat-desc text-xs">
                  Cross-session knowledge
                </div>
              </div>

              <div className="stat bg-gradient-to-r from-warning/20 to-warning/5 rounded-lg p-3 border border-warning/30">
                <div className="stat-title text-xs">Efficiency</div>
                <div className="stat-value text-2xl text-warning">{optimizationStats.efficiency.toFixed(0)}%</div>
                <div className="stat-desc text-xs">
                  Token optimization rate
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {tasks?.map((task) => (
              <div
                key={task.id}
                className={`card bg-base-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                  selectedTask === task.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedTask(selectedTask === task.id ? null : task.id)}
              >
                <div className="card-body p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(task.status)}
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{task.name}</h3>
                        {task.description && (
                          <p className="text-xs text-base-content/70 mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="badge badge-sm">{task.task_type}</span>
                          <span className="badge badge-sm badge-outline">
                            Complexity: {task.complexity_score}/10
                          </span>
                          <span className="badge badge-sm badge-outline">
                            Priority: {task.priority}/10
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {(task.confidence_score || 0).toFixed(0)}%
                      </div>
                      <div className="text-xs text-base-content/70 mb-2">
                        Floor: {task.floor_confidence}% | Target: {task.target_confidence}%
                      </div>
                      {getConfidenceBadge(
                        task.confidence_score || 0,
                        task.target_confidence,
                        task.floor_confidence
                      )}
                    </div>
                  </div>

                  {selectedTask === task.id && (
                    <TaskDetails taskId={task.id} />
                  )}
                </div>
              </div>
            ))}

            {tasks?.length === 0 && (
              <div className="text-center py-12 text-base-content/50">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tasks found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskDetails({ taskId }: { taskId: string }) {
  const { data: executions } = useQuery({
    queryKey: ['task-executions', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_executions')
        .select('*')
        .eq('task_id', taskId)
        .order('started_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const { data: corrections } = useQuery({
    queryKey: ['task-corrections', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_corrections')
        .select('*, execution:task_executions!inner(task_id)')
        .eq('execution.task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mt-4 pt-4 border-t border-base-300 space-y-4">
      <div>
        <h4 className="font-semibold text-sm mb-2">Recent Executions</h4>
        <div className="space-y-1">
          {executions?.map((exec) => (
            <div key={exec.id} className="flex items-center justify-between text-xs bg-base-300 p-2 rounded">
              <div className="flex items-center gap-2">
                <span className="badge badge-xs">{exec.status}</span>
                <span>Attempt #{exec.attempt_number}</span>
                {exec.execution_time_ms && (
                  <span className="text-base-content/50">{exec.execution_time_ms}ms</span>
                )}
              </div>
              <div className="font-semibold">
                {(exec.confidence_score || 0).toFixed(0)}%
              </div>
            </div>
          ))}
          {executions?.length === 0 && (
            <p className="text-xs text-base-content/50">No executions yet</p>
          )}
        </div>
      </div>

      {corrections && corrections.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-2">Corrections Applied</h4>
          <div className="space-y-1">
            {corrections.map((corr) => (
              <div key={corr.id} className="text-xs bg-base-300 p-2 rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="badge badge-xs">{corr.correction_type}</span>
                  <span className={corr.success ? 'text-success' : 'text-error'}>
                    {corr.before_confidence?.toFixed(0)}% → {corr.after_confidence?.toFixed(0)}%
                  </span>
                </div>
                <p className="text-base-content/70">{corr.analysis}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

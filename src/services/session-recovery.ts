import { supabase } from './supabase';
import type { LearnedConstraint } from './knowledge-learner';

export interface SessionLearning {
  id: string;
  sessionId: string;
  learningCategory: string;
  title: string;
  description: string;
  beforeState: any;
  afterState: any;
  impact: string;
  tokensSavedPerApplication: number;
  promotedToGlobal: boolean;
  learnedAt: string;
}

export interface TaskSummary {
  id: string;
  name: string;
  taskType: string;
  status: string;
  confidenceScore: number;
  createdAt: string;
  completedAt: string | null;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  attemptNumber: number;
  status: string;
  confidenceScore: number;
  executionTimeMs: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface MarkovTransition {
  fromState: string;
  toState: string;
  taskType: string;
  confidenceRange: string;
  transitionCount: number;
  successCount: number;
  avgTimeMs: number;
}

export interface SessionSnapshot {
  sessionId: string;
  exists: boolean;
  summary: {
    totalLearnings: number;
    constraintsLearned: number;
    tasksExecuted: number;
    tokensSaved: number;
    errorsPrevented: number;
    firstActivity: string | null;
    lastActivity: string | null;
  };
  learnings: SessionLearning[];
  constraints: LearnedConstraint[];
  tasks: TaskSummary[];
  executions: TaskExecution[];
  markovState: MarkovTransition[];
  tokenMetrics: {
    totalUsed: number;
    totalSaved: number;
    byPhase: Record<string, { used: number; saved: number }>;
  };
}

export interface SessionInfo {
  sessionId: string;
  firstActivity: string;
  lastActivity: string;
  learningsCount: number;
  constraintsCount: number;
  tasksCount: number;
}

export class SessionRecoveryService {
  /**
   * Retrieves complete snapshot of a session for teleportation/recovery
   */
  async teleportToSession(sessionId: string): Promise<SessionSnapshot> {
    console.log(`🚀 Teleporting to session: ${sessionId}`);

    // Fetch session learnings
    const { data: learnings, error: learningsError } = await supabase
      .from('session_learnings')
      .select('*')
      .eq('session_id', sessionId)
      .order('learned_at', { ascending: false });

    if (learningsError) {
      console.error('Error fetching learnings:', learningsError);
    }

    // Fetch learned constraints for this session
    const { data: constraints, error: constraintsError } = await supabase
      .from('learned_constraints')
      .select('*')
      .eq('session_id', sessionId)
      .order('learned_at', { ascending: false });

    if (constraintsError) {
      console.error('Error fetching constraints:', constraintsError);
    }

    // Check if session has any data
    const sessionExists = (learnings && learnings.length > 0) ||
                          (constraints && constraints.length > 0);

    if (!sessionExists) {
      console.warn(`⚠️  Session ${sessionId} not found or has no data`);
    }

    // Fetch token efficiency metrics
    const { data: tokenMetrics, error: tokenError } = await supabase
      .from('token_efficiency_metrics')
      .select('phase, tokens_used, tokens_saved')
      .in('execution_id',
        (await supabase
          .from('task_executions')
          .select('id')
          .ilike('output_data->session_id', `%${sessionId}%`)
        ).data?.map(e => e.id) || []
      );

    if (tokenError) {
      console.error('Error fetching token metrics:', tokenError);
    }

    // Calculate token metrics by phase
    const tokensByPhase: Record<string, { used: number; saved: number }> = {};
    let totalUsed = 0;
    let totalSaved = 0;

    tokenMetrics?.forEach((metric) => {
      const phase = metric.phase;
      if (!tokensByPhase[phase]) {
        tokensByPhase[phase] = { used: 0, saved: 0 };
      }
      tokensByPhase[phase].used += metric.tokens_used || 0;
      tokensByPhase[phase].saved += metric.tokens_saved || 0;
      totalUsed += metric.tokens_used || 0;
      totalSaved += metric.tokens_saved || 0;
    });

    // Fetch Markov state transitions (global, not session-specific)
    const { data: markovState, error: markovError } = await supabase
      .from('markov_state_transitions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (markovError) {
      console.error('Error fetching Markov state:', markovError);
    }

    // Calculate summary metrics
    const tokensSaved = learnings?.reduce(
      (sum, l) => sum + (l.tokens_saved_per_application || 0),
      0
    ) || 0;

    const errorsPrevented = constraints?.reduce(
      (sum, c) => sum + (c.times_prevented || 0),
      0
    ) || 0;

    const mappedLearnings: SessionLearning[] = learnings?.map((l) => ({
      id: l.id,
      sessionId: l.session_id,
      learningCategory: l.learning_category,
      title: l.title,
      description: l.description,
      beforeState: l.before_state,
      afterState: l.after_state,
      impact: l.impact,
      tokensSavedPerApplication: l.tokens_saved_per_application || 0,
      promotedToGlobal: l.promoted_to_global || false,
      learnedAt: l.learned_at,
    })) || [];

    const mappedConstraints: LearnedConstraint[] = constraints?.map((c) => ({
      id: c.id,
      constraintType: c.constraint_type,
      errorPattern: c.error_pattern,
      rootCause: c.root_cause,
      solutionTemplate: c.solution_template,
      codePattern: c.code_pattern,
      fixedPattern: c.fixed_pattern,
      appliesTo: Array.isArray(c.applies_to) ? c.applies_to : [],
      confidence: c.confidence || 0,
      timesPrevented: c.times_prevented || 0,
      isGlobal: c.is_global || false,
    })) || [];

    const mappedMarkov: MarkovTransition[] = markovState?.map((m) => ({
      fromState: m.from_state,
      toState: m.to_state,
      taskType: m.task_type,
      confidenceRange: m.confidence_range,
      transitionCount: m.transition_count || 0,
      successCount: m.success_count || 0,
      avgTimeMs: m.avg_time_ms || 0,
    })) || [];

    // Get timestamp range for session
    const allTimestamps = [
      ...(learnings?.map(l => l.learned_at) || []),
      ...(constraints?.map(c => c.learned_at) || []),
    ].filter(Boolean);

    const firstActivity = allTimestamps.length > 0
      ? new Date(Math.min(...allTimestamps.map(t => new Date(t).getTime()))).toISOString()
      : null;

    const lastActivity = allTimestamps.length > 0
      ? new Date(Math.max(...allTimestamps.map(t => new Date(t).getTime()))).toISOString()
      : null;

    const snapshot: SessionSnapshot = {
      sessionId,
      exists: sessionExists,
      summary: {
        totalLearnings: learnings?.length || 0,
        constraintsLearned: constraints?.length || 0,
        tasksExecuted: 0, // Tasks don't have session_id tracking yet
        tokensSaved,
        errorsPrevented,
        firstActivity,
        lastActivity,
      },
      learnings: mappedLearnings,
      constraints: mappedConstraints,
      tasks: [], // Would need to add session tracking to tasks table
      executions: [],
      markovState: mappedMarkov,
      tokenMetrics: {
        totalUsed,
        totalSaved,
        byPhase: tokensByPhase,
      },
    };

    console.log(`✅ Session snapshot retrieved:`, {
      learnings: snapshot.summary.totalLearnings,
      constraints: snapshot.summary.constraintsLearned,
      tokensSaved: snapshot.summary.tokensSaved,
    });

    return snapshot;
  }

  /**
   * Get a concise summary of a session
   */
  async getSessionSummary(sessionId: string): Promise<SessionSnapshot['summary']> {
    const snapshot = await this.teleportToSession(sessionId);
    return snapshot.summary;
  }

  /**
   * List all available sessions
   */
  async listSessions(limit: number = 50): Promise<SessionInfo[]> {
    // Get unique sessions from session_learnings
    const { data: learningsData, error: learningsError } = await supabase
      .from('session_learnings')
      .select('session_id, learned_at')
      .order('learned_at', { ascending: false })
      .limit(1000);

    if (learningsError) {
      console.error('Error fetching sessions from learnings:', learningsError);
      return [];
    }

    // Get unique sessions from learned_constraints
    const { data: constraintsData, error: constraintsError } = await supabase
      .from('learned_constraints')
      .select('session_id, learned_at')
      .order('learned_at', { ascending: false })
      .limit(1000);

    if (constraintsError) {
      console.error('Error fetching sessions from constraints:', constraintsError);
    }

    // Combine and aggregate session data
    const sessionMap = new Map<string, {
      firstActivity: Date;
      lastActivity: Date;
      learningsCount: number;
      constraintsCount: number;
    }>();

    // Process learnings
    learningsData?.forEach((item) => {
      if (!item.session_id) return;

      const existing = sessionMap.get(item.session_id);
      const timestamp = new Date(item.learned_at);

      if (existing) {
        existing.learningsCount++;
        if (timestamp < existing.firstActivity) existing.firstActivity = timestamp;
        if (timestamp > existing.lastActivity) existing.lastActivity = timestamp;
      } else {
        sessionMap.set(item.session_id, {
          firstActivity: timestamp,
          lastActivity: timestamp,
          learningsCount: 1,
          constraintsCount: 0,
        });
      }
    });

    // Process constraints
    constraintsData?.forEach((item) => {
      if (!item.session_id) return;

      const existing = sessionMap.get(item.session_id);
      const timestamp = new Date(item.learned_at);

      if (existing) {
        existing.constraintsCount++;
        if (timestamp < existing.firstActivity) existing.firstActivity = timestamp;
        if (timestamp > existing.lastActivity) existing.lastActivity = timestamp;
      } else {
        sessionMap.set(item.session_id, {
          firstActivity: timestamp,
          lastActivity: timestamp,
          learningsCount: 0,
          constraintsCount: 1,
        });
      }
    });

    // Convert to array and sort by last activity
    const sessions: SessionInfo[] = Array.from(sessionMap.entries())
      .map(([sessionId, data]) => ({
        sessionId,
        firstActivity: data.firstActivity.toISOString(),
        lastActivity: data.lastActivity.toISOString(),
        learningsCount: data.learningsCount,
        constraintsCount: data.constraintsCount,
        tasksCount: 0, // Would need session tracking in tasks table
      }))
      .sort((a, b) =>
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      )
      .slice(0, limit);

    return sessions;
  }

  /**
   * Display session snapshot in a human-readable format
   */
  formatSessionSnapshot(snapshot: SessionSnapshot): string {
    const lines: string[] = [];

    lines.push('╔═══════════════════════════════════════════════════════════════╗');
    lines.push(`║  SESSION TELEPORT: ${snapshot.sessionId.padEnd(40)} ║`);
    lines.push('╠═══════════════════════════════════════════════════════════════╣');

    if (!snapshot.exists) {
      lines.push('║  ⚠️  SESSION NOT FOUND OR HAS NO DATA                         ║');
      lines.push('╚═══════════════════════════════════════════════════════════════╝');
      return lines.join('\n');
    }

    lines.push('║  SUMMARY                                                      ║');
    lines.push('╟───────────────────────────────────────────────────────────────╢');
    lines.push(`║  Total Learnings:      ${String(snapshot.summary.totalLearnings).padStart(5)}                               ║`);
    lines.push(`║  Constraints Learned:  ${String(snapshot.summary.constraintsLearned).padStart(5)}                               ║`);
    lines.push(`║  Errors Prevented:     ${String(snapshot.summary.errorsPrevented).padStart(5)}                               ║`);
    lines.push(`║  Tokens Saved:         ${String(snapshot.summary.tokensSaved).padStart(5)}                               ║`);

    if (snapshot.summary.firstActivity) {
      const first = new Date(snapshot.summary.firstActivity).toLocaleString();
      const last = new Date(snapshot.summary.lastActivity!).toLocaleString();
      lines.push('╟───────────────────────────────────────────────────────────────╢');
      lines.push(`║  First Activity:  ${first.padEnd(44)} ║`);
      lines.push(`║  Last Activity:   ${last.padEnd(44)} ║`);
    }

    // Show token metrics if available
    if (snapshot.tokenMetrics.totalUsed > 0 || snapshot.tokenMetrics.totalSaved > 0) {
      lines.push('╟───────────────────────────────────────────────────────────────╢');
      lines.push('║  TOKEN METRICS                                                ║');
      lines.push('╟───────────────────────────────────────────────────────────────╢');
      lines.push(`║  Total Used:   ${String(snapshot.tokenMetrics.totalUsed).padStart(10)}                                   ║`);
      lines.push(`║  Total Saved:  ${String(snapshot.tokenMetrics.totalSaved).padStart(10)}                                   ║`);

      if (Object.keys(snapshot.tokenMetrics.byPhase).length > 0) {
        lines.push('╟───────────────────────────────────────────────────────────────╢');
        lines.push('║  BY PHASE:                                                    ║');
        Object.entries(snapshot.tokenMetrics.byPhase).forEach(([phase, metrics]) => {
          const phaseLabel = phase.padEnd(15);
          const used = String(metrics.used).padStart(6);
          const saved = String(metrics.saved).padStart(6);
          lines.push(`║    ${phaseLabel} Used: ${used}  Saved: ${saved}           ║`);
        });
      }
    }

    // Show recent learnings
    if (snapshot.learnings.length > 0) {
      lines.push('╟───────────────────────────────────────────────────────────────╢');
      lines.push('║  RECENT LEARNINGS                                             ║');
      lines.push('╟───────────────────────────────────────────────────────────────╢');

      snapshot.learnings.slice(0, 5).forEach((learning, idx) => {
        const num = `${idx + 1}.`.padEnd(3);
        const title = learning.title.substring(0, 54).padEnd(54);
        lines.push(`║  ${num} ${title} ║`);

        const category = `[${learning.learningCategory}]`.padEnd(28);
        const tokens = `💾 ${learning.tokensSavedPerApplication}`.padStart(30);
        lines.push(`║      ${category}${tokens} ║`);
      });
    }

    // Show learned constraints
    if (snapshot.constraints.length > 0) {
      lines.push('╟───────────────────────────────────────────────────────────────╢');
      lines.push('║  LEARNED CONSTRAINTS                                          ║');
      lines.push('╟───────────────────────────────────────────────────────────────╢');

      snapshot.constraints.slice(0, 5).forEach((constraint, idx) => {
        const num = `${idx + 1}.`.padEnd(3);
        const type = `[${constraint.constraintType}]`.padEnd(24);
        const prevented = `🛡️  ${constraint.timesPrevented}x`.padStart(32);
        lines.push(`║  ${num} ${type}${prevented} ║`);

        const solution = constraint.solutionTemplate.substring(0, 56).padEnd(56);
        lines.push(`║      ${solution} ║`);
      });
    }

    lines.push('╚═══════════════════════════════════════════════════════════════╝');

    return lines.join('\n');
  }

  /**
   * Display a list of available sessions
   */
  formatSessionList(sessions: SessionInfo[]): string {
    const lines: string[] = [];

    lines.push('╔═══════════════════════════════════════════════════════════════╗');
    lines.push('║  AVAILABLE SESSIONS                                           ║');
    lines.push('╠═══════════════════════════════════════════════════════════════╣');

    if (sessions.length === 0) {
      lines.push('║  No sessions found                                            ║');
    } else {
      sessions.forEach((session, idx) => {
        const num = `${idx + 1}.`.padEnd(4);
        const id = session.sessionId.substring(0, 44).padEnd(44);
        lines.push(`║  ${num}${id}       ║`);

        const lastActivity = new Date(session.lastActivity).toLocaleString().padEnd(28);
        const counts = `📚${session.learningsCount} 🛡️${session.constraintsCount}`.padStart(27);
        lines.push(`║       ${lastActivity}${counts} ║`);
      });
    }

    lines.push('╚═══════════════════════════════════════════════════════════════╝');

    return lines.join('\n');
  }
}

// Export singleton instance
export const sessionRecovery = new SessionRecoveryService();

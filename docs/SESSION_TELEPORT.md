# Session Teleport - Time Travel for Your AI Sessions

## Overview

Session Teleport is a powerful feature that allows you to recover, inspect, and resume previous execution sessions. Think of it as a time machine for your AI-powered task execution system - you can jump back to any previous session and see exactly what was learned, what errors were prevented, and how tokens were optimized.

## What is a Session?

A **session** represents a complete execution context, including:

- **Session ID**: Unique identifier (e.g., `session_1697000000000_abc123xyz`)
- **Learnings**: Knowledge gained from successes and failures
- **Constraints**: Rules learned to prevent repeated errors
- **Token Metrics**: Usage and savings tracking
- **Task History**: All tasks executed during the session
- **Markov State**: Predictive state transition patterns

## Features

### 🚀 Teleport to Any Session
Jump to a specific session and view its complete state:
```bash
npm run teleport session_011CUnPBT8qPn3h5NWBk5Y9c
```

### 📋 List All Sessions
See all available sessions ordered by most recent activity:
```bash
npm run teleport list
```

### 📊 View Session Summary
Each session snapshot includes:
- Total learnings captured
- Constraints learned
- Errors prevented
- Tokens saved
- Activity timeline
- Token usage by execution phase

## Installation & Setup

### 1. Install Dependencies

The teleport feature requires `tsx` and `dotenv`:

```bash
npm install --save-dev tsx dotenv
```

These dependencies are already included in the project's `package.json`.

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

⚠️ **Important**: Never commit your `.env` file to version control!

### 3. Verify Setup

Test the teleport CLI:

```bash
npm run teleport --help
```

## Usage Guide

### Basic Commands

#### Show Help
```bash
npm run teleport --help
```

#### List Available Sessions
```bash
npm run teleport list
```

Output example:
```
╔═══════════════════════════════════════════════════════════════╗
║  AVAILABLE SESSIONS                                           ║
╠═══════════════════════════════════════════════════════════════╣
║  1.  session_1697000000000_abc123xyz                          ║
║       10/15/2023, 3:30:00 PM            📚5 🛡️3               ║
║  2.  session_1697000100000_def456uvw                          ║
║       10/15/2023, 2:15:00 PM            📚3 🛡️2               ║
╚═══════════════════════════════════════════════════════════════╝
```

Legend:
- 📚 = Number of learnings
- 🛡️ = Number of constraints

#### Teleport to a Session
```bash
npm run teleport session_011CUnPBT8qPn3h5NWBk5Y9c
```

Output example:
```
╔═══════════════════════════════════════════════════════════════╗
║  SESSION TELEPORT: session_011CUnPBT8qPn3h5NWBk5Y9c          ║
╠═══════════════════════════════════════════════════════════════╣
║  SUMMARY                                                      ║
╟───────────────────────────────────────────────────────────────╢
║  Total Learnings:          5                                  ║
║  Constraints Learned:      3                                  ║
║  Errors Prevented:        12                                  ║
║  Tokens Saved:           450                                  ║
╟───────────────────────────────────────────────────────────────╢
║  First Activity:  10/15/2023, 2:00:00 PM                     ║
║  Last Activity:   10/15/2023, 3:30:00 PM                     ║
╟───────────────────────────────────────────────────────────────╢
║  TOKEN METRICS                                                ║
╟───────────────────────────────────────────────────────────────╢
║  Total Used:        12500                                     ║
║  Total Saved:         450                                     ║
╟───────────────────────────────────────────────────────────────╢
║  BY PHASE:                                                    ║
║    planning         Used:   2000  Saved:    100              ║
║    execution        Used:   8000  Saved:    250              ║
║    testing          Used:   2000  Saved:     80              ║
║    correction       Used:    500  Saved:     20              ║
╟───────────────────────────────────────────────────────────────╢
║  RECENT LEARNINGS                                             ║
╟───────────────────────────────────────────────────────────────╢
║  1.  Always specify UTF-8 encoding for file operations       ║
║      [error_prevention]                  💾 150              ║
║  2.  Batch database queries to reduce round trips            ║
║      [optimization]                      💾 200              ║
╟───────────────────────────────────────────────────────────────╢
║  LEARNED CONSTRAINTS                                          ║
╟───────────────────────────────────────────────────────────────╢
║  1.  [encoding_error]                       🛡️  8x            ║
║      Always specify encoding="utf-8" when opening files      ║
║  2.  [type_error]                           🛡️  4x            ║
║      Check for None before accessing object properties       ║
╚═══════════════════════════════════════════════════════════════╝
```

## Use Cases

### 1. Debugging Session Issues
If something went wrong in a previous session, teleport to it to see:
- What errors occurred
- What corrections were attempted
- What constraints were learned

```bash
npm run teleport session_with_errors_xyz
```

### 2. Learning Analysis
Review what the system learned over time:
- See which errors are most common
- Identify optimization opportunities
- Track token efficiency improvements

### 3. Session Recovery
Resume work from a previous session:
1. Teleport to the session
2. Review its state and learnings
3. Apply those learnings to new tasks
4. Continue from where you left off

### 4. Performance Optimization
Analyze token usage patterns:
- Identify which phases use the most tokens
- See where optimizations saved tokens
- Find opportunities for further efficiency gains

## Architecture

### Database Tables

Session data is stored across multiple Supabase tables:

**session_learnings**
- Records all lessons learned during a session
- Categories: error_prevention, optimization, best_practice
- Tracks tokens saved per application

**learned_constraints**
- Permanent error prevention rules
- Can be session-specific or global
- Tracks how many times each prevented an error

**token_efficiency_metrics**
- Token usage by execution phase
- Links to task executions
- Tracks savings from applied constraints

### Session Recovery Service

The `SessionRecoveryService` (`src/services/session-recovery.ts`) provides:

```typescript
class SessionRecoveryService {
  // Main teleport function
  async teleportToSession(sessionId: string): Promise<SessionSnapshot>

  // List all sessions
  async listSessions(limit?: number): Promise<SessionInfo[]>

  // Get session summary
  async getSessionSummary(sessionId: string): Promise<SessionSummary>

  // Format output for display
  formatSessionSnapshot(snapshot: SessionSnapshot): string
  formatSessionList(sessions: SessionInfo[]): string
}
```

### CLI Tool

The teleport CLI (`scripts/teleport.ts`) is a standalone TypeScript script that:
- Loads environment variables from `.env`
- Provides interactive session recovery
- Formats output for terminal display
- Works independently of the main Vite app

## API Reference

### SessionSnapshot

```typescript
interface SessionSnapshot {
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
```

### Using in Code

You can also use the session recovery service programmatically:

```typescript
import { sessionRecovery } from './src/services/session-recovery';

// Get a session snapshot
const snapshot = await sessionRecovery.teleportToSession('session_xyz');

// Access session data
console.log(`Saved ${snapshot.summary.tokensSaved} tokens`);
console.log(`Prevented ${snapshot.summary.errorsPrevented} errors`);

// List sessions
const sessions = await sessionRecovery.listSessions(10);
sessions.forEach(session => {
  console.log(`${session.sessionId}: ${session.learningsCount} learnings`);
});
```

## Troubleshooting

### "Missing Supabase environment variables"

**Problem**: The `.env` file is missing or incomplete.

**Solution**:
1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials
3. Restart the teleport command

### "Session not found or has no data"

**Problem**: The session ID doesn't exist or has no learnings/constraints.

**Solution**:
1. Check the session ID for typos
2. Run `npm run teleport list` to see available sessions
3. Verify the session has actually recorded data

### "TypeError: Cannot read properties of undefined"

**Problem**: Running in an environment that doesn't support the Supabase client.

**Solution**:
1. Ensure you're using Node.js v16 or higher
2. Check that tsx is installed: `npm install --save-dev tsx`
3. Verify your `.env` file exists and is correctly formatted

## Best Practices

### 1. Regular Session Review
Periodically review sessions to identify patterns:
```bash
npm run teleport list
```

### 2. Session Naming
While session IDs are auto-generated, you can reference them in your task metadata for easier tracking.

### 3. Learning Promotion
When a constraint proves valuable across sessions, it can be promoted to global (applies to all future sessions).

### 4. Token Optimization
Use session metrics to identify high-token operations and optimize them in future tasks.

## Advanced Features

### Cross-Session Learning

The system tracks learnings across sessions:
- **Session-specific** constraints apply only to their originating session
- **Global** constraints (`is_global: true`) apply to all sessions
- Successful patterns are automatically promoted to global

### Markov State Analysis

Each session includes Markov chain transition data:
- Predicts likely next states
- Identifies successful correction strategies
- Optimizes task execution paths

### Token Efficiency Tracking

Detailed token metrics show:
- **Planning phase**: Initial task analysis
- **Execution phase**: Actual task running
- **Testing phase**: Validation and verification
- **Correction phase**: Error recovery
- **Completion phase**: Final cleanup

## Future Enhancements

Planned improvements:
- [ ] Session comparison (diff between two sessions)
- [ ] Session export/import (share learnings across systems)
- [ ] Interactive session browser (web UI)
- [ ] Session replay (re-execute with same constraints)
- [ ] Learning recommendations (suggest applying global constraints)

## Related Documentation

- [Knowledge Learner](./KNOWLEDGE_LEARNER.md) - How the system learns from failures
- [Self-Correction Engine](./SELF_CORRECTION.md) - Automatic error recovery
- [Task Orchestrator](./TASK_ORCHESTRATOR.md) - Task execution system
- [Token Optimizer](./TOKEN_OPTIMIZER.md) - Token efficiency strategies

## Support

For issues or questions:
1. Check this documentation
2. Review the help command: `npm run teleport --help`
3. Examine the source code in `src/services/session-recovery.ts`
4. Open an issue in the project repository

---

**Last Updated**: 2025-11-16
**Version**: 1.0.0
**Status**: Production Ready

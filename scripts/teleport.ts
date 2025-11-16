#!/usr/bin/env tsx

/**
 * Session Teleport CLI Tool
 *
 * Usage:
 *   npm run teleport <session_id>        - Teleport to a specific session
 *   npm run teleport list                - List all available sessions
 *   npm run teleport --help              - Show help
 *
 * Examples:
 *   npm run teleport session_011CUnPBT8qPn3h5NWBk5Y9c
 *   npm run teleport list
 */

import { config } from 'dotenv';
import { sessionRecovery } from '../src/services/session-recovery';

// Load environment variables from .env file
config();

async function main() {
  const args = process.argv.slice(2);

  // Show help without requiring environment variables
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const command = args[0];

  // Check if Supabase environment variables are set for actual operations
  const hasEnvVars = !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);

  if (!hasEnvVars) {
    console.error('❌ Missing Supabase environment variables');
    console.error('');
    console.error('Please create a .env file in the project root with:');
    console.error('  VITE_SUPABASE_URL=your_supabase_project_url');
    console.error('  VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
    console.error('');
    console.error('You can copy .env.example to .env and fill in your values:');
    console.error('  cp .env.example .env');
    console.error('');
    process.exit(1);
  }

  try {
    if (command === 'list') {
      await listSessions();
    } else if (command.startsWith('session_')) {
      await teleportToSession(command);
    } else {
      console.error(`❌ Unknown command: ${command}`);
      console.error('');
      showHelp();
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function teleportToSession(sessionId: string) {
  console.log('');
  console.log(`🚀 Initiating teleport to session: ${sessionId}`);
  console.log('');

  const snapshot = await sessionRecovery.teleportToSession(sessionId);

  console.log(sessionRecovery.formatSessionSnapshot(snapshot));
  console.log('');

  if (snapshot.exists) {
    console.log('✅ Session teleport successful!');
    console.log('');
    console.log('You can now:');
    console.log('  • Review the learnings and constraints from this session');
    console.log('  • Apply the learned constraints to prevent similar errors');
    console.log('  • Analyze token efficiency metrics');
    console.log('  • Continue from where this session left off');
    console.log('');
  } else {
    console.log('⚠️  Session not found or contains no data');
    console.log('');
    console.log('To see available sessions, run:');
    console.log('  npm run teleport list');
    console.log('');
  }
}

async function listSessions() {
  console.log('');
  console.log('📋 Fetching available sessions...');
  console.log('');

  const sessions = await sessionRecovery.listSessions(20);

  console.log(sessionRecovery.formatSessionList(sessions));
  console.log('');

  if (sessions.length > 0) {
    console.log('To teleport to a session, run:');
    console.log('  npm run teleport <session_id>');
    console.log('');
    console.log('Example:');
    console.log(`  npm run teleport ${sessions[0].sessionId}`);
    console.log('');
  }
}

function showHelp() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  SESSION TELEPORT - Recover and Resume Previous Sessions     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('USAGE:');
  console.log('  npm run teleport <session_id>    Teleport to a specific session');
  console.log('  npm run teleport list            List all available sessions');
  console.log('  npm run teleport --help          Show this help message');
  console.log('');
  console.log('EXAMPLES:');
  console.log('  npm run teleport session_011CUnPBT8qPn3h5NWBk5Y9c');
  console.log('  npm run teleport list');
  console.log('');
  console.log('WHAT IS SESSION TELEPORT?');
  console.log('  Session teleport allows you to recover the state, learnings,');
  console.log('  and context from previous execution sessions. You can:');
  console.log('');
  console.log('  • View all learnings and constraints from a session');
  console.log('  • See token efficiency metrics and savings');
  console.log('  • Review errors that were prevented');
  console.log('  • Resume work from a previous session state');
  console.log('');
  console.log('SESSION DATA INCLUDES:');
  console.log('  • Session learnings (error prevention, optimizations)');
  console.log('  • Learned constraints (permanent error prevention rules)');
  console.log('  • Token usage and savings metrics');
  console.log('  • Task execution history');
  console.log('  • Markov state transitions');
  console.log('');
}

// Run the CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

/*
  Aggregate learning events to propose dynamic rules.
  Heuristic: if breaker_capacity failures exceed threshold in the last 24h,
  propose a rule with a maxAmps override (disabled by default) for review.
*/
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL as string
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY as string

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

async function main() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await (supabase as any)
    .from('learning_events')
    .select('id, payload, created_at')
    .gte('created_at', since)
  if (error) throw error

  let breakerFails = 0
  for (const row of data || []) {
    try {
      const p = row.payload || {}
      // For builder_test_results, payload.statuses holds array of statuses
      if (Array.isArray(p.statuses)) {
        for (const s of p.statuses) if (String(s).includes('FAIL')) breakerFails++
      }
    } catch {}
  }

  const THRESHOLD = parseInt(process.env.AGGREGATE_THRESHOLD || '25', 10)
  if (breakerFails >= THRESHOLD) {
    // Propose a conservative capacity rule; left disabled for review
    const { error: insErr } = await (supabase as any)
      .from('rules_registry')
      .insert({
        domain: 'electrical',
        node_type: 'electrical.breaker',
        constraint: 'breaker_capacity',
        params: { maxAmps: 25 },
        severity: 'warning',
        enabled: false,
        source: 'aggregator',
      })
    if (insErr) throw insErr
    console.log('Proposed dynamic rule: breaker_capacity maxAmps=25 (disabled)')
  } else {
    console.log('No proposal. breaker_capacity fails:', breakerFails)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


import { supabase } from './supabase'
import type { GraphData, RuleResult, Signals } from '../engine/types'

export type RuleRow = {
  id: string
  domain: string
  node_type: string | null
  constraint: string
  expression_json: any
  params: any
  severity: 'info' | 'warning' | 'critical' | string
  enabled: boolean
  version: number
}

export async function fetchEnabledRules(domain: string): Promise<RuleRow[]> {
  const { data, error } = await supabase
    .from('rules_registry' as any)
    .select('*')
    .eq('enabled', true)
    .eq('domain', domain)
  if (error) throw new Error(`rules load failed: ${error.message}`)
  return (data as any) || []
}

// Compile a dynamic rule for electrical breaker capacity with optional param override
export function compileElectricalRules(rows: RuleRow[]): ((graph: GraphData, signals: Signals) => RuleResult[]) | null {
  const applicable = rows.filter(r => r.constraint === 'breaker_capacity')
  if (applicable.length === 0) return null
  return (graph: GraphData, signals: Signals) => {
    const res: RuleResult[] = []
    const edgesFrom = (nodeId: string) => graph.edges.filter(e => e.from.nodeId === nodeId)
    for (const node of graph.nodes) {
      if (node.type !== 'electrical.breaker') continue
      let sum = 0
      const queue = [node.id]
      const seen = new Set<string>()
      while (queue.length) {
        const cur = queue.shift()!
        if (seen.has(cur)) continue
        seen.add(cur)
        for (const e of edgesFrom(cur)) {
          const key = `${e.to.nodeId}.${e.to.portId}`
          const v = (signals as any)[key]
          if (v && typeof v === 'object' && typeof v.demand === 'number') sum += v.demand
          queue.push(e.to.nodeId)
        }
      }
      // Use the first matching rule param override if provided
      const override = applicable[0]?.params?.maxAmps
      const max = typeof override === 'number' ? override : (node.state as any)?.maxAmps ?? 20
      const passes = sum <= max
      res.push({ id: `dyn:breaker:${node.id}`, nodeId: node.id, severity: passes ? 'info' : 'critical', constraint: 'breaker_capacity', passes, details: { demand: sum, max } })
    }
    return res
  }
}


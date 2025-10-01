import type { DomainPack, NodeDefinition, RuleResult, GraphData, Signals } from '../../engine/types'

// Basic Electrical Nodes
const panel: NodeDefinition<{ maxAmps: number }> = {
  type: 'electrical.panel',
  label: 'Power Panel',
  inputs: [],
  outputs: [{ id: 'line', name: 'Line', kind: 'power', direction: 'out', valueType: 'current' }],
  defaultState: { maxAmps: 200 },
  compute: (ctx, node) => {
    // Panel supplies whatever downstream demands, bounded by maxAmps
    // Downstream summation isn’t known here; rules will flag overload
    ctx.write(node.id, 'line', { available: node.state.maxAmps })
  },
}

const breaker: NodeDefinition<{ maxAmps: number }> = {
  type: 'electrical.breaker',
  label: 'Circuit Breaker',
  inputs: [{ id: 'in', name: 'In', kind: 'power', direction: 'in', valueType: 'current' }],
  outputs: [{ id: 'out', name: 'Out', kind: 'power', direction: 'out', valueType: 'current' }],
  defaultState: { maxAmps: 20 },
  compute: (ctx, node) => {
    // Pass-through, actual demanded current is evaluated by load nodes
    const upstream = ctx.read(node.id, 'in')
    ctx.write(node.id, 'out', upstream)
  },
}

const mkLoad = (type: string, label: string, amps: number): NodeDefinition<{ amps: number }> => ({
  type,
  label,
  inputs: [{ id: 'in', name: 'In', kind: 'power', direction: 'in', valueType: 'current' }],
  outputs: [],
  defaultState: { amps },
  compute: (ctx, node) => {
    // For skeleton engine, annotate desired current on input
    ctx.write(node.id, 'in', { demand: node.state.amps })
  },
})

const loadLight = mkLoad('electrical.load.light', 'Light', 1)
const loadOutlet = mkLoad('electrical.load.outlet', 'Outlet', 5)
const loadAppliance = mkLoad('electrical.load.appliance', 'Appliance', 12)
const loadMotor = mkLoad('electrical.load.motor', 'Motor/AC', 25)

// Simple rule: sum demands downstream of breakers and compare to rating
function breakerOverloadRule(graph: GraphData, signals: Signals): RuleResult[] {
  const res: RuleResult[] = []
  const edgesFrom = (nodeId: string) => graph.edges.filter(e => e.from.nodeId === nodeId)

  for (const node of graph.nodes) {
    if (node.type !== 'electrical.breaker') continue
    // Traverse to collect demands on downstream load inputs
    let sum = 0
    const queue = [node.id]
    const seen = new Set<string>()
    while (queue.length) {
      const cur = queue.shift()!
      if (seen.has(cur)) continue
      seen.add(cur)
      for (const e of edgesFrom(cur)) {
        const key = `${e.to.nodeId}.${e.to.portId}`
        const v = signals[key]
        if (v && typeof v === 'object' && typeof v.demand === 'number') sum += v.demand
        queue.push(e.to.nodeId)
      }
    }
    const passes = sum <= (node.state.maxAmps ?? 20)
    res.push({ id: `breaker:${node.id}`, nodeId: node.id, severity: passes ? 'info' : 'critical', constraint: 'breaker_capacity', passes, details: { demand: sum, max: node.state.maxAmps } })
  }
  return res
}

export const ElectricalPack: DomainPack = {
  name: 'electrical.v1',
  nodes: [panel, breaker, loadLight, loadOutlet, loadAppliance, loadMotor],
  rules: [breakerOverloadRule],
}


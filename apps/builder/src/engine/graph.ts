import type {
  ComputeContext,
  DomainPack,
  Edge,
  GraphData,
  NodeDefinition,
  NodeId,
  NodeInstance,
  PortId,
  Signals,
} from './types'

export class GraphRuntime {
  private defs = new Map<string, NodeDefinition>()
  constructor(definitions: NodeDefinition[]) {
    for (const d of definitions) this.defs.set(d.type, d)
  }

  makeSignals(): Signals { return {} }

  context(graph: GraphData, signals: Signals): ComputeContext {
    return {
      read: (nodeId: NodeId, portId: PortId) => signals[`${nodeId}.${portId}`],
      write: (nodeId: NodeId, portId: PortId, value: any) => {
        signals[`${nodeId}.${portId}`] = value
      },
      readState: <S = any>(nodeId: NodeId) => graph.nodes.find(n => n.id === nodeId)?.state as S,
      writeState: <S = any>(nodeId: NodeId, next: Partial<S>) => {
        const n = graph.nodes.find(n => n.id === nodeId)
        if (n) Object.assign(n.state as any, next)
      },
    }
  }

  // Simple forward pass: call compute on nodes that define it
  evaluate(graph: GraphData, signals: Signals) {
    const ctx = this.context(graph, signals)
    for (const node of graph.nodes) {
      const def = this.defs.get(node.type)
      if (def && def.compute) def.compute(ctx, node)
    }
  }
}

export class DomainEngine {
  private packs: DomainPack[] = []
  private runtime: GraphRuntime

  constructor(packs: DomainPack[]) {
    this.packs = packs
    const defs = packs.flatMap(p => p.nodes)
    this.runtime = new GraphRuntime(defs)
  }

  newSignals(): Signals { return this.runtime.makeSignals() }

  run(graph: GraphData, signals: Signals) {
    this.runtime.evaluate(graph, signals)
    const ruleResults = this.packs.flatMap(p => (p.rules || []).flatMap(r => r(graph, signals)))
    return { signals, ruleResults }
  }
}


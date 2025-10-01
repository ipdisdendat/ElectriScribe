import { DomainEngine } from './graph'
import type { DomainPack, GraphData, Signals } from './types'

export class UniversalNodeEngine {
  private engine: DomainEngine
  constructor(packs: DomainPack[]) {
    this.engine = new DomainEngine(packs)
  }

  newSignals(): Signals { return this.engine.newSignals() }

  evaluate(graph: GraphData, signals: Signals) {
    return this.engine.run(graph, signals)
  }
}


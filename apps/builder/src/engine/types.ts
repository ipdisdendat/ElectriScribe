export type NodeId = string;
export type PortId = string;

export type Direction = 'in' | 'out';
export type PortKind = 'power' | 'signal';

export interface PortDefinition {
  id: PortId;
  name: string;
  kind: PortKind;
  direction: Direction;
  valueType: 'current' | 'voltage' | 'boolean' | 'number' | 'any';
}

export interface NodeDefinition<State = any> {
  type: string;
  label: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  defaultState?: State;
  // Optional compute pass: derives output values from inputs/state
  compute?: (ctx: ComputeContext, node: NodeInstance<State>) => void;
}

export interface NodeInstance<State = any> {
  id: NodeId;
  type: string;
  state: State;
  x?: number;
  y?: number;
}

export interface Edge {
  id: string;
  from: { nodeId: NodeId; portId: PortId };
  to: { nodeId: NodeId; portId: PortId };
}

export interface GraphData {
  nodes: NodeInstance[];
  edges: Edge[];
}

export type SignalKey = `${NodeId}.${PortId}`;

export interface Signals {
  // Keyed by `${nodeId}.${portId}`
  [key: string]: any;
}

export interface ComputeContext {
  read: (nodeId: NodeId, portId: PortId) => any;
  write: (nodeId: NodeId, portId: PortId, value: any) => void;
  readState: <S = any>(nodeId: NodeId) => S | undefined;
  writeState: <S = any>(nodeId: NodeId, next: Partial<S>) => void;
}

export interface RuleResult {
  id: string;
  nodeId?: NodeId;
  edgeId?: string;
  severity: 'info' | 'warning' | 'critical';
  constraint: string;
  passes: boolean;
  details?: Record<string, any>;
}

export interface DomainPack {
  name: string;
  nodes: NodeDefinition[];
  rules?: ((graph: GraphData, signals: Signals) => RuleResult[])[];
}


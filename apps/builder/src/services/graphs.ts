import { supabase } from './supabase'
import type { GraphData } from '../engine/types'

export type GraphKind = 'working' | 'recipe' | 'challenge'

export async function saveGraph(name: string, kind: GraphKind, graph: GraphData) {
  const { data: g, error: ge } = await supabase
    .from('graphs' as any)
    .insert({ name, kind })
    .select('id')
    .single()
  if (ge) throw ge
  const graphId = g.id as string
  const nodesPayload = graph.nodes.map(n => ({
    graph_id: graphId,
    node_key: n.id,
    type: n.type,
    state: n.state,
    x: n.x,
    y: n.y,
  }))
  const edgesPayload = graph.edges.map(e => ({
    graph_id: graphId,
    from_node_key: e.from.nodeId,
    from_port: e.from.portId,
    to_node_key: e.to.nodeId,
    to_port: e.to.portId,
  }))
  const { error: ne } = await supabase.from('graph_nodes' as any).insert(nodesPayload)
  if (ne) throw ne
  const { error: ee } = await supabase.from('graph_edges' as any).insert(edgesPayload)
  if (ee) throw ee
  return graphId
}

export async function loadGraph(graphId: string): Promise<GraphData> {
  const [{ data: nodes, error: ne }, { data: edges, error: ee }] = await Promise.all([
    supabase.from('graph_nodes' as any).select('*').eq('graph_id', graphId),
    supabase.from('graph_edges' as any).select('*').eq('graph_id', graphId),
  ])
  if (ne) throw ne
  if (ee) throw ee
  return {
    nodes: (nodes || []).map((n: any) => ({ id: n.node_key, type: n.type, state: n.state, x: n.x, y: n.y })),
    edges: (edges || []).map((e: any) => ({ id: e.id, from: { nodeId: e.from_node_key, portId: e.from_port }, to: { nodeId: e.to_node_key, portId: e.to_port } })),
  }
}

export async function listGraphs(kind?: GraphKind) {
  let q = supabase.from('graphs' as any).select('id,name,kind,created_at').order('created_at', { ascending: false })
  if (kind) q = q.eq('kind', kind) as any
  const { data, error } = await q
  if (error) throw error
  return data || []
}


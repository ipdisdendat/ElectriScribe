import React, { useState, useCallback, useRef, useEffect } from 'react';
import { fieldNotesParser, type ParsedFieldNotes } from '../../services/field-notes-parser';
import { Zap, FileText, Trash2, Download } from 'lucide-react';

interface Node {
  id: string;
  type: 'panel' | 'circuit' | 'load';
  x: number;
  y: number;
  data: any;
  outputs: number;
}

interface Connection {
  id: string;
  from: string;
  to: string;
}

const FlowchartDesigner: React.FC = () => {
  const [fieldNotes, setFieldNotes] = useState('');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [connectionMode, setConnectionMode] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleLoadExample = () => {
    const example = `### PANEL SPECIFICATIONS
- **Main Panel:** 200A service
- **Panel Type:** Square D QO
- **Available Slots:** 17-19 (free dryer MWBC)

### CIRCUIT MAPPING
| SLOT | TYPE    | CIRCUIT DESCRIPTION        |
|------|---------|----------------------------|
| 1    | Tandem  | Heat Pump (Leg A)          |
| 3    | Tandem  | Heat Pump (Leg B)          |
| 5    | Tandem  | Family Room Lights & Plugs |
| 9    | Tandem  | Dishwasher                 |
| 11   | Tandem  | Garburator (Disposal)      |

### LOADS IDENTIFIED
- Heat Pump: 240V, 25A continuous
- Dishwasher: 120V, 12A intermittent
- Disposal: 120V, 8A cyclic

### ISSUES NOTED
Kitchen disposal trips breaker when dishwasher running simultaneously.`;
    setFieldNotes(example);
  };

  const handleParseNotes = useCallback(() => {
    if (!fieldNotes.trim()) return;

    const parsed = fieldNotesParser.parseFieldNotes(fieldNotes);
    if (!parsed) return;

    const newNodes: Node[] = [];
    const newConnections: Connection[] = [];

    // Add panels on the left
    let panelY = 100;
    parsed.panels.forEach((panel) => {
      newNodes.push({
        id: panel.id,
        type: 'panel',
        x: 100,
        y: panelY,
        data: panel,
        outputs: parsed.circuits.length || 10
      });
      panelY += 300;
    });

    // Add circuits in the middle
    let circuitY = 100;
    parsed.circuits.forEach((circuit, idx) => {
      newNodes.push({
        id: circuit.id,
        type: 'circuit',
        x: 500,
        y: circuitY,
        data: circuit,
        outputs: 0
      });

      // Connect to first panel
      if (parsed.panels[0]) {
        newConnections.push({
          id: `${parsed.panels[0].id}-${circuit.id}`,
          from: parsed.panels[0].id,
          to: circuit.id
        });
      }

      circuitY += 180;
    });

    // Add loads on the right
    let loadY = 100;
    parsed.loads.forEach((load) => {
      newNodes.push({
        id: load.id,
        type: 'load',
        x: 900,
        y: loadY,
        data: load,
        outputs: 0
      });

      // Try to connect to matching circuit using multiple strategies
      const loadNameLower = load.name.toLowerCase().trim();
      const loadWords = loadNameLower.split(/\s+/);

      const matchingCircuit = parsed.circuits.find(c => {
        const descLower = c.description.toLowerCase();

        // Strategy 1: Direct substring match
        if (descLower.includes(loadNameLower)) return true;

        // Strategy 2: Circuit reference match
        if (load.circuit_reference && c.slot_numbers.some(s =>
          load.circuit_reference?.includes(s.toString())
        )) return true;

        // Strategy 3: All significant words from load name appear in circuit description
        const significantWords = loadWords.filter(w =>
          w.length > 3 && !['pump', 'unit', 'load'].includes(w)
        );
        if (significantWords.length > 0 &&
            significantWords.every(word => descLower.includes(word))) {
          return true;
        }

        // Strategy 4: Fuzzy match - any major word matches
        if (loadWords.length >= 2) {
          const majorWords = loadWords.filter(w => w.length > 4);
          if (majorWords.some(word => descLower.includes(word))) {
            return true;
          }
        }

        return false;
      });

      if (matchingCircuit) {
        newConnections.push({
          id: `${matchingCircuit.id}-${load.id}`,
          from: matchingCircuit.id,
          to: load.id
        });
      } else {
        // No specific circuit match - connect to panel directly
        if (parsed.panels[0]) {
          newConnections.push({
            id: `${parsed.panels[0].id}-${load.id}`,
            from: parsed.panels[0].id,
            to: load.id
          });
        }
      }

      loadY += 150;
    });

    setNodes(newNodes);
    setConnections(newConnections);
  }, [fieldNotes]);

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    // Connection mode - click to connect
    if (connectionMode) {
      if (!pendingConnection) {
        setPendingConnection(nodeId);
      } else if (pendingConnection !== nodeId) {
        setConnections(prev => [...prev, {
          id: `conn_${Date.now()}`,
          from: pendingConnection,
          to: nodeId
        }]);
        setPendingConnection(null);
        setConnectionMode(false);
      }
      return;
    }

    // Drag mode
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragging({
      nodeId,
      offsetX: e.clientX - rect.left - node.x,
      offsetY: e.clientY - rect.top - node.y
    });

    setSelectedNodeId(nodeId);
    e.stopPropagation();
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragging.offsetX;
    const y = e.clientY - rect.top - dragging.offsetY;

    // Grid snap
    const gridSize = 20;
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;

    setNodes(prev => prev.map(node =>
      node.id === dragging.nodeId
        ? { ...node, x: Math.max(0, snappedX), y: Math.max(0, snappedY) }
        : node
    ));
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

  return (
    <div className="h-screen flex flex-col bg-base-200">
      <div className="navbar bg-base-100 shadow-lg border-b">
        <div className="flex-1">
          <Zap className="w-6 h-6 ml-4 text-warning" />
          <span className="ml-2 text-xl font-bold">ElectriScribe Flowchart</span>
        </div>
        <div className="flex-none gap-2 mr-4">
          <button
            className={`btn btn-sm ${connectionMode ? 'btn-accent' : 'btn-ghost'}`}
            onClick={() => {
              setConnectionMode(!connectionMode);
              setPendingConnection(null);
            }}
            title="Toggle connection mode"
          >
            {connectionMode ? 'Exit Connect' : 'Connect'}
          </button>
          <button
            className={`btn btn-sm ${showProperties ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowProperties(!showProperties)}
            title="Toggle properties panel"
            disabled={!selectedNodeId}
          >
            Properties
          </button>
          <div className="badge badge-ghost">{nodes.length} nodes</div>
          <div className="badge badge-ghost">{connections.length} connections</div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-80 bg-base-100 border-r border-base-300 flex flex-col">
          <div className="p-4 border-b border-base-300">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5" />
              <h2 className="font-bold">Field Notes</h2>
            </div>

            <textarea
              className="textarea textarea-bordered w-full h-48 font-mono text-xs mb-3"
              placeholder="Paste field notes here..."
              value={fieldNotes}
              onChange={(e) => setFieldNotes(e.target.value)}
            />

            <div className="flex gap-2">
              <button
                className="btn btn-primary btn-sm flex-1"
                onClick={handleParseNotes}
                disabled={!fieldNotes.trim()}
              >
                <Zap className="w-4 h-4" />
                Parse
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleLoadExample}
              >
                Example
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="font-bold mb-2 text-sm">Instructions</h3>
            <ul className="text-xs space-y-1 text-base-content/70">
              <li>• Paste field notes above</li>
              <li>• Click "Parse" to generate flowchart</li>
              <li>• Drag nodes to rearrange</li>
              <li>• Click "Connect" then click two nodes to link</li>
              <li>• Click connection line to delete it</li>
              <li>• Click "Properties" to inspect nodes</li>
            </ul>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-auto bg-white" ref={canvasRef}>
          <div
            className="relative"
            style={{
              width: '2000px',
              height: '2000px',
              backgroundImage: `
                linear-gradient(#e5e7eb 1px, transparent 1px),
                linear-gradient(90deg, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          >
            {/* SVG for connections */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
              }}
            >
              {connections.map(conn => {
                const fromNode = nodes.find(n => n.id === conn.from);
                const toNode = nodes.find(n => n.id === conn.to);
                if (!fromNode || !toNode) return null;

                const x1 = fromNode.x + 200;
                const y1 = fromNode.y + 60;
                const x2 = toNode.x;
                const y2 = toNode.y + 60;
                const midX = (x1 + x2) / 2;

                return (
                  <g key={conn.id}>
                    <path
                      d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                      stroke="#3b82f6"
                      strokeWidth="2"
                      fill="none"
                      opacity="0.6"
                    />
                    <path
                      d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                      stroke="transparent"
                      strokeWidth="20"
                      fill="none"
                      style={{ cursor: 'pointer', pointerEvents: 'all' }}
                      onClick={() => {
                        if (confirm('Delete this connection?')) {
                          setConnections(prev => prev.filter(c => c.id !== conn.id));
                        }
                      }}
                    />
                  </g>
                );
              })}
              {pendingConnection && (() => {
                const fromNode = nodes.find(n => n.id === pendingConnection);
                if (!fromNode) return null;
                return (
                  <circle
                    cx={fromNode.x + 200}
                    cy={fromNode.y + 60}
                    r="15"
                    fill="#10b981"
                    opacity="0.5"
                    className="animate-pulse"
                  />
                );
              })()}
            </svg>

            {/* Nodes */}
            {nodes.map(node => (
              <div
                key={node.id}
                className={`absolute select-none ${
                  selectedNodeId === node.id ? 'ring-4 ring-primary shadow-2xl z-10' : 'shadow-lg'
                }`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: '200px',
                  cursor: connectionMode ? 'crosshair' : 'grab',
                  outline: connectionMode && pendingConnection === node.id ? '3px solid #10b981' : 'none'
                }}
                onMouseDown={(e) => handleNodeClick(e, node.id)}
              >
                <NodeCard node={node} />
              </div>
            ))}

            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-base-content/30">
                  <FileText className="w-16 h-16 mx-auto mb-3" />
                  <p className="font-semibold">No flowchart yet</p>
                  <p className="text-sm">Parse field notes to generate</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar - Properties */}
        {showProperties && selectedNode && (
          <div className="w-96 bg-base-100 border-l border-base-300 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Properties</h3>
                <button
                  className="btn btn-ghost btn-xs btn-circle"
                  onClick={() => {
                    setShowProperties(false);
                    setSelectedNodeId(null);
                  }}
                >
                  ×
                </button>
              </div>
              <PropertyTable data={selectedNode.data} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const NodeCard: React.FC<{ node: Node }> = ({ node }) => {
  if (node.type === 'panel') {
    const panel = node.data;
    return (
      <div className="card bg-warning text-warning-content shadow-xl">
        <div className="card-body p-4">
          <h3 className="card-title text-sm">⚡ PANEL</h3>
          <div className="space-y-1 text-xs">
            <div><strong>Type:</strong> {panel.manufacturer} {panel.model}</div>
            <div><strong>Rating:</strong> {panel.rating}A @ {panel.voltage}V</div>
            <div className="text-[10px] opacity-80">{panel.phase_configuration}</div>
          </div>
          <div className="flex gap-1 flex-wrap mt-2">
            {Array.from({ length: Math.min(node.outputs, 12) }).map((_, i) => (
              <div key={i} className="w-2 h-2 bg-warning-content rounded-full" title={`Output ${i + 1}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (node.type === 'circuit') {
    const circuit = node.data;
    return (
      <div className="card bg-base-100 border-2 border-secondary shadow-xl">
        <div className="card-body p-4">
          <h3 className="card-title text-sm">🔌 Circuit {circuit.slot_numbers.join('-')}</h3>
          <div className="space-y-1 text-xs">
            <div className="font-semibold truncate">{circuit.description}</div>
            <div><strong>Breaker:</strong> {circuit.breaker_size}A</div>
            <div><strong>Type:</strong> {circuit.circuit_type}</div>
            {circuit.wire_awg && <div><strong>Wire:</strong> #{circuit.wire_awg} AWG</div>}
            <div className="badge badge-xs badge-primary">{circuit.phase}</div>
          </div>
        </div>
      </div>
    );
  }

  if (node.type === 'load') {
    const load = node.data;
    return (
      <div className="card bg-accent text-accent-content shadow-xl">
        <div className="card-body p-4">
          <h3 className="card-title text-sm">⚙️ {load.name}</h3>
          <div className="space-y-1 text-xs">
            <div><strong>Type:</strong> {load.load_type}</div>
            {load.nominal_current && <div><strong>Current:</strong> {load.nominal_current}A</div>}
            <div><strong>Voltage:</strong> {load.nominal_voltage}V</div>
            <div><strong>Duty:</strong> {load.duty_cycle}</div>
            {load.power_factor && <div><strong>PF:</strong> {load.power_factor.toFixed(2)}</div>}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

const PropertyTable: React.FC<{ data: any }> = ({ data }) => {
  const flattenObject = (obj: any, prefix = ''): Array<{ key: string; value: any }> => {
    const result: Array<{ key: string; value: any }> = [];

    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result.push(...flattenObject(value, fullKey));
      } else {
        result.push({ key: fullKey, value });
      }
    });

    return result;
  };

  const properties = flattenObject(data);

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra table-xs">
        <thead>
          <tr>
            <th className="w-1/2">Property</th>
            <th className="w-1/2">Value</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((prop, idx) => (
            <tr key={idx}>
              <td className="font-mono text-xs">{prop.key}</td>
              <td className="font-mono text-xs break-all">
                {Array.isArray(prop.value)
                  ? prop.value.join(', ')
                  : typeof prop.value === 'boolean'
                  ? (prop.value ? 'true' : 'false')
                  : typeof prop.value === 'number'
                  ? prop.value
                  : prop.value?.toString() || 'null'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FlowchartDesigner;

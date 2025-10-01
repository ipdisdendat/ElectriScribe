import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Zap, Plus, Trash2, Play, AlertCircle, CheckCircle } from 'lucide-react';

interface Component {
  id: string;
  type: 'panel' | 'circuit' | 'light' | 'outlet' | 'appliance' | 'motor';
  x: number;
  y: number;
  label: string;
  amps?: number;
  maxAmps?: number;
  voltage?: number;
}

interface Wire {
  id: string;
  from: string;
  to: string;
  amps?: number;
}

const COMPONENT_LIBRARY = [
  { type: 'panel', icon: '⚡', name: 'Power Panel', color: 'bg-yellow-400', amps: 0, maxAmps: 200 },
  { type: 'circuit', icon: '🔌', name: 'Circuit Breaker', color: 'bg-blue-400', amps: 0, maxAmps: 20 },
  { type: 'light', icon: '💡', name: 'Light', color: 'bg-orange-300', amps: 1 },
  { type: 'outlet', icon: '🔌', name: 'Outlet', color: 'bg-green-400', amps: 5 },
  { type: 'appliance', icon: '🍳', name: 'Appliance', color: 'bg-purple-400', amps: 12 },
  { type: 'motor', icon: '⚙️', name: 'Motor/AC', color: 'bg-red-400', amps: 25 }
];

const SimpleElectricalBuilder: React.FC = () => {
  const [components, setComponents] = useState<Component[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const addComponent = (type: string) => {
    const template = COMPONENT_LIBRARY.find(c => c.type === type);
    if (!template) return;

    const newComponent: Component = {
      id: `${type}_${Date.now()}`,
      type: type as any,
      x: 400 + Math.random() * 200,
      y: 200 + Math.random() * 200,
      label: template.name,
      amps: template.amps,
      maxAmps: template.maxAmps
    };

    setComponents(prev => [...prev, newComponent]);
  };

  const deleteComponent = (id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id));
    setWires(prev => prev.filter(w => w.from !== id && w.to !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleComponentClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    if (connecting) {
      if (connecting !== id) {
        // Create wire
        setWires(prev => [...prev, {
          id: `wire_${Date.now()}`,
          from: connecting,
          to: id
        }]);
      }
      setConnecting(null);
    } else {
      // Start drag
      const comp = components.find(c => c.id === id);
      if (!comp || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      setDragging({
        id,
        offsetX: e.clientX - rect.left - comp.x,
        offsetY: e.clientY - rect.top - comp.y
      });
    }

    setSelectedId(id);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragging.offsetX;
    const y = e.clientY - rect.top - dragging.offsetY;

    setComponents(prev => prev.map(c =>
      c.id === dragging.id ? { ...c, x: Math.max(0, x), y: Math.max(0, y) } : c
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

  // Calculate power flow
  const calculatePowerFlow = () => {
    const flow: Record<string, number> = {};
    const warnings: string[] = [];

    // Find panels (power sources)
    const panels = components.filter(c => c.type === 'panel');

    // BFS to calculate amps through each component
    const visited = new Set<string>();
    const queue = panels.map(p => p.id);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.has(currentId);

      const currentComp = components.find(c => c.id === currentId);
      if (!currentComp) continue;

      // Find outgoing wires
      const outgoingWires = wires.filter(w => w.from === currentId);

      outgoingWires.forEach(wire => {
        const targetComp = components.find(c => c.id === wire.to);
        if (!targetComp) return;

        // Calculate amps
        const amps = targetComp.amps || 0;
        flow[wire.to] = (flow[wire.to] || 0) + amps;

        // Check if circuit breaker is overloaded
        if (targetComp.type === 'circuit' && flow[wire.to] > (targetComp.maxAmps || 20)) {
          warnings.push(`⚠️ ${targetComp.label} is overloaded! (${flow[wire.to]}A > ${targetComp.maxAmps}A)`);
        }

        queue.push(wire.to);
      });
    }

    return { flow, warnings };
  };

  const { flow, warnings } = calculatePowerFlow();

  const selectedComp = components.find(c => c.id === selectedId);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-4 border-blue-400 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Electric Home Builder</h1>
              <p className="text-sm text-gray-600">Build circuits like code blocks!</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-sm btn-success">
              <Play className="w-4 h-4" />
              Test Circuit
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left - Component Library */}
        <div className="w-72 bg-white border-r-4 border-blue-300 p-4 shadow-lg">
          <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Components
          </h2>

          <div className="space-y-3">
            {COMPONENT_LIBRARY.map((comp) => (
              <button
                key={comp.type}
                onClick={() => addComponent(comp.type)}
                className={`w-full ${comp.color} hover:opacity-80 text-white font-bold py-4 px-4 rounded-xl shadow-lg transform hover:scale-105 transition-all flex items-center gap-3`}
              >
                <span className="text-3xl">{comp.icon}</span>
                <div className="text-left flex-1">
                  <div className="text-sm">{comp.name}</div>
                  {comp.amps !== undefined && (
                    <div className="text-xs opacity-80">
                      {comp.amps > 0 ? `Uses ${comp.amps}A` : `Max ${comp.maxAmps}A`}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
            <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              How to use:
            </h3>
            <ol className="text-xs space-y-1 text-gray-700">
              <li>1. Click a component to add it</li>
              <li>2. Drag components around</li>
              <li>3. Click "Connect" mode</li>
              <li>4. Click two components to wire them</li>
              <li>5. Click "Test Circuit" to see if it works!</li>
            </ol>
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 relative overflow-auto bg-white" ref={canvasRef}>
          <div
            className="relative"
            style={{
              width: '2000px',
              height: '2000px',
              backgroundImage: `
                radial-gradient(circle, #e0e7ff 1px, transparent 1px)
              `,
              backgroundSize: '30px 30px'
            }}
          >
            {/* Wires */}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
                </marker>
              </defs>
              {wires.map(wire => {
                const from = components.find(c => c.id === wire.from);
                const to = components.find(c => c.id === wire.to);
                if (!from || !to) return null;

                const x1 = from.x + 50;
                const y1 = from.y + 50;
                const x2 = to.x + 50;
                const y2 = to.y + 50;

                const isOverloaded = flow[wire.to] && to.maxAmps && flow[wire.to] > to.maxAmps;

                return (
                  <g key={wire.id}>
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={isOverloaded ? '#ef4444' : '#3b82f6'}
                      strokeWidth="4"
                      markerEnd="url(#arrowhead)"
                      className={isOverloaded ? 'animate-pulse' : ''}
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 10}
                      fill="#1f2937"
                      fontSize="14"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {flow[wire.to] ? `${flow[wire.to]}A` : ''}
                    </text>
                  </g>
                );
              })}
              {connecting && (() => {
                const from = components.find(c => c.id === connecting);
                if (!from) return null;
                return (
                  <circle
                    cx={from.x + 50}
                    cy={from.y + 50}
                    r="60"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    className="animate-ping"
                  />
                );
              })()}
            </svg>

            {/* Components */}
            {components.map(comp => {
              const template = COMPONENT_LIBRARY.find(c => c.type === comp.type);
              if (!template) return null;

              const currentFlow = flow[comp.id] || 0;
              const isOverloaded = comp.maxAmps && currentFlow > comp.maxAmps;
              const isSelected = selectedId === comp.id;

              return (
                <div
                  key={comp.id}
                  className={`absolute cursor-pointer transform transition-transform hover:scale-110 ${isSelected ? 'z-50 ring-4 ring-blue-500' : 'z-10'}`}
                  style={{ left: comp.x, top: comp.y }}
                  onClick={(e) => handleComponentClick(e, comp.id)}
                >
                  <div className={`w-24 h-24 ${template.color} rounded-2xl shadow-2xl flex flex-col items-center justify-center text-white relative`}>
                    <span className="text-4xl mb-1">{template.icon}</span>
                    <span className="text-xs font-bold text-center px-1">{template.name}</span>

                    {/* Power indicator */}
                    {currentFlow > 0 && (
                      <div className="absolute -top-2 -right-2 bg-white rounded-full px-2 py-1 shadow-lg">
                        <span className={`text-xs font-bold ${isOverloaded ? 'text-red-600' : 'text-green-600'}`}>
                          {currentFlow}A
                        </span>
                      </div>
                    )}

                    {/* Status indicator */}
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                      {isOverloaded ? (
                        <div className="bg-red-500 rounded-full p-1 animate-pulse">
                          <AlertCircle className="w-4 h-4 text-white" />
                        </div>
                      ) : currentFlow > 0 ? (
                        <div className="bg-green-500 rounded-full p-1">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Delete button */}
                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteComponent(comp.id);
                      }}
                      className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 shadow-lg hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}

            {components.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Zap className="w-24 h-24 mx-auto mb-4 opacity-30" />
                  <p className="text-xl font-bold">Start by adding a Power Panel!</p>
                  <p className="text-sm mt-2">Click the ⚡ Power Panel button on the left</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right - Info Panel */}
        <div className="w-80 bg-white border-l-4 border-purple-300 p-4 shadow-lg overflow-y-auto">
          <h2 className="text-lg font-bold mb-4 text-gray-800">What's Happening?</h2>

          {warnings.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
              <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Problems Found!
              </h3>
              {warnings.map((w, i) => (
                <div key={i} className="text-sm text-red-700 mb-1">{w}</div>
              ))}
            </div>
          )}

          {warnings.length === 0 && components.length > 0 && (
            <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg">
              <h3 className="font-bold text-green-700 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Everything looks good!
              </h3>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => setConnecting(connecting ? null : selectedId || components[0]?.id || null)}
              className={`w-full ${connecting ? 'btn-error' : 'btn-primary'} btn`}
            >
              {connecting ? 'Cancel Connection' : 'Connect Components'}
            </button>

            {selectedComp && (
              <div className="p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                <h3 className="font-bold mb-2">Selected:</h3>
                <div className="text-sm space-y-1">
                  <div><strong>Type:</strong> {selectedComp.label}</div>
                  {selectedComp.amps !== undefined && <div><strong>Uses:</strong> {selectedComp.amps}A</div>}
                  {selectedComp.maxAmps !== undefined && <div><strong>Max:</strong> {selectedComp.maxAmps}A</div>}
                </div>
              </div>
            )}

            <div className="p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
              <h3 className="font-bold mb-2 text-sm">💡 Did you know?</h3>
              <p className="text-xs text-gray-700">
                Electricity is like water in pipes! The panel is like a water tank,
                circuits are pipes, and appliances are like faucets that use the water (electricity).
                If too much flows through a pipe, it can break - that's why we use circuit breakers!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleElectricalBuilder;

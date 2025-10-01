import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { enhancedElectricalAnalysisEngine, type SystemAnalysis } from '../../services/enhanced-electrical-analysis';

// =============================================================================
// PROFESSIONAL ELECTRICAL DESIGN SYSTEM
// Late 90s Mac OS + N8N + Access + Schematic aesthetics
// =============================================================================

const SystemTheme = {
  colors: {
    background: '#f5f5f5',
    panel: '#e8e8e8', 
    border: '#c0c0c0',
    borderDark: '#808080',
    text: '#000000',
    textSecondary: '#666666',
    accent: '#0066cc',
    success: '#006600',
    warning: '#cc6600',
    error: '#cc0000',
    grid: '#d8d8d8',
    node: '#ffffff',
    nodeBorder: '#999999',
    connection: '#333333',
    phaseL1: '#990000',
    phaseL2: '#000099'
  },
  fonts: {
    main: 'Geneva, "Lucida Grande", Arial, sans-serif',
    mono: 'Monaco, "Courier New", monospace'
  }
};

const ElectricalNodeTypes = {
  MAIN_PANEL: 'main_panel',
  SUB_PANEL: 'sub_panel', 
  CIRCUIT: 'circuit',
  LOAD: 'load',
  ROOM_CLUSTER: 'room_cluster',
  JUNCTION: 'junction'
};

const LoadTypes = {
  LIGHTING: { symbol: '○', name: 'Lighting', current: 3 },
  MOTOR: { symbol: 'M', name: 'Motor', current: 15 },
  HEATING: { symbol: 'H', name: 'Heating', current: 20 },
  APPLIANCE: { symbol: 'A', name: 'Appliance', current: 12 },
  OUTLET: { symbol: '⊡', name: 'Outlet', current: 15 },
  EV_CHARGER: { symbol: 'EV', name: 'EV Charger', current: 16 }
};

// =============================================================================
// CONNECTION AND ROUTING ENGINE (Enhanced for professional schematics)
// =============================================================================

class SchematicRouter {
  constructor() {
    this.connections = [];
    this.gridSize = 20;
  }
  
  calculateOptimalPath(startNode, endNode) {
    const start = this.getNodeCenter(startNode);
    const end = this.getNodeCenter(endNode);
    
    // Professional schematic routing - orthogonal lines only
    const midX = start.x + (end.x - start.x) * 0.6;
    
    return [
      { x: start.x, y: start.y },
      { x: midX, y: start.y },
      { x: midX, y: end.y },
      { x: end.x, y: end.y }
    ];
  }
  
  getNodeCenter(node) {
    return {
      x: node.x + (node.width || 100) / 2,
      y: node.y + (node.height || 60) / 2
    };
  }
  
  snapToGrid(value) {
    return Math.round(value / this.gridSize) * this.gridSize;
  }
  
  calculateWireSpecification(current, distance) {
    const wireTable = [
      { awg: 14, ampacity: 15 },
      { awg: 12, ampacity: 20 },
      { awg: 10, ampacity: 30 },
      { awg: 8, ampacity: 50 },
      { awg: 6, ampacity: 65 }
    ];
    
    const requiredAmpacity = current * 1.25;
    const wire = wireTable.find(w => w.ampacity >= requiredAmpacity) || wireTable[wireTable.length - 1];
    
    return {
      ...wire,
      specification: `${wire.awg} AWG THWN`,
      conduitSize: this.calculateConduitSize(wire.awg)
    };
  }
  
  calculateConduitSize(awg) {
    if (awg >= 12) return '1/2"';
    if (awg >= 8) return '3/4"';
    return '1"';
  }
}

// =============================================================================
// LOAD ANALYSIS ENGINE (Professional calculations)
// =============================================================================

class ElectricalAnalysisEngine {
  constructor() {
    this.panelRating = 200;
    this.safetyFactor = 0.8;
  }
  
  analyzeSystem(nodes, connections) {
    const loads = nodes.filter(n => n.type === ElectricalNodeTypes.LOAD);
    const panels = nodes.filter(n => n.type === ElectricalNodeTypes.MAIN_PANEL || n.type === ElectricalNodeTypes.SUB_PANEL);
    
    let totalLoad = 0;
    let phaseLoads = { L1: 0, L2: 0 };
    
    // Calculate loads by phase
    connections.forEach(conn => {
      const loadNode = nodes.find(n => n.id === conn.to && n.type === ElectricalNodeTypes.LOAD);
      if (loadNode) {
        const current = loadNode.current || 15;
        totalLoad += current;
        phaseLoads[conn.phase || 'L1'] += current;
      }
    });
    
    const phaseImbalance = Math.abs(phaseLoads.L1 - phaseLoads.L2);
    const utilization = Math.max(phaseLoads.L1, phaseLoads.L2) / this.panelRating;
    
    return {
      totalLoad,
      phaseLoads,
      phaseImbalance,
      utilization,
      maxCurrent: Math.max(phaseLoads.L1, phaseLoads.L2),
      analysis: this.generateAnalysis(totalLoad, phaseImbalance, utilization),
      recommendations: this.generateRecommendations(phaseImbalance, utilization)
    };
  }
  
  generateAnalysis(totalLoad, imbalance, utilization) {
    const status = [];
    
    if (utilization > 0.9) status.push({ type: 'error', message: 'Panel overloaded' });
    else if (utilization > 0.8) status.push({ type: 'warning', message: 'Approaching capacity' });
    else status.push({ type: 'success', message: 'Load within limits' });
    
    if (imbalance > 20) status.push({ type: 'warning', message: 'Phase imbalance detected' });
    
    return status;
  }
  
  generateRecommendations(imbalance, utilization) {
    const recommendations = [];
    
    if (imbalance > 20) {
      recommendations.push('Redistribute loads between phases');
    }
    
    if (utilization > 0.8) {
      recommendations.push('Consider installing sub-panel');
      recommendations.push('Implement load management system');
    }
    
    return recommendations;
  }
}

// =============================================================================
// JSON IMPORT/EXPORT SYSTEM
// =============================================================================

class ProjectDataManager {
  static exportProject(nodes, connections, metadata = {}) {
    const projectData = {
      version: '1.0',
      created: new Date().toISOString(),
      metadata: {
        name: 'Electrical Design Project',
        description: 'Professional electrical system design',
        ...metadata
      },
      system: {
        serviceRating: 200,
        voltage: 240,
        phases: 2
      },
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        properties: {
          name: node.name,
          rating: node.rating,
          current: node.current,
          loadType: node.loadType,
          circuitNumber: node.circuitNumber,
          breakerSize: node.breakerSize
        }
      })),
      connections: connections.map(conn => ({
        id: conn.id,
        from: conn.from,
        to: conn.to,
        phase: conn.phase,
        wire: conn.wire,
        path: conn.path
      }))
    };
    
    return JSON.stringify(projectData, null, 2);
  }
  
  static importProject(jsonData) {
    try {
      const project = JSON.parse(jsonData);
      
      if (!project.version || !project.nodes || !project.connections) {
        throw new Error('Invalid project format');
      }
      
      const nodes = project.nodes.map(nodeData => ({
        id: nodeData.id,
        type: nodeData.type,
        x: nodeData.x,
        y: nodeData.y,
        width: nodeData.width,
        height: nodeData.height,
        ...nodeData.properties
      }));
      
      const connections = project.connections;
      
      return { 
        success: true, 
        nodes, 
        connections, 
        metadata: project.metadata,
        system: project.system 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  static downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// =============================================================================
// PROFESSIONAL UI COMPONENTS (Late 90s Mac OS Style)
// =============================================================================

const MacOSButton = ({ children, onClick, primary = false, disabled = false, style = {} }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: primary ? '#0066cc' : 'linear-gradient(to bottom, #f8f8f8, #e8e8e8)',
      border: `1px solid ${SystemTheme.colors.borderDark}`,
      borderTopColor: '#ffffff',
      borderLeftColor: '#ffffff', 
      borderRadius: '4px',
      padding: '6px 12px',
      fontSize: '11px',
      fontFamily: SystemTheme.fonts.main,
      color: primary ? '#ffffff' : SystemTheme.colors.text,
      cursor: disabled ? 'default' : 'pointer',
      boxShadow: disabled ? 'none' : '0 1px 2px rgba(0,0,0,0.1)',
      opacity: disabled ? 0.6 : 1,
      ...style
    }}
  >
    {children}
  </button>
);

const MacOSPanel = ({ title, children, width = '200px', height = 'auto' }) => (
  <div style={{
    width,
    height,
    background: SystemTheme.colors.panel,
    border: `1px solid ${SystemTheme.colors.borderDark}`,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '2px 2px 4px rgba(0,0,0,0.2)',
    overflow: 'hidden'
  }}>
    {title && (
      <div style={{
        background: 'linear-gradient(to bottom, #d8d8d8, #c8c8c8)',
        borderBottom: `1px solid ${SystemTheme.colors.borderDark}`,
        padding: '6px 10px',
        fontSize: '11px',
        fontWeight: 'bold',
        fontFamily: SystemTheme.fonts.main,
        color: SystemTheme.colors.text
      }}>
        {title}
      </div>
    )}
    <div style={{ padding: '8px' }}>
      {children}
    </div>
  </div>
);

const SchematicNode = ({ node, onNodeUpdate, onConnectionStart, isSelected, onSelect }) => {
  const [dragging, setDragging] = useState(null);
  const nodeRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;

    const canvas = document.getElementById('design-canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    setDragging({
      offsetX: e.clientX - rect.left - node.x,
      offsetY: e.clientY - rect.top - node.y
    });

    onSelect(node.id);
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e) => {
      const canvas = document.getElementById('design-canvas');
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - dragging.offsetX;
      const y = e.clientY - rect.top - dragging.offsetY;

      const gridSize = 20;
      const snappedX = Math.round(x / gridSize) * gridSize;
      const snappedY = Math.round(y / gridSize) * gridSize;

      onNodeUpdate(node.id, {
        x: Math.max(0, snappedX),
        y: Math.max(0, snappedY)
      });
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, node.id, onNodeUpdate]);

  const getNodeStyle = () => {
    const baseStyle = {
      position: 'absolute',
      left: node.x,
      top: node.y,
      width: node.width || 100,
      height: node.height || 60,
      background: SystemTheme.colors.node,
      border: `2px solid ${isSelected ? SystemTheme.colors.accent : SystemTheme.colors.nodeBorder}`,
      borderRadius: '6px',
      cursor: dragging ? 'grabbing' : 'grab',
      userSelect: 'none',
      fontFamily: SystemTheme.fonts.main,
      fontSize: '10px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '2px 2px 4px rgba(0,0,0,0.1)',
      zIndex: dragging ? 1000 : (isSelected ? 100 : 10)
    };

    return baseStyle;
  };
  
  const renderNodeContent = () => {
    switch (node.type) {
      case ElectricalNodeTypes.MAIN_PANEL:
        return (
          <>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>MAIN PANEL</div>
            <div style={{ fontSize: '9px', color: SystemTheme.colors.textSecondary }}>
              {node.rating || 200}A Service
            </div>
          </>
        );
      case ElectricalNodeTypes.SUB_PANEL:
        return (
          <>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>SUB PANEL</div>
            <div style={{ fontSize: '9px', color: SystemTheme.colors.textSecondary }}>
              {node.rating || 100}A
            </div>
          </>
        );
      case ElectricalNodeTypes.LOAD:
        const loadType = LoadTypes[node.loadType] || LoadTypes.OUTLET;
        return (
          <>
            <div style={{ 
              fontSize: '16px', 
              marginBottom: '2px',
              fontFamily: SystemTheme.fonts.mono 
            }}>
              {loadType.symbol}
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '9px' }}>{loadType.name}</div>
            <div style={{ fontSize: '8px', color: SystemTheme.colors.textSecondary }}>
              {node.current || loadType.current}A
            </div>
          </>
        );
      case ElectricalNodeTypes.CIRCUIT:
        return (
          <>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
              Circuit {node.circuitNumber || 1}
            </div>
            <div style={{ fontSize: '9px', color: SystemTheme.colors.textSecondary }}>
              {node.breakerSize || 20}A Breaker
            </div>
          </>
        );
      default:
        return <div>{node.name || 'Component'}</div>;
    }
  };
  
  return (
    <div
      style={getNodeStyle()}
      onMouseDown={handleMouseDown}
    >
      {renderNodeContent()}
      
      {/* Connection points - professional schematic style */}
      <div
        style={{
          position: 'absolute',
          right: -6,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 12,
          height: 12,
          background: SystemTheme.colors.node,
          border: `2px solid ${SystemTheme.colors.nodeBorder}`,
          borderRadius: '50%',
          cursor: 'crosshair'
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onConnectionStart && onConnectionStart(node.id);
        }}
      />
      
      <div
        style={{
          position: 'absolute',
          left: -6,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 12,
          height: 12,
          background: SystemTheme.colors.node,
          border: `2px solid ${SystemTheme.colors.nodeBorder}`,
          borderRadius: '50%',
          cursor: 'crosshair'
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onConnectionStart && onConnectionStart(node.id);
        }}
      />
    </div>
  );
};

const SchematicConnection = ({ connection, nodes }) => {
  const fromNode = nodes.find(n => n.id === connection.from);
  const toNode = nodes.find(n => n.id === connection.to);

  if (!fromNode || !toNode) return null;

  // Recalculate path dynamically based on current node positions
  const x1 = fromNode.x + (fromNode.width || 100) / 2;
  const y1 = fromNode.y + (fromNode.height || 60) / 2;
  const x2 = toNode.x + (toNode.width || 100) / 2;
  const y2 = toNode.y + (toNode.height || 60) / 2;
  const midX = x1 + (x2 - x1) * 0.6;

  const pathString = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;

  const strokeColor = connection.phase === 'L1' ? SystemTheme.colors.phaseL1 : SystemTheme.colors.phaseL2;
  
  return (
    <g>
      <path
        d={pathString}
        stroke={strokeColor}
        strokeWidth="2"
        fill="none"
        markerEnd="url(#arrowhead)"
      />
      
      {/* Wire specification label */}
      {connection.wire && (
        <text
          x={midX}
          y={(y1 + y2) / 2 - 8}
          fill={SystemTheme.colors.textSecondary}
          fontSize="9"
          textAnchor="middle"
          fontFamily={SystemTheme.fonts.main}
        >
          {connection.wire.specification || `${connection.wire.awg} AWG`}
        </text>
      )}
    </g>
  );
};

const ComponentPalette = ({ onComponentSelect }) => {
  const components = [
    { type: ElectricalNodeTypes.MAIN_PANEL, name: 'Main Panel', icon: '⬛' },
    { type: ElectricalNodeTypes.SUB_PANEL, name: 'Sub Panel', icon: '▫' },
    { type: 'load_lighting', name: 'Lighting', icon: '○' },
    { type: 'load_motor', name: 'Motor', icon: 'M' },
    { type: 'load_heating', name: 'Heating', icon: 'H' },
    { type: 'load_appliance', name: 'Appliance', icon: 'A' },
    { type: 'load_outlet', name: 'Outlet', icon: '⊡' },
    { type: 'load_ev_charger', name: 'EV Charger', icon: 'EV' }
  ];
  
  return (
    <MacOSPanel title="Component Library" width="180px">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
        {components.map((comp, i) => (
          <div
            key={i}
            onClick={() => onComponentSelect(comp)}
            style={{
              background: 'linear-gradient(to bottom, #f8f8f8, #e8e8e8)',
              border: `1px solid ${SystemTheme.colors.borderDark}`,
              borderRadius: '4px',
              padding: '8px 4px',
              cursor: 'pointer',
              textAlign: 'center',
              fontSize: '9px',
              fontFamily: SystemTheme.fonts.main,
              ':hover': {
                background: 'linear-gradient(to bottom, #e8e8e8, #d8d8d8)'
              }
            }}
          >
            <div style={{ fontSize: '14px', marginBottom: '2px', fontFamily: SystemTheme.fonts.mono }}>
              {comp.icon}
            </div>
            <div>{comp.name}</div>
          </div>
        ))}
      </div>
    </MacOSPanel>
  );
};

const SystemAnalysisPanel = ({ analysis }: { analysis: SystemAnalysis }) => {
  return (
    <MacOSPanel title="System Analysis" width="260px">
      {/* Holistic Score */}
      {analysis.holisticScore !== undefined && (
        <div style={{ marginBottom: '12px', padding: '8px', background: '#f0f0f0', borderRadius: '4px' }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 'bold',
            marginBottom: '4px',
            fontFamily: SystemTheme.fonts.main,
            color: analysis.holisticScore >= 85 ? SystemTheme.colors.success :
                   analysis.holisticScore >= 70 ? SystemTheme.colors.warning :
                   SystemTheme.colors.error
          }}>
            Holistic Score: {analysis.holisticScore.toFixed(1)}%
          </div>
          <div style={{
            height: '8px',
            background: '#ddd',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${analysis.holisticScore}%`,
              height: '100%',
              background: analysis.holisticScore >= 85 ? SystemTheme.colors.success :
                         analysis.holisticScore >= 70 ? SystemTheme.colors.warning :
                         SystemTheme.colors.error,
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
      )}

      {/* Load Summary */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 'bold',
          marginBottom: '4px',
          fontFamily: SystemTheme.fonts.main
        }}>
          Load Summary
        </div>
        <table style={{
          width: '100%',
          fontSize: '9px',
          fontFamily: SystemTheme.fonts.main,
          borderCollapse: 'collapse'
        }}>
          <tbody>
            <tr>
              <td>Total Load:</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                {analysis.totalLoad.toFixed(1)}A
              </td>
            </tr>
            <tr>
              <td>L1 Phase:</td>
              <td style={{ textAlign: 'right', color: SystemTheme.colors.phaseL1 }}>
                {analysis.phaseLoads.L1.toFixed(1)}A
              </td>
            </tr>
            <tr>
              <td>L2 Phase:</td>
              <td style={{ textAlign: 'right', color: SystemTheme.colors.phaseL2 }}>
                {analysis.phaseLoads.L2.toFixed(1)}A
              </td>
            </tr>
            <tr>
              <td>Imbalance:</td>
              <td style={{ textAlign: 'right' }}>
                {analysis.phaseImbalance.toFixed(1)}A
              </td>
            </tr>
            <tr>
              <td>Utilization:</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                {(analysis.utilization * 100).toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Constraint Violations */}
      {analysis.constraintViolations && analysis.constraintViolations.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 'bold',
            marginBottom: '4px',
            fontFamily: SystemTheme.fonts.main,
            color: SystemTheme.colors.error
          }}>
            Constraint Violations ({analysis.constraintViolations.length})
          </div>
          {analysis.constraintViolations.slice(0, 3).map((violation, i) => (
            <div key={i} style={{
              fontSize: '9px',
              padding: '4px',
              marginBottom: '4px',
              background: violation.system_impact_score > 0.7 ? '#ffe0e0' : '#fff5e0',
              border: `1px solid ${violation.system_impact_score > 0.7 ? SystemTheme.colors.error : SystemTheme.colors.warning}`,
              borderRadius: '2px',
              fontFamily: SystemTheme.fonts.main
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                {violation.constraint_type}
              </div>
              <div style={{ color: SystemTheme.colors.textSecondary }}>
                {violation.message}
              </div>
              <div style={{ marginTop: '2px', fontSize: '8px' }}>
                Impact: {(violation.system_impact_score * 100).toFixed(0)}% |
                Cascade: {(violation.cascading_risk * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* System Status */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 'bold',
          marginBottom: '4px',
          fontFamily: SystemTheme.fonts.main
        }}>
          System Status
        </div>
        {analysis.analysis.map((status, i) => (
          <div key={i} style={{
            fontSize: '9px',
            color: status.type === 'success' ? SystemTheme.colors.success :
                   status.type === 'warning' ? SystemTheme.colors.warning :
                   SystemTheme.colors.error,
            marginBottom: '2px',
            fontFamily: SystemTheme.fonts.main
          }}>
            • {status.message}
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div>
          <div style={{
            fontSize: '10px',
            fontWeight: 'bold',
            marginBottom: '4px',
            fontFamily: SystemTheme.fonts.main
          }}>
            Recommendations
          </div>
          {analysis.recommendations.slice(0, 4).map((rec, i) => (
            <div key={i} style={{
              fontSize: '9px',
              color: SystemTheme.colors.textSecondary,
              marginBottom: '2px',
              fontFamily: SystemTheme.fonts.main
            }}>
              • {rec}
            </div>
          ))}
        </div>
      )}
    </MacOSPanel>
  );
};

const PropertyInspector = ({ node }) => {
  if (!node) return null;

  const flattenObject = (obj, prefix = '') => {
    const result = [];

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

  const properties = flattenObject(node);

  return (
    <MacOSPanel title="Property Inspector" width="240px">
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table style={{
          width: '100%',
          fontSize: '9px',
          fontFamily: SystemTheme.fonts.mono,
          borderCollapse: 'collapse'
        }}>
          <thead>
            <tr style={{ background: '#e8e8e8', position: 'sticky', top: 0 }}>
              <th style={{ padding: '4px', textAlign: 'left', borderBottom: `1px solid ${SystemTheme.colors.borderDark}` }}>Property</th>
              <th style={{ padding: '4px', textAlign: 'left', borderBottom: `1px solid ${SystemTheme.colors.borderDark}` }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((prop, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '4px', color: SystemTheme.colors.textSecondary }}>
                  {prop.key}
                </td>
                <td style={{ padding: '4px', fontWeight: 'bold', wordBreak: 'break-all' }}>
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
    </MacOSPanel>
  );
};

const ProjectManager = ({ onImport, onExport, projectName, setProjectName }) => {
  const fileInputRef = useRef(null);
  
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onImport(e.target.result);
      };
      reader.readAsText(file);
    }
  };
  
  return (
    <MacOSPanel title="Project Manager" width="200px">
      <div style={{ marginBottom: '8px' }}>
        <label style={{ 
          fontSize: '10px', 
          fontFamily: SystemTheme.fonts.main,
          display: 'block',
          marginBottom: '2px'
        }}>
          Project Name:
        </label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          style={{
            width: '100%',
            padding: '3px',
            fontSize: '10px',
            fontFamily: SystemTheme.fonts.main,
            border: `1px solid ${SystemTheme.colors.borderDark}`,
            borderRadius: '2px'
          }}
        />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <MacOSButton onClick={onExport} style={{ fontSize: '10px' }}>
          Export Project
        </MacOSButton>
        
        <MacOSButton 
          onClick={() => fileInputRef.current?.click()} 
          style={{ fontSize: '10px' }}
        >
          Import Project
        </MacOSButton>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />
      </div>
    </MacOSPanel>
  );
};

// =============================================================================
// MAIN PROFESSIONAL DESIGN INTERFACE
// =============================================================================

const ProfessionalElectricalDesigner = () => {
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [connectionMode, setConnectionMode] = useState(false);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [analysis, setAnalysis] = useState<SystemAnalysis>({
    totalLoad: 0,
    phaseLoads: { L1: 0, L2: 0 },
    phaseImbalance: 0,
    utilization: 0,
    maxCurrent: 0,
    analysis: [],
    recommendations: []
  });
  const [analyzing, setAnalyzing] = useState(false);

  // Initialize engines
  const router = useMemo(() => new SchematicRouter(), []);

  // Real-time system analysis with Python integration
  useEffect(() => {
    let isCurrent = true;

    const performAnalysis = async () => {
      setAnalyzing(true);
      try {
        const result = await enhancedElectricalAnalysisEngine.analyzeSystem(nodes, connections);
        if (isCurrent) {
          setAnalysis(result);
        }
      } catch (error) {
        console.error('Analysis failed:', error);
      } finally {
        if (isCurrent) {
          setAnalyzing(false);
        }
      }
    };

    performAnalysis();

    return () => {
      isCurrent = false;
    };
  }, [nodes, connections]);
  
  // Handle component placement
  const handleComponentSelect = (component) => {
    const nodeId = `node_${Date.now()}`;
    const x = router.snapToGrid(300 + Math.random() * 200);
    const y = router.snapToGrid(200 + Math.random() * 200);
    
    let newNode = createNodeFromComponent(component, nodeId, x, y);
    setNodes(prev => [...prev, newNode]);
  };
  
  const createNodeFromComponent = (component, id, x, y) => {
    let node = { id, x, y };
    
    if (component.type === ElectricalNodeTypes.MAIN_PANEL) {
      node = { ...node, type: ElectricalNodeTypes.MAIN_PANEL, rating: 200, width: 120, height: 80 };
    } else if (component.type === ElectricalNodeTypes.SUB_PANEL) {
      node = { ...node, type: ElectricalNodeTypes.SUB_PANEL, rating: 100, width: 100, height: 70 };
    } else if (component.type.startsWith('load_')) {
      const loadType = component.type.replace('load_', '').toUpperCase();
      const loadSpec = LoadTypes[loadType] || LoadTypes.OUTLET;
      node = { 
        ...node, 
        type: ElectricalNodeTypes.LOAD, 
        loadType: loadType,
        current: loadSpec.current,
        name: loadSpec.name,
        width: 80,
        height: 60
      };
    }
    
    return node;
  };
  
  // Handle connections
  const handleConnectionStart = (nodeId) => {
    if (pendingConnection) {
      const fromNode = nodes.find(n => n.id === pendingConnection);
      const toNode = nodes.find(n => n.id === nodeId);
      
      if (fromNode && toNode && fromNode.id !== toNode.id) {
        const path = router.calculateOptimalPath(fromNode, toNode);
        const wire = router.calculateWireSpecification(toNode.current || 15, 50);
        
        const newConnection = {
          id: `conn_${Date.now()}`,
          from: pendingConnection,
          to: nodeId,
          path,
          wire,
          phase: connections.filter(c => c.phase === 'L1').length <= 
                 connections.filter(c => c.phase === 'L2').length ? 'L1' : 'L2'
        };
        
        setConnections(prev => [...prev, newConnection]);
      }
      
      setPendingConnection(null);
      setConnectionMode(false);
    } else {
      setPendingConnection(nodeId);
      setConnectionMode(true);
    }
  };
  
  // Project management
  const handleExport = () => {
    const projectData = ProjectDataManager.exportProject(nodes, connections, {
      name: projectName,
      created: new Date().toISOString()
    });
    
    ProjectDataManager.downloadFile(
      projectData, 
      `${projectName.replace(/\s+/g, '_').toLowerCase()}.json`
    );
  };
  
  const handleImport = (jsonData) => {
    const result = ProjectDataManager.importProject(jsonData);
    
    if (result.success) {
      setNodes(result.nodes);
      setConnections(result.connections);
      if (result.metadata?.name) {
        setProjectName(result.metadata.name);
      }
    } else {
      alert(`Import failed: ${result.error}`);
    }
  };
  
  // Node updates
  const handleNodeUpdate = (nodeId, updates) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, ...updates } : node
    ));
  };
  
  return (
    <div style={{
      fontFamily: SystemTheme.fonts.main,
      background: SystemTheme.colors.background,
      minHeight: '100vh',
      position: 'relative'
    }}>
      
      {/* Menu Bar */}
      <div style={{
        background: 'linear-gradient(to bottom, #f0f0f0, #e0e0e0)',
        borderBottom: `1px solid ${SystemTheme.colors.borderDark}`,
        padding: '8px 16px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: SystemTheme.colors.text,
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }}>
        Professional Electrical Design System - {projectName}
      </div>
      
      {/* Left Sidebar */}
      <div style={{
        position: 'fixed',
        left: '10px',
        top: '60px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 1000
      }}>
        <ComponentPalette onComponentSelect={handleComponentSelect} />
        <ProjectManager 
          onImport={handleImport}
          onExport={handleExport}
          projectName={projectName}
          setProjectName={setProjectName}
        />
      </div>
      
      {/* Right Sidebar */}
      <div style={{
        position: 'fixed',
        right: '10px',
        top: '60px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {selectedNodeId && <PropertyInspector node={nodes.find(n => n.id === selectedNodeId)} />}
        <SystemAnalysisPanel analysis={analysis} />
      </div>
      
      {/* Toolbar */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: SystemTheme.colors.panel,
        border: `1px solid ${SystemTheme.colors.borderDark}`,
        borderRadius: '6px',
        padding: '8px',
        display: 'flex',
        gap: '8px',
        boxShadow: '2px 2px 4px rgba(0,0,0,0.2)',
        zIndex: 1000
      }}>
        <MacOSButton 
          onClick={() => setConnectionMode(!connectionMode)}
          primary={connectionMode}
        >
          {connectionMode ? 'Exit Connect' : 'Connect Mode'}
        </MacOSButton>
        
        <MacOSButton onClick={() => {
          setNodes([]);
          setConnections([]);
          setSelectedNodeId(null);
        }}>
          Clear All
        </MacOSButton>
      </div>
      
      {/* Main Design Canvas */}
      <div
        id="design-canvas"
        ref={canvasRef}
        style={{
          marginLeft: '210px',
          marginRight: '240px',
          marginTop: '50px',
          minHeight: 'calc(100vh - 50px)',
          background: '#ffffff',
          backgroundImage: `
            linear-gradient(${SystemTheme.colors.grid} 1px, transparent 1px),
            linear-gradient(90deg, ${SystemTheme.colors.grid} 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          border: `1px solid ${SystemTheme.colors.borderDark}`,
          position: 'relative',
          cursor: connectionMode ? 'crosshair' : 'default'
        }}
      >
        
        {/* SVG Layer for Connections */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1
          }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={SystemTheme.colors.connection}
              />
            </marker>
          </defs>
          
          {connections.map(connection => (
            <SchematicConnection
              key={connection.id}
              connection={connection}
              nodes={nodes}
            />
          ))}
        </svg>
        
        {/* Electrical Nodes */}
        {nodes.map(node => (
          <SchematicNode
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            onSelect={setSelectedNodeId}
            onNodeUpdate={handleNodeUpdate}
            onConnectionStart={handleConnectionStart}
          />
        ))}
        
        {/* Connection Mode Overlay */}
        {connectionMode && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: SystemTheme.colors.panel,
            border: `2px solid ${SystemTheme.colors.accent}`,
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
            zIndex: 2000,
            fontFamily: SystemTheme.fonts.main,
            boxShadow: '4px 4px 8px rgba(0,0,0,0.3)'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
              Connection Mode Active
            </div>
            <div style={{ fontSize: '11px', color: SystemTheme.colors.textSecondary }}>
              Click on component connection points to create electrical connections
            </div>
          </div>
        )}
        
      </div>
      
    </div>
  );
};

export default ProfessionalElectricalDesigner;
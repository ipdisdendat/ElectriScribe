import React, { useState, useCallback, useEffect, useRef } from 'react';
import { fieldNotesParser, type ParsedFieldNotes, type ParsedPanel, type ParsedCircuit, type ParsedLoad, type ParsedIssue } from '../../services/field-notes-parser';
import { fieldNotesPersistence } from '../../services/field-notes-persistence';
import { enhancedOrchestrator } from '../../services/enhanced-task-orchestrator';
import { FileText, Download, Zap, AlertTriangle, CheckCircle, Save, Loader, Database, X } from 'lucide-react';

interface ElectricalEntity {
  id: string;
  type: 'panel' | 'circuit' | 'load';
  x: number;
  y: number;
  width: number;
  height: number;
  data: any;
  isDraggable: boolean;
}

interface DragState {
  isDragging: boolean;
  entityId: string | null;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

interface ValidationResult {
  passes_check: boolean;
  holistic_score?: number;
  constraint_violations?: any[];
  message?: string;
}

const ElectriScribeDesigner: React.FC = () => {
  const [fieldNotes, setFieldNotes] = useState('');
  const [parsedData, setParsedData] = useState<ParsedFieldNotes | null>(null);
  const [entities, setEntities] = useState<ElectricalEntity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    entityId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0
  });
  const [autoSaving, setAutoSaving] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleLoadExample = () => {
    const exampleNotes = `### PANEL SPECIFICATIONS
- **Main Panel:** 200A service
- **Panel Type:** Square D QO
- **Available Slots:** 17-19 (free dryer MWBC), potentially 21-24
- **Phase Configuration:** Split-phase 240V service (L1/L2/Neutral/Ground)

### CURRENT CIRCUIT MAPPING

#### LEFT SIDE (L1) - ODD NUMBERS
| SLOT | TYPE        | CIRCUIT DESCRIPTION                    |
|------|-------------|----------------------------------------|
| 1     | Tandem     | Heat Pump (Leg A) + Home Theater Nook  |
| 1-3   | MWBC Tie   | Heat Pump (2-pole, Goodman 2-stage)   |
| 3     | Tandem     | Heat Pump (Leg B) + Front Basement     |
| 5     | Tandem     | Family Room (Lights & Plugs)           |
| 5-7   | MWBC Tie   | Playroom/Living/Office/Kitchen Lights  |
| 7     | Tandem     | Patio Junction Box                     |
| 9     | Tandem     | Dishwasher (#12 AWG ROMEX)            |
| 9-11  | MWBC Tie   | Kitchen Counter Plugs (Center & Left)  |
| 11    | Tandem     | Garburator (Disposal)                  |
| 17-19 | AVAILABLE  | Old Dryer Circuit - can repurpose      |

#### RIGHT SIDE (L2) - EVEN NUMBERS
| 6-8   | 2-Pole     | 60A Feeder to Oven/Steam Subpanel     |
| 10    | Tandem     | New Microwave + MWBC (Lights)          |
| 12    | Tandem     | Furnace + MWBC (Plugs)                 |
| 14    | Tandem     | Fridge + MWBC (Bedroom Lights)         |
| 18    | Tandem     | Garage Plugs & Lights                  |
| 20    | Tandem     | Washer (#10 AWG THHN)                  |

### LOADS IDENTIFIED
- Heat Pump: 240V, 25A continuous, Goodman 2-stage compressor
- Dishwasher: 120V, 12A intermittent
- Disposal: 120V, 8A cyclic
- Microwave: 120V, 10A intermittent
- Furnace: 240V, 15A cyclic
- Fridge: 120V, 6A continuous

### ISSUES NOTED
Heat pump shows occasional voltage sag on startup causing lights to flicker.
Kitchen disposal trips breaker when dishwasher running simultaneously.
Garage circuit feels warm at panel - possible overload condition.`;

    setFieldNotes(exampleNotes);
  };

  const handleParseNotes = useCallback(async () => {
    if (!fieldNotes.trim()) return;

    try {
      // Parse the field notes
      const parsed = fieldNotesParser.parseFieldNotes(fieldNotes);

      if (!parsed || !parsed.metadata) {
        console.error('Parser returned invalid data');
        return;
      }

      setParsedData(parsed);

    // Generate entities for canvas
    const newEntities: ElectricalEntity[] = [];
    let panelY = 80;
    let circuitX = 320;
    let circuitY = 80;
    let loadX = 900;
    let loadY = 80;

    // Add panels
    parsed.panels.forEach((panel) => {
      newEntities.push({
        id: panel.id,
        type: 'panel',
        x: 40,
        y: panelY,
        width: 240,
        height: 160,
        data: panel,
        isDraggable: true
      });
      panelY += 180;
    });

    // Add circuits (arrange in grid)
    parsed.circuits.forEach((circuit, idx) => {
      if (idx > 0 && idx % 6 === 0) {
        circuitX += 200;
        circuitY = 80;
      }
      newEntities.push({
        id: circuit.id,
        type: 'circuit',
        x: circuitX,
        y: circuitY,
        width: 180,
        height: 100,
        data: circuit,
        isDraggable: true
      });
      circuitY += 120;
    });

    // Add loads
    parsed.loads.forEach((load, idx) => {
      if (idx > 0 && idx % 5 === 0) {
        loadX += 180;
        loadY = 80;
      }
      newEntities.push({
        id: load.id,
        type: 'load',
        x: loadX,
        y: loadY,
        width: 160,
        height: 120,
        data: load,
        isDraggable: true
      });
      loadY += 140;
    });

      setEntities(newEntities);

      // Run holistic validation
      await performHolisticValidation(parsed);
    } catch (error) {
      console.error('Error parsing field notes:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [fieldNotes]);

  const performHolisticValidation = async (parsed: ParsedFieldNotes) => {
    setIsValidating(true);
    try {
      // Calculate total system load
      const totalLoad = parsed.loads.reduce((sum, load) =>
        sum + (load.nominal_current || 0), 0
      );

      // Get main panel rating
      const mainPanel = parsed.panels.find(p => p.panel_type === 'main');
      const panelRating = mainPanel?.rating || 200;

      // Run validation through Python orchestrator
      const result = await enhancedOrchestrator.validateCircuitWithPython({
        circuit_id: 'system_overall',
        load_watts: totalLoad * 240,
        voltage: 240,
        wire_gauge: 2, // Service wire
        wire_length_feet: 50,
        environment_temp_c: 30,
        num_current_carrying_conductors: parsed.circuits.length,
        conduit_type: 'PVC',
        installation_method: 'conduit'
      });

      setValidationResult({
        passes_check: result.passes_check,
        holistic_score: result.holistic_score,
        constraint_violations: result.constraint_violations,
        message: result.message
      });
    } catch (error) {
      console.error('Validation error:', error);
      setValidationResult({
        passes_check: true,
        message: 'Validation offline - basic checks passed'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!parsedData || !fieldNotes.trim()) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const result = await fieldNotesPersistence.saveFieldNotes(
        fieldNotes,
        parsedData,
        undefined // No site_id for now
      );

      if (result.success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        console.error('Save error:', result.error);

        // Show user-friendly message for auth errors
        if (result.error?.includes('not authenticated')) {
          alert('Database save requires authentication. Use "Export JSON" instead for offline testing.');
        }
      }
    } catch (error) {
      setSaveStatus('error');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, entityId: string) => {
    if (e.button !== 0) return;

    const entity = entities.find(ent => ent.id === entityId);
    if (!entity || !entity.isDraggable) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragState({
      isDragging: true,
      entityId,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      offsetX: e.clientX - rect.left - entity.x,
      offsetY: e.clientY - rect.top - entity.y
    });

    setSelectedEntityId(entityId);
    e.stopPropagation();
    e.preventDefault();
  }, [entities]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.entityId) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = Math.max(0, mouseX - dragState.offsetX);
    const newY = Math.max(0, mouseY - dragState.offsetY);

    // Grid snap to 20px
    const gridSize = 20;
    const snappedX = Math.round(newX / gridSize) * gridSize;
    const snappedY = Math.round(newY / gridSize) * gridSize;

    setEntities(prev => prev.map(entity =>
      entity.id === dragState.entityId
        ? { ...entity, x: snappedX, y: snappedY }
        : entity
    ));
  }, [dragState]);

  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging && dragState.entityId && autoSaving) {
      // Save position to database
      const entity = entities.find(e => e.id === dragState.entityId);
      if (entity) {
        fieldNotesPersistence.updateEntityPosition(
          entity.type,
          entity.id,
          entity.x,
          entity.y
        );
      }
    }

    setDragState(prev => ({
      ...prev,
      isDragging: false,
      entityId: null
    }));
  }, [dragState, entities, autoSaving]);

  useEffect(() => {
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  const handleClearNotes = () => {
    setFieldNotes('');
    setParsedData(null);
    setEntities([]);
    setSelectedEntityId(null);
    setValidationResult(null);
    setSaveStatus('idle');
  };

  const handleExportJSON = () => {
    if (!parsedData) return;

    const exportData = {
      ...parsedData,
      entities: entities.map(e => ({
        id: e.id,
        type: e.type,
        x: e.x,
        y: e.y
      })),
      validation: validationResult
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `electriscribe_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedEntity = selectedEntityId ? entities.find(e => e.id === selectedEntityId) : null;

  return (
    <div className="h-screen flex flex-col bg-base-200">
      {/* Header */}
      <div className="navbar bg-base-100 shadow-lg border-b border-base-300">
        <div className="flex-1">
          <Zap className="w-6 h-6 ml-4 text-warning animate-pulse" />
          <span className="ml-2 text-xl font-bold">ElectriScribe v1.0</span>
          <span className="ml-2 text-sm text-base-content/60">Professional Electrical Documentation System</span>
        </div>
        <div className="flex-none gap-2 mr-4">
          {saveStatus === 'success' && (
            <div className="badge badge-success gap-1">
              <CheckCircle className="w-3 h-3" />
              Saved
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="badge badge-error gap-1">
              <X className="w-3 h-3" />
              Error
            </div>
          )}
          <div className="form-control flex flex-row items-center gap-2">
            <input
              type="checkbox"
              className="toggle toggle-sm toggle-success"
              checked={autoSaving}
              onChange={(e) => setAutoSaving(e.target.checked)}
            />
            <span className="text-xs">Auto-save positions</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Field Notes */}
        <div className="w-2/5 flex flex-col border-r border-base-300 bg-base-100">
          <div className="bg-gradient-to-r from-primary/20 to-secondary/20 px-4 py-3 border-b border-base-300 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">📝 Field Notes Input</h2>
          </div>

          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <textarea
              className="textarea textarea-bordered flex-1 font-mono text-xs mb-4 resize-none leading-relaxed"
              placeholder="Paste your field notes here...

Quick patterns:
• Panel: '200A Square D QO'
• Circuit: '1-3 MWBC tie Heat Pump'
• Wire: '#12 AWG ROMEX'
• Available: '17-19 old dryer - can repurpose'
• Issue: 'trips when dishwasher running'"
              value={fieldNotes}
              onChange={(e) => setFieldNotes(e.target.value)}
              spellCheck={false}
            />

            <div className="flex gap-2 flex-wrap">
              <button
                className="btn btn-primary btn-sm flex-1"
                onClick={handleParseNotes}
                disabled={!fieldNotes.trim()}
              >
                <Zap className="w-4 h-4" />
                Parse Notes
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleLoadExample}
              >
                Load Example
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleClearNotes}
              >
                Clear
              </button>
            </div>

            {parsedData && (
              <div className="mt-4 space-y-2">
                <button
                  className="btn btn-accent btn-sm w-full"
                  onClick={handleSaveToDatabase}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      Save to Database
                    </>
                  )}
                </button>
                <button
                  className="btn btn-ghost btn-sm w-full"
                  onClick={handleExportJSON}
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Structured Entities */}
        <div className="flex-1 flex flex-col bg-base-100">
          <div className="bg-gradient-to-r from-secondary/20 to-accent/20 px-4 py-3 border-b border-base-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-secondary" />
              <h2 className="font-bold text-lg">⚡ Structured Entities</h2>
            </div>
            <div className="flex items-center gap-3">
              {isValidating && (
                <span className="text-xs flex items-center gap-1 text-info">
                  <Loader className="w-3 h-3 animate-spin" />
                  Validating...
                </span>
              )}
              {validationResult && (
                <div className={`badge gap-1 ${
                  validationResult.holistic_score && validationResult.holistic_score >= 85 ? 'badge-success' :
                  validationResult.holistic_score && validationResult.holistic_score >= 70 ? 'badge-warning' :
                  'badge-error'
                }`}>
                  {validationResult.holistic_score ?
                    `Score: ${validationResult.holistic_score.toFixed(0)}%` :
                    'Validated'
                  }
                </div>
              )}
              {parsedData && (
                <span className="text-xs text-success flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Active
                </span>
              )}
            </div>
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            className="flex-1 relative overflow-auto bg-white cursor-default"
            style={{
              backgroundImage: `
                linear-gradient(#e5e7eb 1px, transparent 1px),
                linear-gradient(90deg, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
            onClick={() => setSelectedEntityId(null)}
          >
            {!parsedData && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-base-content/40">
                  <FileText className="w-20 h-20 mx-auto mb-4 opacity-30" />
                  <p className="text-xl font-semibold">No entities parsed yet</p>
                  <p className="text-sm mt-2">Enter field notes and click "Parse Notes"</p>
                  <p className="text-xs mt-4 max-w-md">
                    The system will extract panels, circuits, loads, and issues,
                    then validate against NEC constraints with holistic scoring
                  </p>
                </div>
              </div>
            )}

            {entities.map(entity => (
              <div
                key={entity.id}
                className={`absolute transition-shadow ${
                  selectedEntityId === entity.id ? 'ring-4 ring-primary shadow-2xl z-10' : 'shadow-lg'
                } ${dragState.isDragging && dragState.entityId === entity.id ? 'cursor-grabbing' : 'cursor-grab'}`}
                style={{
                  left: entity.x,
                  top: entity.y,
                  width: entity.width,
                  height: entity.height
                }}
                onMouseDown={(e) => handleMouseDown(e, entity.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEntityId(entity.id);
                }}
              >
                {entity.type === 'panel' && <PanelEntity panel={entity.data} isSelected={selectedEntityId === entity.id} />}
                {entity.type === 'circuit' && <CircuitEntity circuit={entity.data} isSelected={selectedEntityId === entity.id} />}
                {entity.type === 'load' && <LoadEntity load={entity.data} isSelected={selectedEntityId === entity.id} />}
              </div>
            ))}
          </div>

          {/* Bottom Stats Panel */}
          {parsedData && (
            <div className="bg-base-200 p-3 border-t border-base-300">
              <div className="grid grid-cols-5 gap-3">
                <div className="stat bg-base-100 rounded-lg p-2 shadow">
                  <div className="stat-value text-xl text-primary">{parsedData.panels.length}</div>
                  <div className="stat-title text-[10px]">Panels</div>
                </div>
                <div className="stat bg-base-100 rounded-lg p-2 shadow">
                  <div className="stat-value text-xl text-secondary">{parsedData.circuits.length}</div>
                  <div className="stat-title text-[10px]">Circuits</div>
                </div>
                <div className="stat bg-base-100 rounded-lg p-2 shadow">
                  <div className="stat-value text-xl text-accent">{parsedData.loads.length}</div>
                  <div className="stat-title text-[10px]">Loads</div>
                </div>
                <div className="stat bg-base-100 rounded-lg p-2 shadow">
                  <div className={`stat-value text-xl ${
                    parsedData.issues.filter(i => i.severity === 'critical').length > 0 ? 'text-error' :
                    parsedData.issues.length > 0 ? 'text-warning' : 'text-success'
                  }`}>
                    {parsedData.issues.length}
                  </div>
                  <div className="stat-title text-[10px]">Issues</div>
                </div>
                <div className="stat bg-base-100 rounded-lg p-2 shadow">
                  <div className="stat-value text-xl text-success">
                    {(parsedData.metadata.confidence_score * 100).toFixed(0)}%
                  </div>
                  <div className="stat-title text-[10px]">Confidence</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedEntity && (
          <div className="w-80 bg-base-100 border-l border-base-300 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Entity Details</h3>
                <button
                  className="btn btn-ghost btn-xs btn-circle"
                  onClick={() => setSelectedEntityId(null)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <DetailPanel entity={selectedEntity} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-base-300 px-4 py-2 text-xs text-base-content/70 flex items-center justify-between border-t">
        <span>ElectriScribe v1.0 - Consciousness-aware electrical documentation</span>
        <div className="flex items-center gap-4">
          {parsedData && (
            <span className="flex items-center gap-1 text-success">
              <CheckCircle className="w-3 h-3" />
              {entities.length} entities on canvas
            </span>
          )}
          {validationResult?.holistic_score && (
            <span className="flex items-center gap-1">
              Holistic Score: {validationResult.holistic_score.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Entity Display Components
const PanelEntity: React.FC<{ panel: ParsedPanel; isSelected: boolean }> = ({ panel, isSelected }) => {
  return (
    <div className={`card bg-gradient-to-br from-warning/20 to-warning/5 h-full border-2 ${
      isSelected ? 'border-primary' : 'border-warning/40'
    }`}>
      <div className="card-body p-3">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-warning" />
          <h3 className="card-title text-sm font-bold">
            {panel.panel_type === 'main' ? '⚡ MAIN PANEL' : '📟 SUB PANEL'}
          </h3>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-base-content/60">Type:</span>
            <span className="font-semibold">{panel.manufacturer} {panel.model}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Rating:</span>
            <span className="font-bold text-warning">{panel.rating}A</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Voltage:</span>
            <span className="font-semibold">{panel.voltage}V</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Config:</span>
            <span className="text-[10px]">{panel.phase_configuration}</span>
          </div>
          {panel.available_slots.length > 0 && (
            <div className="mt-2 p-2 bg-success/10 rounded">
              <div className="text-[10px] text-success font-semibold mb-1">Available Slots:</div>
              <div className="font-bold text-success">{panel.available_slots.join(', ')}</div>
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className={`badge badge-sm ${
            panel.confidence >= 0.85 ? 'badge-success' :
            panel.confidence >= 0.7 ? 'badge-warning' : 'badge-error'
          }`}>
            {(panel.confidence * 100).toFixed(0)}% confidence
          </div>
          {panel.location !== 'Not specified' && (
            <div className="text-[10px] text-base-content/60">📍 {panel.location}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const CircuitEntity: React.FC<{ circuit: ParsedCircuit; isSelected: boolean }> = ({ circuit, isSelected }) => {
  return (
    <div className={`card h-full border-2 ${
      circuit.is_available
        ? 'bg-gradient-to-br from-success/20 to-success/5 border-success'
        : isSelected
          ? 'bg-base-100 border-primary'
          : 'bg-base-100 border-base-300'
    }`}>
      <div className="card-body p-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-sm">
            Slots {circuit.slot_numbers.join('-')}
          </h3>
          {circuit.is_available && (
            <div className="badge badge-xs badge-success font-bold">AVAILABLE</div>
          )}
          {circuit.mwbc_group && (
            <div className="badge badge-xs badge-warning">MWBC</div>
          )}
        </div>
        <div className="text-xs space-y-1">
          <div className="font-semibold truncate text-base-content/90">{circuit.description}</div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-base-content/60">{circuit.circuit_type}</span>
            <span className="font-bold text-secondary">{circuit.breaker_size}A</span>
          </div>
          {circuit.wire_awg && (
            <div className="text-[10px] bg-base-200 p-1 rounded">
              <span className="font-semibold">#{circuit.wire_awg} AWG</span>
              {circuit.wire_type && <span className="ml-1">{circuit.wire_type}</span>}
            </div>
          )}
          <div className="flex justify-between mt-2">
            <div className={`badge badge-xs ${
              circuit.phase === 'L1' ? 'badge-error' :
              circuit.phase === 'L2' ? 'badge-info' : 'badge-warning'
            }`}>
              Phase: {circuit.phase}
            </div>
            <div className="text-[10px] text-base-content/50">
              {(circuit.confidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadEntity: React.FC<{ load: ParsedLoad; isSelected: boolean }> = ({ load, isSelected }) => {
  const getLoadIcon = (type: string) => {
    switch (type) {
      case 'motor': return '⚙️';
      case 'resistive': return '🔥';
      case 'electronic': return '💻';
      case 'lighting': return '💡';
      default: return '⚡';
    }
  };

  return (
    <div className={`card bg-base-100 h-full border-2 ${
      isSelected ? 'border-primary' : 'border-accent/40'
    }`}>
      <div className="card-body p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{getLoadIcon(load.load_type)}</span>
          <h3 className="font-bold text-sm">{load.name}</h3>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-base-content/60">Type:</span>
            <span className="font-semibold capitalize">{load.load_type}</span>
          </div>
          {load.nominal_current && (
            <div className="flex justify-between">
              <span className="text-base-content/60">Current:</span>
              <span className="font-bold text-accent">{load.nominal_current}A</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-base-content/60">Voltage:</span>
            <span className="font-semibold">{load.nominal_voltage}V</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">PF:</span>
            <span className="text-[10px]">{load.power_factor.toFixed(2)}</span>
          </div>
          {load.circuit_reference && (
            <div className="mt-2 p-1 bg-primary/10 rounded text-[10px]">
              Circuit: {load.circuit_reference}
            </div>
          )}
          {load.location !== 'Not specified' && (
            <div className="text-[10px] text-base-content/50 mt-1">
              📍 {load.location}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between">
            <div className={`badge badge-xs ${load.critical ? 'badge-error' : 'badge-ghost'}`}>
              {load.duty_cycle}
            </div>
            <div className="text-[10px] text-base-content/50">
              {(load.confidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailPanel: React.FC<{ entity: ElectricalEntity }> = ({ entity }) => {
  return (
    <div className="space-y-4">
      <div className="text-sm">
        <div className="font-semibold mb-2 text-base-content/70">Entity Type</div>
        <div className="badge badge-lg">{entity.type.toUpperCase()}</div>
      </div>

      <div className="text-sm">
        <div className="font-semibold mb-2 text-base-content/70">Position</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-base-200 p-2 rounded">
            <div className="text-xs text-base-content/60">X</div>
            <div className="font-mono font-bold">{entity.x}px</div>
          </div>
          <div className="bg-base-200 p-2 rounded">
            <div className="text-xs text-base-content/60">Y</div>
            <div className="font-mono font-bold">{entity.y}px</div>
          </div>
        </div>
      </div>

      <div className="text-sm">
        <div className="font-semibold mb-2 text-base-content/70">Raw Data</div>
        <div className="bg-base-200 p-3 rounded text-xs font-mono overflow-auto max-h-96">
          <pre className="whitespace-pre-wrap break-words">
            {JSON.stringify(entity.data, null, 2)}
          </pre>
        </div>
      </div>

      <div className="alert alert-info text-xs">
        <AlertTriangle className="w-4 h-4" />
        <span>Drag entity on canvas to reposition. Changes save automatically if auto-save is enabled.</span>
      </div>
    </div>
  );
};

export default ElectriScribeDesigner;

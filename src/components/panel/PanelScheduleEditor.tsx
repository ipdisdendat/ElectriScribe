/**
 * PanelScheduleEditor Component
 *
 * Editable grid for panel circuit schedule.
 * Allows adding, editing, and removing circuits/breakers.
 *
 * Usage:
 * ```tsx
 * <PanelScheduleEditor
 *   panelId="panel-123"
 *   circuits={circuits}
 *   onUpdate={(circuits) => saveCircuits(circuits)}
 * />
 * ```
 */

import { useState, useEffect } from 'react';
import type { OfflineCircuit } from '../../services/offline-database';

interface PanelScheduleEditorProps {
  panelId: string;
  circuits?: OfflineCircuit[];
  onUpdate?: (circuits: OfflineCircuit[]) => void;
  readOnly?: boolean;
}

export default function PanelScheduleEditor({
  panelId,
  circuits: initialCircuits = [],
  onUpdate,
  readOnly = false,
}: PanelScheduleEditorProps) {
  const [circuits, setCircuits] = useState<OfflineCircuit[]>(initialCircuits);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Update local state when prop changes
  useEffect(() => {
    setCircuits(initialCircuits);
  }, [initialCircuits]);

  const handleAddCircuit = () => {
    const newPosition = circuits.length > 0
      ? Math.max(...circuits.map(c => c.position)) + 1
      : 1;

    const newCircuit: OfflineCircuit = {
      id: `temp-${Date.now()}`, // Temporary ID
      panel_id: panelId,
      position: newPosition,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    const updated = [...circuits, newCircuit];
    setCircuits(updated);
    setEditingId(newCircuit.id);

    if (onUpdate) {
      onUpdate(updated);
    }
  };

  const handleUpdateCircuit = (id: string, updates: Partial<OfflineCircuit>) => {
    const updated = circuits.map(c =>
      c.id === id
        ? { ...c, ...updates, updated_at: Date.now() }
        : c
    );
    setCircuits(updated);

    if (onUpdate) {
      onUpdate(updated);
    }
  };

  const handleDeleteCircuit = (id: string) => {
    const updated = circuits.filter(c => c.id !== id);
    setCircuits(updated);

    if (onUpdate) {
      onUpdate(updated);
    }
  };

  const handleStartEdit = (id: string) => {
    if (!readOnly) {
      setEditingId(id);
    }
  };

  const handleFinishEdit = () => {
    setEditingId(null);
  };

  const sortedCircuits = [...circuits].sort((a, b) => a.position - b.position);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Circuit Schedule</h3>
        {!readOnly && (
          <button
            className="btn btn-primary btn-sm"
            onClick={handleAddCircuit}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Circuit
          </button>
        )}
      </div>

      {/* Circuit Table */}
      {circuits.length === 0 ? (
        <div className="alert alert-info">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>No circuits added yet. Click "Add Circuit" to get started.</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th className="w-20">Position</th>
                <th className="w-24">Amperage</th>
                <th className="w-24">Voltage</th>
                <th className="w-28">Type</th>
                <th>Label</th>
                <th className="w-32">Wire Gauge</th>
                <th className="w-32">Location</th>
                {!readOnly && <th className="w-24">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sortedCircuits.map((circuit) => (
                <CircuitRow
                  key={circuit.id}
                  circuit={circuit}
                  isEditing={editingId === circuit.id}
                  readOnly={readOnly}
                  onUpdate={(updates) => handleUpdateCircuit(circuit.id, updates)}
                  onDelete={() => handleDeleteCircuit(circuit.id)}
                  onStartEdit={() => handleStartEdit(circuit.id)}
                  onFinishEdit={handleFinishEdit}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Circuit Row Component
interface CircuitRowProps {
  circuit: OfflineCircuit;
  isEditing: boolean;
  readOnly: boolean;
  onUpdate: (updates: Partial<OfflineCircuit>) => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onFinishEdit: () => void;
}

function CircuitRow({
  circuit,
  isEditing,
  readOnly,
  onUpdate,
  onDelete,
  onStartEdit,
  onFinishEdit,
}: CircuitRowProps) {
  const [localValues, setLocalValues] = useState(circuit);

  useEffect(() => {
    setLocalValues(circuit);
  }, [circuit]);

  const handleSave = () => {
    onUpdate(localValues);
    onFinishEdit();
  };

  const handleCancel = () => {
    setLocalValues(circuit);
    onFinishEdit();
  };

  if (isEditing) {
    return (
      <tr className="bg-primary/10">
        <td>
          <input
            type="number"
            className="input input-sm input-bordered w-full"
            value={localValues.position || ''}
            onChange={(e) => setLocalValues({ ...localValues, position: parseInt(e.target.value) || 0 })}
          />
        </td>
        <td>
          <input
            type="number"
            className="input input-sm input-bordered w-full"
            placeholder="15"
            value={localValues.amperage || ''}
            onChange={(e) => setLocalValues({ ...localValues, amperage: parseInt(e.target.value) || undefined })}
          />
        </td>
        <td>
          <input
            type="number"
            className="input input-sm input-bordered w-full"
            placeholder="120"
            value={localValues.voltage || ''}
            onChange={(e) => setLocalValues({ ...localValues, voltage: parseInt(e.target.value) || undefined })}
          />
        </td>
        <td>
          <select
            className="select select-sm select-bordered w-full"
            value={localValues.circuit_type || ''}
            onChange={(e) => setLocalValues({ ...localValues, circuit_type: e.target.value as any })}
          >
            <option value="">Select</option>
            <option value="single">Single</option>
            <option value="double">Double</option>
            <option value="triple">Triple</option>
          </select>
        </td>
        <td>
          <input
            type="text"
            className="input input-sm input-bordered w-full"
            placeholder="Kitchen Outlets"
            value={localValues.label || ''}
            onChange={(e) => setLocalValues({ ...localValues, label: e.target.value })}
          />
        </td>
        <td>
          <input
            type="text"
            className="input input-sm input-bordered w-full"
            placeholder="14 AWG"
            value={localValues.wire_gauge || ''}
            onChange={(e) => setLocalValues({ ...localValues, wire_gauge: e.target.value })}
          />
        </td>
        <td>
          <input
            type="text"
            className="input input-sm input-bordered w-full"
            placeholder="First Floor"
            value={localValues.room_location || ''}
            onChange={(e) => setLocalValues({ ...localValues, room_location: e.target.value })}
          />
        </td>
        <td>
          <div className="flex gap-1">
            <button
              className="btn btn-success btn-xs"
              onClick={handleSave}
              title="Save"
            >
              ✓
            </button>
            <button
              className="btn btn-ghost btn-xs"
              onClick={handleCancel}
              title="Cancel"
            >
              ✕
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={readOnly ? '' : 'hover:bg-base-200 cursor-pointer'} onClick={readOnly ? undefined : onStartEdit}>
      <td className="font-mono font-bold">{circuit.position}</td>
      <td>{circuit.amperage ? `${circuit.amperage}A` : '-'}</td>
      <td>{circuit.voltage ? `${circuit.voltage}V` : '-'}</td>
      <td>
        {circuit.circuit_type ? (
          <span className="badge badge-sm">
            {circuit.circuit_type}
          </span>
        ) : '-'}
      </td>
      <td className="font-medium">{circuit.label || '-'}</td>
      <td>{circuit.wire_gauge || '-'}</td>
      <td>{circuit.room_location || '-'}</td>
      {!readOnly && (
        <td>
          <div className="flex gap-1">
            <button
              className="btn btn-ghost btn-xs"
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
              }}
              title="Edit"
            >
              ✏️
            </button>
            <button
              className="btn btn-ghost btn-xs text-error"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this circuit?')) {
                  onDelete();
                }
              }}
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}

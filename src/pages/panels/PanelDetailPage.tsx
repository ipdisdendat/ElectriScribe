import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { ArrowLeft, Edit, Trash2, Download, AlertCircle, Zap, FileText } from 'lucide-react';

interface PanelDetail {
  field_notes_id: string;
  raw_notes: string;
  confidence_score: number;
  created_at: string;
  panel: {
    manufacturer: string;
    model: string;
    rating: number;
    voltage: number;
    location: string;
  } | null;
  circuits: Array<{
    id: string;
    slot_numbers: string[];
    description: string;
    breaker_size: number;
    phase: string;
  }>;
  loads: Array<{
    id: string;
    name: string;
    nominal_current: number;
  }>;
  issues: Array<{
    id: string;
    description: string;
    severity: string;
  }>;
}

export default function PanelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<PanelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadPanelDetail(id);
    }
  }, [id]);

  const loadPanelDetail = async (panelId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Load field notes
      const { data: fieldNotesData, error: fieldNotesError } = await supabase
        .from('field_notes')
        .select('*')
        .eq('id', panelId)
        .single();

      if (fieldNotesError) throw fieldNotesError;

      // Load parsed panel
      const { data: panelData } = await supabase
        .from('parsed_panels')
        .select('*')
        .eq('field_notes_id', panelId)
        .single();

      // Load circuits
      const { data: circuitsData } = await supabase
        .from('parsed_circuits')
        .select('*')
        .eq('field_notes_id', panelId)
        .order('slot_numbers');

      // Load loads
      const { data: loadsData } = await supabase
        .from('parsed_loads')
        .select('*')
        .eq('field_notes_id', panelId);

      // Load issues
      const { data: issuesData } = await supabase
        .from('parsed_issues')
        .select('*')
        .eq('field_notes_id', panelId);

      setPanel({
        field_notes_id: fieldNotesData.id,
        raw_notes: fieldNotesData.raw_notes,
        confidence_score: fieldNotesData.confidence_score,
        created_at: fieldNotesData.created_at,
        panel: panelData ? {
          manufacturer: panelData.manufacturer,
          model: panelData.model,
          rating: panelData.rating,
          voltage: panelData.voltage,
          location: panelData.location,
        } : null,
        circuits: circuitsData || [],
        loads: loadsData || [],
        issues: issuesData || [],
      });
    } catch (err) {
      console.error('Error loading panel:', err);
      setError(err instanceof Error ? err.message : 'Failed to load panel');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this panel documentation?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('field_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      navigate('/');
    } catch (err) {
      console.error('Error deleting panel:', err);
      alert('Failed to delete panel');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error || !panel) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error || 'Panel not found'}</span>
        </div>
        <Link to="/" className="btn btn-ghost mt-4">
          <ArrowLeft className="w-5 h-5" />
          Back to List
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="navbar bg-base-100 shadow-lg">
        <div className="flex-1">
          <Link to="/" className="btn btn-ghost gap-2">
            <ArrowLeft className="w-5 h-5" />
            Back to List
          </Link>
          <h1 className="text-xl font-bold ml-4">
            {panel.panel?.manufacturer} {panel.panel?.model}
          </h1>
        </div>
        <div className="flex-none gap-2">
          <button className="btn btn-ghost btn-sm gap-2" disabled>
            <Edit className="w-4 h-4" />
            Edit (Phase 4)
          </button>
          <button className="btn btn-ghost btn-sm gap-2" disabled>
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            className="btn btn-error btn-sm gap-2"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Panel Info Card */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title mb-4">
              <Zap className="w-6 h-6 text-warning" />
              Panel Information
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-base-content/60">Manufacturer</div>
                <div className="text-lg font-semibold">{panel.panel?.manufacturer || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-base-content/60">Model</div>
                <div className="text-lg font-semibold">{panel.panel?.model || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-base-content/60">Rating</div>
                <div className="text-lg font-semibold text-warning">
                  {panel.panel?.rating || 'N/A'}A
                </div>
              </div>
              <div>
                <div className="text-sm text-base-content/60">Voltage</div>
                <div className="text-lg font-semibold">{panel.panel?.voltage || 'N/A'}V</div>
              </div>
            </div>
            {panel.panel?.location && panel.panel.location !== 'Not specified' && (
              <div className="mt-4">
                <div className="text-sm text-base-content/60">Location</div>
                <div className="text-lg">{panel.panel.location}</div>
              </div>
            )}
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <div className="text-sm text-base-content/60">
                Documented: {new Date(panel.created_at).toLocaleString()}
              </div>
              <div className={`badge ${
                panel.confidence_score >= 85 ? 'badge-success' :
                panel.confidence_score >= 70 ? 'badge-warning' : 'badge-error'
              }`}>
                {panel.confidence_score.toFixed(0)}% confidence
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="stat bg-base-100 shadow-xl rounded-lg">
            <div className="stat-title">Circuits</div>
            <div className="stat-value text-primary">{panel.circuits.length}</div>
            <div className="stat-desc">Breakers documented</div>
          </div>
          <div className="stat bg-base-100 shadow-xl rounded-lg">
            <div className="stat-title">Loads</div>
            <div className="stat-value text-secondary">{panel.loads.length}</div>
            <div className="stat-desc">Electrical loads</div>
          </div>
          <div className="stat bg-base-100 shadow-xl rounded-lg">
            <div className="stat-title">Issues</div>
            <div className={`stat-value ${
              panel.issues.filter(i => i.severity === 'critical').length > 0 ? 'text-error' :
              panel.issues.length > 0 ? 'text-warning' : 'text-success'
            }`}>
              {panel.issues.length}
            </div>
            <div className="stat-desc">
              {panel.issues.filter(i => i.severity === 'critical').length} critical
            </div>
          </div>
        </div>

        {/* Circuits Table */}
        {panel.circuits.length > 0 && (
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title mb-4">Circuit Schedule</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Slot</th>
                      <th>Description</th>
                      <th>Breaker</th>
                      <th>Phase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {panel.circuits.map((circuit) => (
                      <tr key={circuit.id}>
                        <td className="font-mono">{circuit.slot_numbers.join('-')}</td>
                        <td>{circuit.description}</td>
                        <td>
                          <span className="badge badge-primary">{circuit.breaker_size}A</span>
                        </td>
                        <td>
                          <span className={`badge ${
                            circuit.phase === 'L1' ? 'badge-error' :
                            circuit.phase === 'L2' ? 'badge-info' : 'badge-warning'
                          }`}>
                            {circuit.phase}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Issues List */}
        {panel.issues.length > 0 && (
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title mb-4">
                <AlertCircle className="w-6 h-6 text-warning" />
                Detected Issues
              </h2>
              <div className="space-y-3">
                {panel.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`alert ${
                      issue.severity === 'critical' ? 'alert-error' :
                      issue.severity === 'warning' ? 'alert-warning' : 'alert-info'
                    }`}
                  >
                    <AlertCircle className="w-5 h-5" />
                    <div>
                      <div className="font-semibold capitalize">{issue.severity}</div>
                      <div className="text-sm">{issue.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Raw Field Notes */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">
              <FileText className="w-6 h-6" />
              Original Field Notes
            </h2>
            <pre className="bg-base-200 p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap">
              {panel.raw_notes}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

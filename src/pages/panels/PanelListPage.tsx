import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Plus, FileText, Calendar, AlertCircle } from 'lucide-react';

interface PanelSummary {
  field_notes_id: string;
  user_id: string;
  panel_manufacturer: string;
  panel_model: string;
  panel_rating: number;
  circuit_count: number;
  issue_count: number;
  critical_issues: number;
  created_at: string;
  overall_confidence: number;
}

export default function PanelListPage() {
  const [panels, setPanels] = useState<PanelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPanels();
  }, []);

  const loadPanels = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('Please sign in to view your panels');
        return;
      }

      // Query the mvp_panel_documentation view created in migration
      const { data, error: queryError } = await supabase
        .from('field_notes')
        .select(`
          id,
          user_id,
          created_at,
          confidence_score,
          parsed_panels!inner (
            manufacturer,
            model,
            rating
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      // Transform data (simplified for MVP)
      const panelSummaries: PanelSummary[] = (data || []).map((item: any) => ({
        field_notes_id: item.id,
        user_id: item.user_id,
        panel_manufacturer: item.parsed_panels?.[0]?.manufacturer || 'Unknown',
        panel_model: item.parsed_panels?.[0]?.model || 'Unknown',
        panel_rating: item.parsed_panels?.[0]?.rating || 0,
        circuit_count: 0, // TODO: Count from parsed_circuits
        issue_count: 0, // TODO: Count from parsed_issues
        critical_issues: 0,
        created_at: item.created_at,
        overall_confidence: item.confidence_score || 0,
      }));

      setPanels(panelSummaries);
    } catch (err) {
      console.error('Error loading panels:', err);
      setError(err instanceof Error ? err.message : 'Failed to load panels');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="w-8 h-8" />
            My Panel Documentation
          </h1>
          <p className="text-base-content/70 mt-2">
            View and manage all your documented electrical panels
          </p>
        </div>
        <Link to="/panel/new" className="btn btn-primary gap-2">
          <Plus className="w-5 h-5" />
          New Panel
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <div className="alert alert-error mb-6">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && panels.length === 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center py-16">
            <FileText className="w-20 h-20 text-base-content/20 mb-4" />
            <h2 className="card-title text-2xl mb-2">No panels documented yet</h2>
            <p className="text-base-content/70 mb-6 max-w-md">
              Start documenting your electrical panels by taking a photo or entering field notes manually.
            </p>
            <Link to="/panel/new" className="btn btn-primary gap-2">
              <Plus className="w-5 h-5" />
              Document Your First Panel
            </Link>
          </div>
        </div>
      )}

      {/* Panel Grid */}
      {!loading && panels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {panels.map((panel) => (
            <Link
              key={panel.field_notes_id}
              to={`/panel/${panel.field_notes_id}`}
              className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
            >
              <div className="card-body">
                {/* Panel Header */}
                <div className="flex items-start justify-between">
                  <h2 className="card-title text-lg">
                    {panel.panel_manufacturer} {panel.panel_model}
                  </h2>
                  <div className="badge badge-primary">{panel.panel_rating}A</div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="stat bg-base-200 rounded-lg p-3">
                    <div className="stat-value text-2xl text-primary">
                      {panel.circuit_count || '—'}
                    </div>
                    <div className="stat-title text-xs">Circuits</div>
                  </div>
                  <div className="stat bg-base-200 rounded-lg p-3">
                    <div className={`stat-value text-2xl ${
                      panel.critical_issues > 0 ? 'text-error' :
                      panel.issue_count > 0 ? 'text-warning' : 'text-success'
                    }`}>
                      {panel.issue_count || 0}
                    </div>
                    <div className="stat-title text-xs">Issues</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 text-sm text-base-content/60">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(panel.created_at).toLocaleDateString()}
                  </div>
                  <div className={`badge badge-sm ${
                    panel.overall_confidence >= 85 ? 'badge-success' :
                    panel.overall_confidence >= 70 ? 'badge-warning' : 'badge-error'
                  }`}>
                    {panel.overall_confidence.toFixed(0)}% confidence
                  </div>
                </div>

                {/* Critical Issues Warning */}
                {panel.critical_issues > 0 && (
                  <div className="alert alert-error alert-sm mt-3">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs">
                      {panel.critical_issues} critical issue{panel.critical_issues !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

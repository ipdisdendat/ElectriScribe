import { useState } from 'react';
import { pythonAnalysisClient } from '../../services/python-analysis-client';
import { AlertCircle, CheckCircle, Loader, Upload } from 'lucide-react';

interface FieldNotesProcessorProps {
  siteId?: string;
  onProcessingComplete?: (result: any) => void;
}

export default function FieldNotesProcessor({ siteId, onProcessingComplete }: FieldNotesProcessorProps) {
  const [fieldNotes, setFieldNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!fieldNotes.trim()) {
      setError('Please enter field notes to process');
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }

      const processingResult = await pythonAnalysisClient.processFieldNotes({
        raw_notes: fieldNotes,
        site_id: siteId || `site_${Date.now()}`,
        supabase_url: supabaseUrl,
        supabase_key: supabaseKey,
      });

      setResult(processingResult);

      if (onProcessingComplete) {
        onProcessingComplete(processingResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
      console.error('Field notes processing error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleLoadExample = () => {
    setFieldNotes(`PANEL SPECIFICATIONS
- Main Panel: 200A service
- Panel Type: Square D QO
- Available Slots: 17-19 (free dryer MWBC), potentially 21-24
- Phase Configuration: Split-phase 240V service (L1/L2/Neutral/Ground)

CURRENT CIRCUIT MAPPING

LEFT SIDE (L1) - ODD NUMBERS
| 1     | Tandem     | Heat Pump (Leg A) + Home Theater Nook  |
| 1-3   | MWBC Tie   | Heat Pump (2-pole, Goodman 2-stage)   |
| 3     | Tandem     | Heat Pump (Leg B) + Front Basement     |
| 5     | Tandem     | Family Room (Lights & Plugs)           |
| 9     | Tandem     | Dishwasher                             |
| 11    | Tandem     | Garburator (Disposal)                  |

RIGHT SIDE (L2) - EVEN NUMBERS
| 6-8   | 2-Pole     | 60A Feeder to Oven/Steam Subpanel     |
| 10    | Tandem     | New Microwave + MWBC (Lights)          |
| 14    | Tandem     | Fridge + MWBC (Bedroom Lights)         |
| 18    | Tandem     | Garage Plugs & Lights                  |
| 20    | Tandem     | Washer                                 |`);
  };

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Field Notes Processor
          </h2>
          <p className="text-sm text-base-content/70">
            Parse unstructured field notes into validated electrical entities with real-time constraint checking
          </p>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text font-semibold">Electrician Field Notes</span>
              <button
                type="button"
                onClick={handleLoadExample}
                className="btn btn-ghost btn-xs"
              >
                Load Example
              </button>
            </label>
            <textarea
              className="textarea textarea-bordered h-80 font-mono text-sm"
              placeholder="Paste field notes here...

Example:
PANEL SPECIFICATIONS
- Main Panel: 200A service
- Panel Type: Square D QO

CIRCUIT MAPPING
| 1  | 20A | Lighting - Living Room |
| 3  | 15A | Outlets - Kitchen      |
..."
              value={fieldNotes}
              onChange={(e) => setFieldNotes(e.target.value)}
              disabled={processing}
            />
          </div>

          <div className="card-actions justify-end mt-4">
            <button
              className="btn btn-primary"
              onClick={handleProcess}
              disabled={processing || !fieldNotes.trim()}
            >
              {processing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Field Notes'
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="alert alert-success">
            <CheckCircle className="w-5 h-5" />
            <span>
              Field notes processed successfully! Confidence: {result.processing_metadata?.confidence_score?.toFixed(1)}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat bg-base-100 shadow">
              <div className="stat-title">Entities Created</div>
              <div className="stat-value text-primary">{result.processing_metadata?.entities_created || 0}</div>
              <div className="stat-desc">Panels, circuits, loads</div>
            </div>

            <div className="stat bg-base-100 shadow">
              <div className="stat-title">Constraints Checked</div>
              <div className="stat-value text-secondary">{result.processing_metadata?.constraints_checked || 0}</div>
              <div className="stat-desc">Validation rules applied</div>
            </div>

            <div className="stat bg-base-100 shadow">
              <div className="stat-title">Validation Status</div>
              <div className={`stat-value ${
                result.validation_results?.overall_status === 'all_constraints_passed' ? 'text-success' :
                result.validation_results?.overall_status === 'warnings_found' ? 'text-warning' :
                'text-error'
              }`}>
                {result.validation_results?.overall_status === 'all_constraints_passed' ? 'PASS' :
                 result.validation_results?.overall_status === 'warnings_found' ? 'WARN' :
                 'FAIL'}
              </div>
              <div className="stat-desc">Overall system status</div>
            </div>
          </div>

          {result.validation_results?.constraints && result.validation_results.constraints.length > 0 && (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="card-title">Constraint Validation Results</h3>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Constraint</th>
                        <th>Current</th>
                        <th>Limit</th>
                        <th>Margin</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.validation_results.constraints.map((constraint: any, idx: number) => (
                        <tr key={idx} className={
                          constraint.severity === 'critical' ? 'bg-error/10' :
                          constraint.severity === 'warning' ? 'bg-warning/10' :
                          ''
                        }>
                          <td className="font-medium">{constraint.constraint_name}</td>
                          <td>{constraint.current_value?.toFixed(2)}</td>
                          <td>{constraint.limit_value?.toFixed(2)}</td>
                          <td>{constraint.margin_percent?.toFixed(1)}%</td>
                          <td>
                            <div className={`badge ${
                              constraint.passes_check ? 'badge-success' : 'badge-error'
                            }`}>
                              {constraint.passes_check ? 'PASS' : 'FAIL'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {result.parsed_entities && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.parsed_entities.panels && result.parsed_entities.panels.length > 0 && (
                <div className="card bg-base-100 shadow">
                  <div className="card-body">
                    <h3 className="card-title text-sm">Panels Detected</h3>
                    <ul className="space-y-2">
                      {result.parsed_entities.panels.map((panel: any, idx: number) => (
                        <li key={idx} className="text-sm">
                          <span className="font-semibold">{panel.type}:</span> {panel.rating}A {panel.manufacturer}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {result.parsed_entities.circuits && result.parsed_entities.circuits.length > 0 && (
                <div className="card bg-base-100 shadow">
                  <div className="card-body">
                    <h3 className="card-title text-sm">Circuits Detected</h3>
                    <ul className="space-y-2 max-h-60 overflow-y-auto">
                      {result.parsed_entities.circuits.map((circuit: any, idx: number) => (
                        <li key={idx} className="text-sm">
                          <span className="font-semibold">#{circuit.circuit_number}:</span> {circuit.name} ({circuit.breaker_size}A)
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

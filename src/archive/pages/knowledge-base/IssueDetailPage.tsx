import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Wrench } from 'lucide-react';
import { supabase } from '../../services/supabase';

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issues')
        .select(`
          *,
          category:issue_categories(name, color, icon),
          root_causes(*),
          solutions(
            *,
            solution_type:solution_types(name, badge_color)
          )
        `)
        .eq('id', id || '')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="text-center py-12">
        <p className="text-base-content/60">Issue not found</p>
        <Link to="/knowledge-base" className="btn btn-sm btn-primary mt-4">
          Back to Knowledge Base
        </Link>
      </div>
    );
  }

  const issueData = issue as any;

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'text-info',
      medium: 'text-warning',
      high: 'text-error',
      critical: 'text-error font-bold',
    };
    return colors[severity as keyof typeof colors] || 'text-base-content';
  };

  const categoryData = issueData.category;
  const rootCausesData = issueData.root_causes;
  const solutionsData = issueData.solutions;

  return (
    <div className="space-y-4">
      <Link to="/knowledge-base" className="btn btn-sm btn-ghost gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Knowledge Base
      </Link>

      <div className="card bg-base-100 shadow-lg">
        <div className="card-body p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {categoryData && <span className="text-3xl">{categoryData.icon}</span>}
                <div>
                  <h1 className="text-2xl font-bold">{issueData.title}</h1>
                  {categoryData && (
                    <span className="text-sm text-base-content/60">{categoryData.name}</span>
                  )}
                </div>
              </div>
              <p className="text-base-content/80 mt-2">{issueData.description}</p>
            </div>

            <div className="stats stats-vertical shadow">
              <div className="stat p-3">
                <div className="stat-title text-xs">Severity</div>
                <div className={`stat-value text-lg ${getSeverityColor(issueData.severity)}`}>
                  {issueData.severity}
                </div>
              </div>
              <div className="stat p-3">
                <div className="stat-title text-xs">Difficulty</div>
                <div className="stat-value text-lg">{issueData.difficulty}</div>
              </div>
              <div className="stat p-3">
                <div className="stat-title text-xs">Safety</div>
                <div className="stat-value text-lg">{issueData.safety_rating}/5</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {issueData.symptoms && issueData.symptoms.length > 0 && (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-4">
            <h2 className="card-title text-lg">
              <AlertTriangle className="w-5 h-5" />
              Symptoms
            </h2>
            <ul className="space-y-2">
              {issueData.symptoms.map((symptom: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-warning mt-1">•</span>
                  <span>{symptom}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {rootCausesData && rootCausesData.length > 0 && (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-4">
            <h2 className="card-title text-lg">Root Causes</h2>
            <div className="space-y-4">
              {rootCausesData.map((cause: any) => (
                <div key={cause.id} className="border-l-4 border-primary pl-4">
                  <p className="font-semibold">{cause.description}</p>
                  {cause.technical_explanation && (
                    <p className="text-sm text-base-content/70 mt-2">
                      {cause.technical_explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {solutionsData && solutionsData.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Solutions</h2>
          {solutionsData.map((solution: any) => (
            <div key={solution.id} className="card bg-base-100 shadow-md">
              <div className="card-body p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{solution.title}</h3>
                      {solution.solution_type && (
                        <span className={`badge badge-${solution.solution_type.badge_color} badge-sm`}>
                          {solution.solution_type.name}
                        </span>
                      )}
                    </div>
                    <p className="text-base-content/80">{solution.description}</p>
                  </div>

                  <div className="stats stats-vertical shadow">
                    {solution.cost_estimate_min && solution.cost_estimate_max && (
                      <div className="stat p-2">
                        <div className="stat-title text-xs">Cost</div>
                        <div className="stat-value text-sm">
                          ${solution.cost_estimate_min}-{solution.cost_estimate_max}
                        </div>
                      </div>
                    )}
                    {solution.time_estimate_hours && (
                      <div className="stat p-2">
                        <div className="stat-title text-xs">Time</div>
                        <div className="stat-value text-sm">{solution.time_estimate_hours}h</div>
                      </div>
                    )}
                    <div className="stat p-2">
                      <div className="stat-title text-xs">Difficulty</div>
                      <div className="stat-value text-sm">{solution.difficulty}</div>
                    </div>
                  </div>
                </div>

                {solution.steps && solution.steps.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Steps:</h4>
                    <ol className="space-y-2">
                      {solution.steps.map((step: string, idx: number) => (
                        <li key={idx} className="flex gap-3">
                          <span className="badge badge-primary badge-sm">{idx + 1}</span>
                          <span className="flex-1">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {solution.safety_warnings && solution.safety_warnings.length > 0 && (
                  <div className="alert alert-warning mt-4 p-3">
                    <AlertTriangle className="w-4 h-4" />
                    <div>
                      <h4 className="font-semibold text-sm">Safety Warnings:</h4>
                      <ul className="text-xs space-y-1 mt-1">
                        {solution.safety_warnings.map((warning: string, idx: number) => (
                          <li key={idx}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {solution.required_tools && solution.required_tools.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        Required Tools:
                      </h4>
                      <ul className="text-sm space-y-1">
                        {solution.required_tools.map((tool: string, idx: number) => (
                          <li key={idx} className="text-base-content/70">• {tool}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {solution.required_parts && solution.required_parts.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Required Parts:</h4>
                      <ul className="text-sm space-y-1">
                        {solution.required_parts.map((part: string, idx: number) => (
                          <li key={idx} className="text-base-content/70">• {part}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

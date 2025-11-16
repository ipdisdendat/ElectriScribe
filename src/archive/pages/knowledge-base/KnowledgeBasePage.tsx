import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { supabase } from '../../services/supabase';

export default function KnowledgeBasePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issue_categories')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: issues, isLoading } = useQuery({
    queryKey: ['issues', selectedCategory, selectedSeverity, selectedDifficulty, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('issues')
        .select(`
          *,
          category:issue_categories(name, color, icon),
          root_causes(description),
          solutions(id, title, solution_type_id)
        `)
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }
      if (selectedSeverity !== 'all') {
        query = query.eq('severity', selectedSeverity);
      }
      if (selectedDifficulty !== 'all') {
        query = query.eq('difficulty', selectedDifficulty);
      }
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getSeverityBadge = (severity: string) => {
    const badges = {
      low: 'badge-info',
      medium: 'badge-warning',
      high: 'badge-error',
      critical: 'badge-error',
    };
    return badges[severity as keyof typeof badges] || 'badge-ghost';
  };

  const getDifficultyBadge = (difficulty: string) => {
    const badges = {
      easy: 'badge-success',
      medium: 'badge-warning',
      hard: 'badge-error',
      expert: 'badge-error',
    };
    return badges[difficulty as keyof typeof badges] || 'badge-ghost';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Electrical Troubleshooting Knowledge Base</h1>
          <p className="text-sm text-base-content/70 mt-1">
            Comprehensive guide to electrical system diagnostics and solutions
          </p>
        </div>
      </div>

      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="form-control flex-1">
              <div className="input-group">
                <span className="bg-base-200">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search issues..."
                  className="input input-bordered input-sm flex-1"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <select
                className="select select-bordered select-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select
                className="select select-bordered select-sm"
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
              >
                <option value="all">All Severity</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <select
                className="select select-bordered select-sm"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                <option value="all">All Difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {issues?.map((issue: any) => (
            <Link
              key={issue.id}
              to={`/knowledge-base/${issue.id}`}
              className="card bg-base-100 shadow-md hover:shadow-xl transition-shadow"
            >
              <div className="card-body p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="card-title text-base">{issue.title}</h3>
                  {issue.category && (
                    <span className="text-2xl">{issue.category.icon}</span>
                  )}
                </div>

                <p className="text-sm text-base-content/70 line-clamp-2">
                  {issue.description}
                </p>

                {issue.symptoms && issue.symptoms.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold mb-1">Symptoms:</p>
                    <ul className="text-xs space-y-1">
                      {issue.symptoms.slice(0, 2).map((symptom: string, idx: number) => (
                        <li key={idx} className="text-base-content/60">
                          • {symptom}
                        </li>
                      ))}
                      {issue.symptoms.length > 2 && (
                        <li className="text-base-content/60">
                          + {issue.symptoms.length - 2} more...
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="card-actions justify-between items-center mt-4">
                  <div className="flex gap-1">
                    <span className={`badge badge-sm ${getSeverityBadge(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    <span className={`badge badge-sm ${getDifficultyBadge(issue.difficulty)}`}>
                      {issue.difficulty}
                    </span>
                  </div>
                  <div className="text-xs text-base-content/60">
                    {Array.isArray(issue.solutions) ? issue.solutions.length : 0} solutions
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && issues && issues.length === 0 && (
        <div className="text-center py-12">
          <p className="text-base-content/60">No issues found matching your criteria</p>
        </div>
      )}
    </div>
  );
}

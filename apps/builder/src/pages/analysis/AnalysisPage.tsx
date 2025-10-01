import { BarChart3 } from 'lucide-react';

export default function AnalysisPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-8 h-8" />
        <div>
          <h1 className="text-3xl font-bold">Historical Analysis</h1>
          <p className="text-sm text-base-content/70">
            Time-series data visualization and energy reports
          </p>
        </div>
      </div>

      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>Historical analysis with Chart.js visualizations coming soon</span>
      </div>

      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title">Analysis Features</h2>
          <ul className="space-y-2">
            <li>• Time-series data visualization (1hr, 24hr, 7d, 30d, 1yr)</li>
            <li>• Load profile charts with peak detection</li>
            <li>• Energy usage reports with cost calculation</li>
            <li>• Fault event logging and analysis</li>
            <li>• Predictive maintenance indicators</li>
            <li>• Export to PDF, CSV, Excel</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

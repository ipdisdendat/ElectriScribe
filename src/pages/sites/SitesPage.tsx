import { MapPin } from 'lucide-react';

export default function SitesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <MapPin className="w-8 h-8" />
        <div>
          <h1 className="text-3xl font-bold">Site Management</h1>
          <p className="text-sm text-base-content/70">
            Manage customer sites, panels, and circuits
          </p>
        </div>
      </div>

      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>Site management with panel and circuit configuration coming soon</span>
      </div>

      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title">Site Management Features</h2>
          <ul className="space-y-2">
            <li>• Create and manage customer sites</li>
            <li>• Configure main and sub-panels</li>
            <li>• Define circuits with specifications</li>
            <li>• Track service entrance details</li>
            <li>• Link to monitoring and service logs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

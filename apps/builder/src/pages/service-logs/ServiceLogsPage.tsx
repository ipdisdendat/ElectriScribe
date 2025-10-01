import { FileText } from 'lucide-react';

export default function ServiceLogsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FileText className="w-8 h-8" />
        <div>
          <h1 className="text-3xl font-bold">Service Documentation</h1>
          <p className="text-sm text-base-content/70">
            Maintenance logs, photos, and documentation
          </p>
        </div>
      </div>

      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>Service log management with photo uploads coming soon</span>
      </div>

      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title">Documentation Features</h2>
          <ul className="space-y-2">
            <li>• Service log CRUD operations</li>
            <li>• Photo and document attachments (10MB max)</li>
            <li>• Maintenance schedule with reminders</li>
            <li>• Technician notes with timestamps</li>
            <li>• Parts inventory tracking</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

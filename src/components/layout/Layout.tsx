import { Outlet, Link, useLocation } from 'react-router-dom';
import { Book, Activity, BarChart3, FileText, Stethoscope, MapPin, Cpu, Pencil, Zap } from 'lucide-react';

interface LayoutProps {
  onOpenTaskOverlay: () => void;
}

export default function Layout({ onOpenTaskOverlay }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/knowledge-base', label: 'Knowledge Base', icon: Book },
    { path: '/electriscribe', label: 'ElectriScribe', icon: Zap },
    { path: '/designer', label: 'Designer', icon: Pencil },
    { path: '/monitoring', label: 'Monitoring', icon: Activity },
    { path: '/analysis', label: 'Analysis', icon: BarChart3 },
    { path: '/service-logs', label: 'Service Logs', icon: FileText },
    { path: '/diagnostic', label: 'Diagnostic', icon: Stethoscope },
    { path: '/sites', label: 'Sites', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-base-200">
      <div className="navbar bg-base-100 shadow-lg">
        <div className="flex-1">
          <Link to="/" className="btn btn-ghost text-xl">
            ⚡ ElectriScribe
          </Link>
        </div>
        <div className="flex-none">
          <ul className="menu menu-horizontal px-1 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={isActive ? 'active' : ''}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                onClick={onOpenTaskOverlay}
                className="btn btn-ghost btn-sm"
                title="Task Management System"
              >
                <Cpu className="w-4 h-4" />
                <span className="hidden sm:inline">Tasks</span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <Outlet />
      </main>
    </div>
  );
}

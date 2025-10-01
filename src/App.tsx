import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import KnowledgeBasePage from './pages/knowledge-base/KnowledgeBasePage';
import IssueDetailPage from './pages/knowledge-base/IssueDetailPage';
import MonitoringPage from './pages/monitoring/MonitoringPage';
import AnalysisPage from './pages/analysis/AnalysisPage';
import ServiceLogsPage from './pages/service-logs/ServiceLogsPage';
import DiagnosticPage from './pages/diagnostic/DiagnosticPage';
import SitesPage from './pages/sites/SitesPage';
import ProfessionalElectricalDesigner from './pages/designer/ProfessionalElectricalDesigner';
import FlowchartDesigner from './pages/designer/FlowchartDesigner';
import SimpleElectricalBuilder from './pages/designer/SimpleElectricalBuilder';
import TaskOverlay from './components/task-overlay/TaskOverlay';

function App() {
  const [isTaskOverlayOpen, setIsTaskOverlayOpen] = useState(false);

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout onOpenTaskOverlay={() => setIsTaskOverlayOpen(true)} />}>
          <Route index element={<KnowledgeBasePage />} />
          <Route path="knowledge-base" element={<KnowledgeBasePage />} />
          <Route path="knowledge-base/:id" element={<IssueDetailPage />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="analysis" element={<AnalysisPage />} />
          <Route path="service-logs" element={<ServiceLogsPage />} />
          <Route path="diagnostic" element={<DiagnosticPage />} />
          <Route path="sites" element={<SitesPage />} />
          <Route path="builder" element={<SimpleElectricalBuilder />} />
          <Route path="designer" element={<ProfessionalElectricalDesigner />} />
          <Route path="electriscribe" element={<FlowchartDesigner />} />
        </Route>
      </Routes>

      <TaskOverlay
        isOpen={isTaskOverlayOpen}
        onClose={() => setIsTaskOverlayOpen(false)}
      />
    </>
  );
}

export default App;

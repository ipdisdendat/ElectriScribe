import { Routes, Route } from 'react-router-dom';
import PanelListPage from './pages/panels/PanelListPage';
import PanelDocumentationPage from './pages/panels/PanelDocumentationPage';
import PanelDetailPage from './pages/panels/PanelDetailPage';
// ElectriScribeDesigner preserved for Phase 4 reference
import ElectriScribeDesigner from './pages/designer/ElectriScribeDesigner';

/**
 * ElectriScribe MVP Routing (Phase 3b)
 *
 * 3 focused routes for core workflow:
 * 1. / - PanelListPage (view all documented panels)
 * 2. /panel/new - PanelDocumentationPage (camera → OCR → edit → save)
 * 3. /panel/:id - PanelDetailPage (view/edit existing panel)
 *
 * Old ElectriScribeDesigner accessible at /designer for Phase 4 development reference
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<PanelListPage />} />
      <Route path="/panel/new" element={<PanelDocumentationPage />} />
      <Route path="/panel/:id" element={<PanelDetailPage />} />
      {/* Development reference - old designer with field notes parser */}
      <Route path="/designer" element={<ElectriScribeDesigner />} />
    </Routes>
  );
}

export default App;

import { Routes, Route } from 'react-router-dom';
import ElectriScribeDesigner from './pages/designer/ElectriScribeDesigner';

function App() {
  return (
    <Routes>
      <Route path="/" element={<ElectriScribeDesigner />} />
    </Routes>
  );
}

export default App;

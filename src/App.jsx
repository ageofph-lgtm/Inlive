import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import AoVivo from './pages/AoVivo';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AoVivo />} />
        <Route path="/AoVivo" element={<AoVivo />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App

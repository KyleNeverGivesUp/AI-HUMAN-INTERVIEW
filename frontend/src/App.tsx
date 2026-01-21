import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { JobBoard } from './pages/JobBoard';
import { JobDetail } from './pages/JobDetail';
import { DigitalHuman } from './pages/DigitalHuman';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<JobBoard />} />
        <Route path="/job/:id" element={<JobDetail />} />
        <Route path="/digital-human" element={<DigitalHuman />} />
      </Routes>
    </Router>
  );
}

export default App;

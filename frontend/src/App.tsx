import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { JobBoard } from './pages/JobBoard';
import { JobDetail } from './pages/JobDetail';
import { DigitalHuman } from './pages/DigitalHuman';
import { ComingSoon } from './pages/ComingSoon';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<JobBoard />} />
        <Route path="/job/:id" element={<JobDetail />} />
        <Route path="/digital-human" element={<DigitalHuman />} />
        <Route path="/resume" element={<ComingSoon title="Resume" />} />
        <Route path="/profile" element={<ComingSoon title="Profile" />} />
        <Route path="/settings" element={<ComingSoon title="Settings" />} />
        <Route path="/subscription" element={<ComingSoon title="Subscription" />} />
        <Route path="/credits" element={<ComingSoon title="Extra Credits" />} />
        <Route path="*" element={<JobBoard />} />
      </Routes>
    </Router>
  );
}

export default App;

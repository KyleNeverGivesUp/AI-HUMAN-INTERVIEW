import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { JobBoard } from './pages/JobBoard';
import { JobDetail } from './pages/JobDetail';
import { DigitalHuman } from './pages/DigitalHuman';
import { ResumeManager } from './pages/ResumeManager';
import { InterviewEvaluate } from './pages/InterviewEvaluate';
import { InterviewSessionDetail } from './pages/InterviewSessionDetail';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<JobBoard />} />
        <Route path="/job/:id" element={<JobDetail />} />
        <Route path="/digital-human" element={<DigitalHuman />} />
        <Route path="/resume" element={<ResumeManager />} />
        <Route path="/interview-evaluate" element={<InterviewEvaluate />} />
        <Route path="/interview-evaluate/:sessionId" element={<InterviewSessionDetail />} />
      </Routes>
    </Router>
  );
}

export default App;

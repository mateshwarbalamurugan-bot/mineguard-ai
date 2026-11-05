import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AboutPage } from './pages/AboutPage';
import { CommandCentrePage } from './pages/CommandCentrePage';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePages';
import { SourceRegisterPage } from './pages/SourceRegisterPage';
import { useMineStore } from './store/useMineStore';

function RoutedApp() {
  const darkMode = useMineStore((state) => state.darkMode);
  const reducedMotion = useMineStore((state) => state.reducedMotion);
  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full';
  }, [reducedMotion]);
  return <div className={darkMode ? 'theme-dark' : ''}><Routes>
    {/* Product landing page — no AppShell */}
    <Route path="/" element={<LandingPage />} />

    {/* Operations app — wrapped in AppShell */}
    <Route element={<AppShell />}>
      <Route path="/command" element={<CommandCentrePage />} />
      <Route path="/monitoring" element={<WorkspacePage />} />
      <Route path="/map" element={<WorkspacePage />} />
      <Route path="/inspections" element={<WorkspacePage />} />
      <Route path="/workforce" element={<WorkspacePage />} />
      <Route path="/reports" element={<WorkspacePage />} />
      <Route path="/settings" element={<WorkspacePage />} />
      <Route path="/sources" element={<SourceRegisterPage />} />
      <Route path="/about" element={<AboutPage />} />
      {/* Redirect removed tools to command centre */}
      <Route path="/scans" element={<Navigate to="/command" replace />} />
      <Route path="/confidence" element={<Navigate to="/command" replace />} />
      <Route path="/copilot" element={<Navigate to="/command" replace />} />
      <Route path="/vendors" element={<Navigate to="/command" replace />} />
      <Route path="/advisor" element={<Navigate to="/command" replace />} />
      <Route path="/radar" element={<Navigate to="/command" replace />} />
      <Route path="*" element={<Navigate to="/command" replace />} />
    </Route>
    <Route path="/index.html" element={<Navigate to="/" replace />} />
  </Routes></div>;
}

export default function App() {
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
  }, []);
  return <BrowserRouter><RoutedApp /></BrowserRouter>;
}

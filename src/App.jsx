import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import WeeklyOverview from './pages/WeeklyOverview';
import DailyDetail from './pages/DailyDetail';
import Coach from './pages/Coach';
import Courses from './pages/Courses';
import Rules from './pages/Rules';
import Settings from './pages/Settings';
import Tracker from './pages/Tracker';
import Timer from './pages/Timer';
import Login from './pages/Login';
import { useSettings } from './hooks/useSettings';

export default function App() {
  const darkMode = useSettings((s) => s.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/week" element={<WeeklyOverview />} />
          <Route path="/day/:dayName" element={<DailyDetail />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/timer" element={<Timer />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

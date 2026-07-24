import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import Layout from './components/Layout';
import AdminsPage from './pages/AdminsPage';
import NumbersPage from './pages/NumbersPage';
import VoiceoverPage from './pages/VoiceoverPage';
import TelnyxPage from './pages/TelnyxPage';
import { isAuthenticated } from './api';

/** Всё, что раньше было в App.tsx — теперь смонтировано под /admin_panel_2026/* */
export default function AdminApp() {
  const [authed, setAuthed] = useState(isAuthenticated());

  if (!authed) {
    return <LoginForm onSuccess={() => setAuthed(true)} />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="admins" replace />} />
        <Route path="admins" element={<AdminsPage />} />
        <Route path="numbers" element={<NumbersPage />} />
        <Route path="voiceover" element={<VoiceoverPage />} />
        <Route path="telnyx" element={<TelnyxPage />} />
        <Route path="*" element={<Navigate to="admins" replace />} />
      </Route>
    </Routes>
  );
}

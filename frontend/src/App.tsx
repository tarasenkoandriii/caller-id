import { Route, Routes } from 'react-router-dom';
import AdminApp from './AdminApp';
import ClientApp from './client/ClientApp';

/**
 * Верхнеуровневая развилка: /admin_panel_2026/* — админка (свой логин,
 * свой JWT), / — публичная клиентская страница обзвона (свой логин через
 * Google, свой JWT с role: 'client'). Токены и данные полностью изолированы
 * друг от друга — см. src/client/clientApi.ts (ключ localStorage
 * 'client_token') и src/api.ts (ключ 'token').
 */
export default function App() {
  return (
    <Routes>
      <Route path="/admin_panel_2026/*" element={<AdminApp />} />
      <Route path="/*" element={<ClientApp />} />
    </Routes>
  );
}

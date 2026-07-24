import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

export const ADMIN_ROUTE_PREFIX = '/admin_panel_2026';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Без фиксированного basename — App сама разводит /admin_panel_2026/*
        (админка) и / (клиентская страница обзвона) по вложенным Routes. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

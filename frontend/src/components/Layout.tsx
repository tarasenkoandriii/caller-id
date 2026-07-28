import { NavLink, Outlet } from 'react-router-dom';
import { logout } from '../api';

const TABS = [
  { to: 'telnyx', label: 'Telnyx' },
  { to: 'numbers', label: 'Номера' },
  { to: 'voiceover', label: 'Озвучка' },
  { to: 'admins', label: 'Админы' },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-white">Caller ID</h1>
          <button
            onClick={logout}
            className="text-xs text-neutral-500 hover:text-white transition-colors"
          >
            Выйти
          </button>
        </div>

        <nav className="flex gap-1 mb-8 border-b border-line">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  isActive
                    ? 'border-accent text-white'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 pb-12">
        <Outlet />
      </div>
    </div>
  );
}

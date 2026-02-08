import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Sword, Users, Server, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/items', icon: Sword, label: 'Item Browser' },
  { to: '/players', icon: Users, label: 'Players' },
  { to: '/server', icon: Server, label: 'Server Status' },
  { to: '/wowhead', icon: Search, label: 'WoWHead Search' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        'h-screen bg-wow-bg-dark border-r border-wow-border flex flex-col transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-wow-border flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-wow-gold flex items-center justify-center text-wow-bg-darkest font-bold text-sm shrink-0">
          TC
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-wow-gold font-bold text-sm leading-tight">TrinityCore</h1>
            <p className="text-gray-500 text-xs leading-tight">Companion App</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                isActive
                  ? 'bg-wow-bg-light border-l-2 border-wow-gold text-wow-gold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-wow-bg-medium'
              )
            }
          >
            <item.icon size={20} className="shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-4 border-t border-wow-border text-gray-500 hover:text-wow-gold transition-colors flex items-center justify-center"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}

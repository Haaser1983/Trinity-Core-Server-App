import { useLocation } from 'react-router-dom';
import { useServerStatus } from '@/hooks/useServerStatus';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/items': 'Item Browser',
  '/players': 'Player Management',
  '/server': 'Server Status',
  '/wowhead': 'WoWHead Search',
};

export default function Header() {
  const location = useLocation();
  const { data: status } = useServerStatus();

  const title = pageTitles[location.pathname] || 'Dashboard';

  return (
    <header className="h-14 bg-wow-bg-dark border-b border-wow-border flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-white">{title}</h2>

      <div className="flex items-center gap-4">
        {/* Online players badge */}
        {status && (
          <span className="text-sm text-gray-400">
            <span className="text-white font-mono">{status.playersOnline}</span> online
          </span>
        )}

        {/* Server status indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              status?.online ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-400">
            {status?.online ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
}

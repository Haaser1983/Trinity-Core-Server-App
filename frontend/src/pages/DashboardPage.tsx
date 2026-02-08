import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Server, Users, Sword, Database, Search, ArrowRight } from 'lucide-react';
import { useServerStatus } from '@/hooks/useServerStatus';
import { useOnlinePlayers } from '@/hooks/useOnlinePlayers';
import { getServerMetrics } from '@/api/server';
import StatCard from '@/components/ui/StatCard';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { getClassName, getClassColor } from '@/utils/classNames';
import { getRaceName, getFaction } from '@/utils/raceNames';
import { formatUptime, formatNumber } from '@/utils/formatters';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: status, isLoading: statusLoading, error: statusError } = useServerStatus();
  const { data: onlineData } = useOnlinePlayers();
  const { data: metrics } = useQuery({
    queryKey: ['serverMetrics'],
    queryFn: getServerMetrics,
    refetchInterval: 60_000,
  });

  if (statusLoading) return <LoadingSpinner message="Connecting to server..." />;
  if (statusError) return <ErrorDisplay message="Cannot connect to backend server. Is it running on port 3001?" />;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Server}
          label="Server Status"
          value={status?.online ? 'Online' : 'Offline'}
          subtext={status ? `Uptime: ${formatUptime(status.uptime)}` : undefined}
        />
        <StatCard
          icon={Users}
          label="Players Online"
          value={status?.playersOnline ?? 0}
          subtext={onlineData ? `${onlineData.count} connected` : undefined}
        />
        <StatCard
          icon={Sword}
          label="Total Items"
          value={metrics ? formatNumber(metrics.database.items) : '...'}
          subtext="In world database"
        />
        <StatCard
          icon={Database}
          label="Total Characters"
          value={metrics ? formatNumber(metrics.database.characters) : '...'}
          subtext="Registered characters"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Online Players */}
        <div className="lg:col-span-2">
          <Card title="Online Players">
            {!onlineData || onlineData.count === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No players online</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-wow-border">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-wow-gold uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-wow-gold uppercase">Race</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-wow-gold uppercase">Class</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-wow-gold uppercase">Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {onlineData.players.slice(0, 10).map((player) => (
                      <tr
                        key={player.guid}
                        className="border-b border-wow-border/50 hover:bg-wow-bg-dark cursor-pointer transition-colors"
                        onClick={() => navigate('/players')}
                      >
                        <td className={`px-3 py-2 font-medium ${getClassColor(player.class)}`}>
                          {player.name}
                        </td>
                        <td className="px-3 py-2 text-gray-400">
                          <span className={getFaction(player.race) === 'Alliance' ? 'text-faction-alliance' : 'text-faction-horde'}>
                            {getRaceName(player.race)}
                          </span>
                        </td>
                        <td className={`px-3 py-2 ${getClassColor(player.class)}`}>
                          {getClassName(player.class)}
                        </td>
                        <td className="px-3 py-2 text-white font-mono">{player.level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <Card title="Quick Actions">
          <div className="space-y-2">
            {[
              { label: 'Search Items', icon: Sword, to: '/items' },
              { label: 'View Players', icon: Users, to: '/players' },
              { label: 'WoWHead Search', icon: Search, to: '/wowhead' },
              { label: 'Server Metrics', icon: Server, to: '/server' },
            ].map((action) => (
              <button
                key={action.to}
                onClick={() => navigate(action.to)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-wow-border text-gray-300 hover:bg-wow-bg-light hover:text-white hover:border-wow-border-gold transition-colors"
              >
                <div className="flex items-center gap-3">
                  <action.icon size={16} className="text-wow-gold" />
                  <span className="text-sm font-medium">{action.label}</span>
                </div>
                <ArrowRight size={14} className="text-gray-600" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

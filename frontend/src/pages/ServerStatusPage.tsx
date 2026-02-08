import { useQuery } from '@tanstack/react-query';
import { Activity, Database, HardDrive, Cpu } from 'lucide-react';
import { getServerMetrics } from '@/api/server';
import { useServerStatus } from '@/hooks/useServerStatus';
import StatCard from '@/components/ui/StatCard';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { formatUptime, formatBytes, formatNumber } from '@/utils/formatters';

export default function ServerStatusPage() {
  const { data: status, isLoading: statusLoading, error: statusError } = useServerStatus();
  const { data: metrics, isLoading: metricsLoading, error: metricsError, refetch } = useQuery({
    queryKey: ['serverMetrics'],
    queryFn: getServerMetrics,
    refetchInterval: 30_000,
  });

  if (statusLoading || metricsLoading) return <LoadingSpinner message="Loading server data..." />;
  if (statusError || metricsError) {
    return (
      <ErrorDisplay
        message="Cannot connect to backend server"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className="bg-wow-bg-medium border border-wow-border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-4 h-4 rounded-full ${
                status?.online
                  ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]'
                  : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
              }`}
            />
            <div>
              <h3 className="text-xl font-bold text-white">
                Server {status?.online ? 'Online' : 'Offline'}
              </h3>
              <p className="text-gray-500 text-sm">
                Uptime: {status ? formatUptime(status.uptime) : 'N/A'} | Version: {status?.version || 'N/A'}
              </p>
            </div>
          </div>
          <span className="text-xs text-gray-600">
            Auto-refresh every 30s
          </span>
        </div>
      </div>

      {/* Database Statistics */}
      <div>
        <h3 className="text-wow-gold font-semibold text-sm mb-3 uppercase tracking-wider">Database Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={Database}
            label="Items in Database"
            value={metrics ? formatNumber(metrics.database.items) : '0'}
            subtext="world.item_template"
          />
          <StatCard
            icon={Activity}
            label="Total Characters"
            value={metrics ? formatNumber(metrics.database.characters) : '0'}
            subtext="characters.characters"
          />
          <StatCard
            icon={Activity}
            label="Players Online"
            value={metrics?.database.online ?? 0}
            subtext="Currently connected"
          />
        </div>
      </div>

      {/* System Resources */}
      <div>
        <h3 className="text-wow-gold font-semibold text-sm mb-3 uppercase tracking-wider">System Resources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Memory */}
          <Card title="Memory Usage">
            {metrics?.server.memory && (
              <div className="space-y-3">
                {[
                  { label: 'RSS', value: metrics.server.memory.rss, desc: 'Total allocated' },
                  { label: 'Heap Used', value: metrics.server.memory.heapUsed, desc: 'Active memory' },
                  { label: 'Heap Total', value: metrics.server.memory.heapTotal, desc: 'Heap capacity' },
                  { label: 'External', value: metrics.server.memory.external, desc: 'C++ objects' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-300 text-sm">{item.label}</span>
                      <span className="text-gray-600 text-xs ml-2">({item.desc})</span>
                    </div>
                    <span className="text-white font-mono text-sm">{formatBytes(item.value)}</span>
                  </div>
                ))}

                {/* Memory bar */}
                <div className="pt-2 border-t border-wow-border">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Heap Usage</span>
                    <span>
                      {Math.round((metrics.server.memory.heapUsed / metrics.server.memory.heapTotal) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-wow-bg-dark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-wow-gold rounded-full transition-all"
                      style={{
                        width: `${(metrics.server.memory.heapUsed / metrics.server.memory.heapTotal) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* CPU & Info */}
          <Card title="Process Info">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu size={14} className="text-wow-gold" />
                  <span className="text-gray-300 text-sm">CPU User</span>
                </div>
                <span className="text-white font-mono text-sm">
                  {metrics ? `${(metrics.server.cpu.user / 1000).toFixed(1)}ms` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu size={14} className="text-wow-gold" />
                  <span className="text-gray-300 text-sm">CPU System</span>
                </div>
                <span className="text-white font-mono text-sm">
                  {metrics ? `${(metrics.server.cpu.system / 1000).toFixed(1)}ms` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive size={14} className="text-wow-gold" />
                  <span className="text-gray-300 text-sm">Uptime</span>
                </div>
                <span className="text-white font-mono text-sm">
                  {status ? formatUptime(status.uptime) : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">API Version</span>
                <span className="text-white font-mono text-sm">{status?.version || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Last Updated</span>
                <span className="text-gray-500 text-xs">
                  {metrics ? new Date(metrics.timestamp).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

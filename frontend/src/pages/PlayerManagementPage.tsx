import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { getPlayers, getPlayerByGuid } from '@/api/players';
import { useOnlinePlayers } from '@/hooks/useOnlinePlayers';
import DataTable, { type Column } from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import Card from '@/components/ui/Card';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { getClassName, getClassColor } from '@/utils/classNames';
import { getRaceName, getFaction } from '@/utils/raceNames';
import { formatPlaytime, formatGold } from '@/utils/formatters';
import type { Player, OnlinePlayer, PlayerDetail } from '@/types/players';

type Tab = 'all' | 'online';

export default function PlayerManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [page, setPage] = useState(1);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetail | null>(null);

  // All players query
  const { data: playersData, isLoading: playersLoading, error: playersError, refetch: refetchPlayers } = useQuery({
    queryKey: ['players', page],
    queryFn: () => getPlayers(page, 50),
    enabled: activeTab === 'all',
  });

  // Online players query
  const { data: onlineData, isLoading: onlineLoading, error: onlineError, refetch: refetchOnline, dataUpdatedAt } = useOnlinePlayers();

  const handlePlayerClick = async (player: Player | OnlinePlayer) => {
    try {
      const detail = await getPlayerByGuid(player.guid);
      setSelectedPlayer(detail);
    } catch {
      setSelectedPlayer(null);
    }
  };

  const FactionDot = ({ raceId }: { raceId: number }) => {
    const faction = getFaction(raceId);
    return (
      <span
        className={clsx(
          'inline-block w-2 h-2 rounded-full mr-2',
          faction === 'Alliance' ? 'bg-faction-alliance' : 'bg-faction-horde'
        )}
      />
    );
  };

  const allColumns: Column<Player>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <span className={`font-medium ${getClassColor(row.class)}`}>{row.name}</span>
      ),
    },
    {
      key: 'race',
      header: 'Race',
      render: (row) => (
        <span className="text-gray-400">
          <FactionDot raceId={row.race} />
          {getRaceName(row.race)}
        </span>
      ),
    },
    {
      key: 'class',
      header: 'Class',
      render: (row) => <span className={getClassColor(row.class)}>{getClassName(row.class)}</span>,
    },
    { key: 'level', header: 'Level', className: 'font-mono text-white w-16' },
    {
      key: 'totaltime',
      header: 'Playtime',
      className: 'w-24',
      render: (row) => <span className="text-gray-400">{formatPlaytime(row.totaltime)}</span>,
    },
    {
      key: 'online',
      header: 'Status',
      className: 'w-20',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${row.online ? 'bg-green-500' : 'bg-gray-600'}`} />
          <span className="text-gray-400 text-xs">{row.online ? 'Online' : 'Offline'}</span>
        </div>
      ),
    },
  ];

  const onlineColumns: Column<OnlinePlayer>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <span className={`font-medium ${getClassColor(row.class)}`}>{row.name}</span>
      ),
    },
    {
      key: 'race',
      header: 'Race',
      render: (row) => (
        <span className="text-gray-400">
          <FactionDot raceId={row.race} />
          {getRaceName(row.race)}
        </span>
      ),
    },
    {
      key: 'class',
      header: 'Class',
      render: (row) => <span className={getClassColor(row.class)}>{getClassName(row.class)}</span>,
    },
    { key: 'level', header: 'Level', className: 'font-mono text-white w-16' },
    {
      key: 'zone',
      header: 'Zone',
      className: 'w-24',
      render: (row) => <span className="text-gray-400 font-mono">{row.zone}</span>,
    },
  ];

  const timeSinceRefresh = dataUpdatedAt ? Math.floor((Date.now() - dataUpdatedAt) / 1000) : null;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-wow-bg-dark rounded-lg p-1">
          {([
            { key: 'all', label: 'All Players' },
            { key: 'online', label: `Online Now${onlineData ? ` (${onlineData.count})` : ''}` },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedPlayer(null);
              }}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-wow-bg-light text-wow-gold'
                  : 'text-gray-400 hover:text-gray-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'online' && timeSinceRefresh !== null && (
          <span className="text-xs text-gray-600">
            Updated {timeSinceRefresh}s ago
          </span>
        )}
      </div>

      {/* All Players Tab */}
      {activeTab === 'all' && (
        <Card>
          {playersError ? (
            <ErrorDisplay message={(playersError as Error).message} onRetry={() => refetchPlayers()} />
          ) : (
            <>
              <DataTable
                columns={allColumns}
                data={playersData?.players || []}
                onRowClick={handlePlayerClick}
                loading={playersLoading}
                rowKey={(row) => row.guid}
                emptyMessage="No characters found"
              />
              {playersData?.pagination && (
                <Pagination
                  page={playersData.pagination.page}
                  pages={playersData.pagination.pages}
                  total={playersData.pagination.total}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </Card>
      )}

      {/* Online Tab */}
      {activeTab === 'online' && (
        <Card>
          {onlineError ? (
            <ErrorDisplay message={(onlineError as Error).message} onRetry={() => refetchOnline()} />
          ) : (
            <DataTable
              columns={onlineColumns}
              data={onlineData?.players || []}
              onRowClick={handlePlayerClick}
              loading={onlineLoading}
              rowKey={(row) => row.guid}
              emptyMessage="No players online"
            />
          )}
        </Card>
      )}

      {/* Player Detail Panel */}
      {selectedPlayer && (
        <Card title={selectedPlayer.name}>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className={`text-xl font-bold ${getClassColor(selectedPlayer.class)}`}>
                {selectedPlayer.name}
              </span>
              <span className="text-gray-500">
                Level {selectedPlayer.level} {getRaceName(selectedPlayer.race)} {getClassName(selectedPlayer.class)}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-500 text-xs uppercase">Playtime</p>
                <p className="text-white font-mono">{formatPlaytime(selectedPlayer.totaltime)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase">Money</p>
                <p className="text-wow-gold font-mono">{formatGold(selectedPlayer.money)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase">Zone</p>
                <p className="text-white font-mono">{selectedPlayer.zone}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase">Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedPlayer.online ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <span className="text-white">{selectedPlayer.online ? 'Online' : 'Offline'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedPlayer(null)}
              className="px-3 py-1.5 text-xs border border-wow-border text-gray-400 rounded hover:bg-wow-bg-light transition-colors"
            >
              Close
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

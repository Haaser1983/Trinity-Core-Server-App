import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { getItems, getItemById } from '@/api/items';
import { searchWowheadItems, getWowheadItem } from '@/api/wowhead';
import { useDebounce } from '@/hooks/useDebounce';
import DataTable, { type Column } from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import SearchInput from '@/components/ui/SearchInput';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import ItemQualityText from '@/components/ui/ItemQualityText';
import { getQualityConfig } from '@/utils/qualityColors';
import type { DbItem, DbItemDetail } from '@/types/items';
import type { WowheadItem } from '@/types/wowhead';

type Tab = 'database' | 'wowhead';

export default function ItemBrowserPage() {
  const [activeTab, setActiveTab] = useState<Tab>('database');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<DbItemDetail | null>(null);
  const [selectedWowheadItem, setSelectedWowheadItem] = useState<WowheadItem | null>(null);
  const debouncedSearch = useDebounce(search, 500);

  // Database items query
  const { data: itemsData, isLoading: itemsLoading, error: itemsError, refetch: refetchItems } = useQuery({
    queryKey: ['items', page],
    queryFn: () => getItems(page, 50),
    enabled: activeTab === 'database',
  });

  // WoWHead search query
  const { data: wowheadData, isLoading: wowheadLoading, error: wowheadError } = useQuery({
    queryKey: ['wowheadSearch', debouncedSearch],
    queryFn: () => searchWowheadItems(debouncedSearch),
    enabled: activeTab === 'wowhead' && debouncedSearch.length >= 2,
  });

  const handleDbItemClick = async (item: DbItem) => {
    try {
      const detail = await getItemById(item.entry);
      setSelectedItem(detail);
    } catch {
      setSelectedItem(null);
    }
  };

  const handleWowheadItemClick = async (item: WowheadItem) => {
    try {
      const detail = await getWowheadItem(item.id);
      setSelectedWowheadItem(detail);
    } catch {
      setSelectedWowheadItem(null);
    }
  };

  const dbColumns: Column<DbItem>[] = [
    { key: 'entry', header: 'Entry', className: 'w-20 font-mono text-gray-500' },
    {
      key: 'name',
      header: 'Name',
      render: (row) => <ItemQualityText quality={row.Quality}>{row.name}</ItemQualityText>,
    },
    {
      key: 'Quality',
      header: 'Quality',
      className: 'w-28',
      render: (row) => {
        const q = getQualityConfig(row.Quality);
        return <span className={q.className}>{q.label}</span>;
      },
    },
    { key: 'ItemLevel', header: 'iLvl', className: 'w-16 font-mono text-white' },
    { key: 'RequiredLevel', header: 'Req Lvl', className: 'w-20 font-mono text-gray-400' },
  ];

  const wowheadColumns: Column<WowheadItem>[] = [
    { key: 'id', header: 'ID', className: 'w-20 font-mono text-gray-500' },
    {
      key: 'icon',
      header: '',
      className: 'w-10',
      render: (row) =>
        row.icon ? (
          <img
            src={`https://wow.zamimg.com/images/wow/icons/small/${row.icon}.jpg`}
            alt=""
            className="w-6 h-6 rounded"
          />
        ) : null,
    },
    {
      key: 'name',
      header: 'Name',
      render: (row) => <ItemQualityText quality={row.quality}>{row.name}</ItemQualityText>,
    },
    {
      key: 'quality',
      header: 'Quality',
      className: 'w-28',
      render: (row) => {
        const q = getQualityConfig(row.quality);
        return <span className={q.className}>{q.label}</span>;
      },
    },
    { key: 'itemLevel', header: 'iLvl', className: 'w-16 font-mono text-white' },
    { key: 'requiredLevel', header: 'Req Lvl', className: 'w-20 font-mono text-gray-400' },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-wow-bg-dark rounded-lg p-1 w-fit">
        {([
          { key: 'database', label: 'Database Items' },
          { key: 'wowhead', label: 'WoWHead Search' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setSelectedItem(null);
              setSelectedWowheadItem(null);
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

      {/* Database Tab */}
      {activeTab === 'database' && (
        <Card>
          {itemsError ? (
            <ErrorDisplay
              message={(itemsError as Error).message}
              onRetry={() => refetchItems()}
            />
          ) : (
            <>
              <DataTable
                columns={dbColumns}
                data={itemsData?.items || []}
                onRowClick={handleDbItemClick}
                loading={itemsLoading}
                rowKey={(row) => row.entry}
                emptyMessage="No items found in database"
              />
              {itemsData?.pagination && (
                <Pagination
                  page={itemsData.pagination.page}
                  pages={itemsData.pagination.pages}
                  total={itemsData.pagination.total}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </Card>
      )}

      {/* WoWHead Tab */}
      {activeTab === 'wowhead' && (
        <>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search WoWHead items (min 2 characters)..."
            className="max-w-md"
          />
          <Card>
            {wowheadError ? (
              <ErrorDisplay message={(wowheadError as Error).message} />
            ) : debouncedSearch.length < 2 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                Type at least 2 characters to search WoWHead
              </p>
            ) : (
              <DataTable
                columns={wowheadColumns}
                data={wowheadData?.items || []}
                onRowClick={handleWowheadItemClick}
                loading={wowheadLoading}
                rowKey={(row) => row.id}
                emptyMessage="No items found on WoWHead"
              />
            )}
          </Card>
        </>
      )}

      {/* Item Detail Panel */}
      {selectedItem && (
        <Card title={`Item Detail: ${selectedItem.name}`}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(selectedItem).map(([key, value]) => (
              <div key={key} className="text-sm">
                <span className="text-gray-500">{key}: </span>
                <span className="text-white font-mono">{String(value)}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setSelectedItem(null)}
            className="mt-4 px-3 py-1.5 text-xs border border-wow-border text-gray-400 rounded hover:bg-wow-bg-light transition-colors"
          >
            Close
          </button>
        </Card>
      )}

      {selectedWowheadItem && (
        <Card title={`WoWHead Item: ${selectedWowheadItem.name}`}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {selectedWowheadItem.icon && (
              <div className="col-span-full flex items-center gap-3 mb-2">
                <img
                  src={`https://wow.zamimg.com/images/wow/icons/large/${selectedWowheadItem.icon}.jpg`}
                  alt={selectedWowheadItem.name}
                  className="w-12 h-12 rounded border border-wow-border"
                />
                <ItemQualityText quality={selectedWowheadItem.quality}>
                  <span className="text-lg font-semibold">{selectedWowheadItem.name}</span>
                </ItemQualityText>
              </div>
            )}
            {Object.entries(selectedWowheadItem).map(([key, value]) => (
              <div key={key} className="text-sm">
                <span className="text-gray-500">{key}: </span>
                <span className="text-white font-mono">{String(value)}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setSelectedWowheadItem(null)}
            className="mt-4 px-3 py-1.5 text-xs border border-wow-border text-gray-400 rounded hover:bg-wow-bg-light transition-colors"
          >
            Close
          </button>
        </Card>
      )}
    </div>
  );
}

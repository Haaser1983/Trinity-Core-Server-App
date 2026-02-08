import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { searchWowheadItems, getWowheadNPC, getWowheadSpell } from '@/api/wowhead';
import { useDebounce } from '@/hooks/useDebounce';
import SearchInput from '@/components/ui/SearchInput';
import Card from '@/components/ui/Card';
import DataTable, { type Column } from '@/components/ui/DataTable';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import ItemQualityText from '@/components/ui/ItemQualityText';
import { getQualityConfig } from '@/utils/qualityColors';
import type { WowheadItem } from '@/types/wowhead';
import type { WowheadNPC, WowheadSpell } from '@/types/wowhead';

type Tab = 'items' | 'npcs' | 'spells';

export default function WowheadSearchPage() {
  const [activeTab, setActiveTab] = useState<Tab>('items');
  const [itemSearch, setItemSearch] = useState('');
  const [npcId, setNpcId] = useState('');
  const [spellId, setSpellId] = useState('');
  const debouncedItemSearch = useDebounce(itemSearch, 500);

  // Item search
  const { data: itemData, isLoading: itemsLoading, error: itemsError } = useQuery({
    queryKey: ['wowheadItemSearch', debouncedItemSearch],
    queryFn: () => searchWowheadItems(debouncedItemSearch),
    enabled: activeTab === 'items' && debouncedItemSearch.length >= 2,
  });

  // NPC lookup
  const npcIdNum = parseInt(npcId);
  const { data: npcData, isLoading: npcLoading, error: npcError } = useQuery({
    queryKey: ['wowheadNPC', npcIdNum],
    queryFn: () => getWowheadNPC(npcIdNum),
    enabled: activeTab === 'npcs' && !isNaN(npcIdNum) && npcIdNum > 0,
  });

  // Spell lookup
  const spellIdNum = parseInt(spellId);
  const { data: spellData, isLoading: spellLoading, error: spellError } = useQuery({
    queryKey: ['wowheadSpell', spellIdNum],
    queryFn: () => getWowheadSpell(spellIdNum),
    enabled: activeTab === 'spells' && !isNaN(spellIdNum) && spellIdNum > 0,
  });

  const itemColumns: Column<WowheadItem>[] = [
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

  const NpcResult = ({ npc }: { npc: WowheadNPC }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div>
        <p className="text-gray-500 text-xs uppercase">Name</p>
        <p className="text-white font-semibold text-lg">{npc.name}</p>
      </div>
      <div>
        <p className="text-gray-500 text-xs uppercase">ID</p>
        <p className="text-white font-mono">{npc.id}</p>
      </div>
      <div>
        <p className="text-gray-500 text-xs uppercase">Level</p>
        <p className="text-white font-mono">{npc.level}</p>
      </div>
      <div>
        <p className="text-gray-500 text-xs uppercase">Health</p>
        <p className="text-white font-mono">{npc.health.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-gray-500 text-xs uppercase">Type</p>
        <p className="text-white font-mono">{npc.type}</p>
      </div>
      {npc.abilities && npc.abilities.length > 0 && (
        <div className="col-span-full">
          <p className="text-gray-500 text-xs uppercase mb-2">Abilities</p>
          <div className="flex flex-wrap gap-2">
            {npc.abilities.map((ability) => (
              <span
                key={ability.id}
                className="px-2 py-1 bg-wow-bg-dark border border-wow-border rounded text-sm text-gray-300"
              >
                {ability.name} ({ability.id})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const SpellResult = ({ spell }: { spell: WowheadSpell }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="col-span-full">
        <p className="text-white font-semibold text-lg">{spell.name}</p>
        {spell.description && (
          <p className="text-gray-400 text-sm mt-1">{spell.description}</p>
        )}
      </div>
      <div>
        <p className="text-gray-500 text-xs uppercase">ID</p>
        <p className="text-white font-mono">{spell.id}</p>
      </div>
      <div>
        <p className="text-gray-500 text-xs uppercase">Cast Time</p>
        <p className="text-white font-mono">{spell.castTime}ms</p>
      </div>
      <div>
        <p className="text-gray-500 text-xs uppercase">Cooldown</p>
        <p className="text-white font-mono">{spell.cooldown}ms</p>
      </div>
      <div>
        <p className="text-gray-500 text-xs uppercase">Range</p>
        <p className="text-white font-mono">{spell.range} yds</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-wow-bg-dark rounded-lg p-1 w-fit">
        {([
          { key: 'items', label: 'Items' },
          { key: 'npcs', label: 'NPCs' },
          { key: 'spells', label: 'Spells' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
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

      {/* Items Tab */}
      {activeTab === 'items' && (
        <>
          <SearchInput
            value={itemSearch}
            onChange={setItemSearch}
            placeholder="Search WoWHead items (e.g. thunderfury, ashkandi)..."
            className="max-w-md"
          />
          <Card>
            {itemsError ? (
              <ErrorDisplay message={(itemsError as Error).message} />
            ) : debouncedItemSearch.length < 2 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                Type at least 2 characters to search
              </p>
            ) : itemsLoading ? (
              <LoadingSpinner message="Searching WoWHead..." />
            ) : (
              <>
                <p className="text-xs text-gray-600 mb-3">
                  {itemData?.count ?? 0} results for "{itemData?.query}"
                </p>
                <DataTable
                  columns={itemColumns}
                  data={itemData?.items || []}
                  rowKey={(row) => row.id}
                  emptyMessage="No items found"
                />
              </>
            )}
          </Card>
        </>
      )}

      {/* NPCs Tab */}
      {activeTab === 'npcs' && (
        <>
          <div className="max-w-xs">
            <label className="text-gray-500 text-xs uppercase block mb-1">NPC ID</label>
            <input
              type="number"
              value={npcId}
              onChange={(e) => setNpcId(e.target.value)}
              placeholder="Enter NPC ID (e.g. 36597)"
              className="w-full bg-wow-bg-dark border border-wow-border text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-wow-gold focus:outline-none transition-colors placeholder:text-gray-600"
            />
          </div>
          <Card>
            {npcError ? (
              <ErrorDisplay message={(npcError as Error).message} />
            ) : !npcId || isNaN(npcIdNum) ? (
              <p className="text-gray-500 text-sm text-center py-8">Enter an NPC ID to look up</p>
            ) : npcLoading ? (
              <LoadingSpinner message="Fetching NPC from WoWHead..." />
            ) : npcData ? (
              <NpcResult npc={npcData} />
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">NPC not found</p>
            )}
          </Card>
        </>
      )}

      {/* Spells Tab */}
      {activeTab === 'spells' && (
        <>
          <div className="max-w-xs">
            <label className="text-gray-500 text-xs uppercase block mb-1">Spell ID</label>
            <input
              type="number"
              value={spellId}
              onChange={(e) => setSpellId(e.target.value)}
              placeholder="Enter Spell ID (e.g. 133)"
              className="w-full bg-wow-bg-dark border border-wow-border text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-wow-gold focus:outline-none transition-colors placeholder:text-gray-600"
            />
          </div>
          <Card>
            {spellError ? (
              <ErrorDisplay message={(spellError as Error).message} />
            ) : !spellId || isNaN(spellIdNum) ? (
              <p className="text-gray-500 text-sm text-center py-8">Enter a Spell ID to look up</p>
            ) : spellLoading ? (
              <LoadingSpinner message="Fetching spell from WoWHead..." />
            ) : spellData ? (
              <SpellResult spell={spellData} />
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">Spell not found</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

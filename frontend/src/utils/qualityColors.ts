import { ItemQuality } from '@/types/items';

const qualityConfig: Record<number, { label: string; className: string }> = {
  [ItemQuality.Poor]: { label: 'Poor', className: 'text-quality-poor' },
  [ItemQuality.Common]: { label: 'Common', className: 'text-quality-common' },
  [ItemQuality.Uncommon]: { label: 'Uncommon', className: 'text-quality-uncommon' },
  [ItemQuality.Rare]: { label: 'Rare', className: 'text-quality-rare' },
  [ItemQuality.Epic]: { label: 'Epic', className: 'text-quality-epic' },
  [ItemQuality.Legendary]: { label: 'Legendary', className: 'text-quality-legendary' },
  [ItemQuality.Artifact]: { label: 'Artifact', className: 'text-quality-artifact' },
  [ItemQuality.Heirloom]: { label: 'Heirloom', className: 'text-quality-heirloom' },
};

export function getQualityConfig(quality: number) {
  return qualityConfig[quality] || qualityConfig[ItemQuality.Common];
}

import { getQualityConfig } from '@/utils/qualityColors';

interface ItemQualityTextProps {
  quality: number;
  children: React.ReactNode;
}

export default function ItemQualityText({ quality, children }: ItemQualityTextProps) {
  const config = getQualityConfig(quality);
  return <span className={config.className}>{children}</span>;
}

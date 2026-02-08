import { useQuery } from '@tanstack/react-query';
import { getOnlinePlayers } from '@/api/players';

export function useOnlinePlayers() {
  return useQuery({
    queryKey: ['onlinePlayers'],
    queryFn: getOnlinePlayers,
    refetchInterval: 15_000,
  });
}

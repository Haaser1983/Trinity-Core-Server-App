import apiClient from './client';
import type { Player, PlayerDetail, OnlinePlayersResponse } from '@/types/players';
import type { PaginatedResponse } from '@/types/api';

export async function getPlayers(page = 1, limit = 50): Promise<PaginatedResponse<Player>> {
  const { data } = await apiClient.get('/players', { params: { page, limit } });
  return data;
}

export async function getOnlinePlayers(): Promise<OnlinePlayersResponse> {
  const { data } = await apiClient.get('/players/online');
  return data;
}

export async function getPlayerByGuid(guid: number): Promise<PlayerDetail> {
  const { data } = await apiClient.get(`/players/${guid}`);
  return data;
}

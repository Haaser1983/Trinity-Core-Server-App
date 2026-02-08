import apiClient from './client';
import type { WowheadItem, WowheadNPC, WowheadSpell, WowheadSearchResponse } from '@/types/wowhead';

export async function getWowheadItem(id: number): Promise<WowheadItem> {
  const { data } = await apiClient.get(`/wowhead/items/${id}`);
  return data;
}

export async function searchWowheadItems(query: string): Promise<WowheadSearchResponse> {
  const { data } = await apiClient.get(`/wowhead/items/search/${encodeURIComponent(query)}`);
  return data;
}

export async function getWowheadNPC(id: number): Promise<WowheadNPC> {
  const { data } = await apiClient.get(`/wowhead/npcs/${id}`);
  return data;
}

export async function getWowheadSpell(id: number): Promise<WowheadSpell> {
  const { data } = await apiClient.get(`/wowhead/spells/${id}`);
  return data;
}

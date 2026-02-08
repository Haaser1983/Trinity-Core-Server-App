import apiClient from './client';
import type { DbItem, DbItemDetail } from '@/types/items';
import type { PaginatedResponse } from '@/types/api';

export async function getItems(page = 1, limit = 50): Promise<PaginatedResponse<DbItem>> {
  const { data } = await apiClient.get('/items', { params: { page, limit } });
  return data;
}

export async function getItemById(id: number): Promise<DbItemDetail> {
  const { data } = await apiClient.get(`/items/${id}`);
  return data;
}

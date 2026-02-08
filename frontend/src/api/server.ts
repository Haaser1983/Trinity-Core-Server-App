import apiClient from './client';
import type { ServerStatus, ServerMetrics } from '@/types/server';

export async function getServerStatus(): Promise<ServerStatus> {
  const { data } = await apiClient.get('/server/status');
  return data;
}

export async function getServerMetrics(): Promise<ServerMetrics> {
  const { data } = await apiClient.get('/server/metrics');
  return data;
}

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import DashboardPage from '@/pages/DashboardPage';
import ItemBrowserPage from '@/pages/ItemBrowserPage';
import PlayerManagementPage from '@/pages/PlayerManagementPage';
import ServerStatusPage from '@/pages/ServerStatusPage';
import WowheadSearchPage from '@/pages/WowheadSearchPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="items" element={<ItemBrowserPage />} />
            <Route path="players" element={<PlayerManagementPage />} />
            <Route path="server" element={<ServerStatusPage />} />
            <Route path="wowhead" element={<WowheadSearchPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

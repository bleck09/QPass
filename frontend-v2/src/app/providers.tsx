/* Providers globales: React Query + sesión. Sin lógica de UI. */

import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { SesionProvider } from '@/features/auth';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SesionProvider>{children}</SesionProvider>
    </QueryClientProvider>
  );
}

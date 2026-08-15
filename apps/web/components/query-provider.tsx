'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

/**
 * Server state that genuinely moves.
 *
 * ARCHITECTURE.md §7: this arrives in Phase 4 and not before. Phases 2 and 3 had
 * nothing to poll, so a client cache would have been a second copy of state with
 * nothing to justify it. Run progress streams, and here it earns its place.
 *
 * The client is created inside state rather than at module scope: a module-level
 * client is shared between requests on the server and would leak one user's data
 * into another's render.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // A run's stages change on the server, not here. Nothing is cached
            // as fresh, because a stale stage list is a lie about a live job.
            staleTime: 0,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

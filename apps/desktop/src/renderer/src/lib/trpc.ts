import { createTRPCReact, httpBatchLink, splitLink, unstable_httpSubscriptionLink } from '@trpc/react-query'
import type { AppRouter } from '@formallauncher/server/trpc'

export const trpc = createTRPCReact<AppRouter>()

export const trpcClient = trpc.createClient({
  links: [
    splitLink({
      condition: (op) => op.type === 'subscription',
      true: unstable_httpSubscriptionLink({
        url: 'http://localhost:3000/trpc',
        eventSourceOptions: () => ({
          withCredentials: true,
        }),
      }),
      false: httpBatchLink({
        url: 'http://localhost:3000/trpc',
        fetch(url, options) {
          return fetch(url, { ...options, credentials: 'include' })
        },
      }),
    }),
  ],
})

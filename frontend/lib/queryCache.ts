import type { QueryClient } from '@tanstack/react-query';

/**
 * The app's single React Query client, registered by QueryProvider so auth code outside
 * React (login / logout in lib/auth) can wipe it.
 *
 * Needed because QueryProvider's `storage` listener only fires in *other* tabs. Logging
 * out and back in as a different user in the same tab (client-side navigation, no reload)
 * kept the previous session's cached lists — e.g. an Admin's company-wide owners, or
 * another branch's, showing in this branch's Owner Contribution selector.
 */
let activeClient: QueryClient | null = null;

export function registerQueryClient(client: QueryClient) {
  activeClient = client;
}

/** Drops every cached query. Call whenever the signed-in identity changes. */
export function clearQueryCache() {
  activeClient?.clear();
}

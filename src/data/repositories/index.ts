import { apiDataSource } from '@/data/repositories/api/apiDataSource';
import { localDataSource } from '@/data/repositories/local/localDataSource';
import type { DataSource } from '@/data/repositories/types';

// The SINGLE swap point. Default: FresaStuff-API (JWT auth, login required).
// VITE_DATA_SOURCE=local switches to the mock database in localStorage
// (seeded demo data, no backend and no login) — handy for offline dev.
export const isLocalDataSource = import.meta.env.VITE_DATA_SOURCE === 'local';

export function getDataSource(): DataSource {
  return isLocalDataSource ? localDataSource : apiDataSource;
}

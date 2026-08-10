import { apiDataSource } from '@/data/repositories/api/apiDataSource';
import type { DataSource } from '@/data/repositories/types';

// Single access point to the data layer: FresaStuff-API (JWT auth, login
// required). Screens and stores never import a data source directly.
export function getDataSource(): DataSource {
  return apiDataSource;
}

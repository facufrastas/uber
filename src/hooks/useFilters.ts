import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { rangeForPreset, type DateRange, type Preset } from '@/lib/dates';

// Filters live in the URL (?preset=&from=&to=&car=&driver=&owner=), not in a
// store: the app is used by 3 admins and a copy/pasted URL must open exactly
// the same view. Sidebar links preserve the query string, so filters follow
// the user across sections.

export interface Filters {
  preset: Preset;
  range: DateRange;
  carId: string | null;
  driverId: string | null;
  ownerId: string | null;
}

const DEFAULT_PRESET = 'month' as const;

export function useFilters() {
  const [params, setParams] = useSearchParams();

  const filters: Filters = useMemo(() => {
    const rawPreset = params.get('preset');
    const from = params.get('from');
    const to = params.get('to');

    const rawIsValid = rawPreset === 'day' || rawPreset === 'week' || rawPreset === 'month' || rawPreset === 'custom';
    let preset: Preset = rawIsValid ? rawPreset : DEFAULT_PRESET;
    let range: DateRange;

    if (preset === 'custom' && from && to) {
      range = { from, to };
    } else {
      const withoutCustom = preset === 'custom' ? DEFAULT_PRESET : preset;

      preset = withoutCustom;
      range = rangeForPreset(withoutCustom);
    }

    return {
      preset,
      range,
      carId: params.get('car') || null,
      driverId: params.get('driver') || null,
      ownerId: params.get('owner') || null,
    };
  }, [params]);

  const patch = useCallback(
    (updates: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          for (const [key, value] of Object.entries(updates)) {
            if (value === null) next.delete(key);
            else next.set(key, value);
          }

          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const setPreset = useCallback((preset: Exclude<Preset, 'custom'>) => patch({ preset, from: null, to: null }), [patch]);
  const setCustomRange = useCallback((range: DateRange) => patch({ preset: 'custom', from: range.from, to: range.to }), [patch]);
  const setCarId = useCallback((id: string | null) => patch({ car: id }), [patch]);
  const setDriverId = useCallback((id: string | null) => patch({ driver: id }), [patch]);
  const setOwnerId = useCallback((id: string | null) => patch({ owner: id }), [patch]);
  const reset = useCallback(() => patch({ preset: null, from: null, to: null, car: null, driver: null, owner: null }), [patch]);

  return { filters, setPreset, setCustomRange, setCarId, setDriverId, setOwnerId, reset };
}

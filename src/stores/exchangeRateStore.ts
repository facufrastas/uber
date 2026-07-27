import { create } from 'zustand';

import { fetchDolarOficial } from '@/lib/exchangeRate';

// The "dólar oficial" rate, fetched once per session. It is a display concern
// only (converting the ARS earnings of a car against its USD price), so it is
// never persisted nor stored in the database. If the fetch fails the user can
// type the rate by hand and the payoff keeps working.

interface ExchangeRateState {
  rate: number | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  isManual: boolean;
  load: () => Promise<void>;
  setManual: (rate: number) => void;
}

export const useExchangeRateStore = create<ExchangeRateState>()((set, get) => ({
  rate: null,
  status: 'idle',
  isManual: false,

  load: async () => {
    const { status } = get();

    // one fetch per session: 'ready' covers a manual rate too, so a typed
    // value is not overwritten by a later mount
    if (status === 'loading' || status === 'ready') return;
    set({ status: 'loading' });
    try {
      set({ rate: await fetchDolarOficial(), status: 'ready', isManual: false });
    } catch (err) {
      console.error(err);
      set({ status: 'error' });
    }
  },

  setManual: (rate) => set({ rate, status: 'ready', isManual: true }),
}));

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Session tokens, persisted so a reload doesn't log the user out.
// The access token lasts 1h; the api client (lib/api.ts) renews it with the
// refresh token (7d) transparently and calls clear() when that also fails.

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (tokens: Tokens) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      clear: () => set({ accessToken: null, refreshToken: null }),
    }),
    { name: 'uber-auth' }
  )
);

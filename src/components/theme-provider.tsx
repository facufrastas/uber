import { createContext, useContext, useEffect, useState } from 'react'

// Light/dark theme. Default: System prefered; if the browser
// does not exposes matchMedia (or nothing matches), the value is dark

type Theme = 'dark' | 'light' | 'system'

interface ThemeProviderState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = 'uber-theme'

const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: 'system',
  setTheme: () => null,
})

function systemTheme(): 'dark' | 'light' {
  if (typeof window.matchMedia !== 'function') return 'dark'
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
  return 'dark'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEY) as Theme) || 'system',
  )

  useEffect(() => {
    const root = window.document.documentElement
    const apply = () => {
      root.classList.remove('light', 'dark')
      root.classList.add(theme === 'system' ? systemTheme() : theme)
    }
    apply()

    // in system mode, follows the SO changes live
    if (theme === 'system' && typeof window.matchMedia === 'function') {
      const media = window.matchMedia('(prefers-color-scheme: light)')
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
  }, [theme])

  const value = {
    theme,
    setTheme: (next: Theme) => {
      localStorage.setItem(STORAGE_KEY, next)
      setTheme(next)
    },
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeProviderContext)
}

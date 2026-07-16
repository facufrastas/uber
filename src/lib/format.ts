// Centralized formatting: a single Intl instance per format (creating them is expensive).

const ars = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export const formatARS = (amount: number) => ars.format(amount)

// chart axes: abbreviated amounts ($1,2 M / $850 k)
export const formatARSCompact = (amount: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)

const longDate = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC', // 'YYYY-MM-DD' strings parse as UTC; formatting in UTC too avoids the one-day shift
})

export const formatDate = (isoDate: string) => longDate.format(new Date(isoDate))

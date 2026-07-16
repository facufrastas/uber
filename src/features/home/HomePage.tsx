import { useMemo } from 'react'

import { FilterBar } from '@/components/shared/FilterBar'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { useFilteredData } from '@/hooks/useFilteredData'
import {
  computeKpis,
  computeKpisPrevious,
  expensesByCar,
  expensesByType,
  incomeByCar,
  incomeByDriver,
  incomeVsExpensesByDay,
} from '@/lib/analytics'
import { formatARS } from '@/lib/format'
import {
  ByCarChart,
  HorizontalBars,
  IncomeVsExpensesChart,
} from '@/features/home/charts'

// proportional delta vs. previous period; null when there is no baseline
const delta = (current: number, previous: number) =>
  previous === 0 ? null : (current - previous) / Math.abs(previous)

export function HomePage() {
  const { data, filtered, filters } = useFilteredData()

  const kpis = useMemo(() => computeKpis(filtered), [filtered])
  const previousKpis = useMemo(() => computeKpisPrevious(data, filters), [data, filters])

  const dailySeries = useMemo(
    () => incomeVsExpensesByDay(data, filtered, filters.range),
    [data, filtered, filters.range],
  )
  const carIncome = useMemo(() => incomeByCar(data, filtered), [data, filtered])
  const carExpenses = useMemo(() => expensesByCar(data, filtered), [data, filtered])
  const byType = useMemo(() => expensesByType(data, filtered), [data, filtered])
  const byDriver = useMemo(() => incomeByDriver(data, filtered), [data, filtered])

  return (
    <>
      <PageHeader title="Inicio" description="Resumen general de la flota" />
      <FilterBar />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="Ingresos"
          value={formatARS(kpis.totalIncome)}
          delta={delta(kpis.totalIncome, previousKpis.totalIncome)}
        />
        <KpiCard
          label="Gastos"
          value={formatARS(kpis.totalExpenses)}
          delta={delta(kpis.totalExpenses, previousKpis.totalExpenses)}
          invertedDelta
        />
        <KpiCard
          label="Neto"
          value={formatARS(kpis.net)}
          delta={delta(kpis.net, previousKpis.net)}
        />
        <KpiCard
          label="Turnos"
          value={`${kpis.shiftCount}`}
          delta={delta(kpis.shiftCount, previousKpis.shiftCount)}
        />
      </div>

      <IncomeVsExpensesChart series={dailySeries} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ByCarChart income={carIncome} expenses={carExpenses} />
        <HorizontalBars
          title="Gastos por tipo"
          data={byType}
          color="expenses"
          seriesName="Gastos"
        />
        <HorizontalBars
          title="Ingresos por chofer"
          data={byDriver}
          color="income"
          seriesName="Ingresos"
        />
      </div>
    </>
  )
}

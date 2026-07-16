import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatARS, formatARSCompact, formatDate } from '@/lib/format';
import type { AmountByName, DailyPoint } from '@/lib/analytics';

// Series colors: CSS variables (they change with the theme, CVD-validated).
const INCOME = 'var(--chart-income)';
const EXPENSES = 'var(--chart-expenses)';
// chart chrome: muted ink from the design system
const GRID = 'var(--border)';
const TICK = { fill: 'var(--muted-foreground)', fontSize: 11 };

function TooltipContent({
  active,
  payload,
  label,
  labelFormatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string;
  labelFormatter?: (label: string) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium text-popover-foreground">{labelFormatter ? labelFormatter(label) : label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="inline-block size-2 rounded-[2px]" style={{ background: entry.color }} />
          {entry.name}: <span className="font-medium tabular-nums text-popover-foreground">{formatARS(Number(entry.value))}</span>
        </p>
      ))}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64">{children}</CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Hero: income vs. expenses per day (area, 2 series)
// ---------------------------------------------------------------------------
export function IncomeVsExpensesChart({ series }: { series: DailyPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Ingresos vs. gastos por día</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
            <XAxis dataKey="date" tick={TICK} tickLine={false} axisLine={{ stroke: GRID }} tickFormatter={(date: string) => formatDate(date).replace(/ de \d{4}$/, '')} minTickGap={28} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatARSCompact(v)} width={64} />
            <Tooltip content={<TooltipContent labelFormatter={formatDate} />} cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }} />
            <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="income" name="Ingresos" stroke={INCOME} strokeWidth={2} fill={INCOME} fillOpacity={0.12} />
            <Area type="monotone" dataKey="expenses" name="Gastos" stroke={EXPENSES} strokeWidth={2} fill={EXPENSES} fillOpacity={0.12} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Income and expenses per car (grouped bars, 2 series)
// ---------------------------------------------------------------------------
export function ByCarChart({ income, expenses }: { income: AmountByName[]; expenses: AmountByName[] }) {
  const expensesById = new Map(expenses.map((e) => [e.id, e.amount]));
  const extraIds = expenses.filter((e) => !income.some((i) => i.id === e.id));
  const data = [
    ...income.map((i) => ({
      name: i.name,
      income: i.amount,
      expenses: expensesById.get(i.id) ?? 0,
    })),
    ...extraIds.map((e) => ({ name: e.name, income: 0, expenses: e.amount })),
  ];

  return (
    <ChartCard title="Ingresos y gastos por auto">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="name" tick={TICK} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatARSCompact(v)} width={64} />
          <Tooltip content={<TooltipContent />} cursor={{ fill: 'var(--muted)' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="income" name="Ingresos" fill={INCOME} radius={[4, 4, 0, 0]} maxBarSize={36} />
          <Bar dataKey="expenses" name="Gastos" fill={EXPENSES} radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// Single-measure horizontal bars (expenses by type / income by driver)
// ---------------------------------------------------------------------------
export function HorizontalBars({ title, data, color, seriesName }: { title: string; data: AmountByName[]; color: 'income' | 'expenses'; seriesName: string }) {
  const fill = color === 'income' ? INCOME : EXPENSES;

  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatARSCompact(v)} />
          <YAxis type="category" dataKey="name" tick={TICK} tickLine={false} axisLine={{ stroke: GRID }} width={110} />
          <Tooltip content={<TooltipContent />} cursor={{ fill: 'var(--muted)' }} />
          <Bar dataKey="amount" name={seriesName} fill={fill} radius={[0, 4, 4, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

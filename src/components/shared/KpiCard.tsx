import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string;
  // delta vs. previous period, as a proportion (0.12 = +12%). null = no baseline.
  delta?: number | null;
  // for "Gastos" an increase is bad: inverts the delta color
  invertedDelta?: boolean;
}

export function KpiCard({ label, value, delta = null, invertedDelta = false }: KpiCardProps) {
  const positive = delta !== null && delta >= 0;
  const good = invertedDelta ? !positive : positive;

  return (
    <Card className="py-4">
      <CardContent className="px-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
        {delta !== null && (
          <p className={cn('mt-1 text-xs tabular-nums', good ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500')}>
            {positive ? '+' : ''}
            {(delta * 100).toFixed(0)}% vs. período anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}

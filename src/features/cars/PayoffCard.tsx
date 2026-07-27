import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useExchangeRateStore } from '@/stores/exchangeRateStore';
import { carPayoff, type DataSlice } from '@/lib/analytics';
import { formatARS, formatDate } from '@/lib/format';

const usd = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface PayoffCardProps {
  data: DataSlice;
  carId: string;
}

// How much of the car's price its own earnings have paid back. Deliberately
// ignores the dashboard's date filters: this is a lifetime figure since the
// purchase date.
export function PayoffCard({ data, carId }: PayoffCardProps) {
  const rate = useExchangeRateStore((s) => s.rate);
  const status = useExchangeRateStore((s) => s.status);
  const isManual = useExchangeRateStore((s) => s.isManual);
  const load = useExchangeRateStore((s) => s.load);
  const setManual = useExchangeRateStore((s) => s.setManual);
  const [manualInput, setManualInput] = useState('');

  useEffect(() => {
    void load();
  }, [load]);

  const car = data.cars.find((c) => c.id === carId);
  const payoff = carPayoff(data, carId, rate);

  // no purchase data loaded: nothing to show
  if (!car || !payoff) return null;

  const pct = payoff.pct;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recupero de la inversión</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={pct === null ? 0 : Math.min(Math.max(pct, 0), 100)} />

        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-2xl font-semibold tabular-nums tracking-tight">{pct === null ? '—' : `${pct.toFixed(1)}%`}</p>
          <p className="text-sm text-muted-foreground tabular-nums">{payoff.earnedUsd === null ? 'Falta la cotización' : `${usd.format(payoff.earnedUsd)} de ${usd.format(payoff.costUsd)}`}</p>
        </div>

        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Neto acumulado</dt>
            <dd className="tabular-nums">{formatARS(payoff.earnedArs)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Comprado el</dt>
            <dd className="tabular-nums">{car.purchaseDate ? formatDate(car.purchaseDate) : '—'}</dd>
          </div>
          {rate !== null && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{isManual ? 'Cotización (manual)' : 'Dólar oficial'}</dt>
              <dd className="tabular-nums">{formatARS(rate)}</dd>
            </div>
          )}
        </dl>

        {status === 'error' && rate === null && (
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <p className="text-sm text-muted-foreground">No se pudo obtener el dólar oficial. Ingresalo a mano para ver el porcentaje.</p>
            <div className="flex gap-2">
              <Input type="number" inputMode="decimal" placeholder="Ej: 1350" value={manualInput} onChange={(e) => setManualInput(e.target.value)} aria-label="Cotización del dólar" />
              <Button type="button" variant="outline" disabled={!Number(manualInput)} onClick={() => setManual(Number(manualInput))}>
                Usar
              </Button>
            </div>
          </div>
        )}

        {pct !== null && pct >= 100 && <p className="text-sm text-emerald-600 dark:text-emerald-500">El auto ya se pagó solo.</p>}
      </CardContent>
    </Card>
  );
}

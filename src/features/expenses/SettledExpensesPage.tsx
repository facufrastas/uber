import { useMemo, useState } from 'react';
import { CircleCheck } from 'lucide-react';

import { EmptyState } from '@/components/shared/EmptyState';
import { FilterBar } from '@/components/shared/FilterBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { useFilteredData } from '@/hooks/useFilteredData';
import type { Expense } from '@/data/types';
import { ExpenseDialog } from '@/features/expenses/ExpenseDialog';
import { ExpensesTable } from '@/features/expenses/ExpensesTable';

// Same table as Gastos, other side of the `payed` flag: the toggle here sends
// the expense back to /expenses.
export function SettledExpensesPage() {
  const { filtered } = useFilteredData();
  const [dialog, setDialog] = useState<{ open: boolean; expense?: Expense }>({ open: false });

  const settledExpenses = useMemo(() => filtered.expenses.filter((e) => e.payed).sort((a, b) => b.date.localeCompare(a.date)), [filtered.expenses]);

  return (
    <>
      <PageHeader title="Gastos Saldados" description="Gastos marcados como saldados" />
      <FilterBar />

      {settledExpenses.length === 0 ? (
        <EmptyState icon={CircleCheck} title="Sin gastos saldados en el período" description="Marcá un gasto como saldado desde la sección Gastos." />
      ) : (
        <ExpensesTable expenses={settledExpenses} onEdit={(expense) => setDialog({ open: true, expense })} />
      )}

      <ExpenseDialog open={dialog.open} onOpenChange={(open) => setDialog((s) => ({ ...s, open }))} expense={dialog.expense} />
    </>
  );
}

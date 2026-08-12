import { useMemo, useState } from 'react';
import { Plus, TrendingDown } from 'lucide-react';

import { EmptyState } from '@/components/shared/EmptyState';
import { FilterBar } from '@/components/shared/FilterBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { useFilteredData } from '@/hooks/useFilteredData';
import type { Expense } from '@/data/types';
import { ExpenseDialog } from '@/features/expenses/ExpenseDialog';
import { ExpensesTable } from '@/features/expenses/ExpensesTable';

export function ExpensesPage() {
  const { filtered } = useFilteredData();
  const [dialog, setDialog] = useState<{ open: boolean; expense?: Expense }>({ open: false });

  // settled expenses live in their own section (/settled-expenses)
  const pendingExpenses = useMemo(() => filtered.expenses.filter((e) => !e.paid).sort((a, b) => b.date.localeCompare(a.date)), [filtered.expenses]);

  return (
    <>
      <PageHeader title="Gastos" description="Todos los gastos, incluidos los de mantenimiento">
        <Button onClick={() => setDialog({ open: true })}>
          <Plus /> Nuevo gasto
        </Button>
      </PageHeader>
      <FilterBar />

      {pendingExpenses.length === 0 ? (
        <EmptyState icon={TrendingDown} title="Sin gastos en el período" description="Ajustá los filtros o registrá un gasto nuevo." />
      ) : (
        <ExpensesTable expenses={pendingExpenses} onEdit={(expense) => setDialog({ open: true, expense })} />
      )}

      <ExpenseDialog open={dialog.open} onOpenChange={(open) => setDialog((s) => ({ ...s, open }))} expense={dialog.expense} />
    </>
  );
}

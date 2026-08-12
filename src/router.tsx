import { createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { CarDetailPage } from '@/features/cars/CarDetailPage';
import { CarsPage } from '@/features/cars/CarsPage';
import { DebtsPage } from '@/features/debts/DebtsPage';
import { ExpensesPage } from '@/features/expenses/ExpensesPage';
import { HomePage } from '@/features/home/HomePage';
import { IncomePage } from '@/features/income/IncomePage';
import { MaintenancePage } from '@/features/maintenance/MaintenancePage';
import { SettledExpensesPage } from '@/features/expenses/SettledExpensesPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/income', element: <IncomePage /> },
      { path: '/expenses', element: <ExpensesPage /> },
      { path: '/settled-expenses', element: <SettledExpensesPage /> },
      { path: '/debts', element: <DebtsPage /> },
      { path: '/cars', element: <CarsPage /> },
      { path: '/cars/:id', element: <CarDetailPage /> },
      { path: '/maintenance', element: <MaintenancePage /> },
    ],
  },
]);

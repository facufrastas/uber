import { createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { CarsPage } from '@/features/cars/CarsPage';
import { ExpensesPage } from '@/features/expenses/ExpensesPage';
import { HomePage } from '@/features/home/HomePage';
import { IncomePage } from '@/features/income/IncomePage';
import { MaintenancePage } from '@/features/maintenance/MaintenancePage';

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
      { path: '/cars', element: <CarsPage /> },
      { path: '/maintenance', element: <MaintenancePage /> },
    ],
  },
]);

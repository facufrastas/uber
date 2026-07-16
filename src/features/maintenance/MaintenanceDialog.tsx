import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDataStore } from '@/stores/dataStore';
import type { Expense, Maintenance } from '@/data/types';

const schema = z.object({
  carId: z.string().min(1, 'Elegí un auto'),
  serviceType: z.string().min(1, 'Requerido'),
  km: z.number({ message: 'Ingresá un número' }).int().min(0, 'No puede ser negativo'),
  date: z.string().min(1, 'Requerido'),
  amount: z.number({ message: 'Ingresá un monto' }).positive('Debe ser mayor a 0'),
  notes: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface MaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenance?: Maintenance;
  expense?: Expense; // linked expense (always exists for app-created maintenances)
}

export function MaintenanceDialog({ open, onOpenChange, maintenance, expense }: MaintenanceDialogProps) {
  const cars = useDataStore((s) => s.cars);
  const expenseTypes = useDataStore((s) => s.expenseTypes);
  const addMaintenanceWithExpense = useDataStore((s) => s.addMaintenanceWithExpense);
  const updateMaintenance = useDataStore((s) => s.updateMaintenance);
  const updateExpense = useDataStore((s) => s.updateExpense);

  // local date, not UTC: toISOString() shifts the day in Argentina (UTC-3)
  const today = format(new Date(), 'yyyy-MM-dd');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: maintenance
      ? {
          carId: maintenance.carId,
          serviceType: maintenance.serviceType,
          km: maintenance.km ?? 0,
          date: maintenance.date,
          amount: expense?.amount ?? 0,
          notes: maintenance.notes ?? '',
        }
      : { carId: '', serviceType: '', km: 0, date: today, amount: 0, notes: '' },
  });

  const maintenanceTypeId = () => expenseTypes.find((t) => t.name === 'Mantenimiento')?.id ?? expenseTypes[0]?.id ?? '';

  const onSubmit = form.handleSubmit(async (values) => {
    const maintenanceInput = {
      carId: values.carId,
      serviceType: values.serviceType,
      km: values.km || null,
      date: values.date,
      notes: values.notes || null,
    };

    if (maintenance) {
      await updateMaintenance(maintenance.id, maintenanceInput);
      // keep the linked expense in sync (amount, date, car)
      if (expense) {
        await updateExpense(expense.id, {
          amount: values.amount,
          date: values.date,
          carId: values.carId,
          description: values.serviceType,
        });
      }
      toast.success('Mantenimiento actualizado');
    } else {
      await addMaintenanceWithExpense(maintenanceInput, {
        expenseTypeId: maintenanceTypeId(),
        amount: values.amount,
        description: values.serviceType,
      });
      toast.success('Mantenimiento registrado (gasto creado automáticamente)');
    }
    onOpenChange(false);
    form.reset();
  });

  const { errors } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{maintenance ? 'Editar mantenimiento' : 'Nuevo mantenimiento'}</DialogTitle>
          <DialogDescription>El costo se registra automáticamente como gasto de tipo Mantenimiento.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup className="gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Auto</FieldLabel>
                <Controller
                  control={form.control}
                  name="carId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Elegir…" />
                      </SelectTrigger>
                      <SelectContent>
                        {cars.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.model} {c.licensePlate}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.carId && <FieldError>{errors.carId.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="maintenance-date">Fecha</FieldLabel>
                <Input id="maintenance-date" type="date" {...form.register('date')} />
                {errors.date && <FieldError>{errors.date.message}</FieldError>}
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="serviceType">Servicio</FieldLabel>
              <Input id="serviceType" placeholder="Cambio de aceite y filtro" {...form.register('serviceType')} />
              {errors.serviceType && <FieldError>{errors.serviceType.message}</FieldError>}
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="maintenance-km">Kilometraje</FieldLabel>
                <Input id="maintenance-km" type="number" {...form.register('km', { valueAsNumber: true })} />
                {errors.km && <FieldError>{errors.km.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="maintenance-amount">Costo (ARS)</FieldLabel>
                <Input id="maintenance-amount" type="number" step="100" {...form.register('amount', { valueAsNumber: true })} />
                {errors.amount && <FieldError>{errors.amount.message}</FieldError>}
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="maintenance-notes">Notas</FieldLabel>
              <Textarea id="maintenance-notes" rows={2} {...form.register('notes')} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {maintenance ? 'Guardar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

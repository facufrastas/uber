import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useDataStore } from '@/stores/dataStore';
import type { Driver } from '@/data/types';

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  phone: z.string(),
  dni: z.string(),
  carIds: z.array(z.string()), // empty = unassigned
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface DriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: Driver;
}

export function DriverDialog({ open, onOpenChange, driver }: DriverDialogProps) {
  const cars = useDataStore((s) => s.cars);
  const driverCars = useDataStore((s) => s.driverCars);
  const addDriver = useDataStore((s) => s.addDriver);
  const updateDriver = useDataStore((s) => s.updateDriver);

  const assignedCarIds = driver ? driverCars.filter((dc) => dc.driverId === driver.id).map((dc) => dc.carId) : [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: driver
      ? {
          name: driver.name,
          phone: driver.phone ?? '',
          dni: driver.dni ?? '',
          carIds: assignedCarIds,
          active: driver.active,
        }
      : { name: '', phone: '', dni: '', carIds: [], active: true },
  });

  const selectedCarIds = form.watch('carIds');

  const toggleCar = (carId: string, checked: boolean) => {
    const next = checked ? [...selectedCarIds, carId] : selectedCarIds.filter((id) => id !== carId);

    form.setValue('carIds', next, { shouldDirty: true });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const input = {
      name: values.name,
      phone: values.phone || null,
      dni: values.dni || null,
      active: values.active,
    };

    if (driver) {
      await updateDriver(driver.id, input, values.carIds);
      toast.success('Chofer actualizado');
    } else {
      await addDriver(input, values.carIds);
      toast.success('Chofer creado');
    }
    onOpenChange(false);
    form.reset();
  });

  const { errors } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{driver ? 'Editar chofer' : 'Nuevo chofer'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="name">Nombre</FieldLabel>
              <Input id="name" {...form.register('name')} />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
                <Input id="phone" {...form.register('phone')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="dni">DNI</FieldLabel>
                <Input id="dni" {...form.register('dni')} />
              </Field>
            </div>
            <Field>
              <FieldLabel>Autos asignados</FieldLabel>
              {cars.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavía no hay autos cargados.</p>
              ) : (
                <div className="space-y-2 rounded-md border p-3">
                  {cars.map((car) => (
                    <div key={car.id} className="flex items-center gap-2">
                      <Checkbox id={`car-${car.id}`} checked={selectedCarIds.includes(car.id)} onCheckedChange={(checked) => toggleCar(car.id, checked === true)} />
                      <FieldLabel htmlFor={`car-${car.id}`} className="font-normal">
                        {car.model} <span className="font-mono text-xs text-muted-foreground">{car.licensePlate}</span>
                      </FieldLabel>
                    </div>
                  ))}
                </div>
              )}
            </Field>
            <Field orientation="horizontal">
              <Checkbox id="driver-active" checked={form.watch('active')} onCheckedChange={(checked) => form.setValue('active', checked === true)} />
              <FieldLabel htmlFor="driver-active" className="font-normal">
                Activo
              </FieldLabel>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {driver ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

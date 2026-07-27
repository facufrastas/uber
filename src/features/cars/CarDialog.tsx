import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDataStore } from '@/stores/dataStore';
import type { Car } from '@/data/types';

const schema = z
  .object({
    brand: z.string().min(1, 'Requerido'),
    model: z.string().min(1, 'Requerido'),
    licensePlate: z.string().min(6, 'Patente inválida').max(8, 'Patente inválida'),
    year: z.number({ message: 'Ingresá un año' }).int().min(1990, 'Año inválido').max(2100, 'Año inválido'),
    currentKm: z.number({ message: 'Ingresá un número' }).int().min(0, 'No puede ser negativo'),
    // both empty = no payoff tracking; the refine below keeps them together
    purchaseCost: z.union([z.number().min(0, 'No puede ser negativo'), z.nan()]),
    purchaseDate: z.string(),
    owners: z.array(z.object({ ownerId: z.string().min(1, 'Elegí un dueño'), percentage: z.union([z.number(), z.nan()]) })),
    active: z.boolean(),
  })
  .superRefine((values, ctx) => {
    const hasCost = !Number.isNaN(values.purchaseCost);
    const hasDate = values.purchaseDate !== '';

    if (hasCost !== hasDate) {
      ctx.addIssue({ code: 'custom', path: ['purchaseCost'], message: 'Completá costo y fecha juntos' });
    }

    if (values.owners.length === 0) return;

    const ownerIds = values.owners.map((o) => o.ownerId);

    if (new Set(ownerIds).size !== ownerIds.length) {
      ctx.addIssue({ code: 'custom', path: ['owners'], message: 'Hay un dueño repetido' });

      return;
    }

    const sum = values.owners.reduce((acc, o) => acc + (Number.isNaN(o.percentage) ? 0 : o.percentage), 0);

    // float tolerance: 33.33 + 33.33 + 33.34 must pass
    if (Math.abs(sum - 100) > 0.01) {
      ctx.addIssue({ code: 'custom', path: ['owners'], message: `Los porcentajes deben sumar 100 (ahora suman ${sum.toFixed(2)})` });
    }
  });

type FormValues = z.infer<typeof schema>;

interface CarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  car?: Car; // present = editing
}

export function CarDialog({ open, onOpenChange, car }: CarDialogProps) {
  const allOwners = useDataStore((s) => s.owners);
  const carOwners = useDataStore((s) => s.carOwners);
  const addCar = useDataStore((s) => s.addCar);
  const updateCar = useDataStore((s) => s.updateCar);

  const currentOwners = car ? carOwners.filter((co) => co.carId === car.id).map((co) => ({ ownerId: co.ownerId, percentage: co.percentage })) : [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: car
      ? {
          brand: car.brand,
          model: car.model,
          licensePlate: car.licensePlate,
          year: car.year ?? new Date().getFullYear(),
          currentKm: car.currentKm,
          purchaseCost: car.purchaseCost ?? NaN,
          purchaseDate: car.purchaseDate ?? '',
          owners: currentOwners,
          active: car.active,
        }
      : {
          brand: '',
          model: '',
          licensePlate: '',
          year: new Date().getFullYear(),
          currentKm: 0,
          purchaseCost: NaN,
          purchaseDate: '',
          owners: [],
          active: true,
        },
  });

  const ownerRows = useFieldArray({ control: form.control, name: 'owners' });
  const selectedOwnerIds = form.watch('owners').map((o) => o.ownerId);

  const onSubmit = form.handleSubmit(async (values) => {
    const input = {
      brand: values.brand,
      model: values.model,
      licensePlate: values.licensePlate.toUpperCase(),
      year: values.year,
      currentKm: values.currentKm,
      purchaseCost: Number.isNaN(values.purchaseCost) ? null : values.purchaseCost,
      purchaseDate: values.purchaseDate || null,
      active: values.active,
    };
    const owners = values.owners.map((o) => ({ ownerId: o.ownerId, percentage: o.percentage }));

    if (car) {
      await updateCar(car.id, input, owners);
      toast.success('Auto actualizado');
    } else {
      await addCar(input, owners);
      toast.success('Auto creado');
    }
    onOpenChange(false);
    form.reset();
  });

  const { errors } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{car ? 'Editar auto' : 'Nuevo auto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup className="gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="brand">Marca</FieldLabel>
                <Input id="brand" {...form.register('brand')} />
                {errors.brand && <FieldError>{errors.brand.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="model">Modelo</FieldLabel>
                <Input id="model" {...form.register('model')} />
                {errors.model && <FieldError>{errors.model.message}</FieldError>}
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="licensePlate">Patente</FieldLabel>
                <Input id="licensePlate" placeholder="AF123BC" {...form.register('licensePlate')} />
                {errors.licensePlate && <FieldError>{errors.licensePlate.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="year">Año</FieldLabel>
                <Input id="year" type="number" {...form.register('year', { valueAsNumber: true })} />
                {errors.year && <FieldError>{errors.year.message}</FieldError>}
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="currentKm">Kilometraje actual</FieldLabel>
              <Input id="currentKm" type="number" {...form.register('currentKm', { valueAsNumber: true })} />
              {errors.currentKm && <FieldError>{errors.currentKm.message}</FieldError>}
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="purchaseCost">Costo de compra (USD)</FieldLabel>
                <Input id="purchaseCost" type="number" step="100" placeholder="Opcional" {...form.register('purchaseCost', { valueAsNumber: true })} />
                {errors.purchaseCost && <FieldError>{errors.purchaseCost.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="purchaseDate">Fecha de compra</FieldLabel>
                <Input id="purchaseDate" type="date" {...form.register('purchaseDate')} />
              </Field>
            </div>
            <Field>
              <FieldLabel>Dueños</FieldLabel>
              <div className="space-y-2">
                {ownerRows.fields.map((row, index) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <Controller
                      control={form.control}
                      name={`owners.${index}.ownerId`}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Elegí un dueño" />
                          </SelectTrigger>
                          <SelectContent>
                            {allOwners
                              .filter((o) => o.id === field.value || !selectedOwnerIds.includes(o.id))
                              .map((owner) => (
                                <SelectItem key={owner.id} value={owner.id}>
                                  {owner.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <div className="relative w-24">
                      <Input type="number" step="0.01" className="pr-6" aria-label="Porcentaje" {...form.register(`owners.${index}.percentage`, { valueAsNumber: true })} />
                      <span className="absolute top-1/2 right-2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar dueño" onClick={() => ownerRows.remove(index)}>
                      <X />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" disabled={allOwners.length === ownerRows.fields.length} onClick={() => ownerRows.append({ ownerId: '', percentage: NaN })}>
                  <Plus /> Agregar dueño
                </Button>
              </div>
              {errors.owners && <FieldError>{errors.owners.message ?? errors.owners.root?.message}</FieldError>}
            </Field>
            <Field orientation="horizontal">
              <Checkbox id="active" checked={form.watch('active')} onCheckedChange={(checked) => form.setValue('active', checked === true)} />
              <FieldLabel htmlFor="active" className="font-normal">
                Activo
              </FieldLabel>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {car ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

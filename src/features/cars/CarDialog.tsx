import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useDataStore } from '@/stores/dataStore'
import type { Car } from '@/data/types'

const schema = z.object({
  brand: z.string().min(1, 'Requerido'),
  model: z.string().min(1, 'Requerido'),
  licensePlate: z.string().min(6, 'Patente inválida').max(8, 'Patente inválida'),
  year: z.number({ message: 'Ingresá un año' }).int().min(1990, 'Año inválido').max(2100, 'Año inválido'),
  currentKm: z.number({ message: 'Ingresá un número' }).int().min(0, 'No puede ser negativo'),
  active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface CarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  car?: Car // present = editing
}

export function CarDialog({ open, onOpenChange, car }: CarDialogProps) {
  const addCar = useDataStore((s) => s.addCar)
  const updateCar = useDataStore((s) => s.updateCar)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: car
      ? {
          brand: car.brand,
          model: car.model,
          licensePlate: car.licensePlate,
          year: car.year ?? new Date().getFullYear(),
          currentKm: car.currentKm,
          active: car.active,
        }
      : {
          brand: '',
          model: '',
          licensePlate: '',
          year: new Date().getFullYear(),
          currentKm: 0,
          active: true,
        },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    const input = { ...values, licensePlate: values.licensePlate.toUpperCase() }
    if (car) {
      await updateCar(car.id, input)
      toast.success('Auto actualizado')
    } else {
      await addCar(input)
      toast.success('Auto creado')
    }
    onOpenChange(false)
    form.reset()
  })

  const { errors } = form.formState

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
            <Field orientation="horizontal">
              <Checkbox
                id="active"
                checked={form.watch('active')}
                onCheckedChange={(checked) => form.setValue('active', checked === true)}
              />
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
  )
}

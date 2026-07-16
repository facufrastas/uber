import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDataStore } from '@/stores/dataStore'
import type { Driver } from '@/data/types'

const NO_CAR = '__no_car__'

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  phone: z.string(),
  dni: z.string(),
  carId: z.string(), // NO_CAR = unassigned
  active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface DriverDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  driver?: Driver
}

export function DriverDialog({ open, onOpenChange, driver }: DriverDialogProps) {
  const cars = useDataStore((s) => s.cars)
  const addDriver = useDataStore((s) => s.addDriver)
  const updateDriver = useDataStore((s) => s.updateDriver)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: driver
      ? {
          name: driver.name,
          phone: driver.phone ?? '',
          dni: driver.dni ?? '',
          carId: driver.carId ?? NO_CAR,
          active: driver.active,
        }
      : { name: '', phone: '', dni: '', carId: NO_CAR, active: true },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    const input = {
      name: values.name,
      phone: values.phone || null,
      dni: values.dni || null,
      carId: values.carId === NO_CAR ? null : values.carId,
      active: values.active,
    }
    if (driver) {
      await updateDriver(driver.id, input)
      toast.success('Chofer actualizado')
    } else {
      await addDriver(input)
      toast.success('Chofer creado')
    }
    onOpenChange(false)
    form.reset()
  })

  const { errors } = form.formState

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
              <FieldLabel>Auto asignado</FieldLabel>
              <Controller
                control={form.control}
                name="carId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CAR}>Sin asignar</SelectItem>
                      {cars.map((car) => (
                        <SelectItem key={car.id} value={car.id}>
                          {car.model} {car.licensePlate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="driver-active"
                checked={form.watch('active')}
                onCheckedChange={(checked) => form.setValue('active', checked === true)}
              />
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
  )
}

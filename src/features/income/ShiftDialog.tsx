import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
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
import { PAYMENT_METHODS, type Payment, type PaymentMethod, type Shift } from '@/data/types'

const schema = z.object({
  driverId: z.string().min(1, 'Elegí un chofer'),
  carId: z.string().min(1, 'Elegí un auto'),
  date: z.string().min(1, 'Requerido'),
  startTime: z.string(),
  endTime: z.string(),
  amount: z.number({ message: 'Ingresá un monto' }).min(0, 'No puede ser negativo'),
  paymentMethod: z.enum(PAYMENT_METHODS),
})

type FormValues = z.infer<typeof schema>

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  otro: 'Otro',
}

interface ShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift?: Shift
  payment?: Payment
}

export function ShiftDialog({ open, onOpenChange, shift, payment }: ShiftDialogProps) {
  const cars = useDataStore((s) => s.cars)
  const drivers = useDataStore((s) => s.drivers)
  const addShiftWithPayment = useDataStore((s) => s.addShiftWithPayment)
  const updateShift = useDataStore((s) => s.updateShift)
  const updatePayment = useDataStore((s) => s.updatePayment)

  // local date, not UTC: toISOString() shifts the day in Argentina (UTC-3)
  const today = format(new Date(), 'yyyy-MM-dd')

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: shift
      ? {
          driverId: shift.driverId,
          carId: shift.carId,
          date: shift.date,
          startTime: shift.startTime ?? '',
          endTime: shift.endTime ?? '',
          amount: payment?.amount ?? 0,
          paymentMethod: payment?.paymentMethod ?? 'transferencia',
        }
      : {
          driverId: '',
          carId: '',
          date: today,
          startTime: '06:00',
          endTime: '14:00',
          amount: 0,
          paymentMethod: 'transferencia',
        },
  })

  // when choosing a driver, preselect their assigned car
  const onDriverChange = (driverId: string) => {
    form.setValue('driverId', driverId)
    const driver = drivers.find((d) => d.id === driverId)
    if (driver?.carId && !shift) form.setValue('carId', driver.carId)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const shiftInput = {
      driverId: values.driverId,
      carId: values.carId,
      date: values.date,
      startTime: values.startTime || null,
      endTime: values.endTime || null,
      notes: shift?.notes ?? null,
    }
    if (shift) {
      await updateShift(shift.id, shiftInput)
      if (payment) {
        await updatePayment(payment.id, {
          amount: values.amount,
          paymentMethod: values.paymentMethod,
        })
      }
      toast.success('Turno actualizado')
    } else {
      await addShiftWithPayment(shiftInput, {
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        notes: null,
      })
      toast.success('Turno y pago registrados')
    }
    onOpenChange(false)
    form.reset()
  })

  const { errors } = form.formState

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{shift ? 'Editar turno' : 'Nuevo turno'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup className="gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Chofer</FieldLabel>
                <Controller
                  control={form.control}
                  name="driverId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={onDriverChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Elegir…" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers
                          .filter((d) => d.active)
                          .map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.driverId && <FieldError>{errors.driverId.message}</FieldError>}
              </Field>
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
                        {cars
                          .filter((c) => c.active)
                          .map((c) => (
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
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field>
                <FieldLabel htmlFor="date">Fecha</FieldLabel>
                <Input id="date" type="date" {...form.register('date')} />
                {errors.date && <FieldError>{errors.date.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="startTime">Desde</FieldLabel>
                <Input id="startTime" type="time" {...form.register('startTime')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="endTime">Hasta</FieldLabel>
                <Input id="endTime" type="time" {...form.register('endTime')} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="amount">Total del turno (ARS)</FieldLabel>
                <Input id="amount" type="number" step="100" {...form.register('amount', { valueAsNumber: true })} />
                {errors.amount && <FieldError>{errors.amount.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel>Método de pago</FieldLabel>
                <Controller
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {PAYMENT_METHOD_LABELS[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {shift ? 'Guardar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import { useState } from 'react'
import { Car as CarIcon, Pencil, Plus, TriangleAlert, Users } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDataStore } from '@/stores/dataStore'
import type { Car, Driver } from '@/data/types'
import { CarDialog } from '@/features/cars/CarDialog'
import { DriverDialog } from '@/features/cars/DriverDialog'

export function CarsPage() {
  const cars = useDataStore((s) => s.cars)
  const drivers = useDataStore((s) => s.drivers)
  const shifts = useDataStore((s) => s.shifts)
  const removeCar = useDataStore((s) => s.removeCar)
  const removeDriver = useDataStore((s) => s.removeDriver)

  const [carDialog, setCarDialog] = useState<{ open: boolean; car?: Car }>({ open: false })
  const [driverDialog, setDriverDialog] = useState<{ open: boolean; driver?: Driver }>({
    open: false,
  })

  const driversOfCar = (carId: string) => drivers.filter((d) => d.carId === carId && d.active)
  const carById = (carId: string | null) => cars.find((c) => c.id === carId)

  // mirrors the schema's ON DELETE RESTRICT: rows with historic shifts can't be deleted
  const carHasShifts = (carId: string) => shifts.some((s) => s.carId === carId)
  const driverHasShifts = (driverId: string) => shifts.some((s) => s.driverId === driverId)

  return (
    <>
      <Tabs defaultValue="cars" className="gap-4">
        <PageHeader title="Autos" description="Autos y choferes asignados">
          <TabsList>
            <TabsTrigger value="cars">
              <CarIcon className="size-4" /> Autos
            </TabsTrigger>
            <TabsTrigger value="drivers">
              <Users className="size-4" /> Choferes
            </TabsTrigger>
          </TabsList>
        </PageHeader>

        <TabsContent value="cars" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCarDialog({ open: true })}>
              <Plus /> Nuevo auto
            </Button>
          </div>
          {cars.length === 0 ? (
            <EmptyState icon={CarIcon} title="Sin autos" description="Creá el primer auto de la flota." />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Auto</TableHead>
                    <TableHead>Patente</TableHead>
                    <TableHead className="text-right">Km</TableHead>
                    <TableHead>Choferes</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cars.map((car) => {
                    const assigned = driversOfCar(car.id)
                    return (
                      <TableRow key={car.id}>
                        <TableCell className="font-medium">
                          {car.brand} {car.model}
                          <span className="ml-2 text-xs text-muted-foreground">{car.year}</span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{car.licensePlate}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {car.currentKm.toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            {assigned.map((d) => (
                              <Badge key={d.id} variant="secondary">
                                {d.name}
                              </Badge>
                            ))}
                            {assigned.length < 2 && (
                              <Badge variant="outline" className="text-amber-600 dark:text-amber-500">
                                <TriangleAlert />
                                {assigned.length === 0 ? 'Sin chofer' : 'Falta 2º chofer'}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={car.active ? 'secondary' : 'outline'}>
                            {car.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Editar"
                              onClick={() => setCarDialog({ open: true, car })}
                            >
                              <Pencil />
                            </Button>
                            <ConfirmDeleteDialog
                              title={`Eliminar ${car.brand} ${car.model}`}
                              description="Se eliminará el auto, sus mantenimientos y los gastos vinculados. Esta acción no se puede deshacer."
                              onConfirm={async () => {
                                if (carHasShifts(car.id)) {
                                  toast.error('No se puede eliminar: el auto tiene turnos registrados. Marcalo como inactivo.')
                                  return
                                }
                                await removeCar(car.id)
                                toast.success('Auto eliminado')
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="drivers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setDriverDialog({ open: true })}>
              <Plus /> Nuevo chofer
            </Button>
          </div>
          {drivers.length === 0 ? (
            <EmptyState icon={Users} title="Sin choferes" description="Agregá choferes y asignales un auto." />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Auto asignado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => {
                    const car = carById(driver.carId)
                    return (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell className="text-muted-foreground">{driver.phone ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{driver.dni ?? '—'}</TableCell>
                        <TableCell>
                          {car ? (
                            <Badge variant="secondary">
                              {car.model} {car.licensePlate}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 dark:text-amber-500">
                              Sin asignar
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={driver.active ? 'secondary' : 'outline'}>
                            {driver.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Editar"
                              onClick={() => setDriverDialog({ open: true, driver })}
                            >
                              <Pencil />
                            </Button>
                            <ConfirmDeleteDialog
                              title={`Eliminar a ${driver.name}`}
                              description="Esta acción no se puede deshacer."
                              onConfirm={async () => {
                                if (driverHasShifts(driver.id)) {
                                  toast.error('No se puede eliminar: el chofer tiene turnos registrados. Marcalo como inactivo.')
                                  return
                                }
                                await removeDriver(driver.id)
                                toast.success('Chofer eliminado')
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CarDialog
        open={carDialog.open}
        onOpenChange={(open) => setCarDialog((s) => ({ ...s, open }))}
        car={carDialog.car}
      />
      <DriverDialog
        open={driverDialog.open}
        onOpenChange={(open) => setDriverDialog((s) => ({ ...s, open }))}
        driver={driverDialog.driver}
      />
    </>
  )
}

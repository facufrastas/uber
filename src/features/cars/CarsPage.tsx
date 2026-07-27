import { useState } from 'react';
import { Car as CarIcon, Pencil, Plus, TriangleAlert, UserRound, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDataStore } from '@/stores/dataStore';
import type { Car, Driver, Owner } from '@/data/types';
import { CarDialog } from '@/features/cars/CarDialog';
import { DriverDialog } from '@/features/cars/DriverDialog';
import { OwnerDialog } from '@/features/cars/OwnerDialog';

export function CarsPage() {
  const cars = useDataStore((s) => s.cars);
  const drivers = useDataStore((s) => s.drivers);
  const owners = useDataStore((s) => s.owners);
  const driverCars = useDataStore((s) => s.driverCars);
  const carOwners = useDataStore((s) => s.carOwners);
  const shifts = useDataStore((s) => s.shifts);
  const removeCar = useDataStore((s) => s.removeCar);
  const removeDriver = useDataStore((s) => s.removeDriver);
  const removeOwner = useDataStore((s) => s.removeOwner);
  const navigate = useNavigate();
  const location = useLocation();

  const [carDialog, setCarDialog] = useState<{ open: boolean; car?: Car }>({ open: false });
  const [driverDialog, setDriverDialog] = useState<{ open: boolean; driver?: Driver }>({
    open: false,
  });
  const [ownerDialog, setOwnerDialog] = useState<{ open: boolean; owner?: Owner }>({ open: false });

  const driversOfCar = (carId: string) => driverCars.filter((dc) => dc.carId === carId).flatMap((dc) => drivers.filter((d) => d.id === dc.driverId && d.active));
  const carsOfDriver = (driverId: string) => driverCars.filter((dc) => dc.driverId === driverId).flatMap((dc) => cars.filter((c) => c.id === dc.carId));
  const carsOfOwner = (ownerId: string) => carOwners.filter((co) => co.ownerId === ownerId).flatMap((co) => cars.filter((c) => c.id === co.carId).map((car) => ({ car, percentage: co.percentage })));
  // deleting an owner elsewhere can leave a car's split below 100
  const ownershipSum = (carId: string) => carOwners.filter((co) => co.carId === carId).reduce((sum, co) => sum + co.percentage, 0);

  // mirrors the schema's ON DELETE RESTRICT: rows with historic shifts can't be deleted
  const carHasShifts = (carId: string) => shifts.some((s) => s.carId === carId);
  const driverHasShifts = (driverId: string) => shifts.some((s) => s.driverId === driverId);

  return (
    <>
      <Tabs defaultValue="cars" className="gap-4">
        <PageHeader title="Autos" description="Autos, choferes y dueños">
          <TabsList>
            <TabsTrigger value="cars">
              <CarIcon className="size-4" /> Autos
            </TabsTrigger>
            <TabsTrigger value="drivers">
              <Users className="size-4" /> Choferes
            </TabsTrigger>
            <TabsTrigger value="owners">
              <UserRound className="size-4" /> Dueños
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
                    const assigned = driversOfCar(car.id);
                    const ownedPct = ownershipSum(car.id);

                    return (
                      // the whole row opens the car's detail page; the actions
                      // cell stops the event so its buttons still work
                      <TableRow key={car.id} className="cursor-pointer" onClick={() => navigate({ pathname: `/cars/${car.id}`, search: location.search })}>
                        <TableCell className="font-medium">
                          {car.brand} {car.model}
                          <span className="ml-2 text-xs text-muted-foreground">{car.year}</span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{car.licensePlate}</TableCell>
                        <TableCell className="text-right tabular-nums">{car.currentKm.toLocaleString('es-AR')}</TableCell>
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
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant={car.active ? 'secondary' : 'outline'}>{car.active ? 'Activo' : 'Inactivo'}</Badge>
                            {ownedPct > 0 && Math.abs(ownedPct - 100) > 0.01 && (
                              <Badge variant="outline" className="text-amber-600 dark:text-amber-500">
                                <TriangleAlert />
                                Dueños {ownedPct}%
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => setCarDialog({ open: true, car })}>
                              <Pencil />
                            </Button>
                            <ConfirmDeleteDialog
                              title={`Eliminar ${car.brand} ${car.model}`}
                              description="Se eliminará el auto, sus mantenimientos y los gastos vinculados. Esta acción no se puede deshacer."
                              onConfirm={async () => {
                                if (carHasShifts(car.id)) {
                                  toast.error('No se puede eliminar: el auto tiene turnos registrados. Marcalo como inactivo.');

                                  return;
                                }
                                await removeCar(car.id);
                                toast.success('Auto eliminado');
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
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
                    <TableHead>Autos asignados</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => {
                    const assignedCars = carsOfDriver(driver.id);

                    return (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell className="text-muted-foreground">{driver.phone ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{driver.dni ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            {assignedCars.map((car) => (
                              <Badge key={car.id} variant="secondary">
                                {car.model} {car.licensePlate}
                              </Badge>
                            ))}
                            {assignedCars.length === 0 && (
                              <Badge variant="outline" className="text-amber-600 dark:text-amber-500">
                                Sin asignar
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={driver.active ? 'secondary' : 'outline'}>{driver.active ? 'Activo' : 'Inactivo'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => setDriverDialog({ open: true, driver })}>
                              <Pencil />
                            </Button>
                            <ConfirmDeleteDialog
                              title={`Eliminar a ${driver.name}`}
                              description="Esta acción no se puede deshacer."
                              onConfirm={async () => {
                                if (driverHasShifts(driver.id)) {
                                  toast.error('No se puede eliminar: el chofer tiene turnos registrados. Marcalo como inactivo.');

                                  return;
                                }
                                await removeDriver(driver.id);
                                toast.success('Chofer eliminado');
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="owners" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setOwnerDialog({ open: true })}>
              <Plus /> Nuevo dueño
            </Button>
          </div>
          {owners.length === 0 ? (
            <EmptyState icon={UserRound} title="Sin dueños" description="Agregá dueños y asignales su porcentaje desde cada auto." />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Autos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {owners.map((owner) => {
                    const owned = carsOfOwner(owner.id);

                    return (
                      <TableRow key={owner.id}>
                        <TableCell className="font-medium">{owner.name}</TableCell>
                        <TableCell className="text-muted-foreground">{owner.phone ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            {owned.map(({ car, percentage }) => (
                              <Badge key={car.id} variant="secondary">
                                {car.model} {car.licensePlate} · {percentage}%
                              </Badge>
                            ))}
                            {owned.length === 0 && <span className="text-sm text-muted-foreground">Sin autos</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={owner.active ? 'secondary' : 'outline'}>{owner.active ? 'Activo' : 'Inactivo'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => setOwnerDialog({ open: true, owner })}>
                              <Pencil />
                            </Button>
                            <ConfirmDeleteDialog
                              title={`Eliminar a ${owner.name}`}
                              description="Se quitarán sus participaciones en los autos. Esta acción no se puede deshacer."
                              onConfirm={async () => {
                                await removeOwner(owner.id);
                                toast.success('Dueño eliminado');
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CarDialog open={carDialog.open} onOpenChange={(open) => setCarDialog((s) => ({ ...s, open }))} car={carDialog.car} />
      <DriverDialog open={driverDialog.open} onOpenChange={(open) => setDriverDialog((s) => ({ ...s, open }))} driver={driverDialog.driver} />
      <OwnerDialog open={ownerDialog.open} onOpenChange={(open) => setOwnerDialog((s) => ({ ...s, open }))} owner={ownerDialog.owner} />
    </>
  );
}

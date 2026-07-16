import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Check, ChevronDown, X } from 'lucide-react';
import type { DateRange as DayPickerRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFilters } from '@/hooks/useFilters';
import { useDataStore } from '@/stores/dataStore';
import { cn } from '@/lib/utils';

// Global filter bar. Reads and writes the URL (see useFilters): the same bar
// on every section, and the state travels with the link.

const PRESETS = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
] as const;

const ALL = '__all__'; // Radix Select does not allow value=""

export function FilterBar() {
  const { filters, setPreset, setCustomRange, setCarId, setDriverId, reset } = useFilters();
  const cars = useDataStore((s) => s.cars);
  const drivers = useDataStore((s) => s.drivers);
  const [driverOpen, setDriverOpen] = useState(false);

  const selectedDriver = drivers.find((d) => d.id === filters.driverId);

  const selected: DayPickerRange = {
    from: new Date(`${filters.range.from}T00:00:00`),
    to: new Date(`${filters.range.to}T00:00:00`),
  };

  const hasActiveFilters = filters.preset !== 'month' || filters.carId !== null || filters.driverId !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-md border p-0.5">
        {PRESETS.map((p) => (
          <Button key={p.value} variant={filters.preset === p.value ? 'secondary' : 'ghost'} size="sm" className="h-7 px-3" onClick={() => setPreset(p.value)}>
            {p.label}
          </Button>
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn('h-8', filters.preset === 'custom' && 'border-primary')}>
            <CalendarIcon />
            <span className="hidden sm:inline">
              {format(selected.from!, 'd MMM', { locale: es })} – {format(selected.to!, 'd MMM', { locale: es })}
            </span>
            <span className="sm:hidden">Rango</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            locale={es}
            defaultMonth={selected.from}
            selected={selected}
            numberOfMonths={2}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                setCustomRange({
                  from: format(range.from, 'yyyy-MM-dd'),
                  to: format(range.to, 'yyyy-MM-dd'),
                });
              }
            }}
          />
        </PopoverContent>
      </Popover>

      <Select value={filters.carId ?? ALL} onValueChange={(v) => setCarId(v === ALL ? null : v)}>
        <SelectTrigger size="sm" className="w-[150px]">
          <SelectValue placeholder="Auto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los autos</SelectItem>
          {cars.map((car) => (
            <SelectItem key={car.id} value={car.id}>
              {car.model} {car.licensePlate}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* combobox with search: with many drivers, typing beats scrolling */}
      <Popover open={driverOpen} onOpenChange={setDriverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" role="combobox" aria-expanded={driverOpen} className="h-8 w-[180px] justify-between font-normal">
            <span className="truncate">{selectedDriver?.name ?? 'Todos los choferes'}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar chofer…" />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value={ALL}
                  onSelect={() => {
                    setDriverId(null);
                    setDriverOpen(false);
                  }}
                >
                  <Check className={cn('size-4', filters.driverId !== null && 'invisible')} />
                  Todos los choferes
                </CommandItem>
                {drivers.map((driver) => (
                  <CommandItem
                    key={driver.id}
                    // search matches by name; the id keeps duplicates distinct
                    value={`${driver.name} ${driver.id}`}
                    onSelect={() => {
                      setDriverId(driver.id);
                      setDriverOpen(false);
                    }}
                  >
                    <Check className={cn('size-4', filters.driverId !== driver.id && 'invisible')} />
                    {driver.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={reset}>
          <X />
          Limpiar
        </Button>
      )}
    </div>
  );
}

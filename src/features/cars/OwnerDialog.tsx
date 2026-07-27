import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useDataStore } from '@/stores/dataStore';
import type { Owner } from '@/data/types';

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  phone: z.string(),
  notes: z.string(),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface OwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owner?: Owner; // present = editing
}

// The car's ownership split is edited in CarDialog: this dialog only holds
// the owner's own data.
export function OwnerDialog({ open, onOpenChange, owner }: OwnerDialogProps) {
  const addOwner = useDataStore((s) => s.addOwner);
  const updateOwner = useDataStore((s) => s.updateOwner);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: owner ? { name: owner.name, phone: owner.phone ?? '', notes: owner.notes ?? '', active: owner.active } : { name: '', phone: '', notes: '', active: true },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const input = {
      name: values.name,
      phone: values.phone || null,
      notes: values.notes || null,
      active: values.active,
    };

    if (owner) {
      await updateOwner(owner.id, input);
      toast.success('Dueño actualizado');
    } else {
      await addOwner(input);
      toast.success('Dueño creado');
    }
    onOpenChange(false);
    form.reset();
  });

  const { errors } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{owner ? 'Editar dueño' : 'Nuevo dueño'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="owner-name">Nombre</FieldLabel>
              <Input id="owner-name" {...form.register('name')} />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="owner-phone">Teléfono</FieldLabel>
              <Input id="owner-phone" {...form.register('phone')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="owner-notes">Notas</FieldLabel>
              <Textarea id="owner-notes" rows={3} {...form.register('notes')} />
            </Field>
            <Field orientation="horizontal">
              <Checkbox id="owner-active" checked={form.watch('active')} onCheckedChange={(checked) => form.setValue('active', checked === true)} />
              <FieldLabel htmlFor="owner-active" className="font-normal">
                Activo
              </FieldLabel>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {owner ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

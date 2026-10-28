import { uploadLimits } from '../../shared/limits';
import { z } from 'zod';
import { PersonSelect } from './record-select';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCreateRecord } from '@/hooks/use-records';
import { Failure } from './feedback';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Field, FieldGroup, FieldLabel } from './ui/field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

export function RecordCreateDialog({
  collection,
  personId,
  onCreated,
}: {
  collection: 'people' | 'cases';
  personId?: string;
  onCreated?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<string>();
  const linkedPerson = personId ?? selectedPerson;
  const create = useCreateRecord(collection);
  const isPerson = collection === 'people';
  const label = isPerson ? 'New person' : 'New case';
  const fields: [string, string][] = isPerson
    ? [
        ['fullName', 'Full name'],
        ['email', 'Email'],
        ['jobTitle', 'Job title'],
        ['department', 'Department'],
        ['manager', 'Manager'],
        ['location', 'Location'],
      ]
    : [['title', 'Case title']];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{isPerson ? 'Person record' : 'Case details'}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const values = z
              .record(z.string(), z.string())
              .parse(Object.fromEntries(new FormData(event.currentTarget).entries()));
            create.mutate(
              { ...values, ...(!isPerson && linkedPerson ? { personId: linkedPerson } : {}) },
              {
                onSuccess: (record) => {
                  onCreated?.(record.id);
                  setOpen(false);
                },
              },
            );
          }}
        >
          <FieldGroup>
            {!isPerson && !personId ? (
              <Field>
                <FieldLabel>Person</FieldLabel>
                <PersonSelect value={selectedPerson} onChange={setSelectedPerson} />
              </Field>
            ) : null}
            {fields.map(([name, label]) => (
              <Field key={name}>
                <FieldLabel htmlFor={`new-${name}`}>{label}</FieldLabel>
                <Input
                  id={`new-${name}`}
                  name={name}
                  type={name === 'email' ? 'email' : 'text'}
                  required={name === 'fullName' || name === 'email' || name === 'title'}
                  maxLength={name === 'email' ? uploadLimits.email : uploadLimits.shortText}
                  disabled={create.isPending}
                />
              </Field>
            ))}
            {create.error ? <Failure error={create.error} /> : null}
            <Button type="submit" disabled={create.isPending || (!isPerson && !linkedPerson)}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

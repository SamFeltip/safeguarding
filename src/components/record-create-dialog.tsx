import { uploadLimits } from '../../shared/limits';
import { z } from 'zod';
import { PeoplePicker } from './people-picker';
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
  const [selectedPeople, setSelectedPeople] = useState<string[]>(personId ? [personId] : []);
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
          <DialogDescription>
            {isPerson
              ? 'Person record. Fields marked (required) must be completed.'
              : 'Case details. Only the case title is required.'}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const values = z
              .record(z.string(), z.string())
              .parse(Object.fromEntries(new FormData(event.currentTarget).entries()));
            create.mutate(
              { ...values, ...(isPerson ? {} : { personIds: selectedPeople }) },
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
            {isPerson ? null : (
              <Field>
                <FieldLabel>People (optional)</FieldLabel>
                <PeoplePicker values={selectedPeople} onChange={setSelectedPeople} />
              </Field>
            )}
            {fields.map(([name, label]) => (
              <Field key={name}>
                <FieldLabel htmlFor={`new-${name}`}>
                  {label}
                  {name === 'fullName' || name === 'title' ? ' (required)' : ' (optional)'}
                </FieldLabel>
                <Input
                  id={`new-${name}`}
                  name={name}
                  type={name === 'email' ? 'email' : 'text'}
                  required={name === 'fullName' || name === 'title'}
                  maxLength={name === 'email' ? uploadLimits.email : uploadLimits.shortText}
                  disabled={create.isPending}
                />
              </Field>
            ))}
            {create.error ? <Failure error={create.error} /> : null}
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

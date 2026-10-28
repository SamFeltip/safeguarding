import { X } from 'lucide-react';
import { usePerson } from '@/hooks/use-records';
import { PersonSelect } from './record-select';
import { Button } from './ui/button';

function SelectedPerson({ id, onRemove }: { id: string; onRemove: () => void }) {
  const query = usePerson(id);
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border px-3 py-1">
      <span>{query.data?.fullName ?? 'Selected person'}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        aria-label={`Remove ${query.data?.fullName ?? 'person'}`}
      >
        <X />
      </Button>
    </li>
  );
}
export function PeoplePicker({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      <PersonSelect
        onChange={(id) => {
          if (id && !values.includes(id)) onChange([...values, id]);
        }}
      />
      <ul className="space-y-2">
        {values.map((id) => (
          <SelectedPerson
            key={id}
            id={id}
            onRemove={() => {
              onChange(values.filter((value) => value !== id));
            }}
          />
        ))}
      </ul>
    </div>
  );
}

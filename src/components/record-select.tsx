import { useCases, usePeople } from '@/hooks/use-records';
import { Failure } from './feedback';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface RecordSelectProperties {
  value?: string;
  onChange: (value: string | undefined) => void;
}
function RecordSelect({
  value,
  onChange,
  options,
  label,
  more,
  loadMore,
  pending,
}: RecordSelectProperties & {
  options: { id: string; label: string }[];
  label: string;
  more: boolean;
  loadMore: () => void;
  pending: boolean;
}) {
  return (
    <Select
      value={value ?? 'none'}
      onValueChange={(value) => {
        if (value === 'more') loadMore();
        else onChange(value === 'none' ? undefined : value);
      }}
    >
      <SelectTrigger aria-label={label} className="w-full">
        <SelectValue className="min-w-0 truncate" />
      </SelectTrigger>
      <SelectContent className="max-w-[calc(100vw-2rem)] [overflow-wrap:anywhere]">
        <SelectGroup>
          <SelectItem value="none">No {label.toLowerCase()}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
          {more ? (
            <SelectItem value="more" disabled={pending}>
              Load more…
            </SelectItem>
          ) : null}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
export function PersonSelect(props: RecordSelectProperties) {
  const query = usePeople();
  const people = query.data?.pages.flatMap((page) => page.people) ?? [];
  const options = people.map((person) => ({ id: person.id, label: person.fullName }));
  const selected = people.some((person) => person.id === props.value);
  if (props.value && !selected) options.unshift({ id: props.value, label: 'Selected person' });
  return (
    <div className="space-y-2">
      <RecordSelect
        {...props}
        options={options}
        label="Person"
        more={query.hasNextPage}
        pending={query.isFetchingNextPage}
        loadMore={() => {
          void query.fetchNextPage();
        }}
      />
      {query.error ? <Failure error={query.error} /> : null}
    </div>
  );
}
export function CaseSelect({ personId, ...props }: RecordSelectProperties & { personId?: string }) {
  const query = useCases(personId);
  const cases = query.data?.pages.flatMap((page) => page.cases) ?? [];
  const options = cases.map((record) => ({ id: record.id, label: record.title }));
  if (props.value && !cases.some((record) => record.id === props.value)) {
    options.unshift({ id: props.value, label: 'Selected case' });
  }
  return (
    <div className="space-y-2">
      <RecordSelect
        {...props}
        options={options}
        label="Case"
        more={query.hasNextPage}
        pending={query.isFetchingNextPage}
        loadMore={() => {
          void query.fetchNextPage();
        }}
      />
      {query.error ? <Failure error={query.error} /> : null}
    </div>
  );
}

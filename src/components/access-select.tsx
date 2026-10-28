import { audiences, audienceSchema } from '../../shared/documents';
import type { DocumentSummary } from '../../shared/documents';
import { useRecordAccess } from '@/hooks/use-record-access';
import { audienceLabels } from '@/lib/onboarding-fields';
import { Failure } from '@/components/feedback';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export function AccessSelect({
  document,
  collection = 'documents',
}: {
  document: Pick<DocumentSummary, 'id' | 'fullName' | 'audience'>;
  collection?: 'documents' | 'people' | 'cases';
}) {
  const update = useRecordAccess(document.id, collection);
  return (
    <div className="space-y-2">
      <Select
        value={document.audience}
        disabled={update.isPending}
        onValueChange={(value) => {
          update.mutate(audienceSchema.parse(value));
        }}
      >
        <SelectTrigger
          aria-label={`Access for ${document.fullName}`}
          className="w-full min-w-28 sm:w-40"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {audiences.map((audience) => (
              <SelectItem key={audience} value={audience}>
                {audienceLabels[audience]}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {update.error ? <Failure error={update.error} /> : null}
    </div>
  );
}

import type { Onboarding } from '../../shared/documents';
import type { DocumentLinks } from '../../shared/records';
import { OnboardingFields } from '@/components/onboarding-fields';
import { Failure } from '@/components/feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel, FieldSet, FieldLegend } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import { employmentTypes, generateDocumentTitle } from '../../shared/documents';
import type { Audience } from '../../shared/documents';
import { AttachmentUpload } from './attachment-upload';
import { uploadLimits } from '../../shared/limits';

interface OnboardingFormProperties {
  allowed: Audience[];
  defaults?: Partial<Onboarding>;
  links?: DocumentLinks;
  cancelTo?: string;
  pending: boolean;
  error: Error | null;
  onSubmit: (form: FormData) => void;
}

export function OnboardingForm({
  allowed,
  pending,
  error,
  onSubmit,
  defaults,
  links,
  cancelTo = '/',
}: OnboardingFormProperties) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget));
      }}
    >
      <FieldGroup>
        <p className="text-sm text-muted-foreground">All fields are optional.</p>
        {links?.personId ? <input type="hidden" name="personId" value={links.personId} /> : null}
        {links?.caseId ? <input type="hidden" name="caseId" value={links.caseId} /> : null}
        <input type="hidden" name="audience" value={allowed.at(-1)} />
        <Field>
          <FieldLabel htmlFor="title">Document title (optional)</FieldLabel>
          <Input
            id="title"
            name="title"
            placeholder={generateDocumentTitle()}
            maxLength={uploadLimits.shortText}
            disabled={pending}
          />
        </Field>
        <FieldSet disabled={pending}>
          <FieldLegend>Employee</FieldLegend>
          <FieldGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <OnboardingFields section="person" defaults={defaults} />
          </FieldGroup>
        </FieldSet>
        <FieldSet disabled={pending}>
          <FieldLegend>Employment</FieldLegend>
          <FieldGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <OnboardingFields section="work" defaults={defaults} />
            <Field>
              <FieldLabel htmlFor="employmentType">Employment type</FieldLabel>
              <Select name="employmentType" defaultValue="" disabled={pending}>
                <SelectTrigger id="employmentType" className="w-full">
                  <SelectValue placeholder="Select employment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {employmentTypes.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </FieldSet>
        <FieldSet disabled={pending}>
          <FieldLegend>Onboarding</FieldLegend>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="equipment">Equipment requirements</FieldLabel>
              <Textarea id="equipment" name="equipment" maxLength={uploadLimits.equipment} />
            </Field>
            <Field>
              <FieldLabel htmlFor="notes">Additional notes</FieldLabel>
              <Textarea id="notes" name="notes" maxLength={uploadLimits.notes} />
            </Field>
            <Field>
              <AttachmentUpload />
            </Field>
          </FieldGroup>
        </FieldSet>

        {error ? <Failure error={error} /> : null}
        <Field orientation="horizontal">
          <Button type="submit" disabled={pending}>
            {pending ? 'Uploading…' : 'Submit document'}
          </Button>
          <Button asChild variant="outline">
            <Link to={cancelTo}>Cancel</Link>
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

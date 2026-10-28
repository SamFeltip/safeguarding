import type { Onboarding } from '../../shared/documents';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { basicFields, onboardingLabels } from '@/lib/onboarding-fields';
import { uploadLimits } from '../../shared/limits';

export function OnboardingFields({
  section,
  defaults,
}: {
  section: 'person' | 'work';
  defaults?: Partial<Onboarding>;
}) {
  const fields = basicFields.filter(
    ({ name }) => (name === 'fullName' || name === 'email') === (section === 'person'),
  );
  return fields.map(({ name, type }) => (
    <Field key={name}>
      <FieldLabel htmlFor={name}>{onboardingLabels[name]}</FieldLabel>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaults?.[name]}
        maxLength={name === 'email' ? uploadLimits.email : uploadLimits.shortText}
      />
    </Field>
  ));
}

import type { Onboarding } from '../../shared/documents';
import { onboardingLabels } from '@/lib/onboarding-fields';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from './ui/item';

export function DocumentFields({
  onboarding,
  fields,
  columns = false,
}: {
  onboarding: Onboarding;
  fields: (keyof Onboarding)[];
  columns?: boolean;
}) {
  return (
    <ItemGroup className={columns ? 'grid grid-cols-1 sm:grid-cols-2' : undefined}>
      {fields.map((key) => (
        <Item key={key} role="listitem">
          <ItemContent className="min-w-0">
            <ItemTitle className="text-muted-foreground">{onboardingLabels[key]}</ItemTitle>
            {/* Show complete submitted values, including multiline notes. */}
            <ItemDescription className="line-clamp-none whitespace-pre-wrap break-words text-base font-medium text-foreground">
              {onboarding[key] === '' ? '—' : (onboarding[key] ?? '—')}
            </ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  );
}

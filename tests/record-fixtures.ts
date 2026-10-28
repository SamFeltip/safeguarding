import type { Miniflare } from 'miniflare';
import { personSchema, caseSchema } from '../shared/records';
import { permissions } from '../shared/documents';

export async function seedCase(emulator: Miniflare) {
  const headers = {
    'X-Test-Permissions': `${permissions.company},${permissions.create}`,
    'Content-Type': 'application/json',
  };
  const response = await emulator.dispatchFetch('http://test/people', {
    method: 'POST',
    headers,
    body: JSON.stringify({ fullName: 'Alex Morgan', email: 'alex@example.com' }),
  });
  const person = personSchema.parse(await response.json());
  const created = await emulator.dispatchFetch('http://test/cases', {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: 'Onboarding', personId: person.id }),
  });
  return { person, record: caseSchema.parse(await created.json()) };
}

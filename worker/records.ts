import type { Context } from 'hono';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { permissions, readableAudiences } from '../shared/documents';
import {
  casePeople,
  caseInputSchema,
  caseSchema,
  personInputSchema,
  personSchema,
} from '../shared/records';
import { storageLimits } from '../shared/limits';
import { readCase, readPerson } from './record-store';
import { requirePermission } from './authorization';
import { readCursor } from './pagination';
import type { WorkerContext } from './context';

export const records = new Hono<WorkerContext>();

records.get('/people', async (context) => {
  const page = await context.env.DOCUMENTS.list({
    prefix: 'people/',
    limit: storageLimits.pageSize,
    ...readCursor(context.req.query('cursor')),
  });
  const people = await Promise.all(
    page.objects.map(async (object) => {
      try {
        return await readPerson(
          context.env.DOCUMENTS,
          object.key.slice(7, -5),
          context.get('identity').permissions,
        );
      } catch (error) {
        if (error instanceof HTTPException && error.status === 404) return;
        throw error;
      }
    }),
  );
  context.set(
    'accessedPersonIds',
    people.flatMap((person) => (person ? [person.id] : [])),
  );
  return context.json({
    people: people.filter((person) => person !== undefined),
    cursor: page.truncated ? page.cursor : null,
  });
});
records.get('/people/:id', async (context) => {
  context.set('accessedPersonIds', [context.req.param('id')]);
  return context.json(
    await readPerson(
      context.env.DOCUMENTS,
      context.req.param('id'),
      context.get('identity').permissions,
    ),
  );
});
records.get('/cases', async (context) => {
  const personId = context.req.query('personId');
  const grants = context.get('identity').permissions;
  if (personId) await readPerson(context.env.DOCUMENTS, personId, grants);
  const page = await context.env.DOCUMENTS.list({
    prefix: 'cases/',
    limit: storageLimits.pageSize,
    ...readCursor(context.req.query('cursor')),
  });
  const cases = await Promise.all(
    page.objects.map(async (object) => {
      try {
        const record = await readCase(context.env.DOCUMENTS, object.key.slice(6, -5), grants);
        return !personId || casePeople(record).includes(personId) ? record : undefined;
      } catch (error) {
        if (error instanceof HTTPException && error.status === 404) return;
        throw error;
      }
    }),
  );
  context.set(
    'accessedCaseIds',
    cases.flatMap((record) => (record ? [record.id] : [])),
  );
  return context.json({
    cases: cases.filter((record) => record !== undefined),
    cursor: page.truncated ? page.cursor : null,
  });
});
records.get('/cases/:id', async (context) => {
  context.set('accessedCaseIds', [context.req.param('id')]);
  return context.json(
    await readCase(
      context.env.DOCUMENTS,
      context.req.param('id'),
      context.get('identity').permissions,
    ),
  );
});
records.on(
  'POST',
  ['/people', '/cases'],
  requirePermission(permissions.create, 'Creation permission required.'),
  bodyLimit({ maxSize: 4096 }),
  async (context: Context<WorkerContext>) => {
    const collection = z.enum(['people', 'cases']).safeParse(context.req.path.split('/').at(-1));
    if (!collection.success) return context.notFound();
    const schema = collection.data === 'people' ? personInputSchema : caseInputSchema;
    const input = schema.safeParse(await context.req.json());
    if (!input.success) return context.json({ error: 'Check the form fields.' }, 400);
    const identity = context.get('identity');
    if ('personIds' in input.data)
      for (const id of casePeople(input.data))
        await readPerson(context.env.DOCUMENTS, id, identity.permissions);
    const audience = readableAudiences(identity.permissions).at(-1);
    if (!audience) return context.json({ error: 'Read permission required.' }, 403);
    const value = {
      ...input.data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      createdBy: identity.subject,
      audience,
    };
    const record =
      collection.data === 'people' ? personSchema.parse(value) : caseSchema.parse(value);
    const stored = await context.env.DOCUMENTS.put(
      `${collection.data}/${record.id}.json`,
      JSON.stringify(record),
      {
        onlyIf: { etagDoesNotMatch: '*' },
        httpMetadata: { contentType: 'application/json' },
      },
    );
    if (!stored) return context.json({ error: 'Record already exists.' }, 409);
    context.set(collection.data === 'people' ? 'accessedPersonIds' : 'accessedCaseIds', [
      record.id,
    ]);
    return context.json(record, 201);
  },
);

records.put(
  '/cases/:id/people',
  requirePermission(permissions.create, 'Creation permission required.'),
  bodyLimit({ maxSize: 4096 }),
  async (context) => {
    const grants = context.get('identity').permissions;
    const id = context.req.param('id');
    const record = await readCase(context.env.DOCUMENTS, id, grants);
    const input = z
      .strictObject({ personIds: z.array(z.uuid()).max(50) })
      .safeParse(await context.req.json());
    if (!input.success) return context.json({ error: 'Select valid people.' }, 400);
    for (const personId of input.data.personIds)
      await readPerson(context.env.DOCUMENTS, personId, grants);
    const object = await context.env.DOCUMENTS.get(`cases/${id}.json`);
    if (!object) return context.notFound();
    const stored = caseSchema.parse(await object.json());
    const { personId: _personId, ...rest } = stored;
    const updated = { ...rest, personIds: [...new Set(input.data.personIds)] };
    const result = await context.env.DOCUMENTS.put(`cases/${id}.json`, JSON.stringify(updated), {
      onlyIf: { etagMatches: object.etag },
      httpMetadata: { contentType: 'application/json' },
    });
    if (!result) return context.json({ error: 'Case changed. Refresh and retry.' }, 409);
    context.set('accessedCaseIds', [id]);
    context.set('accessedPersonIds', updated.personIds);
    return context.json({ ...updated, audience: record.audience });
  },
);

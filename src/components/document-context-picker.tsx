import { CaseSelect, PersonSelect } from './record-select';
import { RecordCreateDialog } from './record-create-dialog';
import { Field, FieldGroup, FieldTitle } from './ui/field';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function DocumentContextPicker({
  personId,
  caseId,
  onPerson,
  onCase,
}: {
  personId?: string;
  caseId?: string;
  onPerson: (id: string | undefined) => void;
  onCase: (id: string | undefined) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Person & case</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field>
            <FieldTitle>Person</FieldTitle>
            <PersonSelect value={personId} onChange={onPerson} />
            <RecordCreateDialog collection="people" onCreated={onPerson} />
          </Field>
          <Field>
            <FieldTitle>Case (required)</FieldTitle>
            <CaseSelect personId={personId} value={caseId} onChange={onCase} />
            <RecordCreateDialog collection="cases" personId={personId} onCreated={onCase} />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

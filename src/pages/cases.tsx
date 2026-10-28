import { useNavigate } from 'react-router-dom';
import { permissions } from '../../shared/documents';
import { usePermissions } from '@/components/identity';
import { CaseList } from '@/components/case-list';
import { RecordCreateDialog } from '@/components/record-create-dialog';

export function CasesPage() {
  const grants = usePermissions();
  const navigate = useNavigate();
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Cases</h1>
        {grants.includes(permissions.create) ? (
          <RecordCreateDialog
            collection="cases"
            onCreated={(id) => {
              void navigate(`/cases/${id}`);
            }}
          />
        ) : null}
      </div>
      <CaseList />
    </div>
  );
}

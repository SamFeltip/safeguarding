import { PeopleAccessPanel, CasesAccessPanel } from '@/components/record-access-panel';
import { ShieldCheck } from 'lucide-react';
import { permissions } from '../../shared/documents';
import { usePermissions } from '@/components/identity';
import { Failure } from '@/components/feedback';
import { BackupPanel } from '@/components/backup-panel';
import { DocumentAccessPanel } from '@/components/document-access-panel';
import { PageBreadcrumb } from '@/components/page-breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AdminPage() {
  const grants = usePermissions();
  if (!grants.includes(permissions.admin)) {
    return <Failure error={new Error('Administrator access required.')} />;
  }
  return (
    <div className="space-y-8">
      <PageBreadcrumb items={[{ label: 'Documents', to: '/' }, { label: 'Admin settings' }]} />
      <div className="space-y-3">
        <Badge variant="secondary">
          <ShieldCheck /> Administration
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Admin settings</h1>
      </div>
      <Tabs defaultValue="access" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 gap-1 group-data-[orientation=horizontal]/tabs:h-auto [&_[data-slot=tabs-trigger]]:h-10 sm:inline-flex sm:w-fit sm:[&_[data-slot=tabs-trigger]]:h-8">
          <TabsTrigger value="access">Document access</TabsTrigger>
          <TabsTrigger value="people">People access</TabsTrigger>
          <TabsTrigger value="cases">Case access</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
        </TabsList>
        <TabsContent value="access">
          <DocumentAccessPanel />
        </TabsContent>
        <TabsContent value="people">
          <PeopleAccessPanel />
        </TabsContent>
        <TabsContent value="cases">
          <CasesAccessPanel />
        </TabsContent>
        <TabsContent value="backups">
          <BackupPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

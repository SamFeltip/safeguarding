import { PeopleAccessPanel, CasesAccessPanel } from '@/components/record-access-panel';
import { ShieldCheck } from 'lucide-react';
import { permissions } from '../../shared/documents';
import { usePermissions } from '@/components/identity';
import { Failure } from '@/components/feedback';
import { BackupPanel } from '@/components/backup-panel';
import { DocumentAccessPanel } from '@/components/document-access-panel';
import { PageBreadcrumb } from '@/components/page-breadcrumb';
import { Badge } from '@/components/ui/badge';
import { InvitationPanel } from '@/components/invitation-panel';
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
      <Tabs
        defaultValue="access"
        orientation="vertical"
        className="flex-col items-stretch gap-6 lg:flex-row lg:items-start"
      >
        <TabsList
          aria-label="Admin settings"
          className="w-full shrink-0 gap-1 rounded-xl border bg-card p-2 lg:sticky lg:top-6 lg:w-52 [&_[data-slot=tabs-trigger]]:min-h-11 [&_[data-slot=tabs-trigger]]:flex-none [&_[data-slot=tabs-trigger]]:px-3 [&_[data-slot=tabs-trigger]]:data-[state=active]:bg-accent [&_[data-slot=tabs-trigger]]:data-[state=active]:text-accent-foreground"
        >
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="access">Document access</TabsTrigger>
          <TabsTrigger value="people">People access</TabsTrigger>
          <TabsTrigger value="cases">Case access</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts" className="min-w-0">
          <InvitationPanel />
        </TabsContent>
        <TabsContent value="access" className="min-w-0">
          <DocumentAccessPanel />
        </TabsContent>
        <TabsContent value="people" className="min-w-0">
          <PeopleAccessPanel />
        </TabsContent>
        <TabsContent value="cases" className="min-w-0">
          <CasesAccessPanel />
        </TabsContent>
        <TabsContent value="backups" className="min-w-0">
          <BackupPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

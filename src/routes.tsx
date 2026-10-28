import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Failure, Loading } from '@/components/feedback';

const DocumentsPage = lazy(async () => {
  const page = await import('@/pages/documents');
  return { default: page.DocumentsPage };
});
const DocumentPage = lazy(async () => {
  const page = await import('@/pages/document');
  return { default: page.DocumentPage };
});
const NewDocumentPage = lazy(async () => {
  const page = await import('@/pages/new-document');
  return { default: page.NewDocumentPage };
});

const AdminPage = lazy(async () => {
  const page = await import('@/pages/admin');
  return { default: page.AdminPage };
});
const AccountPage = lazy(async () => {
  const page = await import('@/pages/account');
  return { default: page.AccountPage };
});

const PeoplePage = lazy(async () => {
  const page = await import('@/pages/people');
  return { default: page.PeoplePage };
});
const PersonPage = lazy(async () => {
  const page = await import('@/pages/person');
  return { default: page.PersonPage };
});
const CasesPage = lazy(async () => {
  const page = await import('@/pages/cases');
  return { default: page.CasesPage };
});
const CasePage = lazy(async () => {
  const page = await import('@/pages/case');
  return { default: page.CasePage };
});

export function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<DocumentsPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/people/:id" element={<PersonPage />} />
        <Route path="/cases" element={<CasesPage />} />
        <Route path="/cases/:id" element={<CasePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/documents/new" element={<NewDocumentPage />} />
        <Route path="/documents/:id" element={<DocumentPage />} />
        <Route path="*" element={<Failure error={new Error('Page not found.')} />} />
      </Routes>
    </Suspense>
  );
}

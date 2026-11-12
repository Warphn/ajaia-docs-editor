import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { RequireAuth } from './auth/RequireAuth';
import { FullPageMessage } from './components/FullPageMessage';
import { DocumentsPage } from './pages/DocumentsPage';
import { LoginPage } from './pages/LoginPage';

// The editor (TipTap/ProseMirror) is the heaviest part of the bundle; load it only when a document is opened.
const EditorPage = lazy(() => import('./pages/EditorPage').then((module) => ({ default: module.EditorPage })));

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/documents"
        element={
          <RequireAuth>
            <DocumentsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/documents/:documentId"
        element={
          <RequireAuth>
            <Suspense fallback={<FullPageMessage title="Opening document…" />}>
              <EditorPage />
            </Suspense>
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to="/documents" replace />} />
      <Route
        path="*"
        element={<FullPageMessage title="Page not found" description="Check the address or go back to your documents." />}
      />
    </Routes>
  );
}

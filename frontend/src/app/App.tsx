import { RouterProvider } from 'react-router';
import { Toaster } from 'sileo';
import { router } from './routes';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" theme="light" offset={{ top: 70 }} options={{ duration: 4000 }} />
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
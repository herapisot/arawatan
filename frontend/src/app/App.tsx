import { RouterProvider } from 'react-router';
import { Toaster } from 'sileo';
import { router } from './routes';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" theme="light" />
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
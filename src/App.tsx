import { RouterProvider } from 'react-router-dom';
import router from './router';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <ToastProvider />
    </AuthProvider>
  );
}

import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { AIProvider } from '../contexts/AIContext';
import { CrudPagesProvider } from '../contexts/CrudPagesContext';
import { SocketProvider } from '../contexts/SocketContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SocketProvider>
        <CrudPagesProvider>
          <AIProvider>
            <Outlet />
          </AIProvider>
        </CrudPagesProvider>
      </SocketProvider>
    </AuthProvider>
  );
} 
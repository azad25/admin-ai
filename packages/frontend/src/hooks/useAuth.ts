import { useState, useEffect } from 'react';
import { User } from '@admin-ai/shared';

// Mock user for development
const mockUser: User = {
  id: 'dev-user-123',
  email: 'dev@example.com',
  name: 'Development User',
  role: 'ADMIN',
  createdAt: new Date(),
  updatedAt: new Date()
};

export const useAuth = () => {
  const [user] = useState<User | null>(mockUser);
  const [isAuthenticated] = useState(true);
  const [token] = useState('mock-token-for-development');

  useEffect(() => {
    // In a real implementation, this would verify the token with the backend
    console.log('Auth state initialized with mock user for development');
  }, []);

  return {
    user,
    isAuthenticated,
    token
  };
}; 
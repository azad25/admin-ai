import { useSelector } from 'react-redux';
import { RootState } from '../store';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export const useAuth = () => {
  const user = useSelector((state: RootState) => state.auth.user) as User | null;
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const token = useSelector((state: RootState) => state.auth.token);

  return {
    user,
    isAuthenticated,
    token
  };
}; 
import { useContext } from 'react';
import AuthContext from './AuthContext.jsx';

// Lightweight adapter exposing a minimal, stable API for consumers.
export function useAuthApi() {
  const ctx = useContext(AuthContext);
  return {
    // keep `user` for backward compatibility with consumers using `auth.user`
    user: () => ctx?.user ?? null,
    getUser: () => ctx?.user ?? null,
    login: (...args) => ctx?.login && ctx.login(...args),
    logout: () => ctx?.logout && ctx.logout(),
    isAuthenticated: () => !!ctx?.user,
  };
}

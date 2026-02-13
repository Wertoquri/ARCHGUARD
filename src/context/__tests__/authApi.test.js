import { describe, it, expect, vi } from 'vitest';

// module under test
import * as authApiModule from '../authApi.js';

// We'll mock react's useContext to return a fake context
vi.mock('react', () => {
  // provide both default (React) and named exports used by modules
  const createContext = (v) => ({ _default: v });
  return {
    default: { createContext },
    createContext,
    useContext: () => ({
      user: { id: 'u1', name: 'Alice' },
      login: vi.fn(),
      logout: vi.fn(),
    }),
  };
});

describe('useAuthApi adapter', () => {
  it('exposes getUser, user(), login, logout, isAuthenticated', () => {
    const api = authApiModule.useAuthApi();
    expect(typeof api.getUser).toBe('function');
    expect(typeof api.user).toBe('function');
    expect(typeof api.login).toBe('function');
    expect(typeof api.logout).toBe('function');
    expect(typeof api.isAuthenticated).toBe('function');

    expect(api.getUser()).toEqual({ id: 'u1', name: 'Alice' });
    expect(api.user()).toEqual({ id: 'u1', name: 'Alice' });
    expect(api.isAuthenticated()).toBe(true);
  });
});

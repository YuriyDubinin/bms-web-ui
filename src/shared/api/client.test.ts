import { describe, it, expect } from 'vitest';
import { ApiError, isAuthError, isCredentialsError } from './types';

describe('ApiError', () => {
  it('exposes code, status and details', () => {
    const err = new ApiError('VALIDATION_ERROR', 'Bad input', 422, [
      { field: 'email', message: 'required' },
    ]);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.status).toBe(422);
    expect(err.message).toBe('Bad input');
    expect(err.details?.[0]?.field).toBe('email');
  });

  it('defaults status to 0 for network-level errors', () => {
    const err = new ApiError('NETWORK_ERROR', 'Network error');
    expect(err.status).toBe(0);
    expect(err.details).toBeUndefined();
  });
});

describe('isAuthError', () => {
  it('matches all auth codes', () => {
    expect(isAuthError('UNAUTHORIZED')).toBe(true);
    expect(isAuthError('TOKEN_EXPIRED')).toBe(true);
    expect(isAuthError('TOKEN_REVOKED')).toBe(true);
    expect(isAuthError('EMPLOYEE_DISABLED')).toBe(true);
  });

  it('rejects non-auth codes', () => {
    expect(isAuthError('VALIDATION_ERROR')).toBe(false);
    expect(isAuthError('INVALID_CREDENTIALS')).toBe(false);
    expect(isAuthError('NETWORK_ERROR')).toBe(false);
  });
});

describe('isCredentialsError', () => {
  it('matches only INVALID_CREDENTIALS', () => {
    expect(isCredentialsError('INVALID_CREDENTIALS')).toBe(true);
    expect(isCredentialsError('UNAUTHORIZED')).toBe(false);
  });
});

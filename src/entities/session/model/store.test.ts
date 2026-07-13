import { describe, it, expect, beforeEach } from 'vitest';
import { isTokenValid, useSessionStore } from './store';

const FIVE_MIN = 5 * 60 * 1000;
const SAFETY_MARGIN_MS = 30_000;

const futureIso = (ms: number) => new Date(Date.now() + ms).toISOString();

describe('useSessionStore', () => {
  beforeEach(() => {
    // Сбрасываем стор перед каждым тестом — устанавливаем «выход».
    useSessionStore.getState().clearSession(null);
  });

  it('clearSession resets state to unauthenticated', () => {
    useSessionStore.setState({
      status: 'authenticated',
      token: 'tok',
      expiresAt: futureIso(FIVE_MIN),
      employee: { id: '1', full_name: 'A', email: 'a@b', role: 'admin' },
      error: null,
      flag: null,
    });

    useSessionStore.getState().clearSession(null);
    const s = useSessionStore.getState();

    expect(s.status).toBe('unauthenticated');
    expect(s.token).toBeNull();
    expect(s.employee).toBeNull();
    expect(s.expiresAt).toBeNull();
  });

  it('clearSession with flag stores reason and message', () => {
    useSessionStore.setState({ token: 'tok', expiresAt: futureIso(FIVE_MIN) });
    useSessionStore.getState().clearSession({ reason: 'expired', message: 'gone' });

    const flag = useSessionStore.getState().flag;
    expect(flag?.reason).toBe('expired');
    expect(flag?.message).toBe('gone');
  });

  it('consumeFlag returns and clears the flag', () => {
    useSessionStore.setState({ flag: { reason: 'revoked', message: 'm' } });

    const first = useSessionStore.getState().consumeFlag();
    const second = useSessionStore.getState().consumeFlag();

    expect(first?.reason).toBe('revoked');
    expect(second).toBeNull();
  });
});

describe('isTokenValid', () => {
  it('returns false when token is missing', () => {
    expect(isTokenValid({ token: null, expiresAt: futureIso(FIVE_MIN) } as never)).toBe(false);
  });

  it('returns false when expiresAt is missing', () => {
    expect(isTokenValid({ token: 'tok', expiresAt: null } as never)).toBe(false);
  });

  it('returns true with comfortable margin', () => {
    expect(
      isTokenValid({ token: 'tok', expiresAt: futureIso(FIVE_MIN) } as never),
    ).toBe(true);
  });

  it('returns false when expiry is within 30s safety margin', () => {
    expect(
      isTokenValid({ token: 'tok', expiresAt: futureIso(SAFETY_MARGIN_MS - 5_000) } as never),
    ).toBe(false);
  });

  it('returns false when already expired', () => {
    expect(isTokenValid({ token: 'tok', expiresAt: futureIso(-1000) } as never)).toBe(false);
  });
});

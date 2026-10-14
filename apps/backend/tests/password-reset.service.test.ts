import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailDeliveryError } from '@/lib/errors.js';
import { hashPassword, verifyPassword } from '@/lib/hash.js';
import { InvalidOrExpiredResetTokenError } from '@/modules/password-reset/password-reset.errors.js';
import { PasswordResetService } from '@/modules/password-reset/password-reset.service.js';

vi.mock('@/lib/hash.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-code'),
  verifyPassword: vi.fn(),
}));

const sendPasswordResetEmail = vi
  .fn<(to: string, code: string) => Promise<void>>()
  .mockResolvedValue(undefined);

const VERIFY_INPUT = {
  email: 'a@b.com',
  code: '123456',
  password: 'newpassword',
  confirmPassword: 'newpassword',
};

function makeUsers() {
  return { findByEmail: vi.fn() };
}

function makeTokens() {
  return {
    invalidateToken: vi.fn().mockResolvedValue({ count: 1 }),
    replaceActiveToken: vi.fn().mockResolvedValue({ id: 'token-1' }),
    claimVerificationAttempt: vi.fn(),
    commitVerifiedReset: vi.fn().mockResolvedValue(undefined),
  };
}

describe('PasswordResetService.request', () => {
  beforeEach(() => {
    vi.mocked(sendPasswordResetEmail).mockReset();
    vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined);
    vi.mocked(hashPassword).mockClear();
    vi.mocked(verifyPassword).mockReset();
  });

  it('returns without sending when the email is unknown', async () => {
    const users = makeUsers();
    users.findByEmail.mockResolvedValue(null);
    const tokens = makeTokens();
    const service = new PasswordResetService(users, tokens, sendPasswordResetEmail);

    await service.request({ email: 'missing@b.com' });

    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(tokens.replaceActiveToken).not.toHaveBeenCalled();
  });

  it('stores a hash and emails the raw code', async () => {
    const users = makeUsers();
    users.findByEmail.mockResolvedValue({ id: '1', email: 'a@b.com' });
    const tokens = makeTokens();
    const service = new PasswordResetService(users, tokens, sendPasswordResetEmail);

    await service.request({ email: 'a@b.com' });

    expect(tokens.replaceActiveToken).toHaveBeenCalledWith('1', 'hashed-code', expect.any(Date));
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      'a@b.com',
      expect.stringMatching(/^\d{6}$/),
    );
  });

  it('invalidates the new code and throws when the email fails', async () => {
    const users = makeUsers();
    users.findByEmail.mockResolvedValue({ id: '1', email: 'a@b.com' });
    const tokens = makeTokens();
    vi.mocked(sendPasswordResetEmail).mockRejectedValueOnce(new Error('down'));
    const service = new PasswordResetService(users, tokens, sendPasswordResetEmail);

    await expect(service.request({ email: 'a@b.com' })).rejects.toBeInstanceOf(EmailDeliveryError);
    expect(tokens.invalidateToken).toHaveBeenCalledOnce();
    expect(tokens.invalidateToken).toHaveBeenLastCalledWith('token-1');
  });
});

describe('PasswordResetService.check', () => {
  beforeEach(() => {
    vi.mocked(hashPassword).mockClear();
    vi.mocked(verifyPassword).mockReset();
  });

  it('rejects an unknown email without looking up codes', async () => {
    const users = makeUsers();
    users.findByEmail.mockResolvedValue(null);
    const tokens = makeTokens();
    const service = new PasswordResetService(users, tokens, sendPasswordResetEmail);

    await expect(service.check({ email: 'missing@b.com', code: '123456' })).rejects.toBeInstanceOf(
      InvalidOrExpiredResetTokenError,
    );
    expect(tokens.claimVerificationAttempt).not.toHaveBeenCalled();
    expect(tokens.commitVerifiedReset).not.toHaveBeenCalled();
  });

  it('accepts a matching code without consuming it', async () => {
    const users = makeUsers();
    users.findByEmail.mockResolvedValue({ id: '1', email: 'a@b.com' });
    const tokens = makeTokens();
    tokens.claimVerificationAttempt.mockResolvedValue([{ id: 't1', codeHash: 'h1' }]);
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);
    const service = new PasswordResetService(users, tokens, sendPasswordResetEmail);

    await service.check({ email: 'a@b.com', code: '123456' });

    expect(tokens.commitVerifiedReset).not.toHaveBeenCalled();
  });
});

describe('PasswordResetService.verify', () => {
  beforeEach(() => {
    vi.mocked(hashPassword).mockClear();
    vi.mocked(verifyPassword).mockReset();
  });

  it('hashes the new password and commits the reset in one call', async () => {
    const users = makeUsers();
    users.findByEmail.mockResolvedValue({ id: '1', email: 'a@b.com' });
    const tokens = makeTokens();
    tokens.claimVerificationAttempt.mockResolvedValue([
      { id: 't1', codeHash: 'h1' },
      { id: 't2', codeHash: 'h2' },
    ]);
    vi.mocked(verifyPassword).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const service = new PasswordResetService(users, tokens, sendPasswordResetEmail);

    await service.verify(VERIFY_INPUT);

    expect(hashPassword).toHaveBeenCalledWith('newpassword');
    expect(tokens.commitVerifiedReset).toHaveBeenCalledWith('1', 't2', 'hashed-code');
  });

  it('does not commit when no code matches', async () => {
    const users = makeUsers();
    users.findByEmail.mockResolvedValue({ id: '1', email: 'a@b.com' });
    const tokens = makeTokens();
    tokens.claimVerificationAttempt.mockResolvedValue([{ id: 't1', codeHash: 'h1' }]);
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);
    const service = new PasswordResetService(users, tokens, sendPasswordResetEmail);

    await expect(service.verify(VERIFY_INPUT)).rejects.toBeInstanceOf(
      InvalidOrExpiredResetTokenError,
    );
    expect(hashPassword).not.toHaveBeenCalled();
    expect(tokens.commitVerifiedReset).not.toHaveBeenCalled();
  });

  it('propagates a stale code rejected by the commit', async () => {
    const users = makeUsers();
    users.findByEmail.mockResolvedValue({ id: '1', email: 'a@b.com' });
    const tokens = makeTokens();
    tokens.claimVerificationAttempt.mockResolvedValue([{ id: 't1', codeHash: 'h1' }]);
    tokens.commitVerifiedReset.mockRejectedValueOnce(new InvalidOrExpiredResetTokenError());
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);
    const service = new PasswordResetService(users, tokens, sendPasswordResetEmail);

    await expect(service.verify(VERIFY_INPUT)).rejects.toBeInstanceOf(
      InvalidOrExpiredResetTokenError,
    );
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailDeliveryError } from '@/lib/errors.js';
import { PasswordResetService } from '@/modules/password-reset/password-reset.service.js';

vi.mock('@/lib/hash.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-code'),
  verifyPassword: vi.fn(),
}));

vi.mock('@/lib/email.js', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

import { sendPasswordResetEmail } from '@/lib/email.js';

function makeUsers() {
  return { findByEmail: vi.fn() };
}

function makeTokens() {
  return {
    invalidateActiveForUser: vi.fn().mockResolvedValue({ count: 1 }),
    createToken: vi.fn().mockResolvedValue({ id: 'token-1' }),
    findActiveTokensByUserId: vi.fn(),
    markUsed: vi.fn(),
  };
}

describe('PasswordResetService.request', () => {
  beforeEach(() => {
    vi.mocked(sendPasswordResetEmail).mockReset();
    vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined);
  });

  it('returns without sending when the email is unknown', async () => {
    const users = makeUsers();
    users.findByEmail.mockResolvedValue(null);
    const tokens = makeTokens();
    const service = new PasswordResetService(users as never, tokens as never);

    await service.request({ email: 'missing@b.com' });

    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(tokens.createToken).not.toHaveBeenCalled();
  });

  it('stores a hash and emails the raw code', async () => {
    const users = makeUsers();
    users.findByEmail.mockResolvedValue({ id: '1', email: 'a@b.com' });
    const tokens = makeTokens();
    const service = new PasswordResetService(users as never, tokens as never);

    await service.request({ email: 'a@b.com' });

    expect(tokens.createToken).toHaveBeenCalledWith('1', 'hashed-code', expect.any(Date));
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
    const service = new PasswordResetService(users as never, tokens as never);

    await expect(service.request({ email: 'a@b.com' })).rejects.toBeInstanceOf(EmailDeliveryError);
    expect(tokens.invalidateActiveForUser).toHaveBeenCalledTimes(2);
    expect(tokens.invalidateActiveForUser).toHaveBeenLastCalledWith('1');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EmailAlreadyTakenError,
  EmailAlreadyVerifiedError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InvalidVerificationTokenError,
} from '@/modules/auth/auth.errors.js';
import { AuthService } from '@/modules/auth/auth.service.js';

vi.mock('@/lib/hash.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  verifyPassword: vi.fn(),
}));

vi.mock('@/lib/email.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

import { sendVerificationEmail } from '@/lib/email.js';
import { verifyPassword } from '@/lib/hash.js';

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findByEmail: vi.fn(),
    findByEmailWithHash: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByVerificationToken: vi.fn(),
    verifyEmail: vi.fn(),
    findByEmailForResend: vi.fn(),
    updateVerificationToken: vi.fn(),
    ...overrides,
  };
}

describe('AuthService.register', () => {
  it('creates user when email is available', async () => {
    const repo = makeRepo({
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: '1', email: 'a@b.com', createdAt: new Date() }),
    });
    const service = new AuthService(repo as never);

    const result = await service.register({
      email: 'a@b.com',
      password: '12345678',
      consent: true,
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'a@b.com',
        passwordHash: 'hashed-password',
        emailVerificationToken: expect.any(String),
      }),
    );
    expect(result.email).toBe('a@b.com');
  });

  it('throws EmailAlreadyTakenError when email is taken', async () => {
    const repo = makeRepo({
      findByEmail: vi.fn().mockResolvedValue({ id: '1', email: 'a@b.com' }),
    });
    const service = new AuthService(repo as never);

    await expect(
      service.register({ email: 'a@b.com', password: '12345678', consent: true }),
    ).rejects.toThrow(EmailAlreadyTakenError);
  });
});

describe('AuthService.login', () => {
  beforeEach(() => {
    vi.mocked(verifyPassword).mockReset();
  });

  it('returns user data on valid credentials', async () => {
    const user = {
      id: '1',
      email: 'a@b.com',
      passwordHash: 'hashed-password',
      emailVerified: true,
    };
    const repo = makeRepo({ findByEmailWithHash: vi.fn().mockResolvedValue(user) });
    vi.mocked(verifyPassword).mockResolvedValue(true);
    const service = new AuthService(repo as never);

    const result = await service.login({ email: 'a@b.com', password: '12345678' });

    expect(result).toEqual({ id: '1', email: 'a@b.com', sessionVersion: 0 });
  });

  it('throws InvalidCredentialsError when user does not exist', async () => {
    const repo = makeRepo({ findByEmailWithHash: vi.fn().mockResolvedValue(null) });
    const service = new AuthService(repo as never);

    await expect(service.login({ email: 'a@b.com', password: '12345678' })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('throws InvalidCredentialsError when password is wrong', async () => {
    const user = {
      id: '1',
      email: 'a@b.com',
      passwordHash: 'hashed-password',
      emailVerified: true,
    };
    const repo = makeRepo({ findByEmailWithHash: vi.fn().mockResolvedValue(user) });
    vi.mocked(verifyPassword).mockResolvedValue(false);
    const service = new AuthService(repo as never);

    await expect(service.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('throws EmailNotVerifiedError when email is not verified', async () => {
    const user = {
      id: '1',
      email: 'a@b.com',
      passwordHash: 'hashed-password',
      emailVerified: false,
    };
    const repo = makeRepo({ findByEmailWithHash: vi.fn().mockResolvedValue(user) });
    vi.mocked(verifyPassword).mockResolvedValue(true);
    const service = new AuthService(repo as never);

    await expect(service.login({ email: 'a@b.com', password: '12345678' })).rejects.toThrow(
      EmailNotVerifiedError,
    );
  });
});

describe('AuthService.verifyEmail', () => {
  it('verifies the user when token is valid', async () => {
    const user = { id: '1', email: 'a@b.com' };
    const verified = { id: '1', email: 'a@b.com', emailVerified: true };
    const repo = makeRepo({
      findByVerificationToken: vi.fn().mockResolvedValue(user),
      verifyEmail: vi.fn().mockResolvedValue(verified),
    });
    const service = new AuthService(repo as never);

    const result = await service.verifyEmail('valid-token');

    expect(repo.findByVerificationToken).toHaveBeenCalledWith('valid-token');
    expect(repo.verifyEmail).toHaveBeenCalledWith('1');
    expect(result).toEqual(verified);
  });

  it('throws InvalidVerificationTokenError when token is not found', async () => {
    const repo = makeRepo({
      findByVerificationToken: vi.fn().mockResolvedValue(null),
    });
    const service = new AuthService(repo as never);

    await expect(service.verifyEmail('bad-token')).rejects.toThrow(InvalidVerificationTokenError);
  });
});

describe('AuthService.resendVerification', () => {
  beforeEach(() => {
    vi.mocked(sendVerificationEmail).mockClear();
  });

  it('returns silently when user is not found (anti-enumeration)', async () => {
    const repo = makeRepo({
      findByEmailForResend: vi.fn().mockResolvedValue(null),
    });
    const service = new AuthService(repo as never);

    const result = await service.resendVerification({ email: 'unknown@b.com' });

    expect(result).toBeUndefined();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('throws EmailAlreadyVerifiedError when email is already verified', async () => {
    const repo = makeRepo({
      findByEmailForResend: vi
        .fn()
        .mockResolvedValue({ id: '1', email: 'a@b.com', emailVerified: true }),
    });
    const service = new AuthService(repo as never);

    await expect(service.resendVerification({ email: 'a@b.com' })).rejects.toThrow(
      EmailAlreadyVerifiedError,
    );
  });

  it('sends a new verification email for unverified user', async () => {
    const repo = makeRepo({
      findByEmailForResend: vi
        .fn()
        .mockResolvedValue({ id: '1', email: 'a@b.com', emailVerified: false }),
      updateVerificationToken: vi.fn().mockResolvedValue(undefined),
    });
    const service = new AuthService(repo as never);

    await service.resendVerification({ email: 'a@b.com' });

    expect(repo.updateVerificationToken).toHaveBeenCalledWith('1', expect.any(String));
    expect(sendVerificationEmail).toHaveBeenCalledWith('a@b.com', expect.any(String));
  });
});

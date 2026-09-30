import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailDeliveryError } from '@/lib/errors.js';
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

beforeEach(() => {
  vi.mocked(sendVerificationEmail).mockReset();
  vi.mocked(sendVerificationEmail).mockResolvedValue(undefined);
});

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findByEmail: vi.fn(),
    findByEmailWithHash: vi.fn(),
    findById: vi.fn(),
    findByIdWithHash: vi.fn(),
    create: vi.fn(),
    deleteById: vi.fn(),
    updateAccount: vi.fn(),
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
        emailVerificationExpiresAt: expect.any(Date),
      }),
    );
    const expiresAt = repo.create.mock.calls[0][0].emailVerificationExpiresAt as Date;
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
    expect(expiresAt.getTime()).toBeLessThan(Date.now() + 25 * 60 * 60 * 1000);
    const raw = vi.mocked(sendVerificationEmail).mock.calls[0][1];
    const stored = repo.create.mock.calls[0][0].emailVerificationToken as string;
    expect(stored).toBe(sha256(raw));
    expect(result.email).toBe('a@b.com');
  });

  it('deletes the user and throws when the verification email fails', async () => {
    const repo = makeRepo({
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: '1', email: 'a@b.com', createdAt: new Date() }),
      deleteById: vi.fn().mockResolvedValue(undefined),
    });
    vi.mocked(sendVerificationEmail).mockRejectedValueOnce(new Error('down'));
    const service = new AuthService(repo as never);

    await expect(
      service.register({ email: 'a@b.com', password: '12345678', consent: true }),
    ).rejects.toBeInstanceOf(EmailDeliveryError);
    expect(repo.deleteById).toHaveBeenCalledWith('1');
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

    await expect(service.login({ email: 'a@b.com', password: '12345678' })).rejects.toMatchObject({
      name: EmailNotVerifiedError.name,
      code: 'EMAIL_NOT_VERIFIED',
      statusCode: 403,
    });
  });
});

describe('AuthService.verifyEmail', () => {
  it('verifies the user when token is valid', async () => {
    const user = {
      id: '1',
      email: 'a@b.com',
      emailVerificationExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };
    const verified = { id: '1', email: 'a@b.com', emailVerified: true };
    const repo = makeRepo({
      findByVerificationToken: vi.fn().mockResolvedValue(user),
      verifyEmail: vi.fn().mockResolvedValue(verified),
    });
    const service = new AuthService(repo as never);

    const result = await service.verifyEmail('valid-token');

    expect(repo.findByVerificationToken).toHaveBeenCalledWith(sha256('valid-token'));
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

  it('throws InvalidVerificationTokenError when the token is expired', async () => {
    const repo = makeRepo({
      findByVerificationToken: vi.fn().mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        emailVerificationExpiresAt: new Date(Date.now() - 1000),
      }),
      verifyEmail: vi.fn(),
    });
    const service = new AuthService(repo as never);

    await expect(service.verifyEmail('old-token')).rejects.toThrow(InvalidVerificationTokenError);
    expect(repo.verifyEmail).not.toHaveBeenCalled();
  });

  it('throws InvalidVerificationTokenError when the token has no expiry', async () => {
    const repo = makeRepo({
      findByVerificationToken: vi.fn().mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        emailVerificationExpiresAt: null,
      }),
      verifyEmail: vi.fn(),
    });
    const service = new AuthService(repo as never);

    await expect(service.verifyEmail('legacy-token')).rejects.toThrow(
      InvalidVerificationTokenError,
    );
    expect(repo.verifyEmail).not.toHaveBeenCalled();
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

    const raw = vi.mocked(sendVerificationEmail).mock.calls[0][1];
    expect(repo.updateVerificationToken).toHaveBeenCalledWith('1', sha256(raw), expect.any(Date));
    expect(sendVerificationEmail).toHaveBeenCalledWith('a@b.com', raw);
  });

  it('throws EmailDeliveryError when the resend fails', async () => {
    const repo = makeRepo({
      findByEmailForResend: vi
        .fn()
        .mockResolvedValue({ id: '1', email: 'a@b.com', emailVerified: false }),
      updateVerificationToken: vi.fn().mockResolvedValue(undefined),
    });
    vi.mocked(sendVerificationEmail).mockRejectedValueOnce(new Error('down'));
    const service = new AuthService(repo as never);

    await expect(service.resendVerification({ email: 'a@b.com' })).rejects.toBeInstanceOf(
      EmailDeliveryError,
    );
    expect(repo.updateVerificationToken).toHaveBeenCalledOnce();
  });
});

describe('AuthService.updateAccount', () => {
  beforeEach(() => {
    vi.mocked(verifyPassword).mockReset();
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(sendVerificationEmail).mockClear();
  });

  it('sends the verification email before changing the address', async () => {
    const repo = makeRepo({
      findByIdWithHash: vi.fn().mockResolvedValue({
        id: '1',
        email: 'old@b.com',
        passwordHash: 'hashed-password',
      }),
      findByEmail: vi.fn().mockResolvedValue(null),
      updateAccount: vi.fn().mockResolvedValue({
        id: '1',
        email: 'new@b.com',
        emailVerified: false,
        sessionVersion: 1,
      }),
    });
    const service = new AuthService(repo as never);

    await service.updateAccount('1', {
      currentPassword: '12345678',
      email: 'new@b.com',
      newPassword: 'abcdefgh',
    });

    const raw = vi.mocked(sendVerificationEmail).mock.calls[0][1];
    expect(repo.updateAccount).toHaveBeenCalledWith('1', {
      email: 'new@b.com',
      emailVerified: false,
      emailVerificationToken: sha256(raw),
      emailVerificationExpiresAt: expect.any(Date),
      passwordHash: 'hashed-password',
    });
  });

  it('keeps the address and the password when the email fails', async () => {
    const repo = makeRepo({
      findByIdWithHash: vi.fn().mockResolvedValue({
        id: '1',
        email: 'old@b.com',
        passwordHash: 'hashed-password',
      }),
      findByEmail: vi.fn().mockResolvedValue(null),
      updateAccount: vi.fn(),
    });
    vi.mocked(sendVerificationEmail).mockRejectedValueOnce(new Error('down'));
    const service = new AuthService(repo as never);

    await expect(
      service.updateAccount('1', {
        currentPassword: '12345678',
        email: 'new@b.com',
        newPassword: 'abcdefgh',
      }),
    ).rejects.toBeInstanceOf(EmailDeliveryError);
    expect(repo.updateAccount).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@/lib/errors.js';
import { UserService } from '@/modules/user/user.service.js';

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    recordConsent: vi.fn(),
    create: vi.fn(),
    ...overrides,
  };
}

describe('UserService.getById', () => {
  it('returns user when found', async () => {
    const user = { id: '1', email: 'a@b.com', createdAt: new Date() };
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(user) });
    const service = new UserService(repo);

    const result = await service.getById('1');

    expect(result).toEqual(user);
    expect(repo.findById).toHaveBeenCalledWith('1');
  });

  it('throws NotFoundError when user does not exist', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = new UserService(repo);

    await expect(service.getById('999')).rejects.toThrow(NotFoundError);
  });
});

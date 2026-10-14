import { NotFoundError } from '@/lib/errors.js';
import type { UserRepository } from './user.repository.js';

export class UserService {
  constructor(private readonly users: Pick<UserRepository, 'findById' | 'recordConsent'>) {}

  async getById(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('Usuário');
    return user;
  }

  async consent(userId: string) {
    return this.users.recordConsent(userId);
  }
}

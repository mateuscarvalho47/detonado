import { ValidationError } from '@/lib/errors.js';
import type { IgdbClient } from '@/lib/igdb/client.js';
import type { UserRepository } from '@/modules/user/user.repository.js';
import type { UpdatePreferencesInput } from './auth.schema.js';

export class PreferencesService {
  constructor(
    private readonly users: Pick<UserRepository, 'updatePreferences'>,
    private readonly catalog: Pick<IgdbClient, 'getPlatforms'>,
  ) {}

  async update(userId: string, input: UpdatePreferencesInput) {
    const { preferredPlatform } = input;
    if (preferredPlatform !== null) {
      const platforms = await this.catalog.getPlatforms();
      if (!platforms.includes(preferredPlatform)) throw new ValidationError('Plataforma inválida');
    }
    return this.users.updatePreferences(userId, preferredPlatform);
  }
}

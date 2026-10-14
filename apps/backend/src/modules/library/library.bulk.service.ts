import type { BulkLibraryInput, BulkLibraryResponse } from '@detonado/shared';
import { AppError } from '@/lib/errors.js';
import type { LibraryService } from './library.service.js';

function bulkError(error: unknown) {
  if (!(error instanceof AppError)) return 'Não foi possível atualizar este jogo. Tente novamente.';
  if (typeof error.details === 'string') return error.details;
  return error.message;
}

export class LibraryBulkService {
  constructor(private readonly library: Pick<LibraryService, 'update'>) {}
  async update(userId: string, input: BulkLibraryInput): Promise<BulkLibraryResponse> {
    const results: BulkLibraryResponse['results'] = [];
    const { tagIds, ...changes } = input.changes;
    for (const id of input.ids) {
      try {
        await this.library.update(id, userId, changes, { tagIds, requireSupportedPlatform: true });
        results.push({ id, state: 'UPDATED' });
      } catch (error) {
        results.push({ id, state: 'FAILED', error: bulkError(error) });
      }
    }
    return {
      results,
      summary: {
        updated: results.filter((row) => row.state === 'UPDATED').length,
        failed: results.filter((row) => row.state === 'FAILED').length,
      },
    };
  }
}

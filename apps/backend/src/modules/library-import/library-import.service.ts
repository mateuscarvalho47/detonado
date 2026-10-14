import { type LibraryImportRow, libraryImportRowSchema } from '@detonado/shared';
import { AppError } from '@/lib/errors.js';
import { LibraryEntryAlreadyExistsError } from '@/modules/library/library.errors.js';
import type { UpdateLibraryEntryInput } from '@/modules/library/library.schema.js';
import type { LibraryService } from '@/modules/library/library.service.js';
import type { LibraryImportRepository } from './library-import.repository.js';
import type { ImportResult } from './library-import.schema.js';

function rowError(error: unknown) {
  if (error instanceof AppError)
    return typeof error.details === 'string' ? error.details : error.message;
  return 'Não foi possível importar esta linha. Tente novamente.';
}
function updates(row: LibraryImportRow) {
  const patch: UpdateLibraryEntryInput = {};
  if (row.status !== undefined) patch.status = row.status;
  if (row.userPlatform !== undefined) patch.userPlatform = row.userPlatform;
  if (row.hoursPlayed !== undefined) patch.hoursPlayed = row.hoursPlayed;
  if (row.rating !== undefined) patch.rating = row.rating;
  if (row.notes !== undefined) patch.notes = row.notes;
  if (row.completionGoal !== undefined) patch.completionGoal = row.completionGoal;
  if (row.completedAt !== undefined) patch.completedAt = row.completedAt;
  return patch;
}
export class LibraryImportService {
  constructor(
    private readonly repository: Pick<LibraryImportRepository, 'findExisting' | 'findOwned'>,
    private readonly library: Pick<LibraryService, 'create' | 'update'>,
  ) {}
  async preview(userId: string, rows: unknown[]) {
    const parsed = rows.map((row) => libraryImportRowSchema.safeParse(row));
    const ids = parsed.flatMap((row) =>
      row.success && row.data.igdbId !== undefined ? [row.data.igdbId] : [],
    );
    const existing = new Set(
      (await this.repository.findExisting(userId, ids)).map((entry) => entry.igdbId),
    );
    const seen = new Set<number>();
    return {
      rows: parsed.map((row, index) => {
        if (!row.success)
          return {
            index,
            input: null,
            state: 'INVALID' as const,
            error: row.error.issues
              .map((issue) => `${issue.path.join('.') || 'linha'}: ${issue.message}`)
              .join('; '),
          };
        if (row.data.igdbId === undefined)
          return { index, input: row.data, state: 'NEEDS_MATCH' as const, error: null };
        const duplicate = existing.has(row.data.igdbId) || seen.has(row.data.igdbId);
        seen.add(row.data.igdbId);
        return {
          index,
          input: row.data,
          state: duplicate ? ('DUPLICATE' as const) : ('READY' as const),
          error: null,
        };
      }),
    };
  }
  private async writeRow(
    userId: string,
    row: LibraryImportRow & { igdbId: number },
    index: number,
  ): Promise<ImportResult> {
    let existing = await this.repository.findOwned(userId, row.igdbId);
    if (!existing) {
      try {
        const entry = await this.library.create(userId, {
          igdbId: row.igdbId,
          status: row.status ?? 'BACKLOG',
          userPlatform: row.userPlatform ?? undefined,
          completionGoal: row.completionGoal,
          hoursPlayed: row.hoursPlayed,
          rating: row.rating,
          notes: row.notes,
          completedAt: row.completedAt,
        });
        return { index, igdbId: row.igdbId, entryId: entry.id, state: 'ADDED' };
      } catch (error) {
        // A concurrent import may have inserted the same game while IGDB was loading.
        if (!(error instanceof LibraryEntryAlreadyExistsError)) throw error;
        existing = await this.repository.findOwned(userId, row.igdbId);
        if (!existing) throw error;
      }
    }
    if (row.duplicateAction !== 'UPDATE')
      return { index, igdbId: row.igdbId, entryId: existing.id, state: 'SKIPPED' };
    const patch = updates(row);
    if (Object.keys(patch).length === 0)
      return { index, igdbId: row.igdbId, entryId: existing.id, state: 'SKIPPED' };
    const updated = await this.library.update(existing.id, userId, patch);
    return { index, igdbId: row.igdbId, entryId: updated.id, state: 'UPDATED' };
  }
  async commit(userId: string, rows: unknown[]) {
    const results: ImportResult[] = [];
    for (const [index, raw] of rows.entries()) {
      const parsed = libraryImportRowSchema.safeParse(raw);
      if (!parsed.success) {
        results.push({
          index,
          state: 'FAILED',
          error: parsed.error.issues
            .map((issue) => `${issue.path.join('.') || 'linha'}: ${issue.message}`)
            .join('; '),
        });
        continue;
      }
      const row = parsed.data;
      if (row.igdbId === undefined) {
        results.push({
          index,
          state: 'FAILED',
          error: 'Selecione o jogo correspondente antes de importar.',
        });
        continue;
      }
      try {
        results.push(await this.writeRow(userId, { ...row, igdbId: row.igdbId }, index));
      } catch (error) {
        results.push({ index, igdbId: row.igdbId, state: 'FAILED', error: rowError(error) });
      }
    }
    return {
      results,
      summary: {
        added: results.filter((row) => row.state === 'ADDED').length,
        updated: results.filter((row) => row.state === 'UPDATED').length,
        skipped: results.filter((row) => row.state === 'SKIPPED').length,
        failed: results.filter((row) => row.state === 'FAILED').length,
      },
    };
  }
}

import type { Campaign, LibraryEntry } from '@/generated/prisma/client.js';
import { NotFoundError, ValidationError } from '@/lib/errors.js';
import type { CampaignRepository } from './campaign.repository.js';
import { type CreateCampaignInput, campaignResponseSchema } from './campaign.schema.js';

export function presentCampaign(
  campaign: Campaign,
  entry: Pick<
    LibraryEntry,
    | 'activeCampaignId'
    | 'status'
    | 'baseHours'
    | 'hoursPlayed'
    | 'rating'
    | 'notes'
    | 'completedAt'
    | 'completionGoal'
    | 'updatedAt'
  >,
) {
  const isActive = entry.activeCampaignId === campaign.id;
  if (!isActive) return campaignResponseSchema.parse({ ...campaign, isActive });
  // Active campaign data has one source of truth: the editable library entry.
  return campaignResponseSchema.parse({
    ...campaign,
    isActive,
    status: entry.status,
    baseHours: entry.baseHours,
    hoursPlayed: entry.hoursPlayed,
    rating: entry.rating,
    notes: entry.notes,
    completedAt: entry.completedAt,
    completionGoal: entry.completionGoal,
    updatedAt: entry.updatedAt,
  });
}
export class CampaignService {
  constructor(
    private readonly repository: Pick<CampaignRepository, 'withUserLock' | 'findEntry' | 'list'>,
  ) {}
  async list(entryId: string, userId: string) {
    const entry = await this.repository.findEntry(entryId, userId);
    if (!entry) throw new NotFoundError('Jogo');
    const campaigns = await this.repository.list(entryId, userId);
    return campaigns
      .map((campaign) => presentCampaign(campaign, entry))
      .sort((a, b) => Number(b.isActive) - Number(a.isActive));
  }
  create(entryId: string, userId: string, input: CreateCampaignInput) {
    const startedAt = input.startedAt ? new Date(input.startedAt) : new Date();
    if (startedAt.getTime() > Date.now() + 60000)
      throw new ValidationError('Início da campanha não pode estar no futuro');
    return this.repository.withUserLock(userId, async (repository) => {
      const entry = await repository.findEntry(entryId, userId);
      if (!entry) throw new NotFoundError('Jogo');
      if (entry.activeCampaignId)
        await repository.archive(entry.activeCampaignId, entryId, userId, {
          archivedAt: new Date(),
          status: entry.status,
          baseHours: entry.baseHours,
          hoursPlayed: entry.hoursPlayed,
          rating: entry.rating,
          notes: entry.notes,
          completedAt: entry.completedAt,
          completionGoal: entry.completionGoal,
        });
      const campaign = await repository.create(entryId, userId, startedAt);
      const current = await repository.resetEntry(
        entryId,
        userId,
        campaign.id,
        input.notes?.trim() || null,
      );
      await repository.resetChecklist(entryId, userId);
      return presentCampaign(campaign, current);
    });
  }
}

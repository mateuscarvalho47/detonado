import { z } from 'zod';

export const igdbGameRawSchema = z.object({
  id: z.number(),
  name: z.string(),
  cover: z.object({ url: z.string() }).optional(),
  first_release_date: z.number().optional(),
  platforms: z.array(z.object({ name: z.string() })).optional(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
  summary: z.string().optional(),
});

export type IgdbGameRaw = z.infer<typeof igdbGameRawSchema>;

export type IgdbGame = {
  igdbId: number;
  name: string;
  coverUrl?: string;
  releaseYear?: number;
  platforms: string[];
  genres: string[];
  summary?: string;
  hltb?: {
    mainHours: number | null;
    mainExtraHours: number | null;
    completionistHours: number | null;
  } | null;
  hltbStatus?: 'FOUND' | 'MISS' | 'FAILED';
};

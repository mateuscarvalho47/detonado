import type { z } from 'zod';

export function parseJsonCache<T>(raw: string, schema: z.ZodType<T>): T | null {
  try {
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

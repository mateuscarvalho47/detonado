import { AppError } from '@/lib/errors.js';

export function requireSteamKey(key?: string): asserts key is string {
  if (!key)
    throw new AppError(
      'STEAM_NOT_CONFIGURED',
      503,
      'A integração Steam ainda não foi configurada.',
    );
}

export async function steamText(url: string, init: RequestInit = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Never follow a provider redirect with a credential header attached.
    const response = await fetch(url, { ...init, signal: controller.signal, redirect: 'error' });
    if (response.status === 429)
      throw new AppError(
        'STEAM_BUSY',
        503,
        'Steam está limitando as consultas. Tente novamente mais tarde.',
      );
    if (!response.ok)
      throw new AppError(
        'STEAM_PROVIDER_ERROR',
        502,
        'Não foi possível consultar Steam. Confira a configuração e tente novamente.',
      );
    return await response.text();
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (controller.signal.aborted)
      throw new AppError(
        'STEAM_TIMEOUT',
        504,
        'A consulta à Steam demorou demais. Tente novamente.',
      );
    // Do not attach fetch errors, URLs, provider bodies or credentials to logs/errors.
    throw new AppError(
      'STEAM_PROVIDER_ERROR',
      502,
      'Não foi possível consultar Steam. Tente novamente.',
    );
  } finally {
    clearTimeout(timer);
  }
}

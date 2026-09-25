import { ProviderError } from './errors.js';

/**
 * JSON GET isteği: zaman aşımı, HTTP durumlarının ProviderError'a çevrilmesi.
 * Özel başlık eklenmez; böylece tarayıcı fazladan CORS ön isteği (preflight) atmaz.
 *
 * @param {string} url
 * @param {{ timeoutMs?: number, signal?: AbortSignal }} [options]
 */
export async function getJson(url, { timeoutMs = 12_000, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Zaman aşımı', 'TimeoutError')), timeoutMs);
  const forwardAbort = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', forwardAbort, { once: true });

  let response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
  } catch (cause) {
    if (controller.signal.reason?.name === 'TimeoutError') {
      throw new ProviderError('Sunucu zamanında yanıt vermedi.', { code: 'timeout', cause });
    }
    if (signal?.aborted) throw cause;
    throw new ProviderError('Sunucuya ulaşılamadı.', { code: 'network', cause });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After'));
    throw new ProviderError('İstek sınırı aşıldı.', { code: 'rate_limit', status: 429, retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined });
  }
  if (response.status === 404) throw new ProviderError('Kayıt bulunamadı.', { code: 'not_found', status: 404 });
  if (!response.ok) throw new ProviderError(`Sunucu hatası (${response.status}).`, { code: 'provider', status: response.status });

  try {
    return await response.json();
  } catch (cause) {
    throw new ProviderError('Sunucudan okunamayan bir yanıt geldi.', { code: 'bad_response', cause });
  }
}

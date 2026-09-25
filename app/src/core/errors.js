/**
 * Sağlayıcı katmanından çıkan hata. Arayüz, mesajı `code` alanına göre seçer;
 * böylece hangi API kullanılırsa kullanılsın kullanıcı aynı dili görür.
 */
export class ProviderError extends Error {
  /**
   * @param {string} message
   * @param {{ code?: 'network' | 'timeout' | 'rate_limit' | 'not_found' | 'bad_response' | 'provider', status?: number, retryAfter?: number, cause?: unknown }} [info]
   */
  constructor(message, { code = 'provider', status, retryAfter, cause } = {}) {
    super(message, { cause });
    this.name = 'ProviderError';
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/**
 * Konum bulma hatası.
 * code: 'denied' | 'unavailable' | 'geo_timeout' | 'unsupported' | 'insecure' | 'no_country' | 'no_match'
 */
export class LocateError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = 'LocateError';
    this.code = code;
    Object.assign(this, details);
  }
}

const MESSAGES = {
  network: 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.',
  timeout: 'Sunucu zamanında yanıt vermedi. Biraz sonra tekrar deneyin.',
  rate_limit: 'Çok kısa sürede çok istek yapıldı. Birkaç dakika sonra tekrar deneyin.',
  not_found: 'Bu konum için kayıt bulunamadı.',
  bad_response: 'Sunucudan beklenmeyen bir yanıt geldi.',

  denied: 'Konum izni verilmedi. Adres çubuğundaki konum simgesinden izin verebilir ya da listeden seçebilirsiniz.',
  unavailable: 'Konumunuz şu an belirlenemiyor. Listeden seçebilirsiniz.',
  geo_timeout: 'Konum zamanında alınamadı. Tekrar deneyin ya da listeden seçin.',
  unsupported: 'Bu tarayıcı konum bulmayı desteklemiyor. Listeden seçebilirsiniz.',
  insecure: 'Konum yalnızca güvenli bağlantıda (https) kullanılabilir. Listeden seçebilirsiniz.',
  no_country: 'Bulunduğunuz ülke için vakit bilgisi bulunmuyor. Listeden seçebilirsiniz.',
  no_match: 'Bulunduğunuz yer listede eşleşmedi. Listeden seçebilirsiniz.',
};

/** Kullanıcıya gösterilecek Türkçe açıklama. */
export function describeError(error) {
  if (!error) return '';
  return MESSAGES[error.code] ?? (error instanceof ProviderError ? error.message : 'Beklenmeyen bir hata oluştu.');
}

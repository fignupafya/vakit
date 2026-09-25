import { assertProvider } from './contract.js';
import { createImsakiyemProvider } from './imsakiyem.js';
import { createEzanVaktiProvider } from './ezanvakti.js';

/**
 * Kayıtlı veri kaynakları. Uygulama bunlardan yalnızca birini kullanır (config.js → provider);
 * arayüzde seçim yoktur. Yeni bir API (ör. Diyanet'in resmî Awqat Salah API'si ya da kendi
 * sunucumuz) eklemek için contract.js'teki sözleşmeye uyan bir fabrika yazıp buraya ekleyin.
 */
const REGISTRY = {
  imsakiyem: createImsakiyemProvider,  // istenen her ay, ilçe araması var
  ezanvakti: createEzanVaktiProvider,  // yalnızca yakın ~30 gün, arama yok
};

/** @returns {import('./contract.js').PrayerTimesProvider} */
export function createProvider(id, config) {
  const factory = REGISTRY[id];
  if (!factory) throw new Error(`Tanımsız veri kaynağı: "${id}". Seçenekler: ${Object.keys(REGISTRY).join(', ')}`);
  return assertProvider(factory(config.providers?.[id] ?? {}));
}

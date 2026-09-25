import { LocateError } from '../core/errors.js';

/**
 * Tarayıcının konum servisi için ince bir sarmalayıcı.
 * Test için adrese `?geo=39.584,32.147` (sabit konum) ya da `?geo=deny` / `?geo=timeout` eklenebilir.
 */
export function createGeolocation({ override } = {}) {
  const fake = parseOverride(override);
  const api = typeof navigator === 'undefined' ? undefined : navigator.geolocation;

  return {
    supported: Boolean(fake || api),

    /** 'granted' | 'prompt' | 'denied' — izin penceresi açmadan sorgular. */
    async permission() {
      if (fake) return fake.error === 'denied' ? 'denied' : 'granted';
      try {
        return (await navigator.permissions.query({ name: 'geolocation' })).state;
      } catch {
        return 'prompt';
      }
    },

    /** @returns {Promise<{ lat: number, lon: number, accuracy: number }>} */
    getPosition({ timeoutMs = 15_000, maxAgeMs = 10 * 60_000, highAccuracy = false } = {}) {
      if (fake) {
        return fake.error
          ? Promise.reject(new LocateError(fake.error))
          : Promise.resolve({ lat: fake.lat, lon: fake.lon, accuracy: 25 });
      }
      if (!window.isSecureContext) return Promise.reject(new LocateError('insecure'));
      if (!api) return Promise.reject(new LocateError('unsupported'));
      return new Promise((resolve, reject) => {
        api.getCurrentPosition(
          ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude, accuracy: coords.accuracy }),
          (error) => reject(new LocateError(error.code === 1 ? 'denied' : error.code === 3 ? 'geo_timeout' : 'unavailable')),
          { enableHighAccuracy: highAccuracy, timeout: timeoutMs, maximumAge: maxAgeMs },
        );
      });
    },
  };
}

function parseOverride(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (text === 'deny') return { error: 'denied' };
  if (text === 'timeout') return { error: 'geo_timeout' };
  const m = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(text);
  return m ? { lat: Number(m[1]), lon: Number(m[2]) } : null;
}

/** İki nokta arasındaki kuş uçuşu mesafe (km). */
export function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

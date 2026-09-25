/** Arka plandaki gökyüzü tonunu şu anki evreye göre ayarlar (renkler tokens.css'te). */
export function setPhase(phase) {
  const root = document.documentElement;
  const value = phase ?? 'none';
  if (root.dataset.phase !== value) root.dataset.phase = value;
}

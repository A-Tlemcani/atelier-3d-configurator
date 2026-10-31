/** Product options, pricing and (de)serialisation. Pure & unit-tested. */

export interface Option { id: string; label: string; price: number; color: string; kind?: 'wood' | 'fabric' | 'leather' | 'metal' }
export interface Group { id: keyof Config; label: string; options: Option[] }
export interface Config { frame: string; fabric: string; legs: string; pillow: string }

export const BASE_PRICE = 1290;
export const PRODUCT = 'Fjord Lounge Chair';

export const groups: Group[] = [
  { id: 'frame', label: 'Frame', options: [
    { id: 'oak', label: 'Natural oak', price: 0, color: '#c8a27a', kind: 'wood' },
    { id: 'walnut', label: 'American walnut', price: 180, color: '#6b4630', kind: 'wood' },
    { id: 'ash', label: 'Black-stained ash', price: 120, color: '#2b2622', kind: 'wood' },
  ] },
  { id: 'fabric', label: 'Upholstery', options: [
    { id: 'boucle', label: 'Bouclé cream', price: 0, color: '#e9e2d4', kind: 'fabric' },
    { id: 'sage', label: 'Wool sage', price: 0, color: '#8f9e86', kind: 'fabric' },
    { id: 'terracotta', label: 'Velvet terracotta', price: 140, color: '#b4573b', kind: 'fabric' },
    { id: 'cognac', label: 'Leather cognac', price: 390, color: '#9a5a2c', kind: 'leather' },
    { id: 'noir', label: 'Leather noir', price: 390, color: '#1f1d1c', kind: 'leather' },
  ] },
  { id: 'legs', label: 'Legs', options: [
    { id: 'wood', label: 'Matching wood', price: 0, color: '#c8a27a', kind: 'wood' },
    { id: 'brass', label: 'Brushed brass', price: 150, color: '#c9a45c', kind: 'metal' },
    { id: 'steel', label: 'Matte black steel', price: 90, color: '#222222', kind: 'metal' },
  ] },
  { id: 'pillow', label: 'Headrest pillow', options: [
    { id: 'none', label: 'Without', price: 0, color: 'transparent' },
    { id: 'yes', label: 'With headrest pillow', price: 120, color: '#e9e2d4' },
  ] },
];

export const defaults: Config = { frame: 'oak', fabric: 'boucle', legs: 'wood', pillow: 'none' };

export const option = (g: keyof Config, id: string) => groups.find((x) => x.id === g)!.options.find((o) => o.id === id)!;

export function price(c: Config): number {
  return BASE_PRICE + (Object.keys(defaults) as Array<keyof Config>).reduce((sum, g) => sum + option(g, c[g]).price, 0);
}

/** Only known option ids survive; anything else falls back to the default. Safe for URL & storage input. */
export function sanitize(input: unknown): Config {
  const out = { ...defaults };
  if (!input || typeof input !== 'object') return out;
  for (const g of groups) {
    const v = (input as Record<string, unknown>)[g.id];
    if (typeof v === 'string' && g.options.some((o) => o.id === v)) out[g.id] = v;
  }
  return out;
}

export const encode = (c: Config) => new URLSearchParams(c as unknown as Record<string, string>).toString();
export const decode = (hash: string) => sanitize(Object.fromEntries(new URLSearchParams(hash.replace(/^#/, ''))));
export const sku = (c: Config) => `FJD-${c.frame}-${c.fabric}-${c.legs}-${c.pillow}`.toUpperCase();

export interface CartLine { sku: string; config: Config; qty: number }

export function parseCart(raw: string | null): CartLine[] {
  try {
    const data: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(data)) return [];
    return data.slice(0, 20).flatMap((l) => {
      const config = sanitize((l as CartLine)?.config);
      const qty = Math.min(Math.max(Math.trunc(Number((l as CartLine)?.qty)) || 0, 0), 10);
      return qty ? [{ sku: sku(config), config, qty }] : [];
    });
  } catch { return []; }
}

export function addToCart(cart: CartLine[], c: Config): CartLine[] {
  const id = sku(c);
  const hit = cart.find((l) => l.sku === id);
  if (hit) return cart.map((l) => (l === hit ? { ...l, qty: Math.min(l.qty + 1, 10) } : l));
  return [...cart, { sku: id, config: { ...c }, qty: 1 }];
}

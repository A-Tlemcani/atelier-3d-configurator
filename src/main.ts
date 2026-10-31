import '@fontsource-variable/manrope';
import './style.css';
import { addToCart, decode, defaults, encode, groups, option, parseCart, price, PRODUCT, sku, type CartLine, type Config } from './config';
import type { View } from './chair';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n;
};
const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const CART_KEY = 'atelier-nord-cart-v1';

let config: Config = location.hash ? decode(location.hash) : { ...defaults };
let chair: ReturnType<typeof import('./chair').initChair> = null;

// ---------- Options: native radio groups (keyboard & screen-reader friendly)
const form = $('options') as HTMLFormElement;
for (const g of groups) {
  const fs = el('fieldset', `group group-${g.id}`);
  const legend = el('legend');
  legend.append(el('span', undefined, g.label), el('span', 'chosen', ''));
  fs.append(legend);
  const row = el('div', g.id === 'pillow' ? 'toggles' : 'swatches');
  for (const o of g.options) {
    const label = el('label', g.id === 'pillow' ? 'toggle' : 'swatch');
    const input = el('input');
    input.type = 'radio'; input.name = g.id; input.value = o.id;
    input.checked = config[g.id] === o.id;
    const sw = el('span', `chip kind-${o.kind ?? 'none'}`);
    sw.style.setProperty('--c', o.color);
    label.append(input, sw, el('span', 'sr-only', `${o.label}${o.price ? `, plus ${eur.format(o.price)}` : ''}`));
    if (g.id === 'pillow') label.append(el('span', 'toggle-text', `${o.label}${o.price ? ` (+${eur.format(o.price)})` : ''}`));
    label.title = `${o.label}${o.price ? ` (+${eur.format(o.price)})` : ''}`;
    row.append(label);
  }
  fs.append(row);
  form.append(fs);
}
form.addEventListener('change', () => {
  const data = new FormData(form);
  config = { frame: String(data.get('frame')), fabric: String(data.get('fabric')), legs: String(data.get('legs')), pillow: String(data.get('pillow')) };
  sync();
});

function sync(pushHistory = true) {
  for (const g of groups) {
    const o = option(g.id, config[g.id]);
    form.querySelector(`.group-${g.id} .chosen`)!.textContent = `${o.label}${o.price ? ` · +${eur.format(o.price)}` : ''}`;
  }
  $('price').textContent = eur.format(price(config));
  $('sku').textContent = `SKU ${sku(config)}`;
  if (pushHistory) history.replaceState(null, '', `#${encode(config)}`);
  chair?.apply(config);
}
sync(false);

addEventListener('hashchange', () => {
  config = decode(location.hash);
  for (const g of groups) (form.elements.namedItem(g.id) as RadioNodeList).value = config[g.id];
  sync(false);
});

// ---------- Share
$('share').addEventListener('click', async () => {
  const url = `${location.origin}${location.pathname}#${encode(config)}`;
  const status = $('share-status');
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ title: PRODUCT, url });
    else { await navigator.clipboard.writeText(url); status.textContent = 'Link copied: anyone opening it sees this exact chair.'; }
  } catch { status.textContent = 'Copy this link: ' + url; }
  setTimeout(() => (status.textContent = ''), 4000);
});

// ---------- Cart (localStorage, validated on read)
const load = (): CartLine[] => { try { return parseCart(localStorage.getItem(CART_KEY)); } catch { return []; } };
let cart = load();
const save = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* storage unavailable: cart lives in memory */ } };
const drawer = $('cart') as HTMLDialogElement;

function renderCart() {
  $('cart-count').textContent = String(cart.reduce((n, l) => n + l.qty, 0));
  const list = $('cart-lines');
  if (!cart.length) { list.replaceChildren(el('li', 'empty', 'Your cart is empty.')); }
  else list.replaceChildren(...cart.map((l) => {
    const li = el('li', 'line');
    const sw = el('span', 'line-swatch');
    sw.style.setProperty('--a', option('fabric', l.config.fabric).color);
    sw.style.setProperty('--b', option('frame', l.config.frame).color);
    const info = el('div', 'line-info');
    info.append(el('p', 'line-title', PRODUCT), el('p', 'line-meta', groups.map((g) => option(g.id, l.config[g.id]).label).filter((x) => x !== 'Without').join(' · ')));
    const qty = el('div', 'qty');
    const minus = el('button', undefined, '−'); minus.type = 'button'; minus.setAttribute('aria-label', 'Decrease quantity');
    const plus = el('button', undefined, '+'); plus.type = 'button'; plus.setAttribute('aria-label', 'Increase quantity');
    minus.addEventListener('click', () => { cart = cart.flatMap((x) => (x === l ? (x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []) : [x])); save(); renderCart(); });
    plus.addEventListener('click', () => { cart = cart.map((x) => (x === l ? { ...x, qty: Math.min(x.qty + 1, 10) } : x)); save(); renderCart(); });
    qty.append(minus, el('span', undefined, String(l.qty)), plus);
    const edit = el('button', 'link', 'Edit'); edit.type = 'button';
    edit.addEventListener('click', () => { location.hash = encode(l.config); drawer.close(); });
    info.append(qty, edit);
    li.append(sw, info, el('p', 'line-price', eur.format(price(l.config) * l.qty)));
    return li;
  }));
  $('cart-total').textContent = eur.format(cart.reduce((s, l) => s + price(l.config) * l.qty, 0));
  ($('checkout') as HTMLButtonElement).disabled = !cart.length;
}
renderCart();
$('add').addEventListener('click', () => { cart = addToCart(cart, config); save(); renderCart(); drawer.showModal(); });
$('open-cart').addEventListener('click', () => drawer.showModal());
$('close-cart').addEventListener('click', () => drawer.close());
drawer.addEventListener('click', (e) => { if (e.target === drawer) drawer.close(); });
$('checkout').addEventListener('click', () => { $('checkout-note').textContent = 'This is a demo: checkout would hand off to Stripe Checkout here.'; });
addEventListener('storage', (e) => { if (e.key === CART_KEY) { cart = load(); renderCart(); } });

// ---------- 3D
const viewButtons = document.querySelectorAll<HTMLButtonElement>('[data-view]');
viewButtons.forEach((b) => b.addEventListener('click', () => {
  chair?.setView(b.dataset.view as View);
  viewButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
}));
import('./chair').then(({ initChair }) => { chair = initChair($('chair') as HTMLCanvasElement, config); });

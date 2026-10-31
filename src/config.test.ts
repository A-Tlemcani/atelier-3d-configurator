import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addToCart, BASE_PRICE, decode, defaults, encode, parseCart, price, sanitize } from './config.ts';

test('default configuration costs the base price', () => assert.equal(price(defaults), BASE_PRICE));
test('options add up', () => assert.equal(price({ frame: 'walnut', fabric: 'cognac', legs: 'brass', pillow: 'yes' }), BASE_PRICE + 180 + 390 + 150 + 120));
test('encode/decode round-trips', () => {
  const c = { frame: 'ash', fabric: 'sage', legs: 'steel', pillow: 'yes' };
  assert.deepEqual(decode('#' + encode(c)), c);
});
test('unknown or malicious values fall back to defaults', () => {
  assert.deepEqual(decode('#frame=<img src=x>&fabric=sage&__proto__=x'), { ...defaults, fabric: 'sage' });
  assert.deepEqual(sanitize(null), defaults);
});
test('cart merges identical configurations and caps quantity', () => {
  let cart = addToCart([], defaults);
  cart = addToCart(cart, defaults);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].qty, 2);
});
test('corrupted storage yields an empty cart', () => {
  assert.deepEqual(parseCart('{not json'), []);
  assert.deepEqual(parseCart('{"a":1}'), []);
  assert.equal(parseCart(JSON.stringify([{ config: defaults, qty: 99 }]))[0].qty, 10);
});

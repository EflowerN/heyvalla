import test from 'node:test';
import assert from 'node:assert/strict';
import { translate, parseLang, dhivehiCoverage, LANG_COOKIE } from '../src/lib/i18n.ts';
import { navItems, activeNavIndex } from '../src/app/components/nav-items.ts';

test('language cookie only ever resolves to a supported language', () => {
  assert.equal(parseLang('dv'), 'dv');
  assert.equal(parseLang('en'), 'en');
  for (const bad of [undefined, null, '', 'DV', 'fr', '<script>']) assert.equal(parseLang(bad), 'en');
  assert.equal(LANG_COOKIE, 'dhathuru_lang');
});

test('Dhivehi translates known text and falls back to English for anything unknown', () => {
  assert.notEqual(translate('dv', 'Find my journey'), 'Find my journey');
  assert.match(translate('dv', 'Find my journey'), /[ހ-޿]/);
  assert.equal(translate('dv', 'A string nobody has translated yet'), 'A string nobody has translated yet');
  assert.equal(translate('en', 'Find my journey'), 'Find my journey');
});

test('every navigation label and short label has a Dhivehi translation', () => {
  for (const item of navItems) {
    assert.match(translate('dv', item.label), /[ހ-޿]/, item.label);
    assert.match(translate('dv', item.short), /[ހ-޿]/, item.short);
  }
  assert.ok(dhivehiCoverage() > 60);
});

test('Dhivehi values contain Thaana and never the untranslated English source', () => {
  const sample = ['Where are you?', 'Where are you going?', 'Passengers', 'Sailings', 'Search route or stop', 'Your fare estimate'];
  for (const key of sample) {
    const value = translate('dv', key);
    assert.notEqual(value, key);
    assert.match(value, /[ހ-޿]/);
  }
});

test('active navigation follows the current path; the home page highlights nothing', () => {
  assert.equal(activeNavIndex('/'), -1);
  assert.equal(activeNavIndex('/plan'), 0);
  assert.equal(activeNavIndex('/ferry-planner'), 0);
  assert.equal(activeNavIndex('/journeys'), 1);
  assert.equal(activeNavIndex('/sailings'), 2);
  assert.equal(activeNavIndex('/greater-male-taxi'), 3);
  assert.equal(activeNavIndex('/buses'), 4);
  assert.equal(activeNavIndex('/providers'), 5);
  assert.equal(activeNavIndex('/help'), -1);
  assert.equal(activeNavIndex('/plannerx'), -1);
});

test('landing, help and preference copy all have Dhivehi translations', async () => {
  const copy = await import('../src/lib/site-copy.ts');
  const prefs = await import('../src/lib/trip-preferences.ts');
  const strings = [
    ...copy.steps.flatMap(step => [step.title, step.body]), ...copy.bullets, ...copy.exampleLegs.map(leg => leg.label), ...copy.modes.map(mode => mode[1]),
    ...copy.honest.flatMap(item => [item.title, item.body]), ...copy.faq.flat(),
    ...prefs.MODES.map(mode => mode.label), ...Object.values(prefs.CAUTION).flatMap(level => [level.label, level.hint]),
  ];
  const missing = strings.filter(text => translate('dv', text) === text);
  assert.deepEqual(missing, []);
});

test('every static t("…") and <T k="…"> in the UI has a Dhivehi translation', async () => {
  const { readdirSync, statSync, readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const walk = dir => readdirSync(dir).flatMap(name => { const path = join(dir, name); return statSync(path).isDirectory() ? walk(path) : path.endsWith('.tsx') ? [path] : []; });
  const missing = [];
  for (const file of walk(new URL('../src/app', import.meta.url).pathname)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\bt\(("(?:[^"\\]|\\.)*")\)/g)) { const key = JSON.parse(match[1]); if (translate('dv', key) === key) missing.push(`${file.split('/').pop()}: ${key}`); }
    for (const match of source.matchAll(/<T k="((?:[^"\\]|\\.)*)"/g)) if (translate('dv', match[1]) === match[1]) missing.push(`${file.split('/').pop()}: ${match[1]}`);
  }
  assert.deepEqual(missing, []);
});

test('Dhivehi text keeps its characters inside Thaana, Latin, digits and punctuation', async () => {
  const { dvStrings } = await import('../src/lib/dv-strings.ts');
  const allowed = /^[ހ-޿\u0000-ɏ -⯿،؛؟\s]*$/;
  for (const [key, value] of Object.entries(dvStrings)) {
    assert.match(value, allowed, `unexpected character in translation of: ${key}`);
    assert.ok(value.trim().length > 0, key);
  }
  assert.ok(Object.keys(dvStrings).length > 250);
});

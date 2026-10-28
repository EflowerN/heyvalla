import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTripParams, tripSearchParams, bufferRating, filterSeaOptions, maldivesMinutes, CAUTION } from '../src/lib/trip-preferences.ts';

const valid = { from: 'ld0422', to: 'ld0152', date: '2030-11-02', time: '09:00', pax: '2', when: 'arrive', budget: '500', modes: 'ferry,bus,teleport', caution: 'cautious', changes: '1' };

test('search parameters are validated and unknown values fall back safely', () => {
  const trip = parseTripParams(valid);
  assert.deepEqual({ ...trip }, { from: 'ld0422', to: 'ld0152', date: '2030-11-02', passengers: 2, when: 'arrive', time: '09:00', budgetMvr: 500, modes: ['ferry', 'bus'], caution: 'cautious', maxChanges: 1 });
  const loose = parseTripParams({ from: 'a', to: 'b', date: '2030-11-02', pax: '99', time: '25:99', caution: 'reckless', budget: '-5', changes: 'x', when: 'sideways' });
  assert.equal(loose.passengers, 1); assert.equal(loose.time, '09:00'); assert.equal(loose.caution, 'balanced'); assert.equal(loose.budgetMvr, null); assert.equal(loose.maxChanges, null); assert.equal(loose.when, 'leave');
});

test('missing, identical or malformed places and dates are rejected', () => {
  for (const bad of [{ ...valid, from: '' }, { ...valid, to: valid.from }, { ...valid, date: '02/11/2030' }, { ...valid, date: '2030-13-45' }, { ...valid, from: '../etc/passwd' }, { ...valid, to: '<script>' }]) assert.equal(parseTripParams(bad), null);
});

test('round trip through the URL keeps every preference', () => {
  const trip = parseTripParams(valid);
  assert.deepEqual(parseTripParams(tripSearchParams(trip)), trip);
});

test('buffer ratings follow the chosen caution level', () => {
  assert.equal(bufferRating(25, 'relaxed'), 'adequate');
  assert.equal(bufferRating(25, 'balanced'), 'adequate');
  assert.equal(bufferRating(25, 'cautious'), 'tight');
  assert.equal(bufferRating(14, 'relaxed'), 'tight');
  assert.equal(bufferRating(60, 'cautious'), 'comfortable');
  assert.equal(bufferRating(40, 'balanced'), 'comfortable');
  assert.ok(CAUTION.cautious.min > CAUTION.balanced.min && CAUTION.balanced.min > CAUTION.relaxed.min);
});

const option = (id, dep, arr, total, legs = 1) => ({ id, departure_at: `2030-11-02T${dep}:00+05:00`, arrival_at: `2030-11-02T${arr}:00+05:00`, transfer_minutes: 25, total_minor: total, legs: Array(legs).fill({}) });
const prefs = { when: 'leave', time: '09:00', budgetMvr: null, modes: [], caution: 'balanced', maxChanges: null };

test('maldives local minutes ignore the machine time zone', () => {
  assert.equal(maldivesMinutes('2030-11-02T10:00:00+05:00'), 600);
  assert.equal(maldivesMinutes('2030-11-02T05:00:00Z'), 600);
  assert.equal(maldivesMinutes('2030-11-01T20:30:00Z'), 90);
});

test('leave-after and arrive-by filter by local time and report why options were hidden', () => {
  const options = [option('early', '07:00', '08:00', 10000), option('mid', '10:00', '12:00', 17500, 2), option('late', '15:00', '16:30', 15000)];
  assert.deepEqual(filterSeaOptions(options, prefs).shown.map(o => o.id), ['mid', 'late']);
  assert.equal(filterSeaOptions(options, prefs).hidden.time, 1);
  assert.deepEqual(filterSeaOptions(options, { ...prefs, when: 'arrive', time: '13:00' }).shown.map(o => o.id), ['early', 'mid']);
});

test('budget and maximum changes are hard limits; tight buffers are not hidden', () => {
  const options = [option('direct', '10:00', '11:00', 15000), option('change', '10:00', '12:00', 17500, 2)];
  assert.deepEqual(filterSeaOptions(options, { ...prefs, budgetMvr: 160 }).shown.map(o => o.id), ['direct']);
  assert.equal(filterSeaOptions(options, { ...prefs, budgetMvr: 160 }).hidden.budget, 1);
  assert.deepEqual(filterSeaOptions(options, { ...prefs, maxChanges: 0 }).shown.map(o => o.id), ['direct']);
  assert.equal(filterSeaOptions(options, { ...prefs, caution: 'cautious' }).shown.length, 2);
});

test('choosing only non-sea modes explains itself instead of inventing results', () => {
  const result = filterSeaOptions([option('a', '10:00', '11:00', 100)], { ...prefs, modes: ['bus', 'taxi'] });
  assert.equal(result.seaDisallowed, true);
  assert.deepEqual(result.shown, []);
  assert.equal(filterSeaOptions([option('a', '10:00', '11:00', 100)], { ...prefs, modes: ['speedboat'] }).shown.length, 1);
});

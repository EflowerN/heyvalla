import test from 'node:test';
import assert from 'node:assert/strict';
import { vesselReport, vesselIsRecent, trackingSummary } from '../src/lib/live-vessels.ts';

test('vessel report freshness ages locally and never treats missing/future times as live', () => {
  const now = Date.parse('2030-11-01T07:00:00Z');
  const vessel = { id:'1000', name:'Synthetic boat', latitude:2.2, longitude:73.1, reported_at:'2030-11-01T06:59:00Z', freshness:'recent' };
  assert.equal(vesselIsRecent(vessel,now),true);
  assert.match(vesselReport(vessel,now),/Recently reported.*Maldives time/);
  assert.equal(vesselIsRecent(vessel,now+600001),false);
  assert.match(vesselReport(vessel,now+600001),/Last known position/);
  for (const reported_at of [null,'invalid','2030-11-02T07:00:00Z']) {
    assert.equal(vesselIsRecent({...vessel,reported_at},now),false);
    assert.equal(vesselReport({...vessel,reported_at},now),'Report time unavailable');
  }
  assert.equal(vesselIsRecent({...vessel,freshness:'stale'},now),false);
});

test('sailing tracking summary never claims a live position the feed did not report', () => {
  const now = Date.parse('2030-11-01T07:00:00Z');
  const base = { source: 'FollowMe', source_url: 'https://followme.mv/', linked_by: 'owner', verified: false };
  const none = trackingSummary({ ...base, status: 'not_yet', message: 'Boat position appears about three hours before departure.', position: null }, now);
  assert.equal(none.tone, 'idle');
  assert.equal(none.position, null);
  assert.match(none.text, /three hours before departure/);
  const recent = trackingSummary({ ...base, status: 'ok', message: '', position: { latitude: 2.2, longitude: 73.1, reported_at: '2030-11-01T06:59:00Z', freshness: 'recent' } }, now);
  assert.equal(recent.tone, 'recent');
  assert.match(recent.text, /Recently reported/);
  const outage = trackingSummary({ ...base, status: 'unavailable', message: '', position: { latitude: 2.2, longitude: 73.1, reported_at: '2030-11-01T06:59:00Z', freshness: 'recent' } }, now);
  assert.equal(outage.tone, 'stale');
  const old = trackingSummary({ ...base, status: 'ok', message: '', position: { latitude: 2.2, longitude: 73.1, reported_at: '2030-11-01T05:00:00Z', freshness: 'stale' } }, now);
  assert.equal(old.tone, 'stale');
  assert.match(old.text, /Last known position/);
  const unknown = trackingSummary({ ...base, status: 'ok', message: '', position: { latitude: 2.2, longitude: 73.1, reported_at: null, freshness: 'unknown' } }, now);
  assert.equal(unknown.tone, 'stale');
  assert.match(unknown.text, /Report time unavailable/);
});

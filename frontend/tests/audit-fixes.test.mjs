import test from 'node:test';
import assert from 'node:assert/strict';
import { isDhathuruBackend } from '../src/lib/backend-health.ts';
import { validatePassenger } from '../src/lib/booking-validation.ts';
import { filterSailings, sailingRoute } from '../src/lib/sailing-filters.ts';
import { maldivesDate } from '../src/lib/travel-date.ts';

test('backend health requires the expected service, application and timezone', () => {
  const good = {status:'ok', application:'Dhathuru App', service_id:'dhathuru-api', service_timezone:'Indian/Maldives'};
  assert.equal(isDhathuruBackend(good),true);
  for (const data of [null, {}, {...good,application:'Heyliarts'}, {...good,service_id:'different'}, {...good,status:'failed'}, {...good,service_timezone:'UTC'}]) assert.equal(isDhathuruBackend(data),false);
});

test('empty/invalid passenger details give field errors while text is preserved for safe React rendering', () => {
  assert.deepEqual(Object.keys(validatePassenger('', '', 0, 6)), ['passenger_name','email','seats']);
  assert.equal(validatePassenger('Demo', 'bad', 7, 6).email, 'Enter a valid email address.');
  assert.ok(validatePassenger('Demo', 'demo@example.test', 1.5, 6).seats);
  assert.deepEqual(validatePassenger('<script>window.test = true</script>', 'demo@example.test', 2, 6), {});
});

test('sailing filters combine date, provider, route and accent-insensitive text and exclude departures', () => {
  const now=Date.parse('2030-11-01T10:00:00+05:00');
  const first={id:1, origin:'Malé', destination:'Hulhumalé',organization_name:'Lagoon',vessel_name:'One', departure_at:'2030-11-01T10:00:00+05:00'};
  const second={...first,id:2,departure_at:'2030-11-01T11:00:00+05:00'};
  const third={...first,id:3,organization_name:'Coral',departure_at:'2030-11-02T11:00:00+05:00'};
  const all={query:'',date:'',provider:'',route:''};
  assert.deepEqual(filterSailings([third,first,second],all,now).map(s=>s.id),[2,3]);
  assert.deepEqual(filterSailings([third,first,second],{query:'male',date:'2030-11-01',provider:'Lagoon',route:sailingRoute(second)},now).map(s=>s.id),[2]);
  assert.deepEqual(filterSailings([second],{...all,provider:'Coral'},now),[]);
  assert.equal(maldivesDate('2030-11-01T20:00:00Z'),'2030-11-02');
});

test('mutating proxy requests reject missing, malformed and other-site origins', async () => {
  const { sameOrigin } = await import('../src/lib/request-origin.ts');
  const request = origin => new Request('http://127.0.0.1:3000/api/demo-bookings', {method:'POST',headers:{host:'127.0.0.1:3000',...(origin?{origin}:{})}});
  assert.equal(sameOrigin(request('http://127.0.0.1:3000')),true);
  for (const origin of [undefined,'bad-url','http://another.example','http://127.0.0.1:4000']) assert.equal(sameOrigin(request(origin)),false);
});

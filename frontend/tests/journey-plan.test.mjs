import test from 'node:test';
import { matchingFlight } from '../src/lib/flights.ts';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { journeyDetailsInput, buildJourney, canBookForParty, matchesLocation, taxiDestinationZone, validatePlan } from '../src/lib/journey-plan.ts';

const directory = JSON.parse(readFileSync(new URL('../../backend/resources/data/locations.json', import.meta.url)));
const island = id => directory.islands.find(p => p.id === id);
const airport = id => directory.airports.find(p => p.id === id);
const input = { origin: island('ld0205'), destination: island('ld0591'), departureAirport: airport('VRNT'), arrivalAirport: airport('VRMM'), flightArrival: '', address: 'Home', passengers: 2, taxiZone: 'hulhumale-phase-1' };
const result = { transfer_minutes: 20, safety_minutes: 30, flight_at: '2099-01-01T14:00:00+05:00' };
const sailing = { id: 'provider-1', source: 'provider', service: 'Demo One', operator: 'Demo Provider', fare_minor: 15000, bookable: true, classification: 'recommended', available_seats: 3, departure_at: '2099-01-01T08:00:00+05:00', harbour_arrival_at: '2099-01-01T10:00:00+05:00', airport_arrival_at: '2099-01-01T10:20:00+05:00' };
const fare = { from: 'domestic-terminal', to: 'hulhumale-phase-1', amount_minor: 9000, currency: 'MVR' };

test('booking payload carries canonical full-journey inputs without client fares or statuses', () => {
  assert.deepEqual(journeyDetailsInput(input), { arrival_airport_id: 'VRMM', destination_id: 'ld0591', address: 'Home', flight_arrival_at: null, taxi_zone: 'hulhumale-phase-1' });
  assert.equal(journeyDetailsInput({ ...input, arrivalAirport: airport('VRNT') }).taxi_zone, null);
  assert.equal(journeyDetailsInput({ ...input, address: '   ' }).address, null);
});

test('connects four legs using canonical endpoints and per-party ferry prices', () => {
  const legs = buildJourney(input, result, sailing, directory, fare);
  assert.deepEqual(legs.map(l => l.mode), ['sea', 'taxi', 'flight', 'taxi']);
  assert.deepEqual(legs.map(l => l.price), [30000, null, null, 9000]);
  assert.deepEqual(legs.map(l => l.points[1].id), ['ld0082', 'VRNT', 'VRMM', 'ld0591']);
  assert.equal(legs[3].departure, null);
  assert.equal(legs[2].arrival, null);
  assert.match(legs[3].to, /Home/);
});
test('does not invent a road connection to an unrelated island', () => {
  const last = buildJourney({ ...input, destination: island('ld0268') }, result, sailing, directory, fare)[3];
  assert.equal(last.mode, 'land'); assert.deepEqual(last.points, []); assert.equal(last.price, null);
});
test('does not apply the Greater Male matrix to Thimarafushi', () => {
  assert.equal(taxiDestinationZone(input.destination, airport('VRNT'), input.taxiZone), null);
});
test('finishes at the airport without a same-place taxi', () => {
  assert.equal(buildJourney({ ...input, destination: airport('VRMM') }, result, sailing, directory, fare).length, 3);
});
test('keeps unknown fares and mismatched quotes unknown rather than zero', () => {
  for (const quote of [null, { ...fare, to: 'male' }, { ...fare, from: 'velana-airport' }, { ...fare, currency: 'USD' }]) {
    const legs = buildJourney(input, result, { ...sailing, source: 'legacy', fare_minor: undefined }, directory, quote);
    assert.equal(legs[0].price, null); assert.equal(legs[3].price, null);
  }
});
test('uses the selected Hulhumale phase', () => {
  assert.equal(taxiDestinationZone(input.destination, input.arrivalAirport, 'hulhumale-phase-2'), 'hulhumale-phase-2');
  assert.equal(buildJourney({ ...input, taxiZone: 'hulhumale-phase-2' }, result, sailing, directory, fare)[3].price, null);
});
test('requires sufficient capacity and a safe, bookable connection', () => {
  assert.equal(canBookForParty(sailing, 3), true); assert.equal(canBookForParty(sailing, 4), false);
  for (const classification of ['cancelled', 'tight', 'too_late']) assert.equal(canBookForParty({ ...sailing, classification }, 1), false);
  assert.equal(canBookForParty({ ...sailing, bookable: false }, 1), false);
});
test('validates endpoints, future dates and overnight flight arrival', () => {
  const departure = '2099-01-01T23:00:00+05:00';
  assert.equal(validatePlan({ ...input, flightArrival: '2099-01-02T00:30:00+05:00' }, departure), null);
  assert.match(validatePlan({ ...input, flightArrival: '2099-01-01T00:30:00+05:00' }, departure), /after departure/);
  assert.match(validatePlan({ ...input, destination: input.origin }, departure), /different starting/);
  assert.match(validatePlan({ ...input, arrivalAirport: input.departureAirport }, departure), /different airports/);
  assert.match(validatePlan(input, '2020-01-01T14:00:00+05:00'), /future/);
  assert.match(validatePlan(input, 'invalid'), /date and time/);
});
test('search matches accents, atolls, airport codes and categories', () => {
  assert.equal(matchesLocation(island('ld0591'), 'hulhumale'), true);
  assert.equal(matchesLocation(island('ld0205'), 'thaa vilu'), true);
  assert.equal(matchesLocation(airport('VRMM'), 'mle'), true);
  assert.equal(matchesLocation(island('ld0205'), 'resort'), false);
});

test('editing airports or flight times drops a mismatched airline selection', () => {
  const offer = { id: 'source-flight', from: 'VRNT', to: 'VRMM', departure_at: '2099-01-01T14:00:00+05:00', arrival_at: '2099-01-01T14:50:00+05:00', airline: 'Maldivian', flight_number: 'Q2 183', fare_minor: 146400 };
  assert.equal(matchingFlight(offer, 'VRNT', 'VRMM', offer.departure_at, offer.arrival_at), offer);
  assert.equal(matchingFlight(offer, 'VRNT', 'VRMM', '2099-01-01T14:01:00+05:00', offer.arrival_at), null);
  assert.equal(matchingFlight(offer, 'VRNT', 'VRMG', offer.departure_at, offer.arrival_at), null);
  assert.equal(matchingFlight(offer, 'VRNT', 'VRMM', offer.departure_at, ''), null);
  const selected = { ...input, selectedFlight: offer, flightArrival: offer.arrival_at };
  assert.equal(journeyDetailsInput(selected).flight_offer_id, 'source-flight');
  assert.equal('fare_minor' in journeyDetailsInput(selected), false);
  const leg = buildJourney(selected, result, sailing, directory, fare)[2];
  assert.equal(leg.title, 'Maldivian Q2 183');
  assert.equal(leg.price, null);
  assert.match(leg.status, /book with Maldivian/);
});

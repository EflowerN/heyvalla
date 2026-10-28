import test from 'node:test';
import assert from 'node:assert/strict';
import { ACCOUNT_TYPES, needsApproval, nextPage, canUseBoatTools, isAdmin } from '../src/lib/account-types.ts';
import { translate } from '../src/lib/i18n.ts';

const account = (over = {}) => ({ name: 'A', email: 'a@example.test', type: 'customer', status: 'active', is_admin: false, organization_name: null, ...over });

test('only travellers skip approval and admin is not a sign-up choice', () => {
  assert.deepEqual(ACCOUNT_TYPES.map(item => item.value), ['customer', 'vessel_owner', 'vehicle_owner', 'business']);
  assert.equal(needsApproval('customer'), false);
  for (const type of ['vessel_owner', 'vehicle_owner', 'business']) assert.equal(needsApproval(type), true);
  for (const item of ACCOUNT_TYPES.filter(item => item.value !== 'customer')) assert.ok(item.organisation, `${item.value} must ask for an organisation`);
});

test('people land on the right page after signing up or in', () => {
  assert.equal(nextPage(account()), '/journeys');
  assert.equal(nextPage(account({ type: 'vessel_owner', status: 'active' })), '/providers');
  assert.equal(nextPage(account({ type: 'vessel_owner', status: 'pending' })), '/account');
  assert.equal(nextPage(account({ type: 'business', status: 'active' })), '/account');
  assert.equal(nextPage(account({ type: 'vehicle_owner', status: 'active' })), '/account');
  assert.equal(nextPage(account({ status: 'suspended' })), '/account');
});

test('boat tools need an approved boat owner and admin needs an active admin', () => {
  assert.equal(canUseBoatTools(account({ type: 'vessel_owner' })), true);
  assert.equal(canUseBoatTools(account({ type: 'vessel_owner', status: 'pending' })), false);
  assert.equal(canUseBoatTools(account({ type: 'vehicle_owner' })), false);
  assert.equal(canUseBoatTools(null), false);
  assert.equal(isAdmin(account({ is_admin: true })), true);
  assert.equal(isAdmin(account({ is_admin: true, status: 'suspended' })), false);
  assert.equal(isAdmin(account()), false);
  assert.equal(isAdmin(null), false);
});

test('every account type label and description has a Dhivehi translation', () => {
  for (const item of ACCOUNT_TYPES) {
    for (const text of [item.label, item.blurb, item.organisation].filter(Boolean)) assert.notEqual(translate('dv', text), text, text);
  }
});

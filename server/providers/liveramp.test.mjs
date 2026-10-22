import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseFullName, validateLiveRampInput, mapLiveRampStatus, extractLiveRampRequest } from './liveramp.mjs';

test('splits a full name without dropping middle names', () => {
  assert.deepEqual(normaliseFullName(' Ada Lovelace Byron '), { first_name: 'Ada', last_name: 'Lovelace Byron' });
});

test('validates a US opt-out request and normalises email', () => {
  const result = validateLiveRampInput({ fullName:'Ada Lovelace', email:'ADA@example.com', country:'United States', requestType:'OPT_OUT', signature:'Ada Lovelace' });
  assert.equal(result.payload.email, 'ada@example.com');
  assert.equal(result.payload.request_type, 'OPT_OUT');
  assert.equal(result.payload.first_name, 'Ada');
  assert.equal(result.payload.last_name, 'Lovelace');
});

test('blocks non-US requests', () => {
  assert.throws(() => validateLiveRampInput({ fullName:'Ada Lovelace', email:'ada@example.com', country:'Nigeria', requestType:'OPT_OUT', signature:'Ada Lovelace' }), /US-resident/);
});

test('accepts valid US states for deletion while leaving legal eligibility to the provider and user', () => {
  const result = validateLiveRampInput({ fullName:'Ada Lovelace', email:'ada@example.com', country:'United States', requestType:'DELETION', state:'NY', signature:'Ada Lovelace' });
  assert.equal(result.payload.state, 'NY');
  assert.throws(() => validateLiveRampInput({ fullName:'Ada Lovelace', email:'ada@example.com', country:'United States', requestType:'DELETION', state:'ZZ', signature:'Ada Lovelace' }), /valid US state/);
});

test('requires typed signature to match the submitted name', () => {
  assert.throws(() => validateLiveRampInput({ fullName:'Ada Lovelace', email:'ada@example.com', country:'United States', requestType:'OPT_OUT', signature:'Someone Else' }), /typed signature/);
});

test('maps provider status into product status', () => {
  assert.equal(mapLiveRampStatus('ACCEPTED'), 'submitted');
  assert.equal(mapLiveRampStatus('PROCESSING'), 'processing');
  assert.equal(mapLiveRampStatus('COMPLETED'), 'completed');
  assert.equal(mapLiveRampStatus('FAILED'), 'failed');
  assert.equal(mapLiveRampStatus('FUTURE_STATUS'), 'unknown');
});

test('extracts request IDs from response envelopes', () => {
  assert.equal(extractLiveRampRequest({ data: { uuid:'abc-123', status:'PROCESSING' } }).uuid, 'abc-123');
  assert.equal(extractLiveRampRequest({ request_uuid:'def-456' }).uuid, 'def-456');
});

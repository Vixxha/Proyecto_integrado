import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRut, validRut, normalizePhone, validBirth } from '../lib/validation.mjs';
test('Chilean RUT validates checksum, normalization and invalid values',()=>{assert.equal(normalizeRut('12.345.678-5'),'12345678-5');assert.ok(validRut('12.345.678-5'));assert.ok(!validRut('12345678-9'));assert.ok(!validRut('00000000-0'));assert.ok(!validRut('123'));});
test('phone normalizes local and international forms',()=>{assert.equal(normalizePhone('9 1234 5678'),'+56912345678');assert.equal(normalizePhone('+56 9 1234 5678'),'+56912345678');});
test('age boundaries include age 15 and reject age 16, future and invalid dates',()=>{const today=new Date('2026-11-12T18:00:00');assert.ok(validBirth('2010-11-13',today));assert.ok(!validBirth('2010-11-12',today));assert.ok(validBirth('2026-11-12',today));assert.ok(!validBirth('2026-11-13',today));assert.ok(!validBirth('2020-02-30',today));assert.ok(!validBirth('',today));});

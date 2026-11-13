import test from 'node:test';
import assert from 'node:assert/strict';
import { validRegistrationRut, canShareTestRut } from '../lib/registration-mode.mjs';
test('test RUT is accepted only in demo mode, with optional formatting',()=>{
 assert.ok(validRegistrationRut('12345678-1',true));
 assert.ok(validRegistrationRut('12.345.678-1',true));
 assert.ok(!validRegistrationRut('12345678-1',false));
 assert.ok(!validRegistrationRut('12345678-9',true));
 assert.ok(validRegistrationRut('12345678-5',false));
});
test('adult and children can share only the designated demo RUT in demo mode',()=>{
 assert.ok(canShareTestRut('12345678-1','12.345.678-1',true));
 assert.ok(!canShareTestRut('12345678-1','12345678-1',false));
 assert.ok(!canShareTestRut('12345678-5','12345678-5',true));
});

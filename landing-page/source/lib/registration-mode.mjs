// Test records are saved in Supabase and visibly marked in the dashboard.
export const TEST_MODE = true;
export const TEST_RUT = '12345678-1';
export const CAMPAIGN = '2026';
export const SECTORS = [
  {id:'centro',name:'Centro'}, {id:'norte',name:'Norte'}, {id:'sur',name:'Sur'},
  {id:'oriente',name:'Oriente'}, {id:'poniente',name:'Poniente'}, {id:'cordillera',name:'Cordillera'},
];
import { normalizeRut, validRut } from './validation.mjs';
export function validRegistrationRut(value, testMode = TEST_MODE) {
  return (testMode && normalizeRut(value) === TEST_RUT) || validRut(value);
}
export function canShareTestRut(first, second, testMode = TEST_MODE) {
  return testMode && normalizeRut(first) === TEST_RUT && normalizeRut(second) === TEST_RUT;
}

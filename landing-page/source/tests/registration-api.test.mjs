import test from 'node:test';
import assert from 'node:assert/strict';
import {saveRegistration} from '../lib/registration-api.mjs';
const receipt='bda4d663-0879-4ebf-af02-f9f218c81770';
test('test family is posted to the dashboard RPC and uses only the saved receipt',async()=>{
 const payload={solicitud_id:receipt,campana:'2026',prueba:true,adulto:{rut:'12345678-1',sector:'centro'},hijos:[{rut:'12345678-1'}]};
 let calls=0;
 const result=await saveRegistration(payload,async(url,options)=>{
  calls++;assert.ok(url.endsWith('/rpc/familias_dashboard_inscribir'));
  assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{p_solicitud:payload});
  assert.ok(options.headers.apikey.startsWith('sb_publishable_'));
  return {ok:true,json:async()=>receipt};
 });
 assert.equal(calls,1);assert.equal(result,receipt);
});
test('network failures and validation errors never produce a success receipt',async()=>{
 await assert.rejects(saveRegistration({},async()=>{throw new Error('Sin conexión');}),/Sin conexión/);
 await assert.rejects(saveRegistration({},async()=>({ok:false,json:async()=>({code:'P0001',message:'Sector no válido'})})),/Sector no válido/);
 await assert.rejects(saveRegistration({},async()=>({ok:true,json:async()=>null})),/comprobante válido/);
});

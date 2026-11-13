const url = 'https://ovnvoodmxuygkxgczeka.supabase.co/rest/v1/rpc/familias_dashboard_inscribir';
const key = 'sb_publishable_vIZSqnv2VSJic_WRpdXYKg_-vu38qH7';
export async function saveRegistration(payload, fetcher = globalThis.fetch) {
 const response = await fetcher(url, {
  method:'POST',headers:{'Content-Type':'application/json',apikey:key},
  body:JSON.stringify({p_solicitud:payload}),signal:AbortSignal.timeout(25000),
 });
 const data = await response.json();
 if(!response.ok)throw new Error(data?.code==='P0001'?data.message:'No pudimos guardar la inscripción. Inténtalo nuevamente en unos minutos.');
 if(typeof data!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(data)) {
  throw new Error('No recibimos un comprobante válido. Consulta en el dashboard antes de volver a enviar.');
 }
 return data;
}

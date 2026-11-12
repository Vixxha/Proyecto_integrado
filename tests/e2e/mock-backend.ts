import type { Page } from '@playwright/test'
import { CAMPAIGNS, DEMO_DATA, SECTORS, summarize, type Campaign, type Registration, type SystemData } from '../../src/lib/data'
import { assignGift, deliverGift, registerChild, uniqueRegistrations } from '../../src/lib/operations'

// Browser tests use fake sessions and an isolated RPC backend. No real credentials or writes.
export async function mockBackend(page: Page) {
  let source: SystemData = { registrations: uniqueRegistrations(DEMO_DATA), gifts: [...DEMO_DATA.gifts] }
  const calls: { path: string; body: Record<string, unknown> }[] = []
  const user = { id:'00000000-0000-4000-8000-000000000123',email:'browser-test@example.invalid',aud:'authenticated',role:'authenticated',created_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{} }
  const expires = Math.floor(Date.now()/1000)+3600
  const access = [Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',aud:'authenticated',exp:expires})).toString('base64url'),'FAKE-TEST-SIGNATURE'].join('.')
  await page.addInitScript(({user,access,expires}) => {
    localStorage.setItem('sb-ovnvoodmxuygkxgczeka-auth-token',JSON.stringify({access_token:access,refresh_token:'FAKE-TEST-REFRESH',expires_at:expires,expires_in:3600,token_type:'bearer',user}))
  }, {user,access,expires})
  await page.route('https://ovnvoodmxuygkxgczeka.supabase.co/**',async route => {
    const request = route.request(), path = new URL(request.url()).pathname
    const body = request.postDataJSON() as Record<string, unknown> | null ?? {}
    calls.push({path,body})
    let data: unknown
    try {
      if (path === '/auth/v1/user') data = user
      else if (path === '/rest/v1/navidad_staff') data = {role:'operator'}
      else if (path === '/rest/v1/rpc/navidad_dashboard') data = Object.fromEntries(CAMPAIGNS.map(campaign => [campaign,{
        sectors:summarize(campaign,'todos',source).allSectors.map(({progress:_progress,...s})=>s),
        deliveries:SECTORS.flatMap(sector=>summarize(campaign,sector.id,source).weeks.filter(w=>w.delivered>0).map(w=>({sector:sector.id,date:w.date,delivered:w.delivered}))),
      }]))
      else if (path === '/rest/v1/rpc/navidad_records_page') {
        const gifts=new Map(source.gifts.filter(g=>g.campaign===body.p_campaign).map(g=>[g.childId,g]))
        const query=String(body.p_query||'').trim().toLocaleLowerCase('es')
        const records=source.registrations.filter(r=>{
          const gift=gifts.get(r.childId)
          return r.campaign===body.p_campaign && (!body.p_sector||r.sector===body.p_sector)
            && (!body.p_assigned_only||gift) && (body.p_status==='todos'||body.p_status==='sin-asignar'&&!gift||body.p_status==='pendientes'&&gift&&!gift.deliveredAt||body.p_status==='entregados'&&gift?.deliveredAt)
            && [r.childId,r.name||'',r.guardian||''].some(v=>v.toLocaleLowerCase('es').includes(query))
        }).sort((a,b)=>a.childId<b.childId?-1:a.childId>b.childId?1:0)
        data={total:records.length,records:records.slice(Number(body.p_offset),Number(body.p_offset)+Number(body.p_limit)).map(registration=>({registration,gift:gifts.get(registration.childId)||null}))}
      } else if(path==='/rest/v1/rpc/navidad_register_child') {
        const registration:Registration={campaign:body.p_campaign as Campaign,sector:body.p_sector as Registration['sector'],childId:String(body.p_child_id),name:String(body.p_name),birthDate:String(body.p_birth_date),guardian:String(body.p_guardian),phone:String(body.p_phone||''),address:String(body.p_address||'')}
        source=registerChild(source,registration);data=null
      } else if(path==='/rest/v1/rpc/navidad_assign_gift') { source=assignGift(source,body.p_campaign as Campaign,String(body.p_child_id),String(body.p_name));data=null }
      else if(path==='/rest/v1/rpc/navidad_deliver_gift') { source=deliverGift(source,String(body.p_gift_id),String(body.p_recipient),String(body.p_date));data=true }
      else throw new Error(`Unexpected request: ${path}`)
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)})
    } catch (error) { await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'P0001',message:error instanceof Error?error.message:'Mock error'})}) }
  })
  return {calls}
}

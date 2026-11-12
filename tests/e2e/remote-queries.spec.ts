import { expect, test } from '@playwright/test'
import { mockBackend } from './mock-backend'

test('dashboard uses one compact RPC and filters without downloading raw tables',async({page})=>{
  const {calls}=await mockBackend(page)
  await page.goto('/')
  await expect(page.getByTestId('enrolled')).toHaveText('12.840')
  await expect(page.getByTestId('pending')).toHaveText('3.180')
  expect(calls.filter(c=>c.path.endsWith('/navidad_dashboard'))).toHaveLength(1)
  expect(calls.some(c=>/\/navidad_(registrations|gifts)$/.test(c.path))).toBe(false)
  await page.getByRole('combobox',{name:'Sector',exact:true}).click()
  await page.getByRole('option',{name:'Sur',exact:true}).click()
  await expect(page.getByTestId('pending')).toHaveText('790')
  expect(calls.filter(c=>c.path.endsWith('/navidad_dashboard'))).toHaveLength(1)
})

test('server pagination, search and status filters request only the visible page',async({page})=>{
  const {calls}=await mockBackend(page)
  await page.goto('/#inscripciones')
  await expect(page.locator('tbody tr')).toHaveCount(15)
  await page.getByRole('button',{name:'Página siguiente'}).click()
  await expect(page.locator('.operation-pagination')).toContainText('Página 2')
  await expect.poll(()=>calls.filter(c=>c.path.endsWith('/navidad_records_page')).at(-1)?.body.p_offset).toBe(15)
  await page.getByRole('textbox',{name:'Buscar por nombre, código o apoderado'}).fill('norte-0')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody tr')).toContainText('norte-0')
  const last=calls.filter(c=>c.path.endsWith('/navidad_records_page')).at(-1)!
  expect(last.body).toMatchObject({p_query:'norte-0',p_offset:0,p_limit:15})
  expect(calls.some(c=>/\/navidad_(registrations|gifts)$/.test(c.path))).toBe(false)
})

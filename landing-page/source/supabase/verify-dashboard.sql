-- Reversible integration checks. No test records remain after rollback.
begin;
set local role anon;
do $$
declare p jsonb := '{"solicitud_id":"bda4d663-0879-4ebf-af02-f9f218c81770","campana":"2026","prueba":true,"adulto":{"nombre":"Verificación landing","rut":"12345678-1","telefono":"+56912345678","direccion":"Dirección de prueba 123","sector":"centro"},"hijos":[{"nombre":"Hijo prueba uno","rut":"12345678-1","nacimiento":"2020-01-15","sexo":"Otro","origen":"Otro","institucion":""},{"nombre":"Hijo prueba dos","rut":"12345678-1","nacimiento":"2018-06-20","sexo":"F","origen":"Jardín Infantil","institucion":"Jardín de prueba"}],"consentimiento":true,"mayor_edad":true}';
result uuid; rejected boolean;
begin
  rejected := false;
  begin perform public.familias_dashboard_inscribir(jsonb_set(p,'{prueba}','false'));
  exception when raise_exception then rejected:=true; end;
  if not rejected then raise exception 'The invalid RUT was accepted outside test mode'; end if;
  rejected := false;
  begin perform public.familias_dashboard_inscribir(jsonb_set(p,'{hijos,1,nacimiento}','"2099-01-01"'));
  exception when raise_exception then rejected:=true; end;
  if not rejected then raise exception 'An invalid second child was accepted'; end if;
  rejected := false;
  begin perform public.familias_dashboard_inscribir(jsonb_set(p,'{adulto,sector}','"7"'));
  exception when raise_exception then rejected:=true; end;
  if not rejected then raise exception 'A sector absent from the dashboard was accepted'; end if;
  rejected := false;
  begin perform public.familias_dashboard_inscribir(jsonb_set(p,'{consentimiento}','false'));
  exception when raise_exception then rejected:=true; end;
  if not rejected then raise exception 'Missing consent was accepted'; end if;
  result := public.familias_dashboard_inscribir(p);
  if result is distinct from 'bda4d663-0879-4ebf-af02-f9f218c81770'::uuid then raise exception 'Missing saved receipt'; end if;
  if public.familias_dashboard_inscribir(p) is distinct from result then raise exception 'Retry was not idempotent'; end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from public.familias_web_submissions where id='bda4d663-0879-4ebf-af02-f9f218c81770')<>1
 or (select count(*) from public.navidad_registrations where child_id like 'TEST-bda4d663-0879-4ebf-af02-f9f218c81770-%')<>2
 then raise exception 'Incorrect persistence counts'; end if;
 perform set_config('request.jwt.claim.sub',(select user_id::text from public.navidad_staff limit 1),true);
end $$;
set local role authenticated;
select
  (public.navidad_records_page('2026','centro','TEST-bda4d663-0879-4ebf-af02-f9f218c81770','sin-asignar',false,15,0)->>'total')::int=2 as dashboard_sees_both_children,
  (select count(*) from public.familias_web_submissions where id='bda4d663-0879-4ebf-af02-f9f218c81770')=1 as staff_sees_full_form,
  not has_table_privilege('anon','public.familias_web_submissions','SELECT') as anonymous_form_reads_blocked,
  not has_table_privilege('anon','public.navidad_registrations','INSERT') as direct_public_writes_blocked;
rollback;

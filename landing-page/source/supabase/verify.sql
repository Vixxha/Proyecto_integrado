-- Run as postgres/SQL editor. Every test record is rolled back.
begin;
set local role anon;
do $$
declare payload jsonb := '{"adulto":{"nombre":"Prueba técnica temporal","rut":"12345678-5","telefono":"+56912345678","direccion":"Dirección de prueba temporal","territorio":"1"},"hijos":[{"nombre":"Prueba menor temporal","rut":"11111111-1","nacimiento":"2020-01-15","sexo":"Otro","origen":"Jardín Infantil","institucion":"Prueba técnica"}],"consentimiento":true,"mayor_edad":true}';
receipt uuid; rejected boolean;
begin
  rejected := false;
  begin
    perform public.familias_inscribir(payload || '{"consentimiento":false}');
  exception when raise_exception then rejected := true; end;
  if not rejected then raise exception 'Missing consent was accepted'; end if;
  rejected := false;
  begin
    perform public.familias_inscribir(jsonb_set(payload,'{adulto,rut}','"12345678-9"'));
  exception when raise_exception then rejected := true; end;
  if not rejected then raise exception 'Invalid RUT was accepted'; end if;
  rejected := false;
  begin
    perform public.familias_inscribir(jsonb_set(payload,'{hijos,0,nacimiento}','"2099-01-01"'));
  exception when raise_exception then rejected := true; end;
  if not rejected then raise exception 'Future birth was accepted'; end if;
  -- Failure of child 2 must roll back guardian and child 1.
  rejected := false;
  begin
    perform public.familias_inscribir(jsonb_set(payload,'{hijos}',(payload->'hijos') || '[{"nombre":"Prueba inválida","rut":"11111111-9","nacimiento":"2021-01-01","sexo":"M","origen":"Otro","institucion":""}]'));
  exception when raise_exception then rejected := true; end;
  if not rejected then raise exception 'Invalid second child was accepted'; end if;
  receipt := public.familias_inscribir(payload);
  if receipt is null then raise exception 'No receipt'; end if;
  rejected := false;
  begin
    perform public.familias_inscribir(payload);
  exception when raise_exception then rejected := true; end;
  if not rejected then raise exception 'Duplicate registration was accepted'; end if;
end; $$;
reset role;
select (select count(*) from public.tutores where rut='12345678-5')=1 as exactly_one_guardian,
       (select count(*) from public.beneficiarios where rut='11111111-1')=1 as exactly_one_child,
       not has_table_privilege('anon','public.tutores','SELECT') as guardian_reads_blocked,
       not has_table_privilege('anon','public.beneficiarios','SELECT') as child_reads_blocked;
rollback;

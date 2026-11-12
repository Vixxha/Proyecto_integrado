# Verificación remota — 12 de noviembre de 2026

Proyecto: Municipalidad-jugetes (`ovnvoodmxuygkxgczeka`). Reactivado desde INACTIVE hasta ACTIVE_HEALTHY.

Migraciones aplicadas: `create_navidad_campaign_system` e `index_navidad_gift_registration_reference`.

| Campaña | Inscritos | Asignados | Entregados | Pendientes |
| --- | ---: | ---: | ---: | ---: |
| 2026 | 12.840 | 11.520 | 8.340 | 3.180 |
| 2025 | 10.401 | 9.331 | 6.756 | 2.575 |

La consulta remota confirmó estos totales después del seed. `tests/access.sql` confirmó el aislamiento de cuentas sin pertenencia al equipo, lectura sin escritura para lectores, inscripción y asignación para operadores, rechazo de duplicados, entrega atómica y acceso anónimo denegado. Sus cuentas y registros de prueba se revirtieron mediante rollback.

El asesor de seguridad no reportó hallazgos sobre los nuevos objetos `navidad_*`. El índice faltante de la referencia compuesta de regalos a inscripciones se añadió tras la revisión de rendimiento. Los avisos de índices aún no usados corresponden a índices nuevos sin tráfico de la aplicación.

## Hallazgos preexistentes fuera del esquema nuevo

El asesor de seguridad detectó los siguientes hallazgos antes de crear las tablas de Navidad. Permanecen pendientes de revisión y no deben confundirse con una certificación de seguridad del proyecto completo:

- `public.vista_licitacion_san_joaquin` usa SECURITY DEFINER. [Remediación](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view).
- `public.set_beneficiario_tramo_etario` y `public.handle_new_user` no fijan search_path. [Remediación](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
- Las funciones SECURITY DEFINER `handle_new_user` y `rls_auto_enable` pueden ejecutarse con el rol anónimo y autenticado. [Acceso anónimo](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [acceso autenticado](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- La protección de contraseñas filtradas de Auth está deshabilitada. [Remediación](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

No se modificaron esos objetos ajenos a `navidad_*`. La cuenta indicada por el usuario fue incorporada al equipo como operador y se verificó su pertenencia mediante una consulta. No se crearon contraseñas ni usuarios permanentes de demostración.

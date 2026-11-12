# Base de desarrollo

El esquema declarativo está en `schemas/001_navidad.sql` y las consultas optimizadas en `schemas/002_queries.sql`. El seed es aditivo e idempotente y reproduce los datos del dashboard, sin nombres reales, RUT ni teléfonos reales. No modifica tablas ajenas al prefijo `navidad_`.

**Estado:** MCP conectado al proyecto `Municipalidad-jugetes` (`ovnvoodmxuygkxgczeka`), reactivado y saludable. Esquema y seed aplicados el 12 de noviembre de 2026. Los totales fueron verificados y las pruebas de acceso de `tests/access.sql` pasaron en una transacción con rollback. Se conservaron las tablas anteriores `tutores`, `beneficiarios` y `usuarios`. La cuenta indicada por el usuario ya existía en Auth, con correo confirmado, y fue autorizada como operator. No se modificó su contraseña.

Con el MCP conectado:

1. Confirmar el proyecto seleccionado y revisar las tablas existentes antes de aplicar el esquema. No ejecutar sobre un proyecto con tablas `navidad_*` preexistentes sin comparar su estructura.
2. Aplicar el esquema completo en una operación de migración remota y luego ejecutar `seed.sql` en su transacción.
3. Ejecutar `checks.sql`, probar accesos con roles anónimo, lector y operador y revisar los asesores de seguridad y rendimiento.
4. Crear el usuario operador en Supabase Auth mediante una invitación desde el panel. No hay cuentas públicas de registro ni contraseñas de prueba en el repositorio.
5. Con su UUID real de Auth, agregarlo desde el SQL editor: `insert into public.navidad_staff(user_id, role) values ('UUID_DEL_USUARIO', 'operator');`. Este paso es administrativo y nunca se hace desde el navegador.
6. Revisar la URL y la clave pública del navegador en `src/config/public.ts`. Nunca colocar claves `service_role`, claves secretas ni contraseñas en esa configuración.

La aplicación admite `viewer` (lectura), `operator` y `admin` (inscribir, asignar y entregar). El personal ve los datos municipales de todas las campañas; esta aplicación sirve a una sola municipalidad. RLS valida pertenencia y rol en cada operación. La aplicación no puede añadir personal ni cambiar roles.

La inscripción usa una función `SECURITY INVOKER` que crea al niño y su inscripción en una transacción. Una clave primaria compuesta impide inscripciones duplicadas por campaña. La asignación se limita a un regalo por niño y campaña y su sector debe coincidir con la inscripción. La entrega es atómica y condicionada a que aún esté pendiente. Las columnas de identidad y asignación no se pueden modificar al entregar.

El seed no reinicia entregas existentes al ejecutarse de nuevo. Los cambios de prueba desde la aplicación persisten en Supabase cuando está configurado y, en su ausencia, como cambios locales en el navegador. Esos cambios locales no se transfieren automáticamente al proyecto remoto.

## Consultas optimizadas

Las migraciones optimize_navidad_reports_and_pagination y limit_navidad_detail_joins_to_visible_page están aplicadas. El resumen usa navidad_dashboard() y las listas navidad_records_page(...). Las pruebas tests/queries.sql y tests/access.sql pasaron remotamente después de aplicar los cambios. La carga inicial pasó de unas 45 solicitudes de datos a una RPC agregada de 5861 bytes. La UI mantiene los filtros y solo solicita una página de detalle a la vez.

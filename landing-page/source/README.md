# Navidad en familia · La Florida

Landing responsive en Next.js/React. Fondo blanco, ilustración vectorial propia, tipografía Geist incluida localmente y formulario por pasos para un adulto y hasta seis hijos. Versión estática compilada en `out/`.

## Guardado y dashboard

**Los envíos ahora se guardan en Supabase y aparecen en el dashboard original.**

- Proyecto: `Municipalidad-jugetes`, referencia `ovnvoodmxuygkxgczeka`.
- Campaña: **Navidad 2026**.
- Sectores del panel: Centro, Norte, Sur, Oriente, Poniente y Cordillera.
- Entrada pública: `familias_dashboard_inscribir`.
- El formulario completo, incluido el adulto, sus hijos y la declaración de consentimiento, queda en `familias_web_submissions`.
- Cada hijo queda en `navidad_children` y su inscripción en `navidad_registrations`. Estas son las tablas que leen `navidad_records_page` y `navidad_dashboard` en el panel original.
- No se asignan regalos automáticamente. Las inscripciones aparecen inicialmente en **Sin asignar**. Actualizar el panel o volver a cargar los registros después del envío.

`TEST_MODE = true` en `lib/registration-mode.mjs` **permite datos de prueba con guardado real**. Se acepta `12345678-1` tanto para el adulto como para uno o varios hijos. Los nombres guardados en el dashboard llevan `[PRUEBA]`, los hijos usan códigos `TEST-…` únicos y el registro queda marcado `is_demo = true`. El RUT original se conserva en el formulario completo. Se pueden enviar pruebas distintas con el mismo RUT sin reemplazar datos existentes.

La campaña 2026 del proyecto está marcada como demostración. El servidor solo acepta el modo de prueba en una campaña que permita demostración. Para dejar de aceptar el RUT especial, cambiar `TEST_MODE` a `false` y reconstruir; la aplicación sigue guardando, con RUT válidos y control de duplicados. Confirmar los catálogos y datos definitivos antes de usarlo para una campaña municipal de producción.

## Integridad y acceso

Toda la familia se guarda en una transacción: si falla un hijo, no se guarda parcialmente la solicitud. Una identificación UUID por envío permite reintentar la misma petición sin duplicarla después de un corte de conexión. La confirmación y el comprobante solo se muestran después de recibir el UUID guardado del servidor.

El navegador utiliza exclusivamente una clave publicable, verificada como activa. Los visitantes no pueden leer solicitudes ni escribir directamente las tablas del dashboard. `familias_web_submissions` tiene RLS y lectura limitada al personal de `navidad_staff`. La función de recepción pública tiene `search_path` vacío, validación en el servidor y permisos de ejecución explícitos.

El endpoint anterior `familias_inscribir`, definido en `supabase/001_public_registration.sql`, conserva el guardado antiguo en `tutores` y `beneficiarios` pero **ya no es utilizado por esta landing**. No hay sincronización con esas dos tablas: el flujo actual escribe directamente en las tablas del dashboard y conserva todos los campos en `familias_web_submissions`.

## Abrir localmente

```powershell
cd "C:\Users\alexi\Documents\Trabajo-proyecto-integrado-lading-page\navidad-familias"
node scripts/preview.mjs
```

Abrir `http://127.0.0.1:3000`. Recargar con `Ctrl + F5` después de cambios. La versión compilada no necesita instalar dependencias. Los envíos realizados desde ella se guardan en el proyecto Supabase conectado, incluso en modo de prueba.

## Desarrollo y compilación

Con Node y acceso a npm:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

La exportación de Next.js usa `output: 'export'` y genera `out/`. En este entorno, la instalación de Next.js quedó bloqueada por el acceso de red a npm. Se usaron dependencias locales del proyecto original para verificar TypeScript y compilar la misma página React mediante `node scripts/build-static.mjs`.

## Verificación

- Siete pruebas locales: RUT especial, repetición entre adulto e hijos, validación chilena, teléfono, fechas, petición al endpoint de guardado y errores que nunca producen comprobantes ficticios.
- `supabase/002_dashboard_intake.sql` está aplicado en el proyecto conectado.
- `supabase/verify-dashboard.sql` prueba dentro de una transacción con rollback: dos hijos con el RUT especial, rechazo de RUT de prueba fuera del modo de prueba, rechazo de fecha futura, sector inválido y falta de consentimiento, guardado atómico y reintentos sin duplicar.
- La consulta del dashboard se ejecutó como personal autenticado con RLS y vio ambos niños, además de la solicitud completa. Las pruebas se revirtieron y no dejaron registros ficticios.
- Se confirmó que el servidor local responde HTTP 200. La comprobación HTTP directa contra Supabase desde el proceso local quedó bloqueada por la conexión de red del entorno; las comprobaciones remotas se hicieron mediante el conector Supabase.
- El navegador de automatización no está disponible: la revisión visual y el envío completo mediante navegador siguen sin verificar.
- El asesor de seguridad conserva advertencias anteriores en una vista de estadísticas y otras funciones ajenas al flujo. La función pública de recepción genera una advertencia esperada de `SECURITY DEFINER`; su exposición de escritura está limitada intencionalmente al alta validada, sin devolver datos de familias.

## Publicación

`navidad-landing-publicable.zip` contiene los archivos estáticos actualizados. Se puede alojar `out/` en un hosting estático. El sitio reservado en `.openai/hosting.json` todavía no está publicado: el flujo de Sites necesita Git y este entorno no dispone del ejecutable. Conservar el mismo `project_id` al retomar la publicación; no crear otro sitio. No hay credenciales secretas almacenadas en este proyecto.

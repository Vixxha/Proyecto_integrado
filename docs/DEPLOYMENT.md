# GitHub y Netlify

El sistema es una aplicación React estática conectada a Supabase. Una vez publicado no depende de ChatGPT, Codex ni de sus plugins. Netlify puede asignar una dirección .netlify.app o servir un dominio propio.

## Publicar el código

Subir al repositorio privado de GitHub las fuentes, pruebas, archivos SQL y documentación. La configuración de conexión está en src/config/public.ts y solo contiene valores públicos del navegador. No incluir contraseñas, claves secretas, tokens, datos descargados, node_modules ni cachés.

El flujo .github/workflows/ci.yml comprueba los datos, ejecuta pruebas, compila y prueba el navegador con un backend ficticio. No escribe en la base remota. La instalación completa debe sincronizar package-lock.json antes de considerar reproducibles las dependencias.

## Publicar el sitio en Netlify

1. Importar el repositorio de GitHub desde el panel de Netlify y seleccionar la rama main.
2. Usar Node.js 24, definido en .nvmrc.
3. Mantener el comando npm run build y el directorio dist definidos en netlify.toml.
4. Ejecutar el despliegue y comprobar el estado Published.
5. Tomar la URL definitiva del resultado de Netlify y probar el acceso con una cuenta municipal autorizada.

La configuración pública ya acompaña al código. No es necesario cargar variables de conexión en Netlify. Si se cambia de proyecto Supabase, actualizar src/config/public.ts y volver a compilar y desplegar. La aplicación rechaza claves que no sean publishable y usa HTTPS.

## Seguridad

La URL del proyecto y la clave publishable son información pública que cualquier navegador necesita para conectarse. No permiten administrar usuarios, cambiar roles ni eludir RLS. Las contraseñas, claves secretas y credenciales administrativas permanecen fuera del cliente.

La aplicación usa Supabase Auth y los permisos de navidad_staff. Las tablas tienen RLS, la vista del resumen usa security_invoker y las funciones usan SECURITY INVOKER. Las cuentas sin acceso municipal no obtienen registros. Los controles reales se ejecutan en PostgreSQL, no dependen de ocultar botones ni de esconder la URL del proyecto.

El proyecto contiene hallazgos de seguridad de objetos anteriores que se documentan en supabase/verification.md. No se ha certificado el proyecto completo como libre de riesgos.

## Dominio y Google

En Supabase, Authentication → URL Configuration debe contener la URL HTTPS final como Site URL y como redirección permitida para Google. Mantener las direcciones de desarrollo solo si se siguen utilizando.

Una cuenta que ya tenga contraseña puede usar el acceso por correo. Google OAuth necesita que la dirección de retorno esté autorizada. Para un dominio propio, usar los registros DNS indicados por Netlify y esperar la activación del certificado HTTPS. No se ha comprado ni registrado un dominio.

La clave de Google Maps es opcional. Si se utiliza, debe ser una clave de navegador restringida por dominio y por API. Sin ella, el mapa ilustrativo sigue disponible.

## Disponibilidad

El enlace .netlify.app funciona cuando el despliegue termina correctamente. Antes de anunciarlo, comprobar sesión, filtros, páginas, asignación, entrega y descarga Excel. Un dominio propio puede necesitar propagación DNS; no se garantiza un tiempo exacto.

## Pendientes comprobados

Revisión del 12 de noviembre de 2026: no hay carpeta .git ni remoto configurado en esta copia. El usuario indicó el repositorio de destino [Vixxha/Proyecto_integrado](https://github.com/Vixxha/Proyecto_integrado), que existe, es público y está vacío, sin ramas. La integración GitHub puede leer sus metadatos, pero el intento de crear .gitignore fue rechazado con HTTP 403, Resource not accessible by integration. Los permisos de la cuenta indicados en los metadatos no equivalen a autorización de escritura de la integración. No se han subido archivos ni verificado una URL de producción. GitHub CLI conserva una sesión inválida y git no está disponible en PATH.

La búsqueda de plugins no encontró una integración Netlify. El acceso al navegador falla porque su host no está disponible, por lo que tampoco se ha podido revisar el panel web ni iniciar un despliegue.

ExcelJS está declarado pero falta instalarlo, actualizar el lockfile y completar la compilación y las comprobaciones de exportación. No se debe marcar la publicación como terminada antes de obtener y verificar su URL.

La instalación se volvió a intentar con npm install --no-audit --no-fund; falló con EACCES al acceder a registry.npmjs.org. package-lock.json no incluye las dependencias actuales de Supabase y ExcelJS. No usar npm ci hasta actualizarlo mediante una instalación completa con acceso a npm.

### Verificación local del 12 de noviembre de 2026

- npm run test:data: 109 comprobaciones correctas.
- npm test: 14 pruebas correctas y una fallida por no poder importar ExcelJS.
- npm run build: falla porque ExcelJS y sus tipos no están instalados.
- PLAYWRIGHT_CHANNEL=msedge npm run test:e2e: 20 pruebas correctas y cuatro fallidas de 24. Las dos descargas Excel agotan el tiempo de espera; las dos pruebas de operaciones de escritorio quedan bloqueadas por el panel de error de Vite. Las operaciones móviles pasan. La suite usa un backend ficticio y no acredita el acceso a producción.

Para retomar: identificar o crear el repositorio privado de destino, completar npm install en un entorno con red, ejecutar las comprobaciones anteriores y subir las fuentes. Después importar main en Netlify con npm run build y dist. Confirmar el estado Published y probar la URL antes de registrarla como dirección definitiva.

Referencias: [Vite en Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/), [Configuración por archivo](https://docs.netlify.com/build/configure-builds/file-based-configuration/), [Dominios](https://docs.netlify.com/manage/domains/get-started-with-domains/), [Redirecciones de Supabase](https://supabase.com/docs/guides/auth/redirect-urls), [Seguridad de datos](https://supabase.com/docs/guides/database/secure-data).

# Inscripción de familias · Navidad La Florida

Landing independiente del dashboard que está en la raíz del repositorio. La versión compilada está en `site/` y el código Next.js/React en `source/`. No se necesitan dependencias para servir la versión compilada.

## Publicar esta landing en Netlify

Importar el repositorio `Vixxha/Proyecto_integrado`, rama `main`, como **un proyecto nuevo**, con estos valores:

- Base directory: `landing-page`
- Package directory: dejar vacío (o `landing-page` si Netlify lo solicita).
- Build command: `node scripts/verify-site.mjs`
- Publish directory: `site` (relativa a la base).

No seleccionar la raíz como base: corresponde al dashboard. La configuración de esta landing está en `landing-page/netlify.toml`. La compilación y los recursos ya acompañan al código; el comando verifica su integridad antes de publicar. Solo se sirve `site/`, no los archivos SQL ni el código fuente.

También se puede publicar manualmente la carpeta `site/` en Netlify Drop.

## Datos y modo de prueba

Los envíos **se guardan en Supabase** mediante `familias_dashboard_inscribir` y aparecen en el dashboard, campaña **2026**, filtro **Sin asignar**. El modo de prueba está activado: se puede usar `12345678-1` para el adulto y sus hijos. Los registros llevan `[PRUEBA]`. El navegador contiene una clave publicable, sin secretos administrativos.

## Actualizar

Editar `source/`, instalar sus dependencias y ejecutar sus pruebas y compilación. Copiar el resultado de `source/out/` a `site/` y actualizar `site-manifest.json` antes del siguiente despliegue. La compilación local disponible usó `node source/scripts/build-static.mjs` desde la carpeta `source`. La exportación normal de Next.js es `npm run build`.

La publicación en Netlify requiere acceso a una cuenta Netlify. Tener los archivos en GitHub no demuestra que Netlify haya desplegado el sitio; confirmar un despliegue publicado y su URL final.

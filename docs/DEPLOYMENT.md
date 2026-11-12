# GitHub y Netlify

Aplicación React estática conectada a Supabase. Una vez publicada funciona sin ChatGPT. GitHub conserva las fuentes, Netlify sirve la web y Supabase mantiene usuarios y datos.

## Repositorio

El código está en https://github.com/Vixxha/Proyecto_integrado, rama main. La primera publicación corresponde al commit 15b9890 y su ejecución de GitHub Actions terminó correctamente.

Instalar Node.js 24 y ejecutar npm ci para reproducir las dependencias de package-lock.json. ExcelJS y Supabase ya están instalados y registrados en el lockfile.

La integración continua comprueba datos, pruebas unitarias, compilación y navegador con un backend ficticio. No modifica la base remota. El script de instalación inicial de Git se retiró después de completar la primera subida. Para publicar cambios desde una sesión autenticada:

```powershell
git add .
git commit -m "Describe el cambio"
git push origin main
```

## Netlify

1. Importar Vixxha/Proyecto_integrado y seleccionar main.
2. Usar Node.js 24, definido en .nvmrc.
3. Mantener npm run build y la salida dist definidos en netlify.toml.
4. Esperar Published y comprobar el enlace HTTPS que entrega Netlify.

No hay una URL de producción verificada en esta documentación. La configuración pública de conexión acompaña al código en src/config/public.ts; no es necesario cargar claves privadas en Netlify.

## Base de datos y acceso

El proyecto conectado es Municipalidad-jugetes (ovnvoodmxuygkxgczeka). La revisión del 12 de noviembre de 2026 confirmó ACTIVE_HEALTHY y RLS habilitado en las seis tablas navidad_*. La limpieza del frontend no requiere recrear tablas ni ejecutar el seed.

La URL y la clave publishable son públicas. Los permisos se aplican mediante Supabase Auth, navidad_staff y RLS. No subir contraseñas, tokens ni claves administrativas. El repositorio también conserva el esquema SQL, el seed ficticio y las pruebas de base de datos; no volver a aplicarlos sin revisar el proyecto existente.

Para usar Google OAuth, registrar la dirección HTTPS final en Supabase, Authentication > URL Configuration. Probar el inicio de sesión, filtros, inscripción, asignación, entrega y descarga Excel desde el alojamiento final.

El acceso con Google usa PKCE. La aplicación intercambia el código una sola vez antes de cargar los datos, elimina los parámetros de autenticación de la dirección y muestra un mensaje para reintentar si el retorno falla. También admite los retornos con tokens emitidos por la versión anterior.

Autorizar el origen exacto del frontend en Redirect URLs: localhost y 127.0.0.1 son distintos, al igual que sus puertos. Configurar Site URL con el dominio final. En Google Cloud, la URI de retorno del proveedor es https://ovnvoodmxuygkxgczeka.supabase.co/auth/v1/callback. El secreto OAuth se configura en Supabase, nunca en el navegador.

Iniciar y completar el acceso desde el mismo navegador y origen. Si falta el verificador o el código venció, iniciar de nuevo con Continuar con Google. No compartir enlaces que contengan tokens.

Para probar la compilación local, ejecutar npm run build y definir PLAYWRIGHT_PREVIEW=1 al ejecutar npm run test:e2e. Las pruebas simulan Google y no certifican el inicio real desde el dominio publicado.

La clave de Google Maps es opcional. Sin ella se utiliza el mapa ilustrativo. Para un dominio propio, seguir los registros DNS y la activación HTTPS indicados por Netlify.

## Verificación

La primera ejecución de GitHub Actions completó las comprobaciones de datos, pruebas unitarias, compilación y pruebas de navegador. Los tests automáticos usan sesiones y datos ficticios: no certifican Google OAuth en el dominio final.

Los hallazgos preexistentes de objetos ajenos al sistema de Navidad se documentan en supabase/verification.md. No se modifican como parte de una limpieza de archivos.

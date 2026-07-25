# Actualizacion de Cuotly

1. En Supabase abre `SQL Editor`, crea una consulta nueva, copia el contenido de `SUPABASE-EJECUTAR-PRIMERO/upgrade-workspaces-20260725.sql` y pulsa `Run`. Debe terminar con `Success`. Si ya lo ejecutaste anteriormente y terminó bien, no hace falta repetirlo.
2. En Vercel abre el proyecto **Cuotly** > `Settings` > `Environment Variables`. Confirma que ya existen `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FIOMETRA_SUPABASE_URL` y `FIOMETRA_SUPABASE_SERVICE_ROLE_KEY`. Añade además `CRON_SECRET` con una contraseña larga y aleatoria. Márcala al menos para `Production`; no la compartas ni la subas a GitHub.
3. En GitHub abre el repositorio `Cuotly`. En la raíz usa `Add file` > `Upload files` y sube todos los archivos que están directamente en esta carpeta. No subas las carpetas `api` ni `SUPABASE-EJECUTAR-PRIMERO` en este paso.
4. En GitHub entra en la carpeta `api`. Usa `Add file` > `Upload files` y sube los cuatro archivos que hay dentro de la carpeta `api` de esta actualización. GitHub reemplazará los existentes.
5. Haz `Commit changes`. Vercel iniciará el despliegue automáticamente.

El archivo `vercel.json` activa la revisión diaria de cobros, suspensiones, cancelaciones por impago y copias de seguridad automáticas. Vercel usará `CRON_SECRET` internamente para proteger esa tarea; no tienes que abrir esa URL manualmente.

Al terminar, abre Cuotly una vez y recarga. La nueva caché se actualizará también en la aplicación instalada del móvil.

# Publicar Cuotly

Esta guia es para publicar Cuotly igual que hicimos con Fiometra usando GitHub, Vercel y Supabase.

## Punto importante

Cuotly usa Supabase para guardar el estado compartido por cuenta. Los cambios hechos en movil y ordenador se sincronizan al iniciar sesion con la misma cuenta. Mantén las variables de entorno de Vercel conectadas a su proyecto de Supabase correspondiente.

## Archivos que hay que subir a GitHub

Para esta actualizacion, sube el contenido de la carpeta `Cuotly-Actualizar-Planes-20260725`.

Archivos principales:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `package.json`
- `build.mjs`
- `vercel.json`
- `manifest.webmanifest`
- `app-icon.svg`
- `sw.js`
- carpeta `supabase`

No hace falta subir la carpeta `dist`. Vercel la crea automaticamente.

## Paso 1: GitHub

1. Crea un repositorio nuevo en GitHub.
2. Puedes llamarlo `cuotly`.
3. Entra en el repositorio.
4. Sube el contenido de `Cuotly-Actualizar-Planes-20260725` respetando las carpetas `api` y `supabase`.
5. Pulsa `Commit changes`.

## Paso 2: Supabase

Si vas a usar las mismas cuentas que Fiometra, puedes usar el mismo proyecto de Supabase.

1. Entra en Supabase.
2. Abre tu proyecto.
3. Ve a `SQL Editor`.
4. Crea una query nueva.
5. Copia el contenido de `supabase/schema.sql`.
6. Pulsa `Run`.

Cuando salga `Success`, la base de datos ya esta preparada.

Si la app ya estaba publicada y solo necesitas activar la sincronizacion entre movil y ordenador, no hace falta pegar todo `schema.sql`. Pega solo:

`supabase/upgrade-cloud-sync.sql`

Ese archivo crea el guardado compartido por cuenta.

## Actualizacion de planes 2026-07-25

Antes de usar los nuevos planes Presencia, Impulso, Premium y Menu Diario, ejecuta tambien en el SQL Editor:

`supabase/upgrade-planes-20260725.sql`

No borra restaurantes, pagos ni tareas. Solo prepara las columnas y los estados nuevos para pausas, creditos adicionales, cuotas, Menu Diario y cancelaciones por impago.

## Paso 3: Vercel

1. Entra en Vercel.
2. Pulsa `Add New...`.
3. Pulsa `Project`.
4. Importa el repositorio de GitHub de Cuotly.
5. Si subiste el contenido de la carpeta de actualizacion, deja `Root Directory` como `./`.
6. No subas la carpeta contenedora completa dentro del repositorio.
7. Pulsa `Deploy`.

El proyecto ya incluye:

- Build command: `npm run build`
- Output directory: `dist`

## Variables de entorno

En Vercel, dentro del proyecto de Cuotly, anade estas variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Se sacan de Supabase en:

`Project Settings` -> `API Keys`

La URL es la URL del proyecto. La clave publica es la `publishable key` o `anon key`.

La clave `SUPABASE_SERVICE_ROLE_KEY` es la clave secreta de Supabase, la que aparece en `Secret keys`. Debe quedarse solo en Vercel y nunca se pega dentro del codigo visible de la app.

Esta clave secreta permite que Cuotly envie invitaciones por email desde la seccion Equipo.

## Despues de publicar

Cuando Vercel termine, abre el enlace de produccion.

Para actualizar la app en el futuro:

1. Sube a GitHub los archivos que cambien.
2. Pulsa `Commit changes`.
3. Vercel se actualiza solo.

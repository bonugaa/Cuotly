# Publicar Cuotly

Esta guia es para publicar Cuotly igual que hicimos con Fiometra usando GitHub, Vercel y Supabase.

## Punto importante

La app ya funciona en local, pero ahora mismo guarda los datos en el navegador del dispositivo. Para usarla en serio con empleados, cuentas privadas y datos compartidos, hay que conectarla a Supabase antes de meter datos reales.

Puedes publicarla ya para verla online, probarla y revisarla en movil, pero no conviene usarla con datos importantes hasta terminar la conexion con la base de datos.

## Archivos que hay que subir a GitHub

Sube el contenido de la carpeta `Cuotly-Prototipo`.

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
4. Sube los archivos de `Cuotly-Prototipo`.
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

## Paso 3: Vercel

1. Entra en Vercel.
2. Pulsa `Add New...`.
3. Pulsa `Project`.
4. Importa el repositorio de GitHub de Cuotly.
5. Si subiste solo el contenido de `Cuotly-Prototipo`, deja `Root Directory` como `./`.
6. Si subiste toda la carpeta completa, pon `Root Directory` como `Cuotly-Prototipo`.
7. Pulsa `Deploy`.

El proyecto ya incluye:

- Build command: `npm run build`
- Output directory: `dist`

## Variables de entorno

En Vercel, dentro del proyecto de Cuotly, anade estas variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Se sacan de Supabase en:

`Project Settings` -> `API Keys`

La URL es la URL del proyecto. La clave publica es la `publishable key` o `anon key`.

## Despues de publicar

Cuando Vercel termine, abre el enlace de produccion.

Para actualizar la app en el futuro:

1. Sube a GitHub los archivos que cambien.
2. Pulsa `Commit changes`.
3. Vercel se actualiza solo.


# Google Analytics 4 en Quotly

Quotly deja preparado un rendimiento web privado por restaurante. La propiedad de Google Analytics es del mantenimiento: el restaurante solo ve un resumen dentro de `Mi web > Rendimiento`.

## Antes de conectar un restaurante

1. Crea una propiedad de Google Analytics 4 separada para ese restaurante usando la cuenta de Google del mantenimiento.
2. En Quotly abre la ficha del restaurante, entra en `Rendimiento web` y pulsa `Configurar GA4`.
3. Guarda el `ID de propiedad`. El ID de medicion y el contenedor de Google Tag Manager son opcionales hasta instalar el seguimiento.
4. Cuando la web este publicada, configura el aviso de cookies e instala la etiqueta de Google usando Google Tag Manager o los scripts personalizados de LandingSite.
5. Marca en Quotly las dos casillas de estado cuando el consentimiento y el seguimiento hayan sido comprobados.

No basta con poner una URL en Google Analytics: la web debe llevar una etiqueta de Google autorizada por el aviso de cookies.

## Lectura segura desde Quotly

En Vercel, dentro del proyecto de Quotly, crea una de estas configuraciones. La recomendada es la primera:

```text
GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON={contenido completo del JSON de una cuenta de servicio}
```

Como alternativa se pueden usar dos variables:

```text
GOOGLE_ANALYTICS_SERVICE_ACCOUNT_EMAIL=nombre@proyecto.iam.gserviceaccount.com
GOOGLE_ANALYTICS_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

La cuenta de servicio debe recibir el permiso `Viewer` en cada propiedad GA4 desde `Administrar > Gestion de accesos a la propiedad`.

Nunca se debe publicar el JSON, su clave privada ni estas variables en GitHub o en el navegador.

## Datos que muestra Quotly

- Usuarios, sesiones, vistas y sesiones con interaccion.
- Dos rutas mas visitadas.
- En mantenimiento: canales de llegada, dispositivos, ubicacion aproximada y acciones en la web.
- En el restaurante: un resumen simple de rendimiento y acciones.
- En los informes mensuales: el mes exacto del informe, sin mezclar periodos.

Las acciones previstas son telefono, email, mapa, carta, reservas, pedidos, TheFork, CoverManager, Glovo, Uber Eats, Just Eat, redes sociales y formularios. Por ahora las reservas y pedidos representan clics; una conversion confirmada solo se incorporara cuando la plataforma permita conectarla.

## Cuando haya una web publicada

Pasa a Codex la URL publica y, si existe, la estructura de sus enlaces y formularios. Entonces se prepara el script de Google Tag Manager o de LandingSite para registrar sus clics reales y se comprueba el seguimiento desde GA4.

const SUPABASE_URL = cleanUrl(process.env.SUPABASE_URL || '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const PLAN_LIMITS = {
  presencia: { small: 8, medium: 0, large: 0, photos: 5 },
  impulso: { small: 16, medium: 3, large: 0, photos: 12 },
  premium: { small: 25, medium: 5, large: 1, photos: 24 },
  menu: { menu_update: 25 },
};

const CHANGE_GUIDE = `
Clasifica solicitudes de mantenimiento web para restaurantes. El criterio principal es el volumen visible modificado; la dificultad tecnica solo es secundaria. Espanol e ingles de un mismo contenido cuentan como un unico cambio.

PEQUENO: una modificacion aislada: nombre, titulo, frase corta, precio individual, telefono/contacto/direccion, URL, texto o URL de un boton (son dos si cambian ambas), titulo SEO o metadescripcion (son dos si cambian ambas), horario completo de un dia, aviso temporal, media o numero de resenas, sustituir logo ya preparado, eliminar/ocultar/mostrar/cambiar disponibilidad/reordenar un plato, etiqueta, retirar menu estacional, o insertar plantilla exacta ya entregada. Un bloque entero escrito y definitivo por el cliente sigue siendo pequeno si solo hay que pegarlo. Un plato individual normalmente es 3 pequenos (nombre, descripcion, precio) y una foto si lleva imagen.
FOTO: anadir, sustituir o actualizar una foto de galeria, plato, destacada o la misma imagen adaptada a movil y escritorio. Las fotos incluidas en categoria mediana, seccion grande, carta grande o menu estacional grande no consumen foto aparte.
MEDIANO: hasta 10 precios, redaccion/reescritura/resumen/adaptacion de texto, horario completo semanal, una resena completa, categoria de carta de hasta 5 elementos completos, mover una categoria/seccion, crear estructura sobre diseno existente, o nuevo boton de pedido a domicilio. Incluye dos rondas de ajustes y consume aunque el cliente no publique tras realizarse.
GRANDE: todos los textos de una seccion, renovar una seccion hasta 5 bloques/textos/fotos, carta completa hasta 7 secciones y 42 elementos, cambio general de precios de casi toda la carta, tres resenas + media + total, reordenar hasta 10 secciones, logo desde cero, plantilla/seccion completa con contenido, menu estacional hasta 10 elementos, seccion de reservas o seccion completa de pedidos a domicilio. Incluye dos rondas y consume si el trabajo se ejecuto aunque se descarte publicar.
FUERA_DE_ALCANCE: rediseno de identidad completa, nueva web, funcionalidades/API/pagos/carrito/reservas propias, SEO avanzado, publicidad/redes sociales, fotografia o video profesional, y trabajos que no encajan en lo anterior. Marca presupuesto requerido.
MENU_DIARIO: solo actualizacion/publicacion de menu, maximo 25 al mes de lunes a viernes. Si supera el limite o modifica estructura, marca presupuesto requerido.
`;

function cleanUrl(value) { return String(value || '').trim().replace(/\/+$/, '').replace(/\/(?:rest|auth|storage|realtime)\/v1(?:\/.*)?$/i, ''); }
function readBody(req) { if (typeof req.body !== 'string') return req.body || {}; try { return JSON.parse(req.body || '{}'); } catch { return {}; } }
function headers(extra = {}) { return { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}`, ...extra }; }
function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function serviceMemberIds(service) { const ids = Array.isArray(service?.assignedMemberIds) ? service.assignedMemberIds : (service?.assignedTo ? [service.assignedTo] : []); return [...new Set(ids.filter(Boolean))]; }

async function rest(path, options = {}) {
  const { headers: extra = {}, ...request } = options;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...request, headers: headers(extra) });
}

async function recordUsage(payload) {
  try {
    await rest('cuotly_ai_usage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // The classification result remains valid even if telemetry is temporarily unavailable.
  }
}

async function callerOf(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_ROLE_KEY, authorization } });
  if (!response.ok) return null;
  const user = await response.json();
  try { user.aal = JSON.parse(Buffer.from(authorization.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')).aal || 'aal1'; } catch { user.aal = 'aal1'; }
  return user;
}

async function workspaceAccess(caller, workspaceId, restaurantId, serviceId) {
  const membershipResponse = await rest(`cuotly_members?workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(caller.id)}&active=is.true&deleted_at=is.null&select=role,email,name,workspace:cuotly_workspaces!inner(id,state)`);
  if (!membershipResponse.ok) return null;
  const membership = (await membershipResponse.json().catch(() => []))[0];
  if (!membership?.workspace?.state) return null;
  const state = clone(membership.workspace.state);
  const service = (state.services || []).find(item => item.id === serviceId && item.restaurantId === restaurantId);
  if (!service) return null;
  if (membership.role === 'worker') {
    const member = (state.members || []).find(item => String(item.email || '').toLowerCase() === String(caller.email || '').toLowerCase());
    if (!member || !serviceMemberIds(service).includes(member.id)) return null;
  }
  return { source: 'maintenance', membership, state, service };
}

async function clientAccess(caller, workspaceId, restaurantId, serviceId) {
  const response = await rest(`cuotly_client_members?user_id=eq.${encodeURIComponent(caller.id)}&active=is.true&select=role,portal:cuotly_client_portals!inner(id,workspace_id,restaurant_id,status,workspace:cuotly_workspaces!inner(id,state))`);
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []);
  const membership = rows.find(row => row.portal?.workspace_id === workspaceId && row.portal?.restaurant_id === restaurantId && row.portal?.status === 'active' && ['owner', 'editor'].includes(row.role));
  const state = membership?.portal?.workspace?.state ? clone(membership.portal.workspace.state) : null;
  const service = (state?.services || []).find(item => item.id === serviceId && item.restaurantId === restaurantId);
  return membership && service ? { source: 'client', membership, state, service } : null;
}

function outputSchema() {
  return {
    type: 'object', additionalProperties: false,
    properties: {
      category: { type: 'string', enum: ['small', 'medium', 'large', 'photos', 'menu_update', 'mixed', 'out_of_scope'] },
      summary: { type: 'string' },
      explanation: { type: 'string' },
      quoteRequired: { type: 'boolean' },
      reviewRounds: { type: 'integer', minimum: 0, maximum: 2 },
      missingInformation: { type: 'array', items: { type: 'string' } },
      choices: {
        type: 'array', minItems: 1, maxItems: 4,
        items: {
          type: 'object', additionalProperties: false,
          properties: {
            label: { type: 'string' },
            explanation: { type: 'string' },
            allocations: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { type: { type: 'string', enum: ['small', 'medium', 'large', 'photos', 'menu_update'] }, quantity: { type: 'integer', minimum: 1, maximum: 50 } }, required: ['type', 'quantity'] } },
          }, required: ['label', 'explanation', 'allocations'],
        },
      },
    },
    required: ['category', 'summary', 'explanation', 'quoteRequired', 'reviewRounds', 'missingInformation', 'choices'],
  };
}

function cleanAnalysis(value, planCode) {
  const allowed = new Set(Object.keys(PLAN_LIMITS[planCode] || {}));
  const output = { ...value, choices: Array.isArray(value?.choices) ? value.choices : [] };
  output.choices = output.choices.map(choice => ({
    ...choice,
    allocations: (choice.allocations || []).filter(item => allowed.has(item.type) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 50),
  })).filter(choice => choice.allocations.length || output.quoteRequired);
  if (!output.choices.length) output.choices = [{ label: 'Revisar y presupuestar', explanation: 'La solicitud necesita una revision manual antes de asignar cambios.', allocations: [] }];
  return output;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido.' });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Falta configurar Supabase en Vercel.' });
  if (!OPENAI_API_KEY) return res.status(503).json({ error: 'El analisis con IA aun no esta activado. Anade OPENAI_API_KEY en Vercel cuando cargues tus creditos.' });

  const caller = await callerOf(req);
  if (!caller?.id) return res.status(401).json({ error: 'No autorizado.' });
  if (caller.aal !== 'aal2') return res.status(403).json({ error: 'Verifica el segundo factor antes de analizar una solicitud.' });
  const body = readBody(req);
  const workspaceId = String(body.workspaceId || '');
  const restaurantId = String(body.restaurantId || '');
  const serviceId = String(body.serviceId || '');
  const title = String(body.title || '').trim().slice(0, 180);
  if (!workspaceId || !restaurantId || !serviceId || !title) return res.status(400).json({ error: 'Introduce un titulo para analizar el cambio.' });

  const access = await workspaceAccess(caller, workspaceId, restaurantId, serviceId) || await clientAccess(caller, workspaceId, restaurantId, serviceId);
  if (!access) return res.status(403).json({ error: 'No tienes acceso a este servicio.' });
  const planCode = access.service.planCode;
  const planLimits = PLAN_LIMITS[planCode];
  if (!planLimits) return res.status(400).json({ error: 'El servicio no admite este tipo de analisis.' });
  if (access.service.status !== 'active') return res.status(409).json({ error: 'No se pueden analizar solicitudes de un servicio pausado, suspendido o cancelado.' });

  const prompt = `Servicio contratado: ${planCode}. Limites incluidos por ciclo: ${JSON.stringify(planLimits)}.\nTitulo de la solicitud: ${title}\n\nClasifica exclusivamente a partir de este titulo. Si no concreta suficiente el volumen o alcance, usa quoteRequired=true y pide la informacion que falte. Devuelve opciones realistas. No inventes cuotas ni prometas trabajos fuera de alcance. Para Menu Diario, solo permite menu_update. ${CHANGE_GUIDE}`;
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      reasoning: { effort: 'minimal' },
      input: [{ role: 'system', content: [{ type: 'input_text', text: 'Eres un clasificador riguroso de solicitudes de mantenimiento. Devuelve solo informacion ajustada al esquema.' }] }, { role: 'user', content: [{ type: 'input_text', text: prompt }] }],
      text: { format: { type: 'json_schema', name: 'cuotly_change_classification', strict: true, schema: outputSchema() } },
    }),
  });
  const raw = await response.json().catch(() => ({}));
  if (!response.ok) return res.status(response.status).json({ error: raw?.error?.message || 'No se pudo analizar la solicitud.' });
  let analysis;
  try { analysis = JSON.parse(raw.output_text || '{}'); } catch { return res.status(502).json({ error: 'La IA no devolvio un resultado valido. Intentalo de nuevo.' }); }
  const usage = raw.usage || {};
  void recordUsage({
    workspace_id: workspaceId,
    restaurant_id: restaurantId,
    service_id: serviceId,
    user_id: caller.id,
    model: 'gpt-5-mini',
    input_tokens: Number(usage.input_tokens || 0),
    output_tokens: Number(usage.output_tokens || 0),
  });
  return res.status(200).json({ ok: true, model: 'gpt-5-mini', analysis: cleanAnalysis(analysis, planCode) });
}

import { createSign } from 'node:crypto';

import { sendPushToUsers } from './push-utils.js';

const SUPABASE_URL = cleanUrl(process.env.SUPABASE_URL || '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON || '';
const GOOGLE_ANALYTICS_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_EMAIL || '';
const GOOGLE_ANALYTICS_SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_PRIVATE_KEY || '';
const analyticsCache = new Map();

const PLAN_LIMITS = {
  presencia: { small: 8, medium: 0, large: 0, photos: 5 },
  impulso: { small: 16, medium: 3, large: 0, photos: 12 },
  premium: { small: 25, medium: 5, large: 1, photos: 24 },
  menu: { menu_update: 25 },
};
const CLIENT_ROLES = ['owner', 'editor', 'viewer'];
const CHANGE_TYPES = new Set(['small', 'medium', 'large', 'photos', 'menu_update']);
const DEFAULT_WEB_GUIDE = {
  es: [
    { title: 'Entra con la cuenta autorizada', body: 'Abre el editor solo desde este panel. Si no tienes acceso, solicita ayuda al propietario del restaurante o al equipo de mantenimiento.', imageUrl: '', videoUrl: '' },
    { title: 'Habla con la IA de LandingSite', body: 'Escribe una instruccion clara en el chat: que quieres cambiar, donde esta y cual debe ser el resultado. La IA de LandingSite prepara el cambio dentro de su editor.', imageUrl: '', videoUrl: '' },
    { title: 'Edita textos y contenido con calma', body: 'Puedes ajustar textos, platos, precios, horarios, fotos y secciones directamente en LandingSite. Estos cambios son de tu web y no consumen cambios de mantenimiento.', imageUrl: '', videoUrl: '' },
    { title: 'Revisa antes de publicar', body: 'Comprueba la version movil, el idioma y que los datos importantes sean correctos. Cuando estes conforme, publica desde el boton de LandingSite.', imageUrl: '', videoUrl: '' },
    { title: 'Pide ayuda cuando la necesites', body: 'Si prefieres que el equipo de mantenimiento se encargue, crea una solicitud desde este panel. Podras adjuntar una captura y seguir la conversacion.', imageUrl: '', videoUrl: '' },
  ],
  en: [
    { title: 'Use an authorised account', body: 'Open the editor only from this panel. If you do not have access, ask the restaurant owner or the maintenance team for help.', imageUrl: '', videoUrl: '' },
    { title: 'Talk to the LandingSite AI', body: 'Write a clear instruction in the chat: what you want to change, where it is and what the result should be. LandingSite AI prepares the change in its editor.', imageUrl: '', videoUrl: '' },
    { title: 'Edit content carefully', body: 'You can update texts, dishes, prices, opening hours, photos and sections directly in LandingSite. These website edits do not use maintenance plan changes.', imageUrl: '', videoUrl: '' },
    { title: 'Check before publishing', body: 'Review the mobile version, the language and important information. When everything is correct, publish from the LandingSite button.', imageUrl: '', videoUrl: '' },
    { title: 'Ask for help when needed', body: 'If you prefer the maintenance team to handle it, create a request from this panel. You can attach a screenshot and continue the conversation here.', imageUrl: '', videoUrl: '' },
  ],
};

function cleanUrl(value) { return String(value || '').trim().replace(/\/+$/, '').replace(/\/(?:rest|auth|storage|realtime)\/v1(?:\/.*)?$/i, ''); }
function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function readBody(req) { if (typeof req.body !== 'string') return req.body || {}; try { return JSON.parse(req.body || '{}'); } catch { return {}; } }
function headers(extra = {}) { return { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}`, ...extra }; }
function iso(value = new Date()) { return new Date(value).toISOString().slice(0, 10); }
function appUrl(req) { return req.headers.origin || process.env.CUOTLY_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://cuotly.vercel.app'); }
function cleanEmail(value) { return String(value || '').trim().toLowerCase(); }
function cleanText(value, maximum = 1000) { return String(value || '').trim().slice(0, maximum); }
function cleanWebUrl(value) {
  const url = cleanText(value, 1200);
  return /^https?:\/\/[^\s]+$/i.test(url) ? url : '';
}
function cleanAnalyticsPropertyId(value) { return String(value || '').replace(/[^0-9]/g, '').slice(0, 32); }
function cleanMeasurementId(value) { return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 80); }
function cleanContainerId(value) { return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 80); }
function analyticsConfig(restaurant) {
  const raw = restaurant?.analytics && typeof restaurant.analytics === 'object' ? restaurant.analytics : {};
  return {
    propertyId: cleanAnalyticsPropertyId(raw.propertyId),
    measurementId: cleanMeasurementId(raw.measurementId),
    tagManagerId: cleanContainerId(raw.tagManagerId),
    consentConfigured: raw.consentConfigured === true,
    trackingInstalled: raw.trackingInstalled === true,
    configuredAt: String(raw.configuredAt || ''),
    lastVerifiedAt: String(raw.lastVerifiedAt || ''),
  };
}
function base64url(value) { return Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }
function serviceAccount() {
  const raw = String(GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON || '').trim();
  if (raw) {
    try { return JSON.parse(raw); } catch {
      try { return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); } catch { return null; }
    }
  }
  if (GOOGLE_ANALYTICS_SERVICE_ACCOUNT_EMAIL && GOOGLE_ANALYTICS_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return { client_email: GOOGLE_ANALYTICS_SERVICE_ACCOUNT_EMAIL, private_key: GOOGLE_ANALYTICS_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'), token_uri: 'https://oauth2.googleapis.com/token' };
  }
  return null;
}
function analyticsRange(period = 'monthly', requestedMonth = '') {
  const today = iso();
  const pad = value => String(value).padStart(2, '0');
  const completeMonth = String(requestedMonth || '').match(/^\d{4}-\d{2}$/)?.[0];
  if (completeMonth) {
    const [year, month] = completeMonth.split('-').map(Number);
    const end = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return { period: 'monthly', startDate: `${completeMonth}-01`, endDate: `${completeMonth}-${pad(end)}`, label: completeMonth };
  }
  const now = new Date(`${today}T12:00:00Z`);
  if (period === 'daily') {
    const yesterday = new Date(now); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const day = yesterday.toISOString().slice(0, 10);
    return { period: 'daily', startDate: day, endDate: day, label: day };
  }
  if (period === 'quarterly') {
    const quarterStart = Math.floor(now.getUTCMonth() / 3) * 3;
    return { period: 'quarterly', startDate: `${now.getUTCFullYear()}-${pad(quarterStart + 1)}-01`, endDate: today, label: `T${Math.floor(now.getUTCMonth() / 3) + 1} ${now.getUTCFullYear()}` };
  }
  if (period === 'yearly') return { period: 'yearly', startDate: `${now.getUTCFullYear()}-01-01`, endDate: today, label: String(now.getUTCFullYear()) };
  return { period: 'monthly', startDate: `${today.slice(0, 7)}-01`, endDate: today, label: today.slice(0, 7) };
}
function analyticsRows(result) {
  const headers = result?.dimensionHeaders || [];
  const metrics = result?.metricHeaders || [];
  return (result?.rows || []).map(row => Object.fromEntries([
    ...headers.map((header, index) => [header.name, row.dimensionValues?.[index]?.value || '']),
    ...metrics.map((header, index) => [header.name, Number(row.metricValues?.[index]?.value || 0)]),
  ]));
}
function analyticsEventLabel(name) {
  return ({
    click_phone: 'Telefono', click_email: 'Email', click_maps: 'Como llegar', click_menu: 'Carta o menu',
    click_reservation: 'Reservas', click_order: 'Pedidos', click_thefork: 'TheFork', click_covermanager: 'CoverManager',
    click_glovo: 'Glovo', click_ubereats: 'Uber Eats', click_justeat: 'Just Eat', click_social: 'Redes sociales',
    form_submit: 'Formulario enviado', generate_lead: 'Formulario enviado',
  })[name] || name;
}
async function googleAnalyticsToken() {
  const account = serviceAccount();
  if (!account?.client_email || !account?.private_key) throw new Error('Falta configurar la cuenta de servicio de Google Analytics en Vercel.');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(JSON.stringify({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly', aud: account.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3500 }))}`;
  const signer = createSign('RSA-SHA256'); signer.update(unsigned); signer.end();
  const assertion = `${unsigned}.${signer.sign(account.private_key, 'base64url')}`;
  const response = await fetch(account.token_uri || 'https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  const output = await response.json().catch(() => ({}));
  if (!response.ok || !output.access_token) throw new Error(output.error_description || 'No se pudo autorizar Google Analytics.');
  return { token: output.access_token, email: account.client_email };
}
async function gaRunReport(propertyId, token, body) {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const output = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(output.error?.message || 'No se pudo consultar Google Analytics.');
  return output;
}
async function analyticsSnapshot(propertyId, range) {
  const cacheKey = `${propertyId}:${range.startDate}:${range.endDate}`;
  const cached = analyticsCache.get(cacheKey);
  if (cached?.expiresAt > Date.now()) return cached.value;
  const { token, email } = await googleAnalyticsToken();
  const dates = [{ startDate: range.startDate, endDate: range.endDate }];
  const common = { dateRanges: dates, metricAggregations: ['TOTAL'] };
  const [overview, pages, sources, devices, locations, events] = await Promise.all([
    gaRunReport(propertyId, token, { ...common, metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'engagedSessions' }] }),
    gaRunReport(propertyId, token, { ...common, dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 2 }),
    gaRunReport(propertyId, token, { ...common, dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 5 }),
    gaRunReport(propertyId, token, { ...common, dimensions: [{ name: 'deviceCategory' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 4 }),
    gaRunReport(propertyId, token, { ...common, dimensions: [{ name: 'city' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 4 }),
    gaRunReport(propertyId, token, { ...common, dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }], orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 100 }),
  ]);
  const totals = analyticsRows(overview)[0] || {};
  const eventRows = analyticsRows(events);
  const wantedEvents = new Set(['click_phone', 'click_email', 'click_maps', 'click_menu', 'click_reservation', 'click_order', 'click_thefork', 'click_covermanager', 'click_glovo', 'click_ubereats', 'click_justeat', 'click_social', 'form_submit', 'generate_lead']);
  const value = {
    configured: true,
    range,
    serviceAccountEmail: email,
    totals: { users: Number(totals.activeUsers || 0), sessions: Number(totals.sessions || 0), pageViews: Number(totals.screenPageViews || 0), engagedSessions: Number(totals.engagedSessions || 0) },
    topPages: analyticsRows(pages).map(row => ({ path: row.pagePath || '/', views: Number(row.screenPageViews || 0) })),
    sources: analyticsRows(sources).map(row => ({ name: row.sessionDefaultChannelGroup || 'Sin clasificar', sessions: Number(row.sessions || 0) })),
    devices: analyticsRows(devices).map(row => ({ name: row.deviceCategory || 'Sin clasificar', users: Number(row.activeUsers || 0) })),
    locations: analyticsRows(locations).filter(row => row.city && row.city !== '(not set)').map(row => ({ name: row.city, users: Number(row.activeUsers || 0) })),
    actions: eventRows.filter(row => wantedEvents.has(row.eventName)).map(row => ({ name: row.eventName, label: analyticsEventLabel(row.eventName), count: Number(row.eventCount || 0) })),
    fetchedAt: new Date().toISOString(),
  };
  analyticsCache.set(cacheKey, { value, expiresAt: Date.now() + 10 * 60 * 1000 });
  return value;
}
async function analyticsForPortal(portal, range) {
  const restaurant = restaurantInPortal(portal);
  const config = analyticsConfig(restaurant);
  if (!config.propertyId) return { configured: false, state: 'property_missing', config, range, message: 'Aun no se ha configurado la propiedad GA4 de este restaurante.' };
  if (!serviceAccount()) return { configured: false, state: 'service_account_missing', config, range, message: 'Falta conectar la cuenta de servicio de Google Analytics en Vercel.' };
  try {
    const snapshot = await analyticsSnapshot(config.propertyId, range);
    return { ...snapshot, config: { measurementId: config.measurementId, tagManagerId: config.tagManagerId, consentConfigured: config.consentConfigured, trackingInstalled: config.trackingInstalled, lastVerifiedAt: config.lastVerifiedAt } };
  } catch (error) {
    return { configured: false, state: 'connection_error', config, range, message: error.message || 'No se pudo consultar Google Analytics.' };
  }
}
function normalizedGuide(raw) {
  const guide = raw && typeof raw === 'object' ? raw : {};
  const language = key => DEFAULT_WEB_GUIDE[key].map((item, index) => {
    const custom = Array.isArray(guide[key]) ? guide[key][index] || {} : {};
    return {
      title: cleanText(custom.title || item.title, 160),
      body: cleanText(custom.body || item.body, 1800),
      imageUrl: cleanWebUrl(custom.imageUrl),
      videoUrl: cleanWebUrl(custom.videoUrl),
    };
  });
  return { es: language('es'), en: language('en') };
}
function serviceMemberIds(service) { const ids = Array.isArray(service?.assignedMemberIds) ? service.assignedMemberIds : (service?.assignedTo ? [service.assignedTo] : []); return [...new Set(ids.filter(Boolean))]; }
function taskQuotaType(task) { return task.type === 'section' ? 'medium' : task.type === 'incidents' ? 'external_incident' : task.type; }
function userName(user) { return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Cliente'; }
function parsedAllocations(value) {
  const rows = Array.isArray(value) ? value : [];
  const merged = new Map();
  for (const row of rows) {
    const type = String(row?.type || '');
    const quantity = Number(row?.quantity || 0);
    if (!CHANGE_TYPES.has(type) || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) continue;
    merged.set(type, (merged.get(type) || 0) + quantity);
  }
  return [...merged].map(([type, quantity]) => ({ type, quantity }));
}
function safeAttachments(value, portalId) {
  const rows = Array.isArray(value) ? value : [];
  return rows.slice(0, 8).map(item => ({
    path: String(item?.path || ''),
    name: cleanText(item?.name || 'archivo', 120),
    mime: cleanText(item?.mime || '', 100),
    size: Number(item?.size || 0),
  })).filter(item => item.path.startsWith(`portal/${portalId}/`) && item.name && item.size > 0 && item.size <= 6291456);
}

async function rest(path, options = {}) {
  const { headers: extra = {}, ...request } = options;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...request, headers: headers(extra) });
}
async function restRows(path, options = {}) {
  const response = await rest(path, options);
  const text = await response.text();
  if (!response.ok) throw new Error(text || 'SUPABASE_ERROR');
  return text ? JSON.parse(text) : [];
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
async function findAuthUser(email) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, { headers: headers() });
  if (!response.ok) return null;
  const result = await response.json().catch(() => ({}));
  return (result.users || []).find(user => cleanEmail(user.email) === cleanEmail(email)) || null;
}
async function updateState(workspaceId, state) {
  await restRows(`cuotly_workspaces?id=eq.${encodeURIComponent(workspaceId)}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', prefer: 'return=representation' }, body: JSON.stringify({ state, updated_at: new Date().toISOString() }),
  });
}
async function portalById(portalId) {
  const rows = await restRows(`cuotly_client_portals?id=eq.${encodeURIComponent(portalId)}&select=*,workspace:cuotly_workspaces!inner(id,name,owner_id,state)`);
  return rows[0] || null;
}
async function maintenanceMembership(caller, workspaceId) {
  const rows = await restRows(`cuotly_members?workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(caller.id)}&active=is.true&deleted_at=is.null&select=role,email,name`);
  return rows[0] || null;
}
async function clientMembership(caller, portalId) {
  const rows = await restRows(`cuotly_client_members?portal_id=eq.${encodeURIComponent(portalId)}&user_id=eq.${encodeURIComponent(caller.id)}&active=is.true&select=*`);
  return rows[0] || null;
}
async function createActivity(portalId, requestId, eventType, side, actorId, detail = {}) {
  await restRows('cuotly_client_activity', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ portal_id: portalId, request_id: requestId || null, event_type: eventType, side, actor_id: actorId || null, detail }) });
}
async function notifyPortal(portalId, title, body, exceptUserId = '', category = 'messages', url = '/') {
  const members = await restRows(`cuotly_client_members?portal_id=eq.${encodeURIComponent(portalId)}&active=is.true&user_id=not.is.null&select=user_id`);
  const notifications = members.filter(item => item.user_id && item.user_id !== exceptUserId).map(item => ({ portal_id: portalId, user_id: item.user_id, title, body }));
  if (notifications.length) await restRows('cuotly_client_notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(notifications) });
  await sendPushToUsers(notifications.map(item => item.user_id), { title, body, url, category, tag: `portal-${portalId}` });
}
async function notifyMaintenance(portal, title, body, service = null, exceptUserId = '', category = 'messages') {
  const members = await restRows(`cuotly_members?workspace_id=eq.${encodeURIComponent(portal.workspace_id)}&active=is.true&user_id=not.is.null&select=user_id,email,role`);
  const stateMembers = portal.workspace?.state?.members || [];
  const assignedIds = new Set(serviceMemberIds(service));
  const targetIds = members.filter(item => {
    if (!item.user_id || item.user_id === exceptUserId) return false;
    if (['owner', 'admin'].includes(item.role)) return true;
    const internal = stateMembers.find(member => cleanEmail(member.email) === cleanEmail(item.email));
    return Boolean(internal?.id && assignedIds.has(internal.id));
  }).map(item => item.user_id);
  await sendPushToUsers(targetIds, { title, body, url: '/', category, tag: `maintenance-${portal.id}` });
}
function restaurantInPortal(portal) { return (portal.workspace?.state?.restaurants || []).find(item => item.id === portal.restaurant_id) || null; }
function servicesInPortal(portal) { return (portal.workspace?.state?.services || []).filter(item => item.restaurantId === portal.restaurant_id && item.status !== 'cancelled'); }
function extractPublicUrl(restaurant) {
  if (restaurant?.publicUrl) return restaurant.publicUrl;
  const match = String(restaurant?.notes || '').match(/(?:^|\n)\s*Enlace\s*:\s*(https?:\/\/\S+)/i);
  return match?.[1] || '';
}
function extractEditorUrl(restaurant) {
  if (cleanWebUrl(restaurant?.editorUrl)) return cleanWebUrl(restaurant.editorUrl);
  const match = String(restaurant?.notes || '').match(/(?:^|\n)\s*Enlace\s+editor\s*:\s*(https?:\/\/\S+)/i);
  return match?.[1] || '';
}
function cycleFor(service) {
  const start = String(service?.cycleStartDate || service?.startDate || iso()).slice(0, 10);
  const end = String(service?.cycleEndDate || '').slice(0, 10);
  return { start, end: end || iso(new Date(new Date(`${start}T12:00:00Z`).setMonth(new Date(`${start}T12:00:00Z`).getMonth() + 1) - 86400000)) };
}
function date(value) { return new Date(`${String(value || iso()).slice(0, 10)}T12:00:00.000Z`); }
function addDays(value, amount) { const result = new Date(value); result.setUTCDate(result.getUTCDate() + amount); return result; }
function addMonths(value, amount) { const result = new Date(value); const day = result.getUTCDate(); result.setUTCDate(1); result.setUTCMonth(result.getUTCMonth() + amount); result.setUTCDate(Math.min(day, new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate())); return result; }
function daysBetween(from, to) { return Math.max(0, Math.floor((date(to) - date(from)) / 86400000)); }
function paymentTotals(state, base) { const round = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100; const iva = round(base * Number(state?.settings?.ivaRate || 21) / 100); const irpf = round(base * Number(state?.settings?.irpfRate || 15) / 100); return { base: round(base), iva, irpf, invoiceTotal: round(base + iva), received: round(base + iva - irpf) }; }
function reminder(state, service, type, notes) { state.reminders ||= []; state.reminders.push({ id: `rem_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`, type, serviceId: service.id, restaurantId: service.restaurantId, createdAt: new Date().toISOString(), notes }); }
function pauseService(state, service, requestedDays, notes) {
  if (service.planCode === 'menu') throw new Error('Menu Diario no admite pausas. Puedes solicitar su baja.');
  if (service.status === 'cancelled') throw new Error('Ese servicio ya esta cancelado.');
  if (service.pausedAt || service.status === 'paused') throw new Error('Ese servicio ya esta en pausa.');
  const days = Math.min(31, Math.max(1, Number(requestedDays || 31)));
  service.pausedAt = new Date().toISOString();
  service.pausePlanDays = days;
  service.pauseNotes = cleanText(notes, 1000);
  service.status = 'paused';
  reminder(state, service, 'service_paused', `Pausa aprobada por ${days} dia(s). ${service.pauseNotes}`.trim());
}
function scheduleCancellation(state, service) {
  if (service.status === 'cancelled') throw new Error('Ese servicio ya esta cancelado.');
  const cycle = cycleFor(service);
  const nextPayment = addDays(date(cycle.end), 1);
  const notice = addDays(nextPayment, -3);
  const commitmentStart = service.commitmentStartDate || service.startDate || cycle.start;
  const pauses = (service.pauseHistory || []).reduce((sum, item) => sum + Number(item.days || 0), 0);
  const commitmentEnd = addDays(addMonths(date(commitmentStart), Number(service.initialCommitmentMonths || service.commitmentMonths || 3)), pauses);
  const remainingMonths = Math.max(0, Math.ceil((commitmentEnd - nextPayment) / (30 * 86400000)));
  const effective = new Date() > notice ? addMonths(nextPayment, 1) : nextPayment;
  service.cancelAtEnd = true;
  service.cancelRequestedAt = new Date().toISOString();
  service.cancelEffectiveAt = iso(effective);
  if (remainingMonths > 0 && !(state.payments || []).some(payment => payment.serviceId === service.id && payment.kind === 'cancellation_fee' && payment.status !== 'cancelled')) {
    const total = paymentTotals(state, remainingMonths * Number(service.monthlyBase || 0));
    state.payments ||= [];
    state.payments.push({ id: `pay_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`, restaurantId: service.restaurantId, serviceId: service.id, cycleStart: cycle.start, cycleEnd: cycle.end, dueDate: iso(effective), baseAmount: total.base, ivaAmount: total.iva, irpfAmount: total.irpf, invoiceTotal: total.invoiceTotal, receivedAmount: total.received, status: 'pending', method: '', notes: `Liquidacion de permanencia pendiente (${remainingMonths} mensualidad(es)).`, paidAt: '', sentToFiometra: false, kind: 'cancellation_fee' });
  }
  reminder(state, service, 'cancellation', `Cancelacion aprobada para ${iso(effective)}.${remainingMonths ? ` Permanencia pendiente estimada: ${remainingMonths} mensualidad(es).` : ''}`);
}
function currentUsage(state, service, acceptedRequests = []) {
  const limit = { ...(PLAN_LIMITS[service.planCode] || {}) };
  const cycle = cycleFor(service);
  for (const credit of service.extraCredits || []) {
    if (credit.status === 'paid' && String(credit.cycleStart || '') === cycle.start && credit.type in limit) limit[credit.type] += Number(credit.quantity || 0);
  }
  const used = Object.fromEntries(Object.keys(limit).map(key => [key, 0]));
  const reserved = Object.fromEntries(Object.keys(limit).map(key => [key, 0]));
  for (const task of state.tasks || []) {
    if (task.serviceId !== service.id) continue;
    const type = taskQuotaType(task);
    if (!(type in used)) continue;
    const date = String(task.quotaConsumedAt || task.completedAt || '').slice(0, 10);
    if (date >= cycle.start && date <= cycle.end && (task.status === 'completed' || task.quotaConsumedAt)) used[type] += Number(task.quantity || 1);
  }
  for (const request of acceptedRequests) {
    if (request.service_id !== service.id || !['accepted', 'in_progress', 'waiting'].includes(request.status)) continue;
    for (const item of parsedAllocations(request.selected_allocations)) if (item.type in reserved) reserved[item.type] += item.quantity;
  }
  return Object.fromEntries(Object.keys(limit).map(type => [type, { limit: limit[type], used: used[type], reserved: reserved[type], available: Math.max(0, limit[type] - used[type] - reserved[type]) }]));
}
function hasAllocationBalance(usage, allocations) { return allocations.every(item => usage[item.type] && usage[item.type].available >= item.quantity); }
function safeRequest(row) {
  return { id: row.id, serviceId: row.service_id || '', title: row.title, description: row.description, kind: row.kind, status: row.status, source: row.analysis?.source || '', proposedAllocations: row.proposed_allocations || [], selectedAllocations: row.selected_allocations || [], analysis: row.analysis || {}, attachments: row.attachments || [], creditsConsumed: row.credits_consumed, rejectionReason: row.rejection_reason || '', requestedAt: row.requested_at, acceptedAt: row.accepted_at, startedAt: row.started_at, completedAt: row.completed_at, cancelledAt: row.cancelled_at };
}
function safeService(state, service, requests) {
  const p = { presencia: 'Plan Presencia', impulso: 'Plan Impulso', premium: 'Plan Premium', menu: 'Menu Diario' };
  return { id: service.id, planCode: service.planCode, name: p[service.planCode] || service.planCode, status: service.status, startDate: service.startDate, cycle: cycleFor(service), monthlyBase: Number(service.monthlyBase || 0), quotas: currentUsage(state, service, requests), pause: service.pauseHistory?.at(-1) || null };
}
async function portalPayload(portal, clientMember, caller, maintenanceMember = null) {
  const state = clone(portal.workspace?.state || {});
  const restaurant = restaurantInPortal(portal);
  if (!restaurant) throw new Error('No encontramos el restaurante de este panel.');
  const requests = await restRows(`cuotly_client_requests?portal_id=eq.${encodeURIComponent(portal.id)}&order=requested_at.desc`);
  const services = servicesInPortal(portal).map(service => safeService(state, service, requests));
  const payments = (state.payments || []).filter(item => item.restaurantId === restaurant.id).map(item => ({ id: item.id, serviceId: item.serviceId, cycleStart: item.cycleStart, cycleEnd: item.cycleEnd, dueDate: item.dueDate, total: item.invoiceTotal, status: item.status, paidAt: item.paidAt || '', invoiceUrl: item.invoiceUrl || '' }));
  const reports = (state.reports || []).filter(item => item.restaurantId === restaurant.id).map(item => ({ id: item.id, month: item.month, status: item.status, generatedAt: item.generatedAt, filePath: item.filePath || '' }));
  const tasks = (state.tasks || []).filter(item => item.restaurantId === restaurant.id && item.clientRequestId).map(item => ({ id: item.id, requestId: item.clientRequestId, title: item.title, type: item.type, status: item.status, requestedAt: item.requestedAt, startedAt: item.startedAt, completedAt: item.completedAt }));
  const canManageClientTeam = clientMember?.role === 'owner' || maintenanceMember?.role === 'owner';
  const canReturnToMaintenance = Boolean(maintenanceMember);
  const canOpenWebEditor = maintenanceMember?.role === 'owner' || ['owner', 'editor'].includes(clientMember?.role);
  const canManageWebGuide = maintenanceMember?.role === 'owner';
  const publicUrl = extractPublicUrl(restaurant) || portal.public_url || '';
  const editorUrl = extractEditorUrl(restaurant);
  const analytics = analyticsConfig(restaurant);
  const portalMembers = canManageClientTeam ? await restRows(`cuotly_client_members?portal_id=eq.${encodeURIComponent(portal.id)}&active=is.true&select=id,name,email,role,created_at&order=created_at.asc`) : [];
  const notices = await restRows(`cuotly_client_notifications?user_id=eq.${encodeURIComponent(caller.id)}&portal_id=eq.${encodeURIComponent(portal.id)}&select=id,title,body,created_at,read_at&order=created_at.desc&limit=30`);
  return {
    portal: { id: portal.id, workspaceId: portal.workspace_id, restaurantId: restaurant.id, status: portal.status, publicUrl, editorAvailable: Boolean(editorUrl), allowAdminAccess: portal.allow_admin_access, analyticsConfigured: Boolean(analytics.propertyId), analyticsTrackingInstalled: analytics.trackingInstalled },
    restaurant: { name: restaurant.name, email: restaurant.email || '', phone: restaurant.phone || '', address: restaurant.address || '', city: restaurant.city || '', openingHours: restaurant.openingHours || '', socialLinks: restaurant.socialLinks || '', logoUrl: restaurant.logoUrl || '', publicUrl },
    member: clientMember ? { role: clientMember.role, name: clientMember.name || userName(caller), email: clientMember.email } : null,
    services, requests: requests.map(safeRequest), tasks, payments, reports, clientMembers: portalMembers, notifications: notices,
    webGuide: normalizedGuide(state.clientWebGuide),
    permissions: { canManageClientTeam, canReturnToMaintenance, canOpenWebEditor, canManageWebGuide, canViewAnalytics: Boolean(clientMember || ['owner', 'admin'].includes(maintenanceMember?.role)), canManageAnalytics: maintenanceMember?.role === 'owner' },
  };
}
async function listClientPortals(caller) {
  const rows = await restRows(`cuotly_client_members?user_id=eq.${encodeURIComponent(caller.id)}&active=is.true&select=role,portal:cuotly_client_portals!inner(id,restaurant_id,status,public_url,workspace:cuotly_workspaces!inner(id,state))`);
  return rows.filter(row => row.portal?.status === 'active').map(row => ({ id: row.portal.id, role: row.role, restaurantName: ((row.portal.workspace?.state?.restaurants || []).find(item => item.id === row.portal.restaurant_id)?.name) || 'Restaurante' }));
}
async function ensureMaintenanceAccess(caller, portal, action) {
  const member = await maintenanceMembership(caller, portal.workspace_id);
  if (!member) throw new Error('No tienes acceso al mantenimiento de este restaurante.');
  if (member.role === 'worker') {
    const services = servicesInPortal(portal);
    const internal = (portal.workspace?.state?.members || []).find(item => cleanEmail(item.email) === cleanEmail(caller.email));
    if (!internal || !services.some(service => serviceMemberIds(service).includes(internal.id))) throw new Error('No tienes acceso a este restaurante.');
    if (!['bootstrap', 'request-update', 'message'].includes(action)) throw new Error('No tienes permiso para esta accion.');
  }
  if (member.role === 'admin' && !portal.allow_admin_access) throw new Error('El propietario no ha dado acceso al panel de cliente a los administradores.');
  return member;
}
async function inviteClient(caller, portal, body, req) {
  const email = cleanEmail(body.email);
  const role = CLIENT_ROLES.includes(body.role) ? body.role : 'viewer';
  if (!email.includes('@')) throw new Error('Escribe un email valido.');
  const existing = await findAuthUser(email);
  const invite = (await restRows('cuotly_client_invitations?on_conflict=portal_id,email', { method: 'POST', headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ portal_id: portal.id, email, role, invited_by: caller.id, status: 'pending', accepted_by: null, accepted_at: null, responded_at: null }) }))[0];
  const link = `${appUrl(req)}/?clientInvite=${encodeURIComponent(invite.id)}&clientOnly=1`;
  const endpoint = existing ? `${SUPABASE_URL}/auth/v1/otp` : `${SUPABASE_URL}/auth/v1/invite`;
  const payload = existing ? { email, create_user: false, redirect_to: link } : { email, data: { cuotly_client_invite_id: invite.id }, redirect_to: link };
  const sent = await fetch(endpoint, { method: 'POST', headers: headers({ 'content-type': 'application/json' }), body: JSON.stringify(payload) });
  if (!sent.ok) { const output = await sent.json().catch(() => ({})); throw new Error(output.msg || output.error_description || output.error || 'No se pudo enviar la invitacion.'); }
  await createActivity(portal.id, null, 'client_invited', 'maintenance', caller.id, { email, role });
  return { email, role, existingUser: Boolean(existing) };
}
async function acceptInvite(caller, inviteId) {
  const rows = await restRows(`cuotly_client_invitations?id=eq.${encodeURIComponent(inviteId)}&select=*,portal:cuotly_client_portals!inner(id,workspace_id,status)`);
  const invite = rows[0];
  if (!invite || cleanEmail(invite.email) !== cleanEmail(caller.email)) throw new Error('No encontramos esta invitacion para tu cuenta.');
  if (invite.portal?.status !== 'active') throw new Error('Este panel ya no esta disponible.');
  if (invite.status === 'rejected' || invite.status === 'cancelled') throw new Error('Esta invitacion ya no esta disponible.');
  const name = userName(caller);
  await restRows('cuotly_client_members?on_conflict=portal_id,email', { method: 'POST', headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ portal_id: invite.portal_id, user_id: caller.id, email: caller.email, name, role: invite.role, active: true, removed_at: null }) });
  await restRows(`cuotly_client_invitations?id=eq.${encodeURIComponent(invite.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'accepted', accepted_by: caller.id, accepted_at: new Date().toISOString(), responded_at: new Date().toISOString() }) });
  await createActivity(invite.portal_id, null, 'client_joined', 'restaurant', caller.id, { email: caller.email });
  return invite.portal_id;
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Falta configurar Supabase en Vercel.' });
  const caller = await callerOf(req);
  if (!caller?.id) return res.status(401).json({ error: 'No autorizado.' });
  if (caller.aal !== 'aal2') return res.status(403).json({ error: 'Verifica el segundo factor antes de continuar.' });
  const body = readBody(req);
  const action = String(req.query?.action || body.action || 'bootstrap');
  try {
    if (action === 'accept-client-invite') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido.' });
      const portalId = await acceptInvite(caller, String(body.inviteId || ''));
      return res.status(200).json({ ok: true, portalId, portals: await listClientPortals(caller) });
    }
    if (action === 'client-context') {
      const portals = await listClientPortals(caller);
      const maintenance = await restRows(`cuotly_members?user_id=eq.${encodeURIComponent(caller.id)}&active=is.true&deleted_at=is.null&select=id&limit=1`);
      return res.status(200).json({ ok: true, portals, clientOnly: portals.length > 0 && maintenance.length === 0 });
    }
    if (action === 'bootstrap') {
      const portalId = String(req.query?.portalId || body.portalId || '');
      if (!portalId) return res.status(200).json({ ok: true, portals: await listClientPortals(caller) });
      const portal = await portalById(portalId);
      if (!portal || portal.status !== 'active') return res.status(404).json({ error: 'No encontramos este panel.' });
      const client = await clientMembership(caller, portal.id);
      const maintenance = await maintenanceMembership(caller, portal.workspace_id);
      if (client) return res.status(200).json({ ok: true, mode: 'client', portals: await listClientPortals(caller), data: await portalPayload(portal, client, caller, maintenance) });
      const manager = await ensureMaintenanceAccess(caller, portal, 'bootstrap');
      return res.status(200).json({ ok: true, mode: 'maintenance-preview', portals: await listClientPortals(caller), data: await portalPayload(portal, null, caller, manager) });
    }

    if (action === 'create-portal') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido.' });
      const workspaceId = String(body.workspaceId || '');
      const restaurantId = String(body.restaurantId || '');
      const membership = await maintenanceMembership(caller, workspaceId);
      if (!membership || membership.role !== 'owner') throw new Error('Solo el propietario puede crear un panel de restaurante.');
      const workspaceRows = await restRows(`cuotly_workspaces?id=eq.${encodeURIComponent(workspaceId)}&select=id,state`);
      const state = clone(workspaceRows[0]?.state || {});
      const restaurant = (state.restaurants || []).find(item => item.id === restaurantId);
      if (!restaurant) throw new Error('No encontramos el restaurante.');
      const rows = await restRows('cuotly_client_portals?on_conflict=workspace_id,restaurant_id', { method: 'POST', headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ workspace_id: workspaceId, restaurant_id: restaurantId, public_url: cleanText(restaurant.publicUrl || extractPublicUrl(restaurant), 1200), created_by: caller.id, status: 'active' }) });
      return res.status(200).json({ ok: true, portal: rows[0] });
    }

    const portal = await portalById(String(body.portalId || req.query?.portalId || ''));
    if (!portal) return res.status(404).json({ error: 'No encontramos el panel.' });
    const client = await clientMembership(caller, portal.id);
    const clientCanEdit = client && ['owner', 'editor'].includes(client.role);

    if (action === 'analytics-summary') {
      const range = analyticsRange(String(body.period || req.query?.period || 'monthly'), String(body.month || req.query?.month || ''));
      if (!client) {
        const maintenance = await ensureMaintenanceAccess(caller, portal, 'analytics');
        if (!['owner', 'admin'].includes(maintenance.role)) throw new Error('Los datos de rendimiento los consultan el propietario y los administradores.');
      }
      return res.status(200).json({ ok: true, analytics: await analyticsForPortal(portal, range) });
    }

    if (action === 'analytics-alert') {
      const maintenance = await ensureMaintenanceAccess(caller, portal, 'analytics');
      if (maintenance.role !== 'owner') throw new Error('Solo el propietario de mantenimiento puede consultar alertas de rendimiento.');
      const current = await analyticsForPortal(portal, analyticsRange('monthly'));
      const previousEnd = new Date(`${current.range?.startDate || iso()}T12:00:00Z`);
      previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
      const previousStart = new Date(previousEnd);
      const elapsed = Math.max(1, Math.round((new Date(`${current.range?.endDate || iso()}T12:00:00Z`) - new Date(`${current.range?.startDate || iso()}T12:00:00Z`)) / 86400000) + 1);
      previousStart.setUTCDate(previousStart.getUTCDate() - elapsed + 1);
      const format = value => value.toISOString().slice(0, 10);
      const previous = await analyticsForPortal(portal, { period: 'comparison', startDate: format(previousStart), endDate: format(previousEnd), label: 'Periodo anterior equivalente' });
      const currentSessions = Number(current.totals?.sessions || 0);
      const previousSessions = Number(previous.totals?.sessions || 0);
      const change = previousSessions ? Math.round(((currentSessions - previousSessions) / previousSessions) * 100) : null;
      return res.status(200).json({ ok: true, alert: { configured: current.configured, currentSessions, previousSessions, change, needsAttention: change !== null && change <= -50, range: current.range } });
    }

    if (action === 'update-analytics-config') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido.' });
      const maintenance = await ensureMaintenanceAccess(caller, portal, 'analytics');
      if (maintenance.role !== 'owner') throw new Error('Solo el propietario de mantenimiento puede configurar Google Analytics.');
      const state = clone(portal.workspace.state || {});
      const restaurant = (state.restaurants || []).find(item => item.id === portal.restaurant_id);
      if (!restaurant) throw new Error('No encontramos el restaurante.');
      const config = body.config || {};
      restaurant.analytics = {
        propertyId: cleanAnalyticsPropertyId(config.propertyId),
        measurementId: cleanMeasurementId(config.measurementId),
        tagManagerId: cleanContainerId(config.tagManagerId),
        consentConfigured: config.consentConfigured === true,
        trackingInstalled: config.trackingInstalled === true,
        configuredAt: new Date().toISOString(),
        lastVerifiedAt: config.lastVerifiedAt ? new Date().toISOString() : String(restaurant.analytics?.lastVerifiedAt || ''),
      };
      await updateState(portal.workspace_id, state);
      analyticsCache.clear();
      await createActivity(portal.id, null, 'analytics_config_updated', 'maintenance', caller.id, { propertyId: restaurant.analytics.propertyId, trackingInstalled: restaurant.analytics.trackingInstalled });
      return res.status(200).json({ ok: true, config: analyticsConfig(restaurant), serviceAccountEmail: serviceAccount()?.client_email || '' });
    }

    if (action === 'open-web-editor') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido.' });
      let maintenance = await maintenanceMembership(caller, portal.workspace_id);
      if (!client) maintenance = await ensureMaintenanceAccess(caller, portal, 'open-web-editor');
      const allowed = clientCanEdit || maintenance?.role === 'owner';
      if (!allowed) throw new Error('No tienes permiso para abrir el editor de esta web.');
      const editorUrl = extractEditorUrl(restaurantInPortal(portal));
      if (!editorUrl) throw new Error('El propietario de mantenimiento todavia no ha configurado el enlace del editor.');
      await createActivity(portal.id, null, 'web_editor_opened', clientCanEdit ? 'restaurant' : 'maintenance', caller.id, { source: 'client_web' });
      return res.status(200).json({ ok: true, url: editorUrl });
    }

    if (action === 'request-editor-access') {
      if (req.method !== 'POST' || !clientCanEdit) throw new Error('Solo el propietario o los administradores del restaurante pueden solicitar acceso.');
      const existing = await restRows(`cuotly_client_requests?portal_id=eq.${encodeURIComponent(portal.id)}&kind=eq.restaurant_link&status=eq.pending&select=id&limit=1`);
      if (existing.length) throw new Error('Ya hay una solicitud de acceso al editor pendiente.');
      const request = (await restRows('cuotly_client_requests', {
        method: 'POST', headers: { 'content-type': 'application/json', prefer: 'return=representation' },
        body: JSON.stringify({
          portal_id: portal.id,
          workspace_id: portal.workspace_id,
          restaurant_id: portal.restaurant_id,
          title: 'Solicitud de acceso al editor',
          description: 'El restaurante solicita que se configure o comparta el acceso al editor de LandingSite.',
          kind: 'restaurant_link',
          analysis: { source: 'web_editor' },
          requested_by: caller.id,
        }),
      }))[0];
      await createActivity(portal.id, request.id, 'web_editor_access_requested', 'restaurant', caller.id, { source: 'client_web' });
      await notifyMaintenance(portal, 'Solicitud de acceso al editor', 'El restaurante ha solicitado acceso al editor de la web.', null, caller.id, 'messages');
      return res.status(201).json({ ok: true, request: safeRequest(request) });
    }

    if (action === 'update-web-guide') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido.' });
      const maintenance = await ensureMaintenanceAccess(caller, portal, 'update-web-guide');
      if (maintenance.role !== 'owner') throw new Error('Solo el propietario de mantenimiento puede editar la guia.');
      const state = clone(portal.workspace.state || {});
      state.clientWebGuide = normalizedGuide(body.guide);
      await updateState(portal.workspace_id, state);
      await createActivity(portal.id, null, 'web_guide_updated', 'maintenance', caller.id, { source: 'client_web' });
      return res.status(200).json({ ok: true, guide: state.clientWebGuide });
    }

    if (action === 'invite-client') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido.' });
      if (client?.role !== 'owner') {
        const manager = await ensureMaintenanceAccess(caller, portal, 'invite-client');
        if (manager.role !== 'owner') throw new Error('Solo el propietario del mantenimiento puede invitar al primer cliente.');
      }
      return res.status(200).json({ ok: true, invitation: await inviteClient(caller, portal, body, req) });
    }
    if (action === 'update-client-member') {
      if (req.method !== 'POST' || client?.role !== 'owner') throw new Error('Solo el propietario del restaurante puede gestionar su equipo.');
      const memberId = String(body.memberId || '');
      const role = CLIENT_ROLES.includes(body.role) ? body.role : '';
      const active = body.active !== false;
      const members = await restRows(`cuotly_client_members?portal_id=eq.${encodeURIComponent(portal.id)}&active=is.true&select=*`);
      const target = members.find(item => item.id === memberId);
      if (!target) throw new Error('No encontramos a ese usuario.');
      if (target.role === 'owner' && (!active || role !== 'owner') && members.filter(item => item.role === 'owner').length < 2) throw new Error('Debe quedar al menos un propietario del restaurante.');
      await restRows(`cuotly_client_members?id=eq.${encodeURIComponent(memberId)}&portal_id=eq.${encodeURIComponent(portal.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: role || target.role, active, removed_at: active ? null : new Date().toISOString() }) });
      await createActivity(portal.id, null, active ? 'client_member_updated' : 'client_member_removed', 'restaurant', caller.id, { memberId, role: role || target.role });
      return res.status(200).json({ ok: true });
    }
    if (action === 'update-restaurant-profile') {
      if (req.method !== 'POST' || !clientCanEdit) throw new Error('No tienes permiso para editar esta ficha.');
      const state = clone(portal.workspace.state || {});
      const restaurant = (state.restaurants || []).find(item => item.id === portal.restaurant_id);
      if (!restaurant) throw new Error('No encontramos el restaurante.');
      for (const key of ['name', 'email', 'phone', 'address', 'city', 'openingHours', 'socialLinks', 'logoUrl']) if (Object.prototype.hasOwnProperty.call(body.profile || {}, key)) restaurant[key] = cleanText(body.profile[key], key === 'logoUrl' || key === 'socialLinks' ? 1200 : 180);
      await updateState(portal.workspace_id, state);
      await createActivity(portal.id, null, 'restaurant_profile_updated', 'restaurant', caller.id);
      return res.status(200).json({ ok: true });
    }
    if (action === 'create-request') {
      if (req.method !== 'POST' || !clientCanEdit) throw new Error('No tienes permiso para solicitar cambios.');
      const service = servicesInPortal(portal).find(item => item.id === String(body.serviceId || ''));
      if (!service || service.status !== 'active') throw new Error('Ese servicio no esta activo.');
      const allocations = parsedAllocations(body.allocations);
      const quoteRequired = body.analysis?.quoteRequired === true;
      if (body.kind !== 'incident' && !allocations.length && !quoteRequired) throw new Error('Elige una opcion valida de cambios.');
      const existing = await restRows(`cuotly_client_requests?portal_id=eq.${encodeURIComponent(portal.id)}&service_id=eq.${encodeURIComponent(service.id)}&select=service_id,status,selected_allocations`);
      const usage = currentUsage(portal.workspace.state || {}, service, existing);
      if (body.kind !== 'incident' && allocations.length && !hasAllocationBalance(usage, allocations)) throw new Error('Ya no quedan cambios suficientes para esta solicitud. Puedes pedir un paquete adicional.');
      const request = (await restRows('cuotly_client_requests', { method: 'POST', headers: { 'content-type': 'application/json', prefer: 'return=representation' }, body: JSON.stringify({ portal_id: portal.id, workspace_id: portal.workspace_id, restaurant_id: portal.restaurant_id, service_id: service.id, title: cleanText(body.title, 180), description: cleanText(body.description, 8000), kind: body.kind === 'incident' ? 'incident' : 'change', selected_allocations: allocations, proposed_allocations: Array.isArray(body.proposedAllocations) ? body.proposedAllocations : [], analysis: body.analysis || {}, attachments: safeAttachments(body.attachments, portal.id), requested_by: caller.id }) }))[0];
      await createActivity(portal.id, request.id, 'request_created', 'restaurant', caller.id, { allocations });
      const restaurantName = restaurantInPortal(portal)?.name || 'Un restaurante';
      await notifyMaintenance(portal, `Nueva solicitud · ${restaurantName}`, request.title || 'Hay una nueva solicitud pendiente.', service, caller.id, 'messages');
      return res.status(201).json({ ok: true, request: safeRequest(request) });
    }
    if (action === 'cancel-request') {
      if (req.method !== 'POST' || !clientCanEdit) throw new Error('No tienes permiso para cancelar esta solicitud.');
      const request = (await restRows(`cuotly_client_requests?id=eq.${encodeURIComponent(String(body.requestId || ''))}&portal_id=eq.${encodeURIComponent(portal.id)}&select=*`))[0];
      if (!request || ['completed', 'rejected', 'cancelled'].includes(request.status)) throw new Error('Esta solicitud ya no se puede cancelar.');
      const state = clone(portal.workspace.state || {});
      const task = (state.tasks || []).find(item => item.id === request.task_id);
      const alreadyStarted = Boolean(task?.startedAt || ['in_progress', 'waiting'].includes(request.status));
      if (task) {
        task.status = alreadyStarted ? 'completed' : 'cancelled';
        task.cancelledAt = new Date().toISOString();
        if (alreadyStarted) { task.completedAt ||= new Date().toISOString(); task.quotaConsumedAt ||= task.completedAt; }
      }
      if (task) await updateState(portal.workspace_id, state);
      await restRows(`cuotly_client_requests?id=eq.${encodeURIComponent(request.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'cancelled', credits_consumed: alreadyStarted, cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
      await createActivity(portal.id, request.id, alreadyStarted ? 'request_cancelled_after_start' : 'request_cancelled', 'restaurant', caller.id);
      return res.status(200).json({ ok: true, creditsConsumed: alreadyStarted });
    }
    if (action === 'send-message') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido.' });
      const requestId = String(body.requestId || '');
      const isClient = Boolean(client);
      if (!isClient) await ensureMaintenanceAccess(caller, portal, 'message');
      const request = (await restRows(`cuotly_client_requests?id=eq.${encodeURIComponent(requestId)}&portal_id=eq.${encodeURIComponent(portal.id)}&select=id,service_id`))[0];
      if (!request) throw new Error('No encontramos la solicitud.');
      const message = cleanText(body.message, 8000);
      if (!message) throw new Error('Escribe un mensaje.');
      const row = (await restRows('cuotly_client_messages', { method: 'POST', headers: { 'content-type': 'application/json', prefer: 'return=representation' }, body: JSON.stringify({ request_id: requestId, side: isClient ? 'restaurant' : 'maintenance', body: message, attachments: safeAttachments(body.attachments, portal.id), author_id: caller.id }) }))[0];
      await createActivity(portal.id, requestId, 'message_sent', isClient ? 'restaurant' : 'maintenance', caller.id);
      if (isClient) {
        const service = servicesInPortal(portal).find(item => item.id === request.service_id) || null;
        await notifyMaintenance(portal, 'Nuevo mensaje del restaurante', message, service, caller.id, 'messages');
      } else {
        await notifyPortal(portal.id, 'Quotly', 'El equipo de mantenimiento ha respondido.', caller.id, 'messages', `/?clientPortal=${encodeURIComponent(portal.id)}`);
      }
      return res.status(201).json({ ok: true, message: { id: row.id, side: row.side, body: row.body, attachments: row.attachments, createdAt: row.created_at } });
    }
    if (action === 'request-service-pause' || action === 'request-cancellation' || action === 'request-extra-package' || action === 'request-restaurant-link') {
      if (req.method !== 'POST' || client?.role !== 'owner') throw new Error('Solo el propietario del restaurante puede realizar esta solicitud.');
      const kind = action === 'request-service-pause' ? 'pause' : action === 'request-cancellation' ? 'cancellation' : action === 'request-extra-package' ? 'extra_package' : 'restaurant_link';
      const service = ['pause', 'cancellation'].includes(kind) ? servicesInPortal(portal).find(item => item.id === String(body.serviceId || '')) : null;
      if (['pause', 'cancellation'].includes(kind) && !service) throw new Error('Selecciona el servicio que quieres gestionar.');
      if (kind === 'pause' && service.planCode === 'menu') throw new Error('Menu Diario no admite pausas. Puedes solicitar su baja.');
      const record = (await restRows('cuotly_client_requests', { method: 'POST', headers: { 'content-type': 'application/json', prefer: 'return=representation' }, body: JSON.stringify({ portal_id: portal.id, workspace_id: portal.workspace_id, restaurant_id: portal.restaurant_id, service_id: service?.id || null, title: cleanText(body.title || kind, 180), description: cleanText(body.description, 3000), kind, analysis: kind === 'pause' ? { plannedDays: Math.min(31, Math.max(1, Number(body.plannedDays || 31))) } : {}, requested_by: caller.id }) }))[0];
      if (kind === 'restaurant_link') await restRows('cuotly_client_link_requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requester_id: caller.id, source_portal_id: portal.id, status: 'pending' }) });
      await createActivity(portal.id, record.id, `${kind}_requested`, 'restaurant', caller.id);
      await notifyMaintenance(portal, 'Nueva solicitud del restaurante', record.title || 'Hay una nueva solicitud pendiente.', service, caller.id, 'messages');
      return res.status(201).json({ ok: true, request: safeRequest(record) });
    }
    if (action === 'maintenance-request-update') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido.' });
      const manager = await ensureMaintenanceAccess(caller, portal, 'request-update');
      const request = (await restRows(`cuotly_client_requests?id=eq.${encodeURIComponent(String(body.requestId || ''))}&portal_id=eq.${encodeURIComponent(portal.id)}&select=*`))[0];
      if (!request) throw new Error('No encontramos la solicitud.');
      const nextStatus = String(body.status || '');
      const allowed = new Set(['accepted', 'in_progress', 'waiting', 'completed', 'rejected']);
      if (!allowed.has(nextStatus)) throw new Error('Estado no valido.');
      if (['pause', 'cancellation', 'extra_package', 'restaurant_link'].includes(request.kind) && !['accepted', 'rejected'].includes(nextStatus)) throw new Error('Esta solicitud solo se puede aceptar o rechazar.');
      const state = clone(portal.workspace.state || {});
      const service = request.service_id ? (state.services || []).find(item => item.id === request.service_id) : null;
      if (manager.role === 'worker' && request.kind === 'cancellation') throw new Error('Solo el propietario o un administrador puede aprobar una baja.');
      if (request.kind === 'change' || request.kind === 'incident') {
        if (!service || service.status !== 'active') throw new Error('El servicio no esta activo.');
      }
      let task = (state.tasks || []).find(item => item.id === request.task_id);
      let stateChanged = false;
      if (nextStatus === 'accepted' && request.kind === 'pause') {
        if (!service) throw new Error('No encontramos el servicio de esta solicitud.');
        pauseService(state, service, request.analysis?.plannedDays, request.description);
        stateChanged = true;
      }
      if (nextStatus === 'accepted' && request.kind === 'cancellation') {
        if (!service) throw new Error('No encontramos el servicio de esta solicitud.');
        scheduleCancellation(state, service);
        stateChanged = true;
      }
      if (nextStatus === 'accepted' && !task && service && ['change', 'incident'].includes(request.kind)) {
        const others = await restRows(`cuotly_client_requests?portal_id=eq.${encodeURIComponent(portal.id)}&service_id=eq.${encodeURIComponent(service.id)}&select=id,service_id,status,selected_allocations`);
        const usage = currentUsage(state, service, others.filter(item => item.id !== request.id));
        const allocations = parsedAllocations(request.selected_allocations);
        if (request.kind === 'change' && !hasAllocationBalance(usage, allocations)) throw new Error('Ya no queda saldo para aceptar esta solicitud.');
        const internal = (state.members || []).find(item => cleanEmail(item.email) === cleanEmail(caller.email));
        task = { id: `task_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`, clientRequestId: request.id, restaurantId: portal.restaurant_id, serviceId: service.id, title: request.title, description: request.description, type: allocations[0]?.type || 'incident', quantity: allocations[0]?.quantity || 1, consumesQuota: request.kind === 'change' && allocations.length > 0, allocation: allocations, status: 'requested', priority: 'normal', assignedTo: internal?.id || '', assignedName: internal?.name || '', requestedAt: new Date().toISOString(), reservedAt: new Date().toISOString(), createdBy: internal?.id || 'maintenance' };
        state.tasks ||= []; state.tasks.push(task);
      }
      if (task) {
        if (nextStatus === 'in_progress' && !task.startedAt) task.startedAt = new Date().toISOString();
        if (nextStatus === 'waiting' && !task.startedAt) task.startedAt = new Date().toISOString();
        if (nextStatus === 'completed') { task.startedAt ||= new Date().toISOString(); task.completedAt = new Date().toISOString(); task.quotaConsumedAt = task.completedAt; }
        task.status = nextStatus === 'accepted' ? 'assigned' : nextStatus;
      }
      if (task || stateChanged) await updateState(portal.workspace_id, state);
      const patch = { status: nextStatus, task_id: task?.id || request.task_id || null, updated_at: new Date().toISOString() };
      if (nextStatus === 'accepted') { patch.accepted_by = caller.id; patch.accepted_at = new Date().toISOString(); }
      if (nextStatus === 'in_progress') patch.started_at = new Date().toISOString();
      if (nextStatus === 'completed') { patch.completed_by = caller.id; patch.completed_at = new Date().toISOString(); patch.credits_consumed = request.kind === 'change' && parsedAllocations(request.selected_allocations).length > 0; }
      if (nextStatus === 'rejected') patch.rejection_reason = cleanText(body.reason, 1000) || 'La solicitud no se puede realizar con el servicio actual.';
      await restRows(`cuotly_client_requests?id=eq.${encodeURIComponent(request.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) });
      await createActivity(portal.id, request.id, `request_${nextStatus}`, 'maintenance', caller.id, { role: manager.role });
      await notifyPortal(portal.id, 'Quotly', `Tu solicitud ahora está: ${nextStatus}.`, caller.id, 'messages', `/?clientPortal=${encodeURIComponent(portal.id)}`);
      return res.status(200).json({ ok: true });
    }
    if (action === 'messages') {
      const requestId = String(req.query?.requestId || body.requestId || '');
      if (!client) await ensureMaintenanceAccess(caller, portal, 'message');
      const rows = await restRows(`cuotly_client_messages?request_id=eq.${encodeURIComponent(requestId)}&select=id,side,body,attachments,created_at&order=created_at.asc`);
      return res.status(200).json({ ok: true, messages: rows.map(item => ({ id: item.id, side: item.side, body: item.body, attachments: item.attachments, createdAt: item.created_at })) });
    }
    return res.status(400).json({ error: 'Accion no valida.' });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'No se pudo completar la accion.' });
  }
}

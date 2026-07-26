const SUPABASE_URL = cleanUrl(process.env.SUPABASE_URL || '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = 'cuotly-client-files';
const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

function cleanUrl(value) { return String(value || '').trim().replace(/\/+$/, '').replace(/\/(?:rest|auth|storage|realtime)\/v1(?:\/.*)?$/i, ''); }
function readBody(req) { if (typeof req.body !== 'string') return req.body || {}; try { return JSON.parse(req.body || '{}'); } catch { return {}; } }
function headers(extra = {}) { return { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}`, ...extra }; }
function cleanEmail(value) { return String(value || '').trim().toLowerCase(); }
function safeFileName(value) { return String(value || 'archivo').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120) || 'archivo'; }
function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function serviceMemberIds(service) { const ids = Array.isArray(service?.assignedMemberIds) ? service.assignedMemberIds : (service?.assignedTo ? [service.assignedTo] : []); return [...new Set(ids.filter(Boolean))]; }

async function rest(path, options = {}) {
  const { headers: extra = {}, ...request } = options;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...request, headers: headers(extra) });
}
async function rows(path, options = {}) {
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
async function portalById(id) {
  const result = await rows(`cuotly_client_portals?id=eq.${encodeURIComponent(id)}&select=*,workspace:cuotly_workspaces!inner(id,state)`);
  return result[0] || null;
}
async function canAccess(caller, portal) {
  const client = await rows(`cuotly_client_members?portal_id=eq.${encodeURIComponent(portal.id)}&user_id=eq.${encodeURIComponent(caller.id)}&active=is.true&select=role`);
  if (client[0] && ['owner', 'editor'].includes(client[0].role)) return true;
  const maintenance = await rows(`cuotly_members?workspace_id=eq.${encodeURIComponent(portal.workspace_id)}&user_id=eq.${encodeURIComponent(caller.id)}&active=is.true&deleted_at=is.null&select=role,email`);
  const member = maintenance[0];
  if (!member) return false;
  if (member.role === 'owner') return true;
  if (member.role === 'admin') return Boolean(portal.allow_admin_access);
  const internal = (clone(portal.workspace?.state).members || []).find(item => cleanEmail(item.email) === cleanEmail(caller.email));
  const services = (clone(portal.workspace?.state).services || []).filter(item => item.restaurantId === portal.restaurant_id);
  return Boolean(internal && services.some(service => serviceMemberIds(service).includes(internal.id)));
}
function decodeDataUrl(value) {
  const match = String(value || '').match(/^data:([^;,]+);base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) throw new Error('El archivo no tiene un formato valido.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!ALLOWED_TYPES.has(match[1])) throw new Error('Solo puedes adjuntar JPG, PNG, WEBP o PDF.');
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('Cada archivo puede ocupar como maximo 6 MB.');
  return { mime: match[1], bytes };
}
function validateFileMeta(name, mime, size) {
  const fileName = safeFileName(name);
  const contentType = String(mime || '');
  const bytes = Number(size || 0);
  if (!ALLOWED_TYPES.has(contentType)) throw new Error('Solo puedes adjuntar JPG, PNG, WEBP o PDF.');
  if (!Number.isFinite(bytes) || bytes < 1 || bytes > MAX_BYTES) throw new Error('Cada archivo puede ocupar como maximo 6 MB.');
  return { name: fileName, mime: contentType, size: bytes };
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Falta configurar Supabase en Vercel.' });
  const caller = await callerOf(req);
  if (!caller?.id) return res.status(401).json({ error: 'No autorizado.' });
  if (caller.aal !== 'aal2') return res.status(403).json({ error: 'Verifica el segundo factor antes de adjuntar archivos.' });
  const body = readBody(req);
  const action = String(body.action || req.query?.action || 'upload');
  try {
    const portal = await portalById(String(body.portalId || req.query?.portalId || ''));
    if (!portal || portal.status !== 'active') throw new Error('No encontramos el panel del restaurante.');
    if (!(await canAccess(caller, portal))) throw new Error('No tienes acceso a estos archivos.');

    if (action === 'signed-url') {
      const path = String(body.path || '').replace(/^\/+/, '');
      if (!path.startsWith(`portal/${portal.id}/`)) throw new Error('Archivo no valido.');
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`, { method: 'POST', headers: headers({ 'content-type': 'application/json' }), body: JSON.stringify({ expiresIn: 900 }) });
      const output = await response.json().catch(() => ({}));
      if (!response.ok || !output.signedURL) throw new Error(output.message || 'No se pudo abrir el archivo.');
      const url = output.signedURL.startsWith('http') ? output.signedURL : `${SUPABASE_URL}/storage/v1${output.signedURL}`;
      return res.status(200).json({ ok: true, url });
    }

    if (action === 'signed-upload') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido.' });
      const file = validateFileMeta(body.name, body.mime, body.size);
      const path = `portal/${portal.id}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${file.name}`;
      const signed = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}`, {
        method: 'POST',
        headers: headers({ 'content-type': 'application/json' }),
        body: JSON.stringify({}),
      });
      const output = await signed.json().catch(() => ({}));
      if (!signed.ok || !output.url) throw new Error(output.message || 'No se pudo preparar la subida.');
      const uploadUrl = output.url.startsWith('http') ? output.url : `${SUPABASE_URL}/storage/v1${output.url}`;
      return res.status(200).json({ ok: true, uploadUrl, attachment: { path, name: file.name, mime: file.mime, size: file.size } });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido.' });
    const decoded = decodeDataUrl(body.dataUrl);
    const name = safeFileName(body.name);
    const path = `portal/${portal.id}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${name}`;
    const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, { method: 'POST', headers: headers({ 'content-type': decoded.mime, 'x-upsert': 'false' }), body: decoded.bytes });
    const output = await upload.json().catch(() => ({}));
    if (!upload.ok) throw new Error(output.message || 'No se pudo guardar el archivo.');
    return res.status(201).json({ ok: true, attachment: { path, name, mime: decoded.mime, size: decoded.bytes.length } });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'No se pudo adjuntar el archivo.' });
  }
}

const SUPABASE_URL = cleanUrl(process.env.SUPABASE_URL || '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const MONTHLY_LIMIT = 3;
const INVITATION_DAYS = 30;

function cleanUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '').replace(/\/(?:rest|auth|storage|realtime)\/v1(?:\/.*)?$/i, '');
}

function headers(extra = {}) {
  return { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}`, ...extra };
}

function readBody(req) {
  if (typeof req.body !== 'string') return req.body || {};
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

async function rest(path, options = {}) {
  const { headers: requestHeaders = {}, ...request } = options;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...request, headers: headers(requestHeaders) });
}

async function callerOf(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_ROLE_KEY, authorization } });
  if (!response.ok) return null;
  const user = await response.json();
  try {
    const payload = JSON.parse(Buffer.from(authorization.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    user.aal = payload.aal || 'aal1';
  } catch { user.aal = 'aal1'; }
  return user;
}

function cleanEmail(value) { return String(value || '').trim().toLowerCase(); }
function roleLabel(role) { return ({ admin: 'Administrador', worker: 'Trabajador', owner: 'Propietario', editor: 'Puede editar', viewer: 'Solo consultar' })[role] || role; }

function parseLink(value) {
  let url;
  try { url = new URL(String(value || '').trim()); } catch { throw new Error('Pega un enlace de invitación válido.'); }
  const maintenanceId = url.searchParams.get('invite');
  const clientId = url.searchParams.get('clientInvite');
  if (maintenanceId) return { kind: 'maintenance', id: maintenanceId };
  if (clientId) return { kind: 'restaurant', id: clientId };
  throw new Error('El enlace no contiene una invitación de Cuotly.');
}

function isExpired(createdAt) {
  const timestamp = new Date(createdAt || 0).getTime();
  return !timestamp || Date.now() - timestamp > INVITATION_DAYS * 86400000;
}

function monthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function usageFor(userId) {
  const response = await rest(`cuotly_invitation_link_uses?user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${encodeURIComponent(monthStart())}&select=id&order=created_at.asc`);
  const rows = response.ok ? await response.json().catch(() => []) : [];
  return { used: rows.length, limit: MONTHLY_LIMIT };
}

async function markUse(caller, invitation) {
  const response = await rest('cuotly_invitation_link_uses', {
    method: 'POST',
    headers: { 'content-type': 'application/json', prefer: 'return=representation' },
    body: JSON.stringify({ user_id: caller.id, invitation_kind: invitation.kind, invitation_id: invitation.id }),
  });
  if (!response.ok) throw new Error('No se pudo registrar el uso de la invitación.');
}

async function maintenanceInvitation(caller, id) {
  const response = await rest(`cuotly_invitations?id=eq.${encodeURIComponent(id)}&select=id,email,role,status,created_at,workspace:cuotly_workspaces!inner(id,name)`);
  const rows = response.ok ? await response.json().catch(() => []) : [];
  const invitation = rows[0];
  if (!invitation || cleanEmail(invitation.email) !== cleanEmail(caller.email)) throw new Error('Esta invitación no pertenece al correo de tu cuenta.');
  if (invitation.status && invitation.status !== 'pending') throw new Error('Esta invitación ya fue respondida o cancelada.');
  if (isExpired(invitation.created_at)) throw new Error('Esta invitación ha caducado. Pide que te envíen una nueva.');
  return { kind: 'maintenance', id: invitation.id, targetName: invitation.workspace?.name || 'Espacio de mantenimiento', role: invitation.role, roleLabel: roleLabel(invitation.role), createdAt: invitation.created_at };
}

async function restaurantInvitation(caller, id) {
  const response = await rest(`cuotly_client_invitations?id=eq.${encodeURIComponent(id)}&select=id,email,role,status,created_at,portal:cuotly_client_portals!inner(id,status,restaurant_id,workspace:cuotly_workspaces!inner(id,state))`);
  const rows = response.ok ? await response.json().catch(() => []) : [];
  const invitation = rows[0];
  if (!invitation || cleanEmail(invitation.email) !== cleanEmail(caller.email)) throw new Error('Esta invitación no pertenece al correo de tu cuenta.');
  if (invitation.status && invitation.status !== 'pending') throw new Error('Esta invitación ya fue respondida o cancelada.');
  if (invitation.portal?.status !== 'active') throw new Error('Este panel de restaurante ya no está disponible.');
  if (isExpired(invitation.created_at)) throw new Error('Esta invitación ha caducado. Pide que te envíen una nueva.');
  const restaurants = invitation.portal?.workspace?.state?.restaurants || [];
  const restaurant = restaurants.find(item => String(item.id) === String(invitation.portal.restaurant_id));
  return { kind: 'restaurant', id: invitation.id, portalId: invitation.portal.id, targetName: restaurant?.name || 'Panel de restaurante', role: invitation.role, roleLabel: roleLabel(invitation.role), createdAt: invitation.created_at };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido.' });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Falta configurar Supabase en Vercel.' });
  const caller = await callerOf(req);
  if (!caller?.id) return res.status(401).json({ error: 'No autorizado.' });
  if (caller.aal !== 'aal2') return res.status(403).json({ error: 'Verifica el segundo factor antes de continuar.' });
  try {
    const parsed = parseLink(readBody(req).link);
    const invitation = parsed.kind === 'maintenance' ? await maintenanceInvitation(caller, parsed.id) : await restaurantInvitation(caller, parsed.id);
    const usage = await usageFor(caller.id);
    if (usage.used >= MONTHLY_LIMIT) return res.status(429).json({ error: 'Has alcanzado el máximo de 3 usos de enlaces de invitación este mes.', usage });
    await markUse(caller, invitation);
    return res.status(200).json({ ok: true, invitation, usage: { used: usage.used + 1, limit: MONTHLY_LIMIT } });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'No se pudo comprobar la invitación.' });
  }
}

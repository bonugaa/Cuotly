const SUPABASE_URL = cleanUrl(process.env.SUPABASE_URL || '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

function appUrl(req) {
  return req.headers.origin || process.env.CUOTLY_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://cuotly.vercel.app');
}

async function getCaller(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_ROLE_KEY, authorization } });
  if (!response.ok) return null;
  const user = await response.json();
  try {
    const payload = JSON.parse(Buffer.from(authorization.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    user.aal = payload.aal || 'aal1';
  } catch {
    user.aal = 'aal1';
  }
  return user;
}

async function rest(path, options = {}) {
  const { headers: requestHeaders = {}, ...request } = options;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...request, headers: headers(requestHeaders) });
}

async function findUserByEmail(email) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, { headers: headers() });
  if (!response.ok) return null;
  const result = await response.json().catch(() => ({}));
  return (result.users || []).find(user => String(user.email || '').toLowerCase() === email) || null;
}

async function workspaceForOwner(workspaceId, callerId) {
  const response = await rest(`cuotly_members?workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(callerId)}&active=is.true&deleted_at=is.null&select=role,workspace:cuotly_workspaces!inner(id,name,state,owner_id)`);
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []);
  const row = rows[0];
  return row?.role === 'owner' ? row.workspace : null;
}

async function saveWorkspace(workspaceId, state) {
  const response = await rest(`cuotly_workspaces?id=eq.${encodeURIComponent(workspaceId)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ state, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(await response.text());
}

async function upsertMembership(workspaceId, member, userId = undefined) {
  const payload = { workspace_id: workspaceId, email: member.email, name: member.name, role: member.role, active: true, removed_at: null, deleted_at: null, rejoin_after: null };
  if (userId) payload.user_id = userId;
  const response = await rest('cuotly_members?on_conflict=workspace_id,email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text());
}

async function blockedMembership(workspaceId, email) {
  const response = await rest(`cuotly_members?workspace_id=eq.${encodeURIComponent(workspaceId)}&email=ilike.${encodeURIComponent(email)}&deleted_at=not.is.null&select=rejoin_after`);
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []);
  const lock = rows[0]?.rejoin_after;
  return lock && new Date(lock) > new Date() ? lock : null;
}

async function sendMagicLink(email, redirectTo) {
  return fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: 'POST',
    headers: headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({ email, create_user: false, redirect_to: redirectTo }),
  });
}

async function createInvitation(workspaceId, email, role, callerId) {
  const response = await rest('cuotly_invitations?on_conflict=workspace_id,email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      workspace_id: workspaceId,
      email,
      role,
      invited_by: callerId,
      status: 'pending',
      accepted_at: null,
      accepted_by: null,
      responded_at: null,
      rejected_at: null,
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json().catch(() => []);
  return rows[0];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido' });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Falta configurar Supabase en Vercel.' });
  const caller = await getCaller(req);
  if (!caller?.id) return res.status(401).json({ error: 'No autorizado' });
  if (caller.aal !== 'aal2') return res.status(403).json({ error: 'Verifica el segundo factor antes de invitar.' });

  const body = readBody(req);
  const workspaceId = String(body.workspaceId || '');
  const email = String(body.email || '').trim().toLowerCase();
  const role = ['admin', 'worker'].includes(body.role) ? body.role : 'worker';
  if (!workspaceId || !email.includes('@')) return res.status(400).json({ error: 'Revisa el email y el espacio de trabajo.' });

  const workspace = await workspaceForOwner(workspaceId, caller.id);
  if (!workspace) return res.status(403).json({ error: 'Solo el propietario puede invitar o gestionar miembros.' });
  const blockedUntil = await blockedMembership(workspaceId, email);
  if (blockedUntil) return res.status(409).json({ error: `Ese email podra volver a unirse a partir del ${new Intl.DateTimeFormat('es-ES').format(new Date(blockedUntil))}.` });

  const existingUser = await findUserByEmail(email);
  const invitation = await createInvitation(workspaceId, email, role, caller.id);
  const inviteLink = `${appUrl(req)}/?invite=${encodeURIComponent(invitation.id)}`;
  if (!existingUser?.id) {
    const invite = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
      method: 'POST',
      headers: headers({ 'content-type': 'application/json' }),
      body: JSON.stringify({ email, data: { cuotly_invite_id: invitation.id }, redirect_to: inviteLink }),
    });
    const result = await invite.json().catch(() => ({}));
    if (!invite.ok) return res.status(invite.status).json({ error: result.msg || result.error_description || result.error || 'No se pudo enviar la invitacion.' });
  } else {
    const emailResponse = await sendMagicLink(email, inviteLink);
    if (!emailResponse.ok) {
      const result = await emailResponse.json().catch(() => ({}));
      return res.status(emailResponse.status).json({ error: result.msg || result.error_description || result.error || 'No se pudo enviar el email.' });
    }
  }
  return res.status(200).json({ ok: true, invitationId: invitation.id, existingUser: Boolean(existingUser?.id) });
}

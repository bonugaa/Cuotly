const SUPABASE_URL = cleanUrl(process.env.SUPABASE_URL || '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function cleanUrl(value) { return String(value || '').trim().replace(/\/+$/, '').replace(/\/(?:rest|auth|storage|realtime)\/v1(?:\/.*)?$/i, ''); }
function headers(extra = {}) { return { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}`, ...extra }; }
function bodyOf(req) { if (typeof req.body !== 'string') return req.body || {}; try { return JSON.parse(req.body || '{}'); } catch { return {}; } }
function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function memberId(workspaceId, count) { return `member_${String(workspaceId).slice(0, 8)}_${count + 1}`; }

async function callerOf(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_ROLE_KEY, authorization } });
  if (!response.ok) return null;
  const user = await response.json();
  try { user.aal = JSON.parse(Buffer.from(authorization.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')).aal || 'aal1'; } catch { user.aal = 'aal1'; }
  return user;
}
async function rest(path, options = {}) { const { headers: extra = {}, ...restOptions } = options; return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...restOptions, headers: headers(extra) }); }
async function memberships(userId) {
  const response = await rest(`cuotly_members?user_id=eq.${encodeURIComponent(userId)}&active=is.true&deleted_at=is.null&select=workspace_id,role,workspace:cuotly_workspaces!inner(id,name)&order=created_at.asc`);
  const rows = response.ok ? await response.json() : [];
  return rows.map(row => ({ id: row.workspace_id, name: row.workspace?.name || 'Mi espacio', role: row.role }));
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Falta configurar Supabase en Vercel.' });
  const caller = await callerOf(req);
  if (!caller?.id) return res.status(401).json({ error: 'No autorizado' });
  if (caller.aal !== 'aal2') return res.status(403).json({ error: 'Verifica el segundo factor antes de responder una invitacion.' });
  const body = bodyOf(req);
  const invitationId = String(req.query?.inviteId || body.inviteId || '');
  if (!invitationId) return res.status(400).json({ error: 'Falta la invitacion.' });

  const response = await rest(`cuotly_invitations?id=eq.${encodeURIComponent(invitationId)}&select=*,workspace:cuotly_workspaces!inner(id,name,state)`);
  const rows = response.ok ? await response.json().catch(() => []) : [];
  const invitation = rows[0];
  if (!invitation || String(invitation.email).toLowerCase() !== String(caller.email).toLowerCase()) return res.status(404).json({ error: 'No encontramos esta invitacion para tu cuenta.' });
  if (new Date(invitation.created_at).getTime() + 30 * 86400000 <= Date.now()) return res.status(410).json({ error: 'Esta invitacion ha caducado.' });
  if (req.method === 'GET') return res.status(200).json({ ok: true, invitation: { id: invitation.id, workspaceName: invitation.workspace?.name || 'Espacio', role: invitation.role, status: invitation.status || (invitation.accepted_at ? 'accepted' : 'pending') } });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido.' });
  const answer = body.answer === 'reject' ? 'reject' : 'accept';
  if ((invitation.status || 'pending') !== 'pending') return res.status(409).json({ error: 'Esta invitacion ya fue respondida.' });
  if (answer === 'reject') {
    await rest(`cuotly_invitations?id=eq.${encodeURIComponent(invitation.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'rejected', responded_at: new Date().toISOString(), rejected_at: new Date().toISOString(), accepted_by: caller.id }) });
    return res.status(200).json({ ok: true, answer: 'reject', workspaces: await memberships(caller.id) });
  }
  const state = clone(invitation.workspace?.state || {});
  state.members ||= [];
  const metadata = caller.user_metadata || {};
  const name = metadata.full_name || metadata.name || caller.email.split('@')[0];
  let member = state.members.find(item => String(item.email || '').toLowerCase() === String(caller.email).toLowerCase());
  if (!member) {
    member = { id: memberId(invitation.workspace_id, state.members.length), name, email: caller.email, role: invitation.role, active: true, restaurantIds: [], joinedAt: new Date().toISOString() };
    state.members.push(member);
  } else Object.assign(member, { name, email: caller.email, role: invitation.role, active: true, removedAt: '', deletedAt: '' });
  const memberUpsert = await rest('cuotly_members?on_conflict=workspace_id,email', { method: 'POST', headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ workspace_id: invitation.workspace_id, user_id: caller.id, email: caller.email.toLowerCase(), name, role: invitation.role, active: true, removed_at: null, deleted_at: null, rejoin_after: null }) });
  if (!memberUpsert.ok) return res.status(400).json({ error: 'No se pudo unir la cuenta al espacio.' });
  const save = await rest(`cuotly_workspaces?id=eq.${encodeURIComponent(invitation.workspace_id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state, updated_at: new Date().toISOString() }) });
  if (!save.ok) return res.status(400).json({ error: 'No se pudo preparar el espacio.' });
  await rest(`cuotly_invitations?id=eq.${encodeURIComponent(invitation.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'accepted', accepted_at: new Date().toISOString(), responded_at: new Date().toISOString(), accepted_by: caller.id }) });
  return res.status(200).json({ ok: true, answer: 'accept', workspaceId: invitation.workspace_id, workspaces: await memberships(caller.id) });
}

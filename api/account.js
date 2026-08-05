const SUPABASE_URL = cleanUrl(process.env.SUPABASE_URL || '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function cleanUrl(value) { return String(value || '').trim().replace(/\/+$/, '').replace(/\/(?:rest|auth|storage|realtime)\/v1(?:\/.*)?$/i, ''); }
function headers(extra = {}) { return { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}`, ...extra }; }
function bodyOf(req) { if (typeof req.body !== 'string') return req.body || {}; try { return JSON.parse(req.body || '{}'); } catch { return {}; } }
function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
async function rest(path, options = {}) { const { headers: extra = {}, ...restOptions } = options; return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...restOptions, headers: headers(extra) }); }
async function callerOf(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_ROLE_KEY, authorization } });
  if (!response.ok) return null;
  const user = await response.json();
  try { user.aal = JSON.parse(Buffer.from(authorization.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')).aal || 'aal1'; } catch { user.aal = 'aal1'; }
  return user;
}
async function adminUpdate(userId, attributes) { return fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: 'PUT', headers: headers({ 'content-type': 'application/json' }), body: JSON.stringify(attributes) }); }
async function syncMemberNames(user, profile) {
  const rowsResponse = await rest(`cuotly_members?user_id=eq.${encodeURIComponent(user.id)}&select=workspace_id,email,role,active,name,workspace:cuotly_workspaces!inner(id,state)`);
  const rows = rowsResponse.ok ? await rowsResponse.json().catch(() => []) : [];
  for (const row of rows) {
    await rest(`cuotly_members?workspace_id=eq.${encodeURIComponent(row.workspace_id)}&email=ilike.${encodeURIComponent(row.email)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: profile.full_name }) });
    const state = clone(row.workspace?.state || {});
    const member = (state.members || []).find(item => String(item.email || '').toLowerCase() === String(row.email || '').toLowerCase());
    if (member) {
      member.name = profile.full_name;
      member.avatarUrl = profile.avatar_url || '';
      await rest(`cuotly_workspaces?id=eq.${encodeURIComponent(row.workspace_id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state, updated_at: new Date().toISOString() }) });
    }
  }
}
async function anonymiseAccount(user) {
  const rowsResponse = await rest(`cuotly_members?user_id=eq.${encodeURIComponent(user.id)}&select=workspace_id,email,role,workspace:cuotly_workspaces!inner(id,owner_id,state)`);
  const rows = rowsResponse.ok ? await rowsResponse.json().catch(() => []) : [];
  const owned = rows.filter(row => row.workspace?.owner_id === user.id).map(row => row.workspace_id);
  const shared = rows.filter(row => row.workspace?.owner_id !== user.id);
  for (const row of shared) {
    const state = clone(row.workspace?.state || {});
    const member = (state.members || []).find(item => String(item.email || '').toLowerCase() === String(row.email || '').toLowerCase());
    if (member) { member.active = false; member.name = 'Cuenta eliminada'; member.avatarUrl = ''; member.accountDeletedAt = new Date().toISOString(); }
    (state.tasks || []).forEach(task => {
      if (task.assignedTo === member?.id) { task.assignedTo = ''; task.assignedName = 'Cuenta eliminada'; }
      if (task.createdBy === member?.id) { task.createdBy = ''; task.createdByName = 'Cuenta eliminada'; }
    });
    await rest(`cuotly_workspaces?id=eq.${encodeURIComponent(row.workspace_id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state, updated_at: new Date().toISOString() }) });
    await rest(`cuotly_members?workspace_id=eq.${encodeURIComponent(row.workspace_id)}&email=ilike.${encodeURIComponent(row.email)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ active: false, user_id: null, name: 'Cuenta eliminada', removed_at: new Date().toISOString(), deleted_at: new Date().toISOString() }) });
  }
  for (const workspaceId of owned) await rest(`cuotly_workspaces?id=eq.${encodeURIComponent(workspaceId)}&owner_id=eq.${encodeURIComponent(user.id)}`, { method: 'DELETE' });

  const clientRowsResponse = await rest(`cuotly_client_members?user_id=eq.${encodeURIComponent(user.id)}&select=id,portal_id,email,role,portal:cuotly_client_portals(id,workspace_id,restaurant_id,state)`);
  const clientRows = clientRowsResponse.ok ? await clientRowsResponse.json().catch(() => []) : [];
  const deletedAt = new Date().toISOString();
  for (const row of clientRows) {
    await rest(`cuotly_client_members?id=eq.${encodeURIComponent(row.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ active: false, user_id: null, name: 'Cuenta eliminada', removed_at: deletedAt }) });
  }
  if (user.email) await rest(`cuotly_client_invitations?email=ilike.${encodeURIComponent(user.email)}&status=eq.pending`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'cancelled', responded_at: deletedAt }) });
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Falta configurar Supabase en Vercel.' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido.' });
  const caller = await callerOf(req);
  if (!caller?.id) return res.status(401).json({ error: 'No autorizado' });
  if (caller.aal !== 'aal2') return res.status(403).json({ error: 'Verifica el segundo factor antes de continuar.' });
  const body = bodyOf(req);
  if (body.action === 'profile') {
    const current = caller.user_metadata || {};
    const profile = {
      ...current,
      full_name: String(body.profile?.full_name || current.full_name || current.name || caller.email?.split('@')[0] || '').trim().slice(0, 80),
      name: String(body.profile?.full_name || current.full_name || current.name || caller.email?.split('@')[0] || '').trim().slice(0, 80),
      phone: String(body.profile?.phone || '').trim().slice(0, 40),
      job_title: String(body.profile?.job_title || '').trim().slice(0, 80),
      bio: String(body.profile?.bio || '').trim().slice(0, 280),
      avatar_url: String(body.profile?.avatar_url || '').trim().slice(0, 1000),
      notification_preferences: body.profile?.notification_preferences || current.notification_preferences || {},
      account_completed: true,
    };
    if (!profile.full_name) return res.status(400).json({ error: 'El nombre es obligatorio.' });
    const update = await adminUpdate(caller.id, { user_metadata: profile });
    if (!update.ok) return res.status(400).json({ error: 'No se pudo actualizar el perfil.' });
    await syncMemberNames(caller, profile);
    return res.status(200).json({ ok: true, profile });
  }
  if (body.action === 'delete-account') {
    if (body.confirmation !== 'ELIMINAR') return res.status(400).json({ error: 'Escribe ELIMINAR para confirmar.' });
    await anonymiseAccount(caller);
    const removed = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(caller.id)}`, { method: 'DELETE', headers: headers() });
    if (!removed.ok) return res.status(400).json({ error: 'No se pudo eliminar la cuenta.' });
    return res.status(200).json({ ok: true });
  }
  return res.status(400).json({ error: 'Accion no valida.' });
}

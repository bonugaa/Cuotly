const SUPABASE_URL = cleanUrl(process.env.SUPABASE_URL || '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const MAX_REJOIN_REQUESTS_PER_MONTH = 3;

function cleanUrl(value) { return String(value || '').trim().replace(/\/+$/, '').replace(/\/(?:rest|auth|storage|realtime)\/v1(?:\/.*)?$/i, ''); }
function headers(extra = {}) { return { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}`, ...extra }; }
function bodyOf(req) { if (typeof req.body !== 'string') return req.body || {}; try { return JSON.parse(req.body || '{}'); } catch { return {}; } }
function cleanEmail(value) { return String(value || '').trim().toLowerCase(); }
function cleanText(value, max = 500) { return String(value || '').trim().slice(0, max); }
function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function iso(value = new Date()) { return new Date(value).toISOString(); }
function monthStart() { const now = new Date(); return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); }
function monthEnd() { const start = monthStart(); start.setUTCMonth(start.getUTCMonth() + 1); return start; }
function roleLabel(role) { return ({ owner: 'Propietario', admin: 'Administrador', worker: 'Trabajador', editor: 'Puede editar', viewer: 'Solo consultar' }[role] || role || 'Miembro'); }

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
function workspaceRestaurant(workspace, restaurantId) { return (workspace?.state?.restaurants || []).find(item => item.id === restaurantId) || null; }
function internalMember(workspace, email) { return (workspace?.state?.members || []).find(item => cleanEmail(item.email) === cleanEmail(email)); }
function uniqueBy(rowsList, key) { const seen = new Set(); return rowsList.filter(item => { const value = item?.[key]; if (!value || seen.has(value)) return false; seen.add(value); return true; }); }
function maintenanceItem(row, kind = 'maintenance') {
  const workspace = row.workspace || {};
  return { kind, id: row.workspace_id, name: workspace.name || 'Espacio de mantenimiento', role: row.role, roleLabel: roleLabel(row.role), status: row.active === false ? 'inactive' : 'active', active: row.active !== false, joinedAt: row.created_at, leftAt: row.removed_at || '', deletedAt: row.deleted_at || '', rejoinAfter: row.rejoin_after || '', ownerId: workspace.owner_id || '', workspaceId: row.workspace_id, email: row.email || '' };
}
function restaurantItem(row) {
  const portal = row.portal || {};
  const workspace = portal.workspace || {};
  const restaurant = workspaceRestaurant(workspace, portal.restaurant_id);
  return { kind: 'restaurant', id: portal.id, name: restaurant?.name || 'Restaurante', role: row.role, roleLabel: roleLabel(row.role), status: row.active === false || portal.status !== 'active' ? 'inactive' : 'active', active: row.active !== false && portal.status === 'active', joinedAt: row.created_at, leftAt: row.removed_at || '', deletedAt: portal.status === 'deleted' ? portal.updated_at || '' : '', rejoinAfter: '', ownerId: workspace.owner_id || '', workspaceId: portal.workspace_id, portalId: portal.id, restaurantId: portal.restaurant_id, email: row.email || '' };
}
async function fetchMemberships(caller) {
  const email = encodeURIComponent(cleanEmail(caller.email));
  const activeMaintenance = await rows(`cuotly_members?user_id=eq.${encodeURIComponent(caller.id)}&active=is.true&deleted_at=is.null&select=workspace_id,email,name,role,active,created_at,removed_at,deleted_at,rejoin_after,workspace:cuotly_workspaces!inner(id,name,owner_id,state,updated_at)&order=created_at.asc`);
  const oldMaintenance = await rows(`cuotly_members?email=ilike.${email}&active=is.false&select=workspace_id,email,name,role,active,created_at,removed_at,deleted_at,rejoin_after,workspace:cuotly_workspaces(id,name,owner_id,state,updated_at)&order=removed_at.desc`);
  const activeRestaurants = await rows(`cuotly_client_members?user_id=eq.${encodeURIComponent(caller.id)}&active=is.true&select=id,portal_id,email,role,active,created_at,removed_at,portal:cuotly_client_portals(id,workspace_id,restaurant_id,status,updated_at,workspace:cuotly_workspaces(id,name,owner_id,state,updated_at))&order=created_at.asc`);
  const oldRestaurants = await rows(`cuotly_client_members?email=ilike.${email}&active=is.false&select=id,portal_id,email,role,active,created_at,removed_at,portal:cuotly_client_portals(id,workspace_id,restaurant_id,status,updated_at,workspace:cuotly_workspaces(id,name,owner_id,state,updated_at))&order=removed_at.desc`);
  return { activeMaintenance, oldMaintenance, activeRestaurants, oldRestaurants };
}
async function pendingInvitations(caller) {
  const email = encodeURIComponent(cleanEmail(caller.email));
  const maintenance = await rows(`cuotly_invitations?email=ilike.${email}&status=eq.pending&select=id,email,role,created_at,workspace:cuotly_workspaces(id,name,owner_id)&order=created_at.desc`).catch(() => []);
  const restaurants = await rows(`cuotly_client_invitations?email=ilike.${email}&status=eq.pending&select=id,email,role,created_at,portal:cuotly_client_portals(id,workspace_id,restaurant_id,status,workspace:cuotly_workspaces(id,name,owner_id,state))&order=created_at.desc`).catch(() => []);
  const expiresAt = value => new Date(new Date(value).getTime() + 30 * 86400000);
  return {
    maintenance: maintenance.filter(item => expiresAt(item.created_at) > new Date()).map(item => ({ id: item.id, kind: 'maintenance', targetId: item.workspace?.id, targetName: item.workspace?.name || 'Espacio', role: item.role, roleLabel: roleLabel(item.role), createdAt: item.created_at, expiresAt: expiresAt(item.created_at).toISOString() })),
    restaurants: restaurants.filter(item => item.portal?.status === 'active' && expiresAt(item.created_at) > new Date()).map(item => ({ id: item.id, kind: 'restaurant', targetId: item.portal?.id, targetName: workspaceRestaurant(item.portal?.workspace, item.portal?.restaurant_id)?.name || 'Restaurante', role: item.role, roleLabel: roleLabel(item.role), createdAt: item.created_at, expiresAt: expiresAt(item.created_at).toISOString() })),
  };
}
async function rejoinUsage(caller) {
  const start = encodeURIComponent(monthStart().toISOString());
  const end = encodeURIComponent(monthEnd().toISOString());
  const requestRows = await rows(`cuotly_access_rejoin_requests?user_id=eq.${encodeURIComponent(caller.id)}&created_at=gte.${start}&created_at=lt.${end}&select=id,status,kind,target_id,created_at&order=created_at.desc`).catch(() => []);
  return { used: requestRows.length, limit: MAX_REJOIN_REQUESTS_PER_MONTH, remaining: Math.max(0, MAX_REJOIN_REQUESTS_PER_MONTH - requestRows.length), requests: requestRows };
}
async function storedHistory(caller) {
  return rows(`cuotly_access_history?user_id=eq.${encodeURIComponent(caller.id)}&select=*&order=occurred_at.desc`).catch(() => []);
}
async function accountOverview(caller) {
  const membershipData = await fetchMemberships(caller);
  const invitations = await pendingInvitations(caller);
  const usage = await rejoinUsage(caller);
  const accessEvents = await storedHistory(caller);
  const maintenance = uniqueBy(membershipData.activeMaintenance.map(row => maintenanceItem(row)), 'id');
  const oldMaintenance = uniqueBy(membershipData.oldMaintenance.map(row => maintenanceItem(row)), 'id');
  const restaurantRows = uniqueBy(membershipData.activeRestaurants.map(row => restaurantItem(row)), 'id');
  const restaurants = restaurantRows.filter(item => item.active);
  const inactiveRestaurants = restaurantRows.filter(item => !item.active);
  const oldRestaurants = uniqueBy([...membershipData.oldRestaurants.map(row => restaurantItem(row)), ...inactiveRestaurants], 'id');
  const now = Date.now();
  const historyMap = new Map([...oldMaintenance, ...oldRestaurants].map(item => [`${item.kind}:${item.id}`, item]));
  accessEvents.forEach(event => {
    const key = `${event.kind}:${event.target_id}`;
    const current = historyMap.get(key) || { kind: event.kind, id: event.target_id, name: event.target_name || 'Acceso', role: event.role, roleLabel: roleLabel(event.role), active: false, status: 'inactive', leftAt: '', rejoinAfter: '', ownerId: '', workspaceId: event.kind === 'maintenance' ? event.target_id : '', portalId: event.kind === 'restaurant' ? event.target_id : '' };
    historyMap.set(key, { ...current, name: current.name || event.target_name || 'Acceso', role: current.role || event.role, roleLabel: current.roleLabel || roleLabel(event.role), leftAt: current.leftAt || event.occurred_at });
  });
  const history = [...historyMap.values()].filter(item => !((item.kind === 'maintenance' ? maintenance : restaurants).some(active => active.id === item.id))).map(item => ({ ...item, canRequestRejoin: item.kind === 'restaurant' ? true : (!item.rejoinAfter || new Date(item.rejoinAfter).getTime() <= now) }));
  const ownerWorkspaceIds = maintenance.filter(item => item.ownerId === caller.id).map(item => item.workspaceId);
  const ownedWorkspaces = await rows(`cuotly_workspaces?owner_id=eq.${encodeURIComponent(caller.id)}&select=id,name,owner_id,state&order=created_at.asc`).catch(() => []);
  const ownerIds = new Set([...ownerWorkspaceIds, ...ownedWorkspaces.map(item => item.id)]);
  const ownedRestaurantRows = await rows(`cuotly_client_members?user_id=eq.${encodeURIComponent(caller.id)}&role=eq.owner&active=is.true&select=portal_id,portal:cuotly_client_portals(id,workspace_id,restaurant_id,status,workspace:cuotly_workspaces(id,state))`).catch(() => []);
  const ownedPortalIds = new Set(ownedRestaurantRows.filter(item => item.portal?.status === 'active').map(item => item.portal_id));
  const ownedRestaurantNames = new Map(ownedRestaurantRows.map(item => [item.portal_id, workspaceRestaurant(item.portal?.workspace, item.portal?.restaurant_id)?.name || 'Restaurante']));
  const pendingRejoins = await rows('cuotly_access_rejoin_requests?status=eq.pending&select=id,user_id,email,display_name,kind,target_id,role,reason,created_at&order=created_at.asc').catch(() => []);
  const manageableRejoins = pendingRejoins.filter(item => item.kind === 'maintenance' ? ownerIds.has(item.target_id) : ownedPortalIds.has(item.target_id)).map(item => ({ ...item, roleLabel: roleLabel(item.role), targetName: item.kind === 'maintenance' ? (ownedWorkspaces.find(workspace => workspace.id === item.target_id)?.name || 'Espacio') : (ownedRestaurantNames.get(item.target_id) || 'Restaurante') }));
  const activeAccess = [...maintenance, ...restaurants].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return { account: { id: caller.id, email: caller.email || '', name: caller.user_metadata?.full_name || caller.user_metadata?.name || '' }, maintenance, restaurants, history, invitations, rejoinUsage: usage, pendingRejoins: manageableRejoins, activeAccess };
}
async function recordHistory(payload) {
  await rows('cuotly_access_history', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
}
async function leaveMaintenance(caller, workspaceId) {
  const memberships = await rows(`cuotly_members?workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(caller.id)}&active=is.true&select=workspace_id,email,name,role,created_at`);
  const membership = memberships[0];
  if (!membership) throw new Error('No tienes acceso activo a ese espacio.');
  const owner = await rows(`cuotly_workspaces?id=eq.${encodeURIComponent(workspaceId)}&owner_id=eq.${encodeURIComponent(caller.id)}&select=id`).catch(() => []);
  if (owner.length || membership.role === 'owner') throw new Error('El propietario no puede abandonar su propio espacio. Elimina el espacio o transfiere la gestión primero.');
  const leftAt = iso();
  const response = await rest(`cuotly_members?workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(caller.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json', prefer: 'return=minimal' }, body: JSON.stringify({ active: false, user_id: null, removed_at: leftAt }) });
  if (!response.ok) throw new Error(await response.text());
  const workspaces = await rows(`cuotly_workspaces?id=eq.${encodeURIComponent(workspaceId)}&select=id,name,owner_id,state`);
  const workspace = workspaces[0];
  if (workspace) {
    const state = clone(workspace.state || {});
    const member = internalMember(workspace, caller.email);
    if (member) { member.active = false; member.leftAt = leftAt; }
    state.services = (state.services || []).map(service => { const ids = (Array.isArray(service.assignedMemberIds) ? service.assignedMemberIds : (service.assignedTo ? [service.assignedTo] : [])).filter(id => id !== member?.id); return { ...service, assignedMemberIds: ids, assignedTo: ids[0] || '' }; });
    await rest(`cuotly_workspaces?id=eq.${encodeURIComponent(workspaceId)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state, updated_at: leftAt }) });
  }
  await recordHistory({ user_id: caller.id, email: caller.email, display_name: caller.user_metadata?.full_name || caller.email, kind: 'maintenance', target_id: workspaceId, target_name: workspace?.name || 'Espacio', role: membership.role, event: 'left', occurred_at: leftAt });
}
async function leaveRestaurant(caller, portalId) {
  const memberships = await rows(`cuotly_client_members?portal_id=eq.${encodeURIComponent(portalId)}&user_id=eq.${encodeURIComponent(caller.id)}&active=is.true&select=id,portal_id,email,role,created_at,portal:cuotly_client_portals(id,restaurant_id,workspace_id,status,workspace:cuotly_workspaces(id,name,owner_id,state))`);
  const membership = memberships[0];
  if (!membership || membership.portal?.status !== 'active') throw new Error('No tienes acceso activo a ese restaurante.');
  const restaurant = workspaceRestaurant(membership.portal.workspace, membership.portal.restaurant_id);
  if (membership.role === 'owner') {
    const ownerRows = await rows(`cuotly_client_members?portal_id=eq.${encodeURIComponent(portalId)}&role=eq.owner&active=is.true&select=id`).catch(() => []);
    if (ownerRows.length <= 1) throw new Error('No puedes abandonar el restaurante porque eres el Ãºnico propietario. AÃ±ade otro propietario antes de salir.');
  }
  const leftAt = iso();
  const response = await rest(`cuotly_client_members?id=eq.${encodeURIComponent(membership.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json', prefer: 'return=minimal' }, body: JSON.stringify({ active: false, removed_at: leftAt }) });
  if (!response.ok) throw new Error(await response.text());
  await recordHistory({ user_id: caller.id, email: caller.email, display_name: caller.user_metadata?.full_name || caller.email, kind: 'restaurant', target_id: portalId, target_name: restaurant?.name || 'Restaurante', role: membership.role, event: 'left', occurred_at: leftAt });
}
async function requestRejoin(caller, body) {
  const usage = await rejoinUsage(caller);
  if (usage.remaining <= 0) throw new Error('Has alcanzado el límite de 3 solicitudes de acceso este mes.');
  const kind = body.kind === 'restaurant' ? 'restaurant' : 'maintenance';
  const targetId = cleanText(body.targetId, 100);
  if (!targetId) throw new Error('Falta el acceso que quieres recuperar.');
  const email = encodeURIComponent(cleanEmail(caller.email));
  const previous = kind === 'restaurant'
    ? await rows(`cuotly_client_members?portal_id=eq.${encodeURIComponent(targetId)}&email=ilike.${email}&active=is.false&select=id`).catch(() => [])
    : await rows(`cuotly_members?workspace_id=eq.${encodeURIComponent(targetId)}&email=ilike.${email}&active=is.false&select=id`).catch(() => []);
  const historical = await rows(`cuotly_access_history?user_id=eq.${encodeURIComponent(caller.id)}&kind=eq.${kind}&target_id=eq.${encodeURIComponent(targetId)}&select=id&limit=1`).catch(() => []);
  if (!previous.length && !historical.length) throw new Error('No encontramos un acceso anterior para esta cuenta.');
  const existing = await rows(`cuotly_access_rejoin_requests?user_id=eq.${encodeURIComponent(caller.id)}&kind=eq.${kind}&target_id=eq.${encodeURIComponent(targetId)}&status=eq.pending&select=id`).catch(() => []);
  if (existing.length) throw new Error('Ya tienes una solicitud pendiente para este acceso.');
  const item = (await rows('cuotly_access_rejoin_requests', { method: 'POST', headers: { 'content-type': 'application/json', prefer: 'return=representation' }, body: JSON.stringify({ user_id: caller.id, email: caller.email, display_name: caller.user_metadata?.full_name || caller.email, kind, target_id: targetId, role: cleanText(body.role, 30), reason: cleanText(body.reason, 600) }) }))[0];
  return { ...item, remaining: usage.remaining - 1 };
}
async function reviewRejoin(caller, body) {
  const requestRows = await rows(`cuotly_access_rejoin_requests?id=eq.${encodeURIComponent(body.requestId)}&status=eq.pending&select=*`);
  const request = requestRows[0];
  if (!request) throw new Error('La solicitud ya no está pendiente.');
  let workspaceId = request.kind === 'maintenance' ? request.target_id : '';
  let restaurantOwner = false;
  if (request.kind === 'restaurant') {
    const portals = await rows(`cuotly_client_portals?id=eq.${encodeURIComponent(request.target_id)}&select=id,workspace_id,status`);
    if (portals[0]?.status !== 'active') throw new Error('Este panel de restaurante ya no estÃ¡ activo.');
    workspaceId = portals[0]?.workspace_id || '';
    const ownerRows = await rows(`cuotly_client_members?portal_id=eq.${encodeURIComponent(request.target_id)}&user_id=eq.${encodeURIComponent(caller.id)}&role=eq.owner&active=is.true&select=id`).catch(() => []);
    restaurantOwner = ownerRows.length > 0;
  }
  const owned = await rows(`cuotly_workspaces?id=eq.${encodeURIComponent(workspaceId)}&owner_id=eq.${encodeURIComponent(caller.id)}&select=id`);
  if (!owned.length && !restaurantOwner) throw new Error('Solo el propietario del espacio o del restaurante puede responder.');
  const approve = body.answer === 'approve';
  if (approve && request.kind === 'maintenance') {
    await rest(`cuotly_members?workspace_id=eq.${encodeURIComponent(workspaceId)}&email=ilike.${encodeURIComponent(cleanEmail(request.email))}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user_id: request.user_id, active: true, removed_at: null, deleted_at: null, rejoin_after: null }) });
    const workspace = (await rows(`cuotly_workspaces?id=eq.${encodeURIComponent(workspaceId)}&select=id,state`))[0];
    if (workspace) { const state = clone(workspace.state || {}); const member = internalMember(workspace, request.email); if (member) { member.active = true; member.leftAt = ''; } await rest(`cuotly_workspaces?id=eq.${encodeURIComponent(workspaceId)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state, updated_at: iso() }) }); }
  }
  if (approve && request.kind === 'restaurant') await rest(`cuotly_client_members?portal_id=eq.${encodeURIComponent(request.target_id)}&email=ilike.${encodeURIComponent(cleanEmail(request.email))}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user_id: request.user_id, active: true, removed_at: null }) });
  await rest(`cuotly_access_rejoin_requests?id=eq.${encodeURIComponent(request.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: approve ? 'approved' : 'rejected', handled_by: caller.id, handled_at: iso() }) });
  return { ok: true, status: approve ? 'approved' : 'rejected' };
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Vercel.' });
  const caller = await callerOf(req);
  if (!caller?.id) return res.status(401).json({ error: 'No autorizado.' });
  if (caller.aal !== 'aal2') return res.status(403).json({ error: 'Verifica el segundo factor antes de continuar.' });
  try {
    const body = bodyOf(req);
    if (req.method === 'GET') return res.status(200).json({ ok: true, ...(await accountOverview(caller)) });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido.' });
    if (body.action === 'leave-maintenance') await leaveMaintenance(caller, body.targetId);
    else if (body.action === 'leave-restaurant') await leaveRestaurant(caller, body.targetId);
    else if (body.action === 'request-rejoin') return res.status(201).json({ ok: true, request: await requestRejoin(caller, body) });
    else if (body.action === 'review-rejoin') return res.status(200).json(await reviewRejoin(caller, body));
    else return res.status(400).json({ error: 'Accion no valida.' });
    return res.status(200).json({ ok: true, ...(await accountOverview(caller)) });
  } catch (error) { return res.status(400).json({ error: error.message || 'No se pudo completar la accion.' }); }
}

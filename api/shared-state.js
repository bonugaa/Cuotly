const SUPABASE_URL = cleanUrl(process.env.SUPABASE_URL || '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function cleanUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '').replace(/\/(?:rest|auth|storage|realtime)\/v1(?:\/.*)?$/i, '');
}

function headers(extra = {}) {
  return { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}`, ...extra };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function isoDate(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10);
}

function addDaysToIso(value, days) {
  const result = new Date(`${String(value).slice(0, 10)}T12:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + Math.max(0, Number(days || 0)));
  return isoDate(result);
}

function pausedDays(startedAt) {
  const start = new Date(`${String(startedAt).slice(0, 10)}T12:00:00.000Z`);
  const today = new Date(`${isoDate()}T12:00:00.000Z`);
  return Math.max(0, Math.floor((today - start) / 86400000));
}

function readBody(req) {
  if (typeof req.body !== 'string') return req.body || {};
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

function stateMember(state, email) {
  return (state?.members || []).find(member => String(member.email || '').toLowerCase() === String(email || '').toLowerCase());
}

function serviceMemberIds(service) {
  const ids = Array.isArray(service?.assignedMemberIds) ? service.assignedMemberIds : (service?.assignedTo ? [service.assignedTo] : []);
  return [...new Set(ids.filter(Boolean))];
}

function hasServiceMember(service, memberId) {
  return serviceMemberIds(service).includes(memberId);
}

function memberRole(row) {
  return row?.role || 'worker';
}

function isOwner(row) {
  return memberRole(row) === 'owner';
}

function isManager(row) {
  return ['owner', 'admin'].includes(memberRole(row));
}

const BASE_PLAN_CODES = new Set(['presencia', 'impulso', 'premium']);
const PLAN_PRICES = { presencia: 119, impulso: 199, premium: 399 };
const PLAN_RANK = { presencia: 0, impulso: 1, premium: 2 };
const QUOTA_TASK_TYPES = new Set(['small', 'medium', 'large', 'photos', 'external_incident', 'menu_update']);

async function reply(res, status, body) {
  res.status(status).json(body);
}

async function getCaller(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_ROLE_KEY, authorization } });
  return response.ok ? response.json() : null;
}

async function rest(path, options = {}) {
  const { headers: requestHeaders = {}, ...request } = options;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...request, headers: headers(requestHeaders) });
}

async function getLegacyState(userId) {
  const response = await rest(`cuotly_user_states?user_id=eq.${encodeURIComponent(userId)}&select=state`);
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []);
  return rows?.[0]?.state || null;
}

async function createWorkspace(owner, state, requestedName = '') {
  // Names only need content: one word, one letter, or several words are all valid.
  const cleanName = value => String(value || '').trim().replace(/\s+/g, ' ');
  const name = cleanName(requestedName) || cleanName(state?.settings?.workspaceName) || 'Mi espacio';
  const response = await rest('cuotly_workspaces', {
    method: 'POST',
    headers: { 'content-type': 'application/json', prefer: 'return=representation' },
    body: JSON.stringify({ owner_id: owner.id, name, state: state || {}, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  const workspace = rows[0];
  const safeState = clone(state);
  safeState.ownerUserId = owner.id;
  safeState.settings ||= {};
  safeState.settings.workspaceName = name;
  safeState.members ||= [];
  let ownerMember = stateMember(safeState, owner.email);
  if (!ownerMember) {
    ownerMember = { id: `owner_${owner.id.slice(0, 8)}`, name: owner.user_metadata?.full_name || owner.user_metadata?.name || owner.email, email: owner.email, role: 'owner', active: true, restaurantIds: [] };
    safeState.members.push(ownerMember);
  }
  ownerMember.name ||= owner.user_metadata?.full_name || owner.user_metadata?.name || owner.email;
  ownerMember.email = owner.email;
  ownerMember.role = 'owner';
  ownerMember.active = true;
  safeState.currentUserId = ownerMember.id;
  await upsertWorkspaceState(workspace.id, safeState);
  await upsertMember(workspace.id, ownerMember, owner.id);
  return { ...workspace, state: safeState };
}

async function upsertWorkspaceState(workspaceId, state) {
  const response = await rest(`cuotly_workspaces?id=eq.${encodeURIComponent(workspaceId)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify({ state, name: state?.settings?.workspaceName || 'Cuotly', updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(await response.text());
}

async function upsertMember(workspaceId, member, userId = undefined) {
  const payload = {
    workspace_id: workspaceId,
    email: String(member.email || '').toLowerCase(),
    name: member.name || member.email || 'Miembro',
    role: member.role === 'owner' ? 'owner' : member.role === 'admin' ? 'admin' : 'worker',
    active: member.active !== false,
    removed_at: member.active === false ? (member.removedAt || new Date().toISOString()) : null,
    deleted_at: null,
    rejoin_after: null,
  };
  if (userId) payload.user_id = userId;
  const response = await rest('cuotly_members?on_conflict=workspace_id,email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text());
}

async function claimEmailMemberships(caller) {
  const email = String(caller.email || '').toLowerCase();
  if (!email) return;
  await rest(`cuotly_members?email=ilike.${encodeURIComponent(email)}&user_id=is.null&active=is.true&deleted_at=is.null`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ user_id: caller.id }),
  });
}

async function membershipsForCaller(caller) {
  await claimEmailMemberships(caller);
  const response = await rest(`cuotly_members?user_id=eq.${encodeURIComponent(caller.id)}&active=is.true&deleted_at=is.null&select=workspace_id,email,name,role,workspace:cuotly_workspaces!inner(id,name,owner_id,state,updated_at)&order=created_at.asc`);
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json().catch(() => []);
  return rows.filter(row => row.workspace);
}

async function migrateLegacyWorkspace(caller) {
  const legacy = await getLegacyState(caller.id);
  if (!legacy || !Object.keys(legacy).length) return null;
  return createWorkspace(caller, legacy, legacy?.settings?.workspaceName || 'Cuotly');
}

function workspaceList(rows) {
  return rows.map(row => ({ id: row.workspace_id, name: row.workspace?.name || 'Cuotly', role: row.role }));
}

function ensureCurrentMember(state, caller, membership) {
  const next = clone(state);
  next.members ||= [];
  let member = stateMember(next, caller.email);
  if (!member) {
    member = { id: `member_${membership.workspace_id.slice(0, 8)}_${next.members.length + 1}`, name: membership.name || caller.email, email: caller.email, role: membership.role, active: true, restaurantIds: [] };
    next.members.push(member);
  }
  member.name ||= membership.name || caller.user_metadata?.full_name || caller.email;
  member.email = caller.email;
  member.role = membership.role;
  member.active = true;
  next.currentUserId = member.id;
  next.ownerUserId ||= membership.workspace?.owner_id || '';
  return { state: next, member };
}

function stateForCaller(state, caller, membership) {
  const prepared = ensureCurrentMember(state, caller, membership);
  const copy = prepared.state;
  const member = prepared.member;
  const role = memberRole(membership);
  if (role === 'owner') return copy;
  if (role === 'admin') {
    copy.payments = [];
    copy.members = (copy.members || []).filter(item => item.active !== false);
    return copy;
  }
  const serviceIds = new Set((copy.services || []).filter(service => hasServiceMember(service, member.id) && service.status !== 'cancelled').map(service => service.id));
  const restaurantIds = new Set((copy.services || []).filter(service => serviceIds.has(service.id)).map(service => service.restaurantId));
  copy.services = (copy.services || []).filter(service => serviceIds.has(service.id));
  copy.restaurants = (copy.restaurants || []).filter(restaurant => restaurantIds.has(restaurant.id));
  copy.tasks = (copy.tasks || []).filter(task => serviceIds.has(task.serviceId) && task.assignedTo === member.id);
  copy.payments = [];
  copy.reports = [];
  copy.reminders = (copy.reminders || []).filter(reminder => serviceIds.has(reminder.serviceId));
  copy.members = (copy.members || []).filter(item => item.role === 'owner' || item.id === member.id);
  return copy;
}

function replaceById(base, incoming, ids, predicate) {
  const incomingById = new Map((incoming || []).filter(predicate).map(item => [item.id, item]));
  const output = (base || []).filter(item => !ids.has(item.id) || incomingById.has(item.id));
  incomingById.forEach(item => output.push(item));
  return output;
}

function mergeRestaurantNotes(baseRestaurants, incomingRestaurants, allowedIds, actor = null, isManager = false) {
  const incomingById = new Map((incomingRestaurants || []).filter(item => allowedIds.has(item.id)).map(item => [item.id, item]));
  return (baseRestaurants || []).map(restaurant => {
    const incoming = incomingById.get(restaurant.id);
    if (!incoming) return restaurant;
    const entries = [...(restaurant.noteEntries || [])];
    const known = new Map(entries.map(entry => [entry.id, entry]));
    (incoming.noteEntries || []).forEach(entry => {
      if (!entry?.id) return;
      const existing = known.get(entry.id);
      if (!existing) {
        if (!actor || entry.authorId === actor.id) {
          const created = { ...entry, authorId: actor?.id || entry.authorId, authorName: actor?.name || entry.authorName };
          entries.push(created);
          known.set(created.id, created);
        }
        return;
      }
      if (isManager || (actor && existing.authorId === actor.id)) {
        existing.text = entry.text || existing.text;
        if (entry.updatedAt) existing.updatedAt = entry.updatedAt;
      }
    });
    return { ...restaurant, noteEntries: entries };
  });
}

function mergeOperationalPayments(next, incomingPayments, allowedServiceIds) {
  const allowedKinds = new Set(['plan_change', 'cancellation_fee']);
  const knownIds = new Set((next.payments || []).map(payment => payment.id));
  const additions = (incomingPayments || []).filter(payment => (
    payment?.id
    && allowedKinds.has(payment.kind)
    && allowedServiceIds.has(payment.serviceId)
    && !knownIds.has(payment.id)
  ));
  if (additions.length) next.payments = [...(next.payments || []), ...additions];
}

function mergeAdminState(baseState, incomingState) {
  const next = clone(baseState);
  const baseRestaurants = new Map((next.restaurants || []).map(item => [item.id, item]));
  (incomingState.restaurants || []).forEach(incoming => {
    const existing = baseRestaurants.get(incoming.id);
    if (!existing) return;
    Object.assign(existing, { name: incoming.name, email: incoming.email, phone: incoming.phone, address: incoming.address, city: incoming.city, notes: incoming.notes, status: incoming.status, noteEntries: incoming.noteEntries || existing.noteEntries || [] });
  });
  const allowedRestaurantIds = new Set((next.restaurants || []).map(item => item.id));
  const incomingServices = (incomingState.services || []).filter(service => allowedRestaurantIds.has(service.restaurantId));
  const incomingServiceIds = new Set(incomingServices.map(service => service.id));
  next.services = (next.services || []).filter(service => !incomingServiceIds.has(service.id)).concat(incomingServices);
  const serviceIds = new Set((next.services || []).map(service => service.id));
  const incomingTasks = (incomingState.tasks || []).filter(task => serviceIds.has(task.serviceId));
  // Administrators can manage every task in the workspace, including deletions.
  next.tasks = (next.tasks || []).filter(task => !serviceIds.has(task.serviceId)).concat(incomingTasks);
  const incomingReportIds = new Set((incomingState.reports || []).map(report => report.id));
  next.reports = (next.reports || []).filter(report => !incomingReportIds.has(report.id)).concat((incomingState.reports || []).filter(report => allowedRestaurantIds.has(report.restaurantId)));
  next.reminders = incomingState.reminders || next.reminders || [];
  mergeOperationalPayments(next, incomingState.payments, serviceIds);
  return next;
}

function mergeWorkerState(baseState, incomingState, caller, membership) {
  const prepared = ensureCurrentMember(baseState, caller, membership);
  const next = prepared.state;
  const member = prepared.member;
  const allowedServices = new Set((next.services || []).filter(service => hasServiceMember(service, member.id)).map(service => service.id));
  const allowedRestaurants = new Set((next.services || []).filter(service => allowedServices.has(service.id)).map(service => service.restaurantId));
  next.restaurants = mergeRestaurantNotes(next.restaurants, incomingState.restaurants, allowedRestaurants, member, false);
  const incomingServiceMap = new Map((incomingState.services || []).filter(service => allowedServices.has(service.id)).map(service => [service.id, service]));
  next.services = (next.services || []).map(service => {
    const incoming = incomingServiceMap.get(service.id);
    if (!incoming || service.planCode === 'menu') return service;
    const wantedPlan = BASE_PLAN_CODES.has(incoming.planCode) ? incoming.planCode : service.planCode;
    const requestedPlan = PLAN_RANK[wantedPlan] >= PLAN_RANK[service.planCode] ? wantedPlan : service.planCode;
    const upgraded = requestedPlan !== service.planCode;
    const requestedPending = incoming.pendingPlanChange;
    const pendingPlanChange = requestedPending && BASE_PLAN_CODES.has(requestedPending.planCode)
      ? {
        ...requestedPending,
        planCode: requestedPending.planCode,
        monthlyBase: PLAN_PRICES[requestedPending.planCode],
      }
      : requestedPending === undefined ? service.pendingPlanChange || null : null;
    const resuming = service.status === 'paused' && ['active', 'pending'].includes(incoming.status);
    const pausing = incoming.status === 'paused' && ['active', 'pending'].includes(service.status);
    const status = pausing ? 'paused' : resuming ? incoming.status : service.status;
    const pauseDays = resuming ? pausedDays(service.pausedAt) : 0;
    const pauseHistory = [...(service.pauseHistory || [])];
    if (resuming && service.pausedAt) {
      pauseHistory.push({
        startedAt: isoDate(service.pausedAt),
        endedAt: isoDate(),
        days: pauseDays,
        notes: service.pauseNotes || '',
      });
    }
    return {
      ...service,
      planCode: requestedPlan,
      monthlyBase: PLAN_PRICES[requestedPlan] || service.monthlyBase,
      initialCommitmentMonths: upgraded ? 3 : service.initialCommitmentMonths,
      commitmentStartDate: upgraded ? isoDate() : service.commitmentStartDate,
      pendingPlanChange,
      pausedAt: pausing ? (incoming.pausedAt || service.pausedAt || new Date().toISOString()) : resuming ? '' : service.pausedAt || '',
      pausePlanDays: pausing ? Number(incoming.pausePlanDays || 0) : resuming ? 0 : service.pausePlanDays || 0,
      pauseNotes: pausing ? String(incoming.pauseNotes || '') : resuming ? '' : service.pauseNotes || '',
      pauseHistory,
      cycleEndDate: resuming ? addDaysToIso(service.cycleEndDate, pauseDays) : service.cycleEndDate,
      status,
    };
  });
  const incomingTasks = (incomingState.tasks || []).filter(task => allowedServices.has(task.serviceId) && task.assignedTo === member.id);
  // A worker can only replace their own tasks on assigned services. Replacing this
  // subset lets an intentional deletion persist while preserving everyone else's work.
  next.tasks = (next.tasks || []).filter(task => !(allowedServices.has(task.serviceId) && task.assignedTo === member.id));
  incomingTasks.forEach(task => {
    const service = (next.services || []).find(item => item.id === task.serviceId);
    if (!service) return;
    const existing = (baseState.tasks || []).find(item => item.id === task.id);
    if (existing && existing.assignedTo !== member.id) return;
    const type = String(task.type || existing?.type || 'incident');
    next.tasks.push({
      ...(existing || {}),
      ...task,
      type,
      consumesQuota: QUOTA_TASK_TYPES.has(type),
      restaurantId: service.restaurantId,
      assignedTo: member.id,
      createdBy: existing?.createdBy || member.id,
    });
  });
  mergeOperationalPayments(next, incomingState.payments, allowedServices);
  return next;
}

async function syncMembers(workspaceId, state, caller) {
  for (const member of state.members || []) {
    if (!member.email) continue;
    await upsertMember(workspaceId, member, String(member.email).toLowerCase() === String(caller.email).toLowerCase() ? caller.id : undefined);
  }
}

async function purgeMember(workspace, membership, body) {
  if (!isOwner(membership)) throw new Error('FORBIDDEN');
  const state = clone(workspace.state || {});
  const requestedEmail = String(body.memberEmail || '').trim().toLowerCase();
  const target = (state.members || []).find(member => member.id === body.memberId)
    || (requestedEmail ? (state.members || []).find(member => String(member.email || '').toLowerCase() === requestedEmail) : null);
  const email = String(target?.email || requestedEmail).trim().toLowerCase();
  if (!email || target?.role === 'owner') throw new Error('MEMBER_NOT_FOUND');

  // Membership data is the access source of truth, even if a browser just removed
  // an inactive person from its locally cached workspace state.
  const currentResponse = await rest(`cuotly_members?workspace_id=eq.${encodeURIComponent(workspace.id)}&email=ilike.${encodeURIComponent(email)}&select=email,name,role`);
  if (!currentResponse.ok) throw new Error(await currentResponse.text());
  const currentRows = await currentResponse.json().catch(() => []);
  const current = currentRows[0] || null;
  if (current?.role === 'owner') throw new Error('MEMBER_NOT_FOUND');
  const lockUntil = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
  const removal = { active: false, user_id: null, name: 'Miembro eliminado', removed_at: new Date().toISOString(), deleted_at: new Date().toISOString(), rejoin_after: lockUntil };
  const response = await rest(`cuotly_members?workspace_id=eq.${encodeURIComponent(workspace.id)}&email=ilike.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', prefer: 'return=representation' },
    body: JSON.stringify(removal),
  });
  if (!response.ok) throw new Error(await response.text());
  const removedRows = await response.json().catch(() => []);
  if (!removedRows.length && !current) {
    const createResponse = await rest('cuotly_members?on_conflict=workspace_id,email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ workspace_id: workspace.id, email, role: target?.role === 'admin' ? 'admin' : 'worker', ...removal }),
    });
    if (!createResponse.ok) throw new Error(await createResponse.text());
  }
  state.tasks = (state.tasks || []).map(task => ({
    ...task,
    assignedName: task.assignedTo === body.memberId ? (task.assignedName || target?.name || body.memberName || current?.name || email) : task.assignedName,
    createdByName: task.createdBy === body.memberId ? (task.createdByName || target?.name || body.memberName || current?.name || email) : task.createdByName,
  }));
  state.members = (state.members || []).filter(member => member.id !== body.memberId && String(member.email || '').toLowerCase() !== email);
  state.services = (state.services || []).map(service => {
    const assignedMemberIds = serviceMemberIds(service).filter(id => id !== body.memberId);
    return { ...service, assignedMemberIds, assignedTo: assignedMemberIds[0] || '' };
  });
  await upsertWorkspaceState(workspace.id, state);
  return state;
}

async function loadWorkspace(caller, requestedId = '') {
  let memberships = await membershipsForCaller(caller);
  if (!memberships.length) {
    const migrated = await migrateLegacyWorkspace(caller);
    if (migrated) memberships = await membershipsForCaller(caller);
  }
  const requested = requestedId ? memberships.find(item => item.workspace_id === requestedId) : null;
  const selected = requested || (!requestedId ? memberships[0] || null : null);
  return { memberships, selected, requestedDenied: Boolean(requestedId && !requested) };
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return reply(res, 500, { error: 'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Vercel.' });
  const caller = await getCaller(req);
  if (!caller?.id) return reply(res, 401, { error: 'AUTH_REQUIRED' });
  const body = readBody(req);

  if (req.method === 'POST' && body.action === 'create-workspace') {
    const workspace = await createWorkspace(caller, body.state || {}, String(body.name || '').trim());
    const memberships = await membershipsForCaller(caller);
    return reply(res, 200, { ok: true, workspace: { id: workspace.id, name: workspace.name, role: 'owner' }, workspaces: workspaceList(memberships), state: workspace.state });
  }

  const requestedId = String(req.query?.workspaceId || body.workspaceId || '');
  const { memberships, selected, requestedDenied } = await loadWorkspace(caller, requestedId);
  if (requestedDenied) {
    return reply(res, 403, {
      error: 'WORKSPACE_ACCESS_REVOKED',
      workspaces: workspaceList(memberships),
      needsSetup: memberships.length === 0,
    });
  }
  if (!selected) return reply(res, 200, { ok: true, needsSetup: true, workspaces: [] });
  const workspace = selected.workspace;
  const membership = selected;
  const workspaceInfo = { id: selected.workspace_id, name: workspace.name || 'Cuotly', role: membership.role };

  if (req.method === 'POST' && body.action === 'purge-member') {
    try {
      await purgeMember({ ...workspace, id: selected.workspace_id }, membership, body);
      return reply(res, 200, { ok: true });
    } catch (error) {
      return reply(res, error.message === 'FORBIDDEN' ? 403 : 400, { error: 'No se pudo eliminar definitivamente al miembro.' });
    }
  }

  if (req.method === 'POST' && body.action === 'delete-workspace') {
    if (!isOwner(membership) || workspace.owner_id !== caller.id) return reply(res, 403, { error: 'Solo el propietario puede eliminar el espacio.' });
    const response = await rest(`cuotly_workspaces?id=eq.${encodeURIComponent(selected.workspace_id)}&owner_id=eq.${encodeURIComponent(caller.id)}`, {
      method: 'DELETE',
      headers: { prefer: 'return=representation' },
    });
    if (!response.ok) return reply(res, 400, { error: 'No se pudo eliminar el espacio.' });
    const removed = await response.json().catch(() => []);
    if (!removed.length) return reply(res, 404, { error: 'No se encontro el espacio para eliminar.' });
    const remaining = await membershipsForCaller(caller);
    return reply(res, 200, { ok: true, workspaces: workspaceList(remaining), needsSetup: remaining.length === 0 });
  }

  if (req.method === 'GET') {
    const output = stateForCaller(workspace.state || {}, caller, membership);
    return reply(res, 200, { ok: true, state: output, workspace: workspaceInfo, workspaces: workspaceList(memberships), needsSetup: false });
  }

  if (req.method !== 'PUT') return reply(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  if (!body.state || typeof body.state !== 'object') return reply(res, 400, { error: 'STATE_REQUIRED' });

  const incoming = clone(body.state);
  const current = clone(workspace.state || {});
  let next;
  if (isOwner(membership)) {
    next = incoming;
    next.ownerUserId = workspace.owner_id || caller.id;
    await syncMembers(selected.workspace_id, next, caller);
  } else if (memberRole(membership) === 'admin') {
    next = mergeAdminState(current, incoming);
  } else {
    next = mergeWorkerState(current, incoming, caller, membership);
  }
  await upsertWorkspaceState(selected.workspace_id, next);
  return reply(res, 200, { ok: true, workspace: workspaceInfo });
}

const SUPABASE_URL = cleanUrl(process.env.SUPABASE_URL || '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function cleanUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '').replace(/\/(?:rest|auth|storage|realtime)\/v1(?:\/.*)?$/i, '');
}

function headers(extra = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

async function json(res, status, body) {
  res.status(status).json(body);
}

async function getCaller(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_ROLE_KEY, authorization },
  });
  if (!response.ok) return null;
  return response.json();
}

async function getState(userId) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/cuotly_user_states?user_id=eq.${userId}&select=state`, {
    headers: headers(),
  });
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []);
  return rows?.[0]?.state || null;
}

async function upsertState(userId, state) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/cuotly_user_states?on_conflict=user_id`, {
    method: 'POST',
    headers: headers({
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates',
    }),
    body: JSON.stringify({
      user_id: userId,
      state,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'No se pudo guardar el estado compartido.');
  }
}

function memberForEmail(state, email) {
  return (state?.members || []).find(member => String(member.email || '').toLowerCase() === String(email || '').toLowerCase());
}

function isManager(member) {
  return member?.role === 'owner' || member?.role === 'admin';
}

function workerServiceIds(state, member) {
  return new Set((state?.services || [])
    .filter(service => service.assignedTo === member?.id && service.status !== 'cancelled')
    .map(service => service.id));
}

function stateForCaller(state, caller) {
  const copy = JSON.parse(JSON.stringify(state || {}));
  const member = memberForEmail(copy, caller.email);
  if (member) {
    member.active = true;
    copy.currentUserId = member.id;
  }
  if (!member || isManager(member)) return copy;
  const serviceIds = workerServiceIds(copy, member);
  const restaurantIds = new Set((copy.services || []).filter(service => serviceIds.has(service.id)).map(service => service.restaurantId));
  copy.services = (copy.services || []).filter(service => serviceIds.has(service.id));
  copy.restaurants = (copy.restaurants || []).filter(restaurant => restaurantIds.has(restaurant.id));
  copy.tasks = (copy.tasks || []).filter(task => serviceIds.has(task.serviceId));
  copy.payments = (copy.payments || []).filter(payment => serviceIds.has(payment.serviceId));
  copy.reports = (copy.reports || []).filter(report => restaurantIds.has(report.restaurantId));
  copy.reminders = (copy.reminders || []).filter(reminder => serviceIds.has(reminder.serviceId));
  return copy;
}

function mergeWorkerTasks(ownerState, incomingState, member) {
  const next = JSON.parse(JSON.stringify(ownerState || {}));
  const serviceIds = workerServiceIds(next, member);
  const incomingTasks = Array.isArray(incomingState?.tasks) ? incomingState.tasks : [];
  const accepted = incomingTasks.filter(task => serviceIds.has(task.serviceId));
  const incomingById = new Map(accepted.filter(task => task.id).map(task => [task.id, task]));
  const existingById = new Map((next.tasks || []).map(task => [task.id, task]));
  const retained = (next.tasks || []).filter(task => !serviceIds.has(task.serviceId) || incomingById.has(task.id));

  accepted.forEach(task => {
    const service = (next.services || []).find(item => item.id === task.serviceId);
    if (!service) return;
    const existing = existingById.get(task.id);
    if (existing) {
      retained.push({
        ...existing,
        title: String(task.title || existing.title || '').slice(0, 240),
        description: String(task.description || ''),
        type: task.type || existing.type,
        quantity: Math.max(1, Number(task.quantity || 1)),
        status: task.status || existing.status,
        priority: task.priority || existing.priority,
        startedAt: task.startedAt || existing.startedAt || '',
        completedAt: task.completedAt || existing.completedAt || '',
        cancelledAt: task.cancelledAt || existing.cancelledAt || '',
        reservedAt: task.reservedAt || existing.reservedAt || '',
        consumesQuota: task.consumesQuota !== false,
        menuMeta: task.menuMeta || existing.menuMeta || {},
      });
      return;
    }
    retained.push({
      id: task.id,
      restaurantId: service.restaurantId,
      serviceId: service.id,
      title: String(task.title || '').slice(0, 240),
      description: String(task.description || ''),
      type: task.type || 'small',
      quantity: Math.max(1, Number(task.quantity || 1)),
      status: task.status || 'requested',
      priority: task.priority || 'normal',
      assignedTo: member.id,
      requestedAt: task.requestedAt || new Date().toISOString(),
      startedAt: task.startedAt || '',
      completedAt: task.completedAt || '',
      cancelledAt: task.cancelledAt || '',
      reservedAt: task.reservedAt || '',
      consumesQuota: task.consumesQuota !== false,
      menuMeta: task.menuMeta || {},
      createdBy: member.id,
    });
  });
  next.tasks = retained;
  return next;
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json(res, 500, { error: 'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Vercel.' });
  const caller = await getCaller(req);
  if (!caller?.id) return json(res, 401, { error: 'AUTH_REQUIRED' });

  const ownState = await getState(caller.id);
  const ownerUserId = ownState?.ownerUserId || caller.id;
  const ownerState = ownerUserId === caller.id ? ownState : await getState(ownerUserId);
  const member = memberForEmail(ownerState, caller.email);
  if (ownerState && ownerUserId !== caller.id && !member) return json(res, 403, { error: 'No tienes acceso a este espacio.' });

  if (req.method === 'GET') {
    return json(res, 200, { ok: true, state: stateForCaller(ownerState || ownState, caller), ownerUserId });
  }

  if (req.method !== 'PUT') return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const incoming = body.state && typeof body.state === 'object' ? body.state : null;
  if (!incoming) return json(res, 400, { error: 'STATE_REQUIRED' });

  const targetUserId = ownerState?.ownerUserId || incoming.ownerUserId || caller.id;
  const baseState = ownerState || incoming;
  const callerMember = memberForEmail(baseState, caller.email);
  if (targetUserId !== caller.id && !callerMember) return json(res, 403, { error: 'No tienes acceso a este espacio.' });

  const nextState = isManager(callerMember)
    ? { ...incoming, ownerUserId: targetUserId }
    : { ...mergeWorkerTasks(baseState, incoming, callerMember), ownerUserId: targetUserId };
  await upsertState(targetUserId, nextState);
  if (targetUserId !== caller.id) await upsertState(caller.id, { ...nextState, currentUserId: callerMember?.id || nextState.currentUserId });
  return json(res, 200, { ok: true, ownerUserId: targetUserId });
}

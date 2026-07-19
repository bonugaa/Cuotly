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

function stateForCaller(state, caller) {
  const copy = JSON.parse(JSON.stringify(state || {}));
  const member = memberForEmail(copy, caller.email);
  if (member) {
    member.active = true;
    copy.currentUserId = member.id;
  }
  return copy;
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

  const nextState = { ...incoming, ownerUserId: targetUserId };
  await upsertState(targetUserId, nextState);
  if (targetUserId !== caller.id) await upsertState(caller.id, { ...nextState, currentUserId: callerMember?.id || nextState.currentUserId });
  return json(res, 200, { ok: true, ownerUserId: targetUserId });
}

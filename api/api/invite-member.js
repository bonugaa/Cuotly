const SUPABASE_URL = cleanUrl(process.env.SUPABASE_URL || 'https://fgghesxikhbhasyyuwpf.supabase.co');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function cleanUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '').replace(/\/(?:rest|auth|storage|realtime)\/v1(?:\/.*)?$/i, '');
}

function appUrlFromRequest(req) {
  const origin = req.headers.origin;
  if (origin) return origin;
  if (process.env.CUOTLY_APP_URL) return process.env.CUOTLY_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return 'https://cuotly-git-main-bonuga.vercel.app';
}

async function getCaller(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      authorization,
    },
  });

  if (!response.ok) return null;
  return response.json();
}

function adminHeaders(extra = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

async function findUserByEmail(email) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: adminHeaders(),
  });
  if (!response.ok) return null;
  const result = await response.json().catch(() => ({}));
  const users = Array.isArray(result.users) ? result.users : [];
  return users.find(user => String(user.email || '').toLowerCase() === email.toLowerCase()) || null;
}

async function upsertSharedState(userId, state) {
  if (!userId || !state || typeof state !== 'object') return;
  await fetch(`${SUPABASE_URL}/rest/v1/cuotly_user_states?on_conflict=user_id`, {
    method: 'POST',
    headers: adminHeaders({
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates',
    }),
    body: JSON.stringify({
      user_id: userId,
      state,
      updated_at: new Date().toISOString(),
    }),
  });
}

async function sendAccessEmail(email, name, role, redirectTo) {
  const otpUrl = new URL(`${SUPABASE_URL}/auth/v1/otp`);
  otpUrl.searchParams.set('redirect_to', redirectTo);
  const response = await fetch(otpUrl, {
    method: 'POST',
    headers: adminHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({
      email,
      create_user: false,
      data: {
        name,
        full_name: name,
        cuotly_role: role,
      },
    }),
  });
  return response;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metodo no permitido' });
    return;
  }

  if (!SERVICE_ROLE_KEY) {
    res.status(500).json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY en Vercel' });
    return;
  }

  const caller = await getCaller(req);
  if (!caller?.id) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || '').trim();
  const role = String(body.role || 'worker').trim();
  const mode = String(body.mode || 'invite').trim();
  const state = body.state && typeof body.state === 'object' ? body.state : null;

  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Email no valido' });
    return;
  }

  if (!['admin', 'worker'].includes(role)) {
    res.status(400).json({ error: 'Permiso no valido' });
    return;
  }

  const redirectTo = `${appUrlFromRequest(req)}/?invite=1`;

  if (mode === 'sync') {
    const existingUser = await findUserByEmail(email);
    if (existingUser?.id) await upsertSharedState(existingUser.id, state);
    res.status(200).json({ ok: true, mode: 'sync' });
    return;
  }

  if (mode === 'existing') {
    const existingUser = await findUserByEmail(email);
    if (!existingUser?.id) {
      res.status(404).json({ error: 'Ese email todavia no tiene cuenta. Usa la opcion de usuario nuevo.' });
      return;
    }
    await upsertSharedState(existingUser.id, state);
    const emailResponse = await sendAccessEmail(email, name, role, redirectTo);
    if (!emailResponse.ok) {
      const result = await emailResponse.json().catch(() => ({}));
      res.status(emailResponse.status).json({
        error: result.msg || result.error_description || result.error || 'No se pudo enviar el email de acceso',
      });
      return;
    }
    res.status(200).json({ ok: true, mode: 'existing' });
    return;
  }

  const inviteUrl = new URL(`${SUPABASE_URL}/auth/v1/invite`);
  inviteUrl.searchParams.set('redirect_to', redirectTo);

  const inviteResponse = await fetch(inviteUrl, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email,
      data: {
        name,
        full_name: name,
        cuotly_role: role,
        invited_by: caller.email || caller.id,
      },
    }),
  });

  const result = await inviteResponse.json().catch(() => ({}));
  if (!inviteResponse.ok) {
    const existingUser = await findUserByEmail(email);
    if (existingUser?.id) {
      await upsertSharedState(existingUser.id, state);
      const emailResponse = await sendAccessEmail(email, name, role, redirectTo);
      if (emailResponse.ok) {
        res.status(200).json({ ok: true, mode: 'existing' });
        return;
      }
    }
    res.status(inviteResponse.status).json({
      error: result.msg || result.error_description || result.error || 'No se pudo enviar la invitacion',
    });
    return;
  }

  const invitedUserId = result.id || result.user?.id;
  await upsertSharedState(invitedUserId, state);

  res.status(200).json({ ok: true, mode: 'invite' });
}

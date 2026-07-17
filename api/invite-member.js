const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fgghesxikhbhasyyuwpf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Email no valido' });
    return;
  }

  if (!['admin', 'worker'].includes(role)) {
    res.status(400).json({ error: 'Permiso no valido' });
    return;
  }

  const redirectTo = `${appUrlFromRequest(req)}/?invite=1`;
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
    res.status(inviteResponse.status).json({
      error: result.msg || result.error_description || result.error || 'No se pudo enviar la invitacion',
    });
    return;
  }

  res.status(200).json({ ok: true });
}

import { pushIsConfigured, pushPublicKey, removePushSubscription, savePushSubscription, sendPushToUsers } from './push-utils.js';

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/(?:rest|auth|storage|realtime)\/v1(?:\/.*)?$/i, '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
function headers(extra = {}) { return { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}`, ...extra }; }
function bodyOf(req) { if (typeof req.body !== 'string') return req.body || {}; try { return JSON.parse(req.body || '{}'); } catch { return {}; } }
async function callerOf(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_ROLE_KEY, authorization } });
  if (!response.ok) return null;
  const user = await response.json();
  try { user.aal = JSON.parse(Buffer.from(authorization.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')).aal || 'aal1'; } catch { user.aal = 'aal1'; }
  return user;
}
export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Falta configurar Supabase en Vercel.' });
  const caller = await callerOf(req);
  if (!caller?.id) return res.status(401).json({ error: 'No autorizado.' });
  if (caller.aal !== 'aal2') return res.status(403).json({ error: 'Verifica el segundo factor antes de activar los avisos.' });
  const body = bodyOf(req);
  const action = String(req.query?.action || body.action || '');
  try {
    if (action === 'public-key' && req.method === 'GET') {
      if (!pushIsConfigured()) return res.status(503).json({ error: 'Faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en Vercel.' });
      return res.status(200).json({ ok: true, publicKey: pushPublicKey() });
    }
    if (action === 'subscribe' && req.method === 'POST') {
      if (!pushIsConfigured()) return res.status(503).json({ error: 'Faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en Vercel.' });
      await savePushSubscription(caller.id, body.subscription, body.preferences || {});
      return res.status(200).json({ ok: true });
    }
    if (action === 'unsubscribe' && req.method === 'POST') {
      await removePushSubscription(caller.id, String(body.endpoint || ''));
      return res.status(200).json({ ok: true });
    }
    if (action === 'test' && req.method === 'POST') {
      const result = await sendPushToUsers([caller.id], { title: 'Quotly', body: 'Los avisos del móvil están activados.', url: '/', category: 'messages', tag: 'cuotly-test' });
      if (!result.configured) return res.status(503).json({ error: 'Faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en Vercel.' });
      return res.status(200).json({ ok: true, sent: result.sent });
    }
    return res.status(400).json({ error: 'Acción no válida.' });
  } catch (error) { return res.status(400).json({ error: error.message || 'No se pudo configurar el dispositivo.' }); }
}

import webpush from 'web-push';

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/(?:rest|auth|storage|realtime)\/v1(?:\/.*)?$/i, '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const VAPID_PUBLIC_KEY = String(process.env.VAPID_PUBLIC_KEY || '').trim();
const VAPID_PRIVATE_KEY = String(process.env.VAPID_PRIVATE_KEY || '').trim();
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:notificaciones@cuotly.app';

let configured = false;
function configure() {
  if (!configured && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    configured = true;
  }
  return configured;
}
function headers(extra = {}) { return { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}`, ...extra }; }
async function rest(path, options = {}) {
  const { headers: extra = {}, ...request } = options;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...request, headers: headers(extra) });
}
async function restRows(path, options = {}) {
  const response = await rest(path, options);
  const text = await response.text();
  if (!response.ok) throw new Error(text || 'SUPABASE_ERROR');
  return text ? JSON.parse(text) : [];
}
function allowedForCategory(subscription, category) {
  const preferences = subscription.preferences && typeof subscription.preferences === 'object' ? subscription.preferences : {};
  if (category === 'payments') return preferences.payments !== false;
  if (category === 'assignments') return preferences.assignments !== false;
  return preferences.messages !== false;
}
export function pushIsConfigured() { return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY && configure()); }
export function pushPublicKey() { return VAPID_PUBLIC_KEY; }
export async function savePushSubscription(userId, subscription, preferences = {}) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('PUSH_NOT_CONFIGURED');
  const endpoint = String(subscription?.endpoint || '').trim();
  const p256dh = String(subscription?.keys?.p256dh || '').trim();
  const authKey = String(subscription?.keys?.auth || '').trim();
  if (!endpoint.startsWith('https://') || !p256dh || !authKey) throw new Error('INVALID_PUSH_SUBSCRIPTION');
  return (await restRows('cuotly_push_subscriptions?on_conflict=endpoint', {
    method: 'POST',
    headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ user_id: userId, endpoint: endpoint.slice(0, 2000), p256dh: p256dh.slice(0, 500), auth_key: authKey.slice(0, 500), enabled: true, preferences: { messages: preferences.messages !== false, assignments: preferences.assignments !== false, payments: preferences.payments !== false }, updated_at: new Date().toISOString() }),
  }))[0];
}
export async function removePushSubscription(userId, endpoint = '') {
  const filter = endpoint ? `&endpoint=eq.${encodeURIComponent(endpoint)}` : '';
  await restRows(`cuotly_push_subscriptions?user_id=eq.${encodeURIComponent(userId)}${filter}`, { method: 'DELETE' });
}
export async function sendPushToUsers(userIds, { title = 'Quotly', body = '', url = '/', category = 'messages', tag = 'cuotly' } = {}) {
  if (!pushIsConfigured()) return { sent: 0, configured: false };
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return { sent: 0, configured: true };
  const queryIds = ids.map(id => encodeURIComponent(id)).join(',');
  const subscriptions = await restRows(`cuotly_push_subscriptions?user_id=in.(${queryIds})&enabled=is.true&select=*`);
  let sent = 0;
  for (const item of subscriptions) {
    if (!allowedForCategory(item, category)) continue;
    try {
      await webpush.sendNotification({ endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth_key } }, JSON.stringify({ title: String(title).slice(0, 80), body: String(body).slice(0, 240), url: String(url || '/').slice(0, 500), tag: String(tag || 'cuotly').slice(0, 80) }));
      sent += 1;
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) await rest(`cuotly_push_subscriptions?id=eq.${encodeURIComponent(item.id)}`, { method: 'DELETE' }).catch(() => {});
      else console.error('PUSH_SEND_FAILED', error?.message || error);
    }
  }
  return { sent, configured: true };
}

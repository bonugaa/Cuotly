const CUOTLY_SUPABASE_URL = cleanUrl(process.env.SUPABASE_URL || '');
const CUOTLY_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const FIOMETRA_SUPABASE_URL = cleanUrl(process.env.FIOMETRA_SUPABASE_URL || '');
const FIOMETRA_SERVICE_ROLE_KEY = process.env.FIOMETRA_SUPABASE_SERVICE_ROLE_KEY || '';

function cleanUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '').replace(/\/(?:rest|auth|storage|realtime)\/v1(?:\/.*)?$/i, '');
}

function adminHeaders(key, extra = {}) {
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    ...extra,
  };
}

async function jsonResponse(res, status, body) {
  res.status(status).json(body);
}

async function getCuotlyCaller(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;
  const response = await fetch(`${CUOTLY_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: CUOTLY_SERVICE_ROLE_KEY,
      authorization,
    },
  });
  if (!response.ok) return null;
  return response.json();
}

async function fiometraRest(table, query = '', options = {}) {
  const response = await fetch(`${FIOMETRA_SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`, {
    ...options,
    headers: adminHeaders(FIOMETRA_SERVICE_ROLE_KEY, {
      'content-type': 'application/json',
      ...(options.headers || {}),
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(text || 'FIOMETRA_ERROR');
    error.status = response.status;
    throw error;
  }
  return text ? JSON.parse(text) : null;
}

async function findFiometraUserByEmail(email) {
  const response = await fetch(`${FIOMETRA_SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: adminHeaders(FIOMETRA_SERVICE_ROLE_KEY),
  });
  if (!response.ok) return null;
  const result = await response.json().catch(() => ({}));
  const users = Array.isArray(result.users) ? result.users : [];
  return users.find(user => String(user.email || '').toLowerCase() === String(email || '').toLowerCase()) || null;
}

function paymentDescription(payment, restaurant, service, callerEmail) {
  return [
    `Importado automaticamente desde Cuotly.`,
    `Restaurante: ${restaurant?.name || payment.restaurantName || 'Sin restaurante'}.`,
    `Servicio: ${service?.planName || payment.serviceName || 'Mantenimiento'}.`,
    `Ciclo: ${payment.cycleStart} - ${payment.cycleEnd}.`,
    `Pago Cuotly: ${payment.id}.`,
    `Registrado por: ${callerEmail}.`,
  ].join('\n');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return jsonResponse(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  if (!CUOTLY_SUPABASE_URL || !CUOTLY_SERVICE_ROLE_KEY) return jsonResponse(res, 500, { error: 'Faltan variables de Cuotly en Vercel.' });
  if (!FIOMETRA_SUPABASE_URL || !FIOMETRA_SERVICE_ROLE_KEY) return jsonResponse(res, 500, { error: 'Faltan FIOMETRA_SUPABASE_URL y FIOMETRA_SUPABASE_SERVICE_ROLE_KEY en Vercel.' });

  try {
    const caller = await getCuotlyCaller(req);
    if (!caller?.email) return jsonResponse(res, 401, { error: 'AUTH_REQUIRED' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const payment = body.payment || {};
    const restaurant = body.restaurant || {};
    const service = body.service || {};
    if (!payment.id || !Number(payment.baseAmount)) return jsonResponse(res, 400, { error: 'PAYMENT_REQUIRED' });

    const fiometraUser = await findFiometraUserByEmail(caller.email);
    if (!fiometraUser?.id) return jsonResponse(res, 404, { error: 'No existe una cuenta de Fiometra con este mismo email.' });

    const profiles = await fiometraRest('profiles', `id=eq.${fiometraUser.id}&select=active_workspace_id`);
    const workspaceId = profiles?.[0]?.active_workspace_id;
    if (!workspaceId) return jsonResponse(res, 400, { error: 'La cuenta de Fiometra no tiene espacio activo.' });

    const marker = `Pago Cuotly: ${payment.id}.`;
    const existing = await fiometraRest(
      'sales',
      `workspace_id=eq.${workspaceId}&owner_id=eq.${fiometraUser.id}&description=ilike.*${encodeURIComponent(marker)}*&select=id&limit=1`
    );
    if (existing?.[0]?.id) return jsonResponse(res, 200, { ok: true, saleId: existing[0].id, alreadySynced: true });

    const irpfRate = Number(payment.irpfRate || body.irpfRate || 15);
    const extraRate = Math.max(0, irpfRate - 9);
    const planName = service?.planName || service?.name || 'Mantenimiento';
    const restaurantName = restaurant?.name || payment.restaurantName || 'Restaurante';
    const paidDate = String(payment.paidAt || new Date().toISOString()).slice(0, 10);
    const saleName = `Cuotly - ${planName} - ${restaurantName}`;
    const description = paymentDescription(payment, restaurant, { ...service, planName }, caller.email);

    const inserted = await fiometraRest('sales', '', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({
        owner_id: fiometraUser.id,
        workspace_id: workspaceId,
        name: saleName,
        client_name: restaurantName,
        client_id: null,
        base: Number(payment.baseAmount),
        irpf_enabled: true,
        iva_enabled: true,
        extra_rate: extraRate,
        description,
        hidden_from: [],
        next_payment_due: null,
        created_at: `${paidDate}T12:00:00Z`,
      }),
    });

    const sale = inserted?.[0];
    if (!sale?.id) return jsonResponse(res, 500, { error: 'No se pudo crear la venta en Fiometra.' });

    await fiometraRest('payments', '', {
      method: 'POST',
      body: JSON.stringify({
        owner_id: fiometraUser.id,
        workspace_id: workspaceId,
        sale_id: sale.id,
        base: Number(payment.baseAmount),
        paid_at: paidDate,
        method: payment.method || 'Transferencia',
        notes: `Cobro importado desde Cuotly. ${marker}`,
        hidden_from: [],
      }),
    });

    return jsonResponse(res, 201, { ok: true, saleId: sale.id });
  } catch (error) {
    return jsonResponse(res, error.status || 500, { error: error.message || 'No se pudo pasar el pago a Fiometra.' });
  }
};

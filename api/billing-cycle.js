const SUPABASE_URL = cleanUrl(process.env.SUPABASE_URL || '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CRON_SECRET = process.env.CRON_SECRET || '';

function cleanUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '').replace(/\/(?:rest|auth|storage|realtime)\/v1(?:\/.*)?$/i, '');
}

function headers(extra = {}) {
  return { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}`, ...extra };
}

async function rest(path, options = {}) {
  const { headers: requestHeaders = {}, ...request } = options;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...request, headers: headers(requestHeaders) });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function madridDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function date(value) {
  return new Date(`${String(value).slice(0, 10)}T12:00:00.000Z`);
}

function iso(value) {
  return value.toISOString().slice(0, 10);
}

function addDays(value, amount) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function addMonths(value, amount) {
  const result = new Date(value);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + amount);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function daysBetween(from, to) {
  return Math.max(0, Math.floor((date(to) - date(from)) / 86400000));
}

function currentCycle(service) {
  const start = service.cycleStartDate || service.startDate || madridDate();
  const end = service.cycleEndDate || iso(addDays(addMonths(date(start), 1), -1));
  service.cycleStartDate = start;
  service.cycleEndDate = end;
  service.cycleIndex = Number(service.cycleIndex || 1);
  return { start, end };
}

function amounts(base, settings) {
  const round = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const iva = round(base * Number(settings?.ivaRate || 21) / 100);
  const irpf = round(base * Number(settings?.irpfRate || 15) / 100);
  return { base: round(base), iva, irpf, invoiceTotal: round(base + iva), received: round(base + iva - irpf) };
}

function paymentFor(state, service, cycleStart) {
  return (state.payments || []).find(payment => payment.serviceId === service.id && payment.cycleStart === cycleStart && (!payment.kind || payment.kind === 'subscription'));
}

function hasActivePremium(state, restaurantId, menuCycleStart) {
  const premium = (state.services || []).find(service => service.restaurantId === restaurantId && service.planCode === 'premium' && service.status === 'active');
  if (!premium) return false;
  const premiumCycle = currentCycle(premium);
  if (date(premiumCycle.start) > date(menuCycleStart) || date(premiumCycle.end) < date(menuCycleStart)) return false;
  return paymentFor(state, premium, premiumCycle.start)?.status === 'paid';
}

function monthlyBaseFor(state, service, cycleStart) {
  if (service.planCode !== 'menu') return Number(service.monthlyBase || 0);
  return hasActivePremium(state, service.restaurantId, cycleStart) ? 149 : 169;
}

function addReminder(state, service, type, cycleStart, notes) {
  state.reminders ||= [];
  const autoKey = `${type}-${service.id}-${cycleStart}`;
  if (state.reminders.some(item => item.autoKey === autoKey)) return;
  state.reminders.push({
    id: `rem_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`,
    type,
    serviceId: service.id,
    restaurantId: service.restaurantId,
    createdAt: new Date().toISOString(),
    notes,
    autoKey,
  });
}

function createPayment(state, service, cycle) {
  const price = monthlyBaseFor(state, service, cycle.start);
  service.monthlyBase = price;
  const total = amounts(price, state.settings || {});
  const payment = {
    id: `pay_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`,
    restaurantId: service.restaurantId,
    serviceId: service.id,
    cycleStart: cycle.start,
    cycleEnd: cycle.end,
    dueDate: cycle.start,
    baseAmount: total.base,
    ivaAmount: total.iva,
    irpfAmount: total.irpf,
    invoiceTotal: total.invoiceTotal,
    receivedAmount: total.received,
    status: 'pending',
    method: '',
    notes: '',
    paidAt: '',
    sentToFiometra: false,
    kind: 'subscription',
  };
  state.payments.push(payment);
  addReminder(state, service, 'payment_due', cycle.start, 'Cobro mensual pendiente de confirmar.');
  return payment;
}

function ensureBackupTask(state, service, cycleStart) {
  const every = service.planCode === 'premium' ? 1 : ['presencia', 'impulso'].includes(service.planCode) ? 3 : 0;
  if (!every || Number(service.cycleIndex || 1) % every !== 0) return false;
  state.tasks ||= [];
  const autoKey = `backup-${service.id}-${cycleStart}`;
  if (state.tasks.some(task => task.autoKey === autoKey)) return false;
  state.tasks.push({
    id: `task_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`,
    restaurantId: service.restaurantId,
    serviceId: service.id,
    title: 'Realizar copia de seguridad',
    description: `Copia programada del ciclo iniciado el ${cycleStart}.`,
    type: 'backup',
    quantity: 1,
    consumesQuota: false,
    status: 'requested',
    priority: 'normal',
    assignedTo: service.assignedTo || '',
    requestedAt: new Date().toISOString(),
    startedAt: '',
    completedAt: '',
    createdBy: 'system',
    autoKey,
  });
  return true;
}

function applyPendingPlanChange(service, today) {
  const pending = service.pendingPlanChange;
  if (!pending || !pending.planCode || !pending.effectiveAt) return false;
  if (date(pending.effectiveAt) > date(today)) return false;
  service.planCode = pending.planCode;
  service.monthlyBase = Number(pending.monthlyBase || service.monthlyBase || 0);
  service.initialCommitmentMonths = 3;
  service.commitmentStartDate = pending.effectiveAt;
  service.pendingPlanChange = null;
  return true;
}

function resumeExpiredPause(state, service, today) {
  if (!service.pausedAt && service.status !== 'paused') return false;
  if (!service.pausedAt) return false;

  const startedAt = String(service.pausedAt).slice(0, 10);
  const plannedDays = Math.min(31, Math.max(1, Number(service.pausePlanDays || 31)));
  const resumeAt = addDays(date(startedAt), plannedDays);
  if (date(today) < resumeAt) return false;

  const cycle = currentCycle(service);
  service.pauseHistory ||= [];
  service.pauseHistory.push({
    startedAt,
    endedAt: iso(resumeAt),
    days: plannedDays,
    notes: service.pauseNotes || '',
  });
  service.cycleEndDate = iso(addDays(date(cycle.end), plannedDays));
  service.pausedAt = '';
  service.pausePlanDays = 0;
  service.pauseNotes = '';
  service.status = paymentFor(state, service, cycle.start)?.status === 'paid' ? 'active' : 'pending';
  addReminder(state, service, 'auto_resume', startedAt, 'Pausa finalizada automaticamente; se reanuda el servicio con el tiempo y las cuotas restantes.');
  return true;
}

function processService(state, service, today) {
  let changed = resumeExpiredPause(state, service, today);
  if (service.status === 'cancelled' || service.pausedAt || service.status === 'paused') return changed;
  let guard = 0;

  while (guard < 24) {
    guard += 1;
    const cycle = currentCycle(service);
    let payment = paymentFor(state, service, cycle.start);
    if (!payment) {
      payment = createPayment(state, service, cycle);
      changed = true;
    }

    if (service.planCode === 'menu' && payment.status !== 'paid') {
      const base = monthlyBaseFor(state, service, cycle.start);
      const total = amounts(base, state.settings || {});
      if (Number(payment.baseAmount) !== total.base || Number(service.monthlyBase) !== total.base) changed = true;
      service.monthlyBase = total.base;
      Object.assign(payment, {
        baseAmount: total.base,
        ivaAmount: total.iva,
        irpfAmount: total.irpf,
        invoiceTotal: total.invoiceTotal,
        receivedAmount: total.received,
      });
    }

    if (payment.status !== 'paid') {
      const overdue = daysBetween(payment.dueDate, today);
      if (today > payment.dueDate && overdue > 3) {
        payment.status = 'cancelled';
        service.status = 'cancelled';
        service.cancelledAt ||= new Date().toISOString();
        service.cancelReason ||= 'impago';
        addReminder(state, service, 'auto_cancellation', cycle.start, 'Cancelado automaticamente tras 3 dias naturales de impago.');
        return true;
      }
      if (today > payment.dueDate) {
        if (payment.status !== 'late' || service.status !== 'suspended') changed = true;
        payment.status = 'late';
        service.status = 'suspended';
        addReminder(state, service, 'payment_late', cycle.start, 'Pago vencido: el servicio queda suspendido hasta confirmar el cobro.');
      } else if (service.status !== 'pending') {
        service.status = 'pending';
        changed = true;
      }
      return changed;
    }

    if (service.status !== 'active') {
      service.status = 'active';
      changed = true;
    }
    if (ensureBackupTask(state, service, cycle.start)) changed = true;

    if (today <= cycle.end) return changed;
    const nextStart = iso(addDays(date(cycle.end), 1));
    if (service.cancelAtEnd && String(service.cancelEffectiveAt || nextStart).slice(0, 10) <= nextStart) {
      service.status = 'cancelled';
      service.cancelledAt ||= new Date().toISOString();
      service.cancelReason ||= 'cancelacion_programada';
      return true;
    }
    service.cycleStartDate = nextStart;
    service.cycleEndDate = iso(addDays(addMonths(date(nextStart), 1), -1));
    service.cycleIndex = Number(service.cycleIndex || 1) + 1;
    if (applyPendingPlanChange(service, today)) changed = true;
    changed = true;
  }
  return changed;
}

function processWorkspace(input) {
  const state = clone(input || {});
  state.services ||= [];
  state.payments ||= [];
  state.reminders ||= [];
  const today = madridDate();
  const changed = state.services.reduce((didChange, service) => processService(state, service, today) || didChange, false);
  return { state, changed };
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !CRON_SECRET) return res.status(500).json({ error: 'Falta configurar Supabase o CRON_SECRET.' });
  if (req.headers.authorization !== `Bearer ${CRON_SECRET}`) return res.status(401).json({ error: 'No autorizado.' });

  try {
    const response = await rest('cuotly_workspaces?select=id,state');
    if (!response.ok) throw new Error(await response.text());
    const workspaces = await response.json();
    let updated = 0;
    for (const workspace of workspaces) {
      const result = processWorkspace(workspace.state || {});
      if (!result.changed) continue;
      const save = await rest(`cuotly_workspaces?id=eq.${encodeURIComponent(workspace.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state: result.state, updated_at: new Date().toISOString() }),
      });
      if (!save.ok) throw new Error(await save.text());
      updated += 1;
    }
    return res.status(200).json({ ok: true, updated, checked: workspaces.length });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'No se pudo actualizar la facturacion.' });
  }
}

const STORAGE_KEY = 'cuotly_state_v1';

const PLAN_CATALOG = {
  presencia: {
    code: 'presencia',
    name: 'Plan Presencia',
    label: 'ESENCIAL',
    className: 'presencia',
    price: 99,
    prices: { 1: 99, 3: 96, 6: 94, 9: 92, 12: 89 },
    quotas: { small: 8, photos: 8, calls: 1, incidents: 8 },
    response: '48-72 h laborables',
    report: ['Cambios realizados', 'Incidencias', 'Cambios restantes'],
    includes: ['Revision mensual', '8 cambios pequenos', '8 fotografias', 'Revision movil', 'Backup trimestral', 'Informe mensual'],
  },
  impulso: {
    code: 'impulso',
    name: 'Plan Impulso',
    label: 'PRINCIPAL',
    className: 'impulso',
    price: 149,
    prices: { 1: 149, 3: 145, 6: 142, 9: 139, 12: 134 },
    quotas: { small: 15, medium: 3, section: 1, photos: 18, calls: 2, incidents: 15 },
    response: '24-48 h laborables',
    report: ['Cambios realizados', 'Incidencias', 'Sugerencias', 'Proximos pasos'],
    includes: ['Revision avanzada', '15 cambios pequenos', '3 cambios medianos', '1 bloque sencillo', '18 fotografias', '2 llamadas'],
  },
  premium: {
    code: 'premium',
    name: 'Plan Premium',
    label: 'AVANZADO',
    className: 'premium',
    price: 299,
    prices: { 1: 299, 3: 290, 6: 284, 9: 278, 12: 269 },
    quotas: { small: 25, medium: 5, large: 1, section: 2, photos: 30, calls: 4, incidents: 25 },
    response: '24 h laborables',
    report: ['Cambios realizados', 'Incidencias', 'Recomendaciones', 'Proximos pasos'],
    includes: ['Revision completa', '25 pequenos', '5 medianos', '1 grande', '2 secciones', '30 fotografias', '4 llamadas'],
  },
  menu: {
    code: 'menu',
    name: 'Menu Diario',
    label: 'SERVICIO INDEPENDIENTE',
    className: 'menu',
    price: 149,
    premiumPrice: 135,
    prices: { 1: 149 },
    quotas: { menu_update: 20, incidents: 20 },
    response: 'Lunes a viernes',
    report: ['Menus publicados', 'Incidencias', 'Actualizaciones restantes'],
    includes: ['20 actualizaciones mensuales', 'Lunes a viernes', 'Correcciones de formato', 'WhatsApp o correo', 'Informe combinado'],
  },
};

const TASK_TYPES = {
  small: 'Cambio pequeno',
  medium: 'Cambio mediano',
  large: 'Cambio grande',
  section: 'Seccion',
  photos: 'Fotografias',
  calls: 'Llamada',
  incidents: 'Incidencia',
  menu_update: 'Menu Diario',
};

const STATUS_LABELS = {
  requested: 'Solicitado',
  assigned: 'Asignado',
  in_progress: 'En proceso',
  waiting: 'Esperando cliente',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const PAYMENT_LABELS = {
  paid: 'Pagado',
  late: 'Retrasado',
  pending: 'Sin pagar',
  suspended: 'Suspendido',
};

const ROLE_LABELS = {
  owner: 'Propietario',
  admin: 'Administrador',
  worker: 'Trabajador',
};

const app = {
  state: null,
  booted: false,
  view: 'inicio',
  selectedRestaurantId: null,
  detailTab: 'servicios',
  taskFilter: 'all',
  paymentFilter: 'all',
  reportFilter: 'all',
  settingsTab: 'general',
  calendarMonth: startOfMonth(new Date()),
  search: '',
  auth: {
    client: null,
    session: null,
    user: null,
    ready: false,
    mode: 'login',
  },
};

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function $(selector, root = document) {
  return root.querySelector(selector);
}

function $all(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function iso(date = new Date()) {
  const copy = date instanceof Date ? new Date(date) : parseDate(date);
  return `${copy.getFullYear()}-${String(copy.getMonth() + 1).padStart(2, '0')}-${String(copy.getDate()).padStart(2, '0')}`;
}

function nowIso() {
  return new Date().toISOString();
}

function parseDate(value) {
  if (!value) return new Date();
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function addMonths(date, amount) {
  const copy = new Date(date);
  const day = copy.getDate();
  copy.setDate(1);
  copy.setMonth(copy.getMonth() + amount);
  const max = new Date(copy.getFullYear(), copy.getMonth() + 1, 0).getDate();
  copy.setDate(Math.min(day, max));
  return copy;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(value, options = {}) {
  const date = value instanceof Date ? value : parseDate(value);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: options.short ? 'short' : 'long',
    year: options.year === false ? undefined : 'numeric',
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function euro(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function initials(name) {
  return String(name || 'CU')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function hasSupabaseConfig() {
  const config = window.CUOTLY_CONFIG || {};
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

function storageKey() {
  return app.auth.user?.id ? `${STORAGE_KEY}_${app.auth.user.id}` : STORAGE_KEY;
}

function getAuthName(user) {
  const meta = user?.user_metadata || {};
  return meta.full_name || meta.name || meta.display_name || user?.email?.split('@')[0] || 'Propietario';
}

function getAuthEmail(user) {
  return user?.email || '';
}

function applyAuthUserToState() {
  if (!app.state || !app.auth.user) return;
  const owner = app.state.members.find(member => member.role === 'owner') || app.state.members[0];
  if (!owner) return;
  owner.id = 'user_owner';
  owner.name = getAuthName(app.auth.user);
  owner.email = getAuthEmail(app.auth.user);
  owner.role = 'owner';
  owner.active = true;
  app.state.currentUserId = owner.id;
}

function renderAuthScreen(mode = app.auth.mode, message = '') {
  app.auth.mode = mode;
  const isRegister = mode === 'register';
  const authScreen = $('#authScreen');
  $('#appShell')?.classList.add('hidden');
  authScreen.classList.remove('hidden');
  authScreen.innerHTML = `
    <section class="auth-card">
      <div class="auth-brand"><span class="brand-mark">Q</span><strong>Cuotly</strong></div>
      ${message ? `<div class="auth-message">${esc(message)}</div>` : ''}
      <h1>${isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h1>
      <p>${isRegister ? 'Crea tu espacio privado para gestionar mantenimientos.' : 'Entra para consultar y actualizar los mantenimientos.'}</p>
      <form id="${isRegister ? 'authRegisterForm' : 'authLoginForm'}" class="auth-form">
        ${isRegister ? '<label>Nombre<input name="name" autocomplete="name" required></label>' : ''}
        <label>Email<input name="email" type="email" autocomplete="email" required></label>
        <label>Contrasena<input name="password" type="password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" minlength="6" required></label>
        ${isRegister ? '<label>Repite la contrasena<input name="confirmPassword" type="password" autocomplete="new-password" minlength="6" required></label>' : ''}
        <button class="primary-button full-width" type="submit">${isRegister ? 'Crear cuenta' : 'Entrar en Cuotly'}</button>
      </form>
      <button class="secondary-button full-width auth-google" data-action="auth-google">Continuar con Google</button>
      <button class="text-button auth-switch" data-action="auth-mode" data-mode="${isRegister ? 'login' : 'register'}">${isRegister ? 'Ya tengo cuenta' : 'Crear cuenta'}</button>
    </section>
  `;
}

function showAppShell() {
  $('#authScreen')?.classList.add('hidden');
  $('#appShell')?.classList.remove('hidden');
}

async function setupAuth() {
  if (!hasSupabaseConfig() || !window.supabase?.createClient) {
    app.auth.ready = true;
    return true;
  }
  const config = window.CUOTLY_CONFIG;
  app.auth.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  const { data } = await app.auth.client.auth.getSession();
  app.auth.session = data?.session || null;
  app.auth.user = app.auth.session?.user || null;
  app.auth.client.auth.onAuthStateChange((_event, session) => {
    app.auth.session = session || null;
    app.auth.user = session?.user || null;
    if (!app.auth.ready) return;
    if (app.auth.user) startApp();
    else {
      app.booted = false;
      app.state = null;
      renderAuthScreen('login');
    }
  });
  app.auth.ready = true;
  if (!app.auth.user) {
    renderAuthScreen('login');
    return false;
  }
  return true;
}

async function handleAuthLogin(form) {
  if (!app.auth.client) return;
  const data = Object.fromEntries(new FormData(form));
  const { error } = await app.auth.client.auth.signInWithPassword({
    email: data.email.trim(),
    password: data.password,
  });
  if (error) {
    renderAuthScreen('login', 'Revisa el email o la contrasena e intentalo de nuevo.');
    return;
  }
  showToast('Sesion iniciada');
}

async function handleAuthRegister(form) {
  if (!app.auth.client) return;
  const data = Object.fromEntries(new FormData(form));
  if (data.password !== data.confirmPassword) {
    renderAuthScreen('register', 'Las contrasenas no coinciden.');
    return;
  }
  const { data: result, error } = await app.auth.client.auth.signUp({
    email: data.email.trim(),
    password: data.password,
    options: { data: { name: data.name.trim(), full_name: data.name.trim() } },
  });
  if (error) {
    renderAuthScreen('register', 'No se ha podido crear la cuenta. Revisa los datos.');
    return;
  }
  if (!result.session) {
    renderAuthScreen('login', 'Cuenta creada. Revisa tu email si Supabase te pide confirmarla.');
    return;
  }
  showToast('Cuenta creada');
}

async function handleGoogleLogin() {
  if (!app.auth.client) return;
  await app.auth.client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
  });
}

async function logout() {
  if (!app.auth.client) {
    app.booted = false;
    app.state = null;
    renderAuthScreen('login', 'Sesion cerrada.');
    return;
  }
  const { error } = await app.auth.client.auth.signOut();
  app.auth.session = null;
  app.auth.user = null;
  app.booted = false;
  app.state = null;
  closeDrawer();
  closeModal();
  renderAuthScreen('login', error ? 'Sesion cerrada en esta pantalla.' : 'Sesion cerrada.');
}

function plan(code) {
  return PLAN_CATALOG[code] || PLAN_CATALOG.presencia;
}

function taskTypeLabel(type) {
  return TASK_TYPES[type] || type;
}

function isWorkday(date, settings) {
  const day = date.getDay();
  const normalized = day === 0 ? 7 : day;
  if (!settings.workdays.includes(normalized)) return false;
  return !settings.holidays.some(item => item.date === iso(date));
}

function addWorkingDays(date, days, settings) {
  let current = new Date(date);
  let added = 0;
  while (added < days) {
    current = addDays(current, 1);
    if (isWorkday(current, settings)) added += 1;
  }
  return current;
}

function workingDaysBetween(start, end, settings) {
  let current = parseDate(start);
  const last = parseDate(end);
  let count = 0;
  while (current <= last) {
    if (isWorkday(current, settings)) count += 1;
    current = addDays(current, 1);
  }
  return count;
}

function getCurrentUser() {
  return app.state.members.find(member => member.id === app.state.currentUserId) || app.state.members[0];
}

function canManage() {
  const role = getCurrentUser()?.role;
  return role === 'owner' || role === 'admin';
}

function canSeeService(service) {
  const user = getCurrentUser();
  if (!user) return false;
  if (user.role === 'owner' || user.role === 'admin') return true;
  return service.assignedTo === user.id;
}

function visibleServices() {
  return app.state.services.filter(service => canSeeService(service));
}

function visibleRestaurants() {
  const serviceRestaurantIds = new Set(visibleServices().map(service => service.restaurantId));
  return app.state.restaurants.filter(restaurant => serviceRestaurantIds.has(restaurant.id) || canManage());
}

function restaurantById(id) {
  return app.state.restaurants.find(item => item.id === id);
}

function memberById(id) {
  return app.state.members.find(item => item.id === id);
}

function servicesForRestaurant(restaurantId) {
  return app.state.services.filter(service => service.restaurantId === restaurantId && canSeeService(service));
}

function tasksForService(serviceId) {
  return app.state.tasks.filter(task => task.serviceId === serviceId);
}

function serviceCycleStart(service, reference = new Date()) {
  let start = parseDate(service.startDate);
  while (addMonths(start, 1) <= reference) start = addMonths(start, 1);
  return start;
}

function serviceCycleEnd(service, reference = new Date()) {
  return addDays(addMonths(serviceCycleStart(service, reference), 1), -1);
}

function commitmentEnd(service) {
  return addMonths(parseDate(service.startDate), Number(service.commitmentMonths || 1));
}

function cancellationNoticeDate(service) {
  const end = serviceCycleEnd(service);
  let date = end;
  let remaining = app.state.settings.cancelNoticeWorkdays;
  while (remaining > 0) {
    date = addDays(date, -1);
    if (isWorkday(date, app.state.settings)) remaining -= 1;
  }
  return date;
}

function quotaUsage(service, reference = new Date()) {
  const p = plan(service.planCode);
  const start = serviceCycleStart(service, reference);
  const end = serviceCycleEnd(service, reference);
  const usage = {};
  Object.keys(p.quotas).forEach(key => {
    usage[key] = { used: 0, limit: Number(p.quotas[key] || 0) };
  });
  app.state.tasks
    .filter(task => task.serviceId === service.id && task.status === 'completed' && task.completedAt)
    .filter(task => {
      const completed = new Date(task.completedAt);
      return completed >= start && completed <= addDays(end, 1);
    })
    .forEach(task => {
      if (!usage[task.type]) usage[task.type] = { used: 0, limit: 0 };
      usage[task.type].used += Number(task.quantity || 1);
    });
  return usage;
}

function quotaTotals(service) {
  const usage = quotaUsage(service);
  const keys = Object.keys(usage);
  const totalLimit = keys.reduce((sum, key) => sum + Number(usage[key].limit || 0), 0);
  const totalUsed = keys.reduce((sum, key) => sum + Number(usage[key].used || 0), 0);
  return { used: totalUsed, limit: totalLimit, percent: totalLimit ? Math.round((totalUsed / totalLimit) * 100) : 0 };
}

function serviceMonthlyBase(planCode, months, restaurantId) {
  const p = plan(planCode);
  if (planCode === 'menu') {
    const hasPremium = app.state.services.some(service =>
      service.restaurantId === restaurantId &&
      service.planCode === 'premium' &&
      service.status !== 'cancelled'
    );
    return hasPremium ? p.premiumPrice : p.price;
  }
  return p.prices[months] || p.prices[1] || p.price;
}

function paymentAmounts(base) {
  const ivaRate = Number(app.state.settings.ivaRate || 21);
  const irpfRate = Number(app.state.settings.irpfRate || 15);
  const iva = round(base * ivaRate / 100);
  const irpf = round(base * irpfRate / 100);
  return {
    base: round(base),
    iva,
    irpf,
    invoiceTotal: round(base + iva),
    received: round(base + iva - irpf),
  };
}

function round(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function paymentStatusForDate(dueDate, existingStatus) {
  if (existingStatus === 'paid') return 'paid';
  const due = parseDate(dueDate);
  const now = new Date();
  const today = parseDate(iso(now));
  if (due >= today) return 'pending';
  const suspension = addWorkingDays(due, Number(app.state.settings.paymentGraceDays || 3), app.state.settings);
  suspension.setHours(Number(app.state.settings.paymentGraceHours || 12), 0, 0, 0);
  return now > suspension ? 'suspended' : 'late';
}

function refreshBilling() {
  const services = app.state.services.filter(service => service.status !== 'cancelled');
  services.forEach(service => {
    const cycleStart = iso(serviceCycleStart(service));
    const cycleEnd = iso(serviceCycleEnd(service));
    let payment = app.state.payments.find(item => item.serviceId === service.id && item.cycleStart === cycleStart);
    const amounts = paymentAmounts(Number(service.monthlyBase || serviceMonthlyBase(service.planCode, service.commitmentMonths, service.restaurantId)));
    if (!payment) {
      payment = {
        id: uid('pay'),
        restaurantId: service.restaurantId,
        serviceId: service.id,
        cycleStart,
        cycleEnd,
        dueDate: cycleStart,
        baseAmount: amounts.base,
        ivaAmount: amounts.iva,
        irpfAmount: amounts.irpf,
        invoiceTotal: amounts.invoiceTotal,
        receivedAmount: amounts.received,
        status: 'pending',
        method: '',
        notes: '',
        paidAt: '',
        sentToFiometra: false,
      };
      app.state.payments.push(payment);
    } else if (payment.status !== 'paid') {
      Object.assign(payment, {
        cycleEnd,
        baseAmount: amounts.base,
        ivaAmount: amounts.iva,
        irpfAmount: amounts.irpf,
        invoiceTotal: amounts.invoiceTotal,
        receivedAmount: amounts.received,
      });
    }
    payment.status = paymentStatusForDate(payment.dueDate, payment.status);
    if (payment.status === 'suspended') service.status = 'suspended';
    else if (payment.status === 'late') service.status = 'late';
    else if (service.status !== 'cancelled') service.status = 'active';
  });
}

function seedState() {
  const today = iso(new Date());
  return {
    version: 3,
    currentUserId: 'user_owner',
    settings: {
      workspaceName: 'Cuotly · Restaurantes',
      timezone: 'Europe/Madrid',
      ivaRate: 21,
      irpfRate: 15,
      paymentGraceDays: 3,
      paymentGraceHours: 12,
      cancelNoticeWorkdays: 3,
      workdays: [1, 2, 3, 4, 5, 6],
      holidays: [
        { id: 'hol_1', date: '2026-01-01', name: 'Ano Nuevo' },
        { id: 'hol_2', date: '2026-01-06', name: 'Reyes' },
        { id: 'hol_3', date: '2026-05-01', name: 'Fiesta del Trabajo' },
        { id: 'hol_4', date: '2026-05-02', name: 'Comunidad de Madrid' },
        { id: 'hol_5', date: '2026-10-12', name: 'Fiesta Nacional' },
        { id: 'hol_6', date: '2026-12-08', name: 'Inmaculada' },
        { id: 'hol_7', date: '2026-12-25', name: 'Navidad' },
      ],
      defaultReminderDays: 3,
      autoSuspend: true,
    },
    members: [
      { id: 'user_owner', name: 'Bosco Nunez', email: 'bosconunez@gmail.com', role: 'owner', active: true },
      { id: 'user_lucia', name: 'Lucia Castro', email: 'lucia@cuotly.es', role: 'admin', active: true },
      { id: 'user_diego', name: 'Diego Martin', email: 'diego@cuotly.es', role: 'worker', active: true },
      { id: 'user_alba', name: 'Alba Ruiz', email: 'alba@cuotly.es', role: 'worker', active: true },
    ],
    restaurants: [
      { id: 'rest_brasa', name: 'La Brasa de Chamberi', email: 'direccion@labrasachamberi.es', phone: '+34 610 234 100', address: 'Calle Fuencarral 88, Madrid', city: 'Madrid', notes: 'Cliente con plan avanzado y menu diario.', status: 'active', createdAt: today },
      { id: 'rest_manolo', name: 'Casa Manolo', email: 'hola@casamanolo.es', phone: '+34 611 440 220', address: 'Calle Atocha 43, Madrid', city: 'Madrid', notes: 'Suelen pedir cambios de carta por temporada.', status: 'active', createdAt: today },
      { id: 'rest_mar', name: 'Mar de Fondo', email: 'reservas@mardefondo.es', phone: '+34 612 780 321', address: 'Paseo de la Castellana 120, Madrid', city: 'Madrid', notes: 'Plan de presencia, pocas solicitudes.', status: 'active', createdAt: today },
      { id: 'rest_savia', name: 'Savia Cocina', email: 'equipo@saviacocina.es', phone: '+34 613 012 554', address: 'Calle Ibiza 24, Madrid', city: 'Madrid', notes: 'Solo menu diario.', status: 'active', createdAt: today },
    ],
    services: [
      { id: 'svc_brasa_premium', restaurantId: 'rest_brasa', planCode: 'premium', startDate: '2026-06-16', commitmentMonths: 12, monthlyBase: 269, status: 'active', autoRenew: true, assignedTo: 'user_lucia', cancelAtEnd: false, createdAt: today },
      { id: 'svc_brasa_menu', restaurantId: 'rest_brasa', planCode: 'menu', startDate: '2026-06-16', commitmentMonths: 1, monthlyBase: 135, status: 'active', autoRenew: true, assignedTo: 'user_alba', cancelAtEnd: false, createdAt: today },
      { id: 'svc_manolo_impulso', restaurantId: 'rest_manolo', planCode: 'impulso', startDate: '2026-07-10', commitmentMonths: 6, monthlyBase: 142, status: 'active', autoRenew: true, assignedTo: 'user_diego', cancelAtEnd: false, createdAt: today },
      { id: 'svc_mar_presencia', restaurantId: 'rest_mar', planCode: 'presencia', startDate: '2026-06-28', commitmentMonths: 3, monthlyBase: 96, status: 'active', autoRenew: true, assignedTo: 'user_alba', cancelAtEnd: false, createdAt: today },
      { id: 'svc_savia_menu', restaurantId: 'rest_savia', planCode: 'menu', startDate: '2026-06-21', commitmentMonths: 1, monthlyBase: 149, status: 'active', autoRenew: true, assignedTo: 'user_lucia', cancelAtEnd: false, createdAt: today },
    ],
    tasks: [
      { id: 'task_1', restaurantId: 'rest_brasa', serviceId: 'svc_brasa_premium', title: 'Actualizar precios de la carta de vinos', description: 'Cambiar 3 precios enviados por WhatsApp.', type: 'small', quantity: 3, status: 'completed', priority: 'normal', assignedTo: 'user_lucia', requestedAt: '2026-07-13T08:30:00.000Z', startedAt: '2026-07-13T09:05:00.000Z', completedAt: '2026-07-13T09:42:00.000Z', createdBy: 'user_owner' },
      { id: 'task_2', restaurantId: 'rest_brasa', serviceId: 'svc_brasa_menu', title: 'Publicar menu del dia', description: 'Menu enviado por correo a las 08:10.', type: 'menu_update', quantity: 1, status: 'completed', priority: 'normal', assignedTo: 'user_alba', requestedAt: '2026-07-13T06:30:00.000Z', startedAt: '2026-07-13T07:15:00.000Z', completedAt: '2026-07-13T07:28:00.000Z', createdBy: 'user_owner' },
      { id: 'task_3', restaurantId: 'rest_brasa', serviceId: 'svc_brasa_premium', title: 'Nueva seccion para eventos privados', description: 'Crear seccion mediana con texto y 4 fotos.', type: 'section', quantity: 1, status: 'in_progress', priority: 'high', assignedTo: 'user_lucia', requestedAt: '2026-07-12T14:20:00.000Z', startedAt: '2026-07-13T08:05:00.000Z', completedAt: '', createdBy: 'user_owner' },
      { id: 'task_4', restaurantId: 'rest_manolo', serviceId: 'svc_manolo_impulso', title: 'Nuevos platos de temporada', description: 'Actualizar 3 platos y sus descripciones.', type: 'small', quantity: 3, status: 'assigned', priority: 'normal', assignedTo: 'user_diego', requestedAt: '2026-07-12T11:15:00.000Z', startedAt: '', completedAt: '', createdBy: 'user_owner' },
      { id: 'task_5', restaurantId: 'rest_manolo', serviceId: 'svc_manolo_impulso', title: 'Confirmar enlace de reservas', description: 'El restaurante debe mandar el enlace correcto.', type: 'incidents', quantity: 1, status: 'waiting', priority: 'normal', assignedTo: 'user_diego', requestedAt: '2026-07-11T16:30:00.000Z', startedAt: '2026-07-11T17:00:00.000Z', completedAt: '', createdBy: 'user_owner' },
      { id: 'task_6', restaurantId: 'rest_mar', serviceId: 'svc_mar_presencia', title: 'Cambiar horario y telefono', description: 'Horario de verano y telefono de reservas.', type: 'small', quantity: 2, status: 'requested', priority: 'normal', assignedTo: 'user_alba', requestedAt: '2026-07-13T10:00:00.000Z', startedAt: '', completedAt: '', createdBy: 'user_owner' },
      { id: 'task_7', restaurantId: 'rest_savia', serviceId: 'svc_savia_menu', title: 'Menu recibido como audio', description: 'Pedir que lo envien por escrito.', type: 'incidents', quantity: 1, status: 'waiting', priority: 'high', assignedTo: 'user_lucia', requestedAt: '2026-07-13T06:45:00.000Z', startedAt: '', completedAt: '', createdBy: 'user_owner' },
    ],
    payments: [
      { id: 'pay_brasa_premium_jun', restaurantId: 'rest_brasa', serviceId: 'svc_brasa_premium', cycleStart: '2026-06-16', cycleEnd: '2026-07-15', dueDate: '2026-06-16', baseAmount: 269, ivaAmount: 56.49, irpfAmount: 40.35, invoiceTotal: 325.49, receivedAmount: 285.14, status: 'paid', method: 'Transferencia', notes: '', paidAt: '2026-06-17T08:00:00.000Z', sentToFiometra: true },
      { id: 'pay_brasa_menu_jun', restaurantId: 'rest_brasa', serviceId: 'svc_brasa_menu', cycleStart: '2026-06-16', cycleEnd: '2026-07-15', dueDate: '2026-06-16', baseAmount: 135, ivaAmount: 28.35, irpfAmount: 20.25, invoiceTotal: 163.35, receivedAmount: 143.1, status: 'paid', method: 'Transferencia', notes: '', paidAt: '2026-06-17T08:00:00.000Z', sentToFiometra: true },
      { id: 'pay_mar_presencia_jun', restaurantId: 'rest_mar', serviceId: 'svc_mar_presencia', cycleStart: '2026-06-28', cycleEnd: '2026-07-27', dueDate: '2026-06-28', baseAmount: 96, ivaAmount: 20.16, irpfAmount: 14.4, invoiceTotal: 116.16, receivedAmount: 101.76, status: 'paid', method: 'Transferencia', notes: '', paidAt: '2026-06-29T08:00:00.000Z', sentToFiometra: true },
      { id: 'pay_old_savia', restaurantId: 'rest_savia', serviceId: 'svc_savia_menu', cycleStart: '2026-06-21', cycleEnd: '2026-07-20', dueDate: '2026-06-21', baseAmount: 149, ivaAmount: 31.29, irpfAmount: 22.35, invoiceTotal: 180.29, receivedAmount: 157.94, status: 'paid', method: 'Transferencia', notes: '', paidAt: '2026-06-22T08:00:00.000Z', sentToFiometra: true },
    ],
    reports: [
      { id: 'rep_brasa_jun', restaurantId: 'rest_brasa', month: '2026-06', status: 'ready', generatedAt: '2026-06-16T10:30:00.000Z', summary: '34 trabajos, 2 incidencias, Premium + Menu Diario' },
      { id: 'rep_manolo_jun', restaurantId: 'rest_manolo', month: '2026-06', status: 'ready', generatedAt: '2026-06-10T09:30:00.000Z', summary: '19 trabajos, 1 incidencia, Plan Impulso' },
    ],
    reminders: [],
  };
}

function loadState() {
  const stored = localStorage.getItem(storageKey());
  if (!stored) {
    app.state = seedState();
    applyAuthUserToState();
    refreshBilling();
    saveState();
    return;
  }
  try {
    app.state = JSON.parse(stored);
    if (app.state.version !== 3) {
      app.state = seedState();
      applyAuthUserToState();
      refreshBilling();
      saveState();
      return;
    }
    app.state.settings ||= seedState().settings;
    app.state.members ||= [];
    app.state.restaurants ||= [];
    app.state.services ||= [];
    app.state.tasks ||= [];
    app.state.payments ||= [];
    app.state.reports ||= [];
    app.state.reminders ||= [];
    applyAuthUserToState();
    refreshBilling();
    saveState();
  } catch {
    app.state = seedState();
    applyAuthUserToState();
    refreshBilling();
    saveState();
  }
}

function saveState() {
  if (!app.state) return;
  localStorage.setItem(storageKey(), JSON.stringify(app.state));
}

function showToast(message) {
  const toast = $('#toast');
  toast.querySelector('p').textContent = message;
  toast.classList.add('show');
  clearTimeout(window.cuotlyToastTimer);
  window.cuotlyToastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function showView(name, options = {}) {
  app.view = name;
  if (options.restaurantId) app.selectedRestaurantId = options.restaurantId;
  $all('.view').forEach(view => view.classList.toggle('active', view.id === `view-${name}`));
  $all('.nav-item[data-view]').forEach(item => item.classList.toggle('active', item.dataset.view === name));
  closeDrawer();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeDrawer() {
  $('#sidebar')?.classList.remove('open');
  $('#drawerBackdrop')?.classList.remove('show');
}

function render() {
  refreshBilling();
  updateShell();
  const renderers = {
    inicio: renderHome,
    restaurantes: renderRestaurants,
    'restaurante-detalle': renderRestaurantDetail,
    trabajos: renderTasks,
    calendario: renderCalendar,
    pagos: renderPayments,
    informes: renderReports,
    equipo: renderTeam,
    planes: renderPlans,
    ajustes: renderSettings,
  };
  renderers[app.view]?.();
  saveState();
}

function updateShell() {
  const user = getCurrentUser();
  const restaurants = visibleRestaurants();
  const services = visibleServices();
  const tasks = app.state.tasks.filter(task => services.some(service => service.id === task.serviceId));
  const pendingTasks = tasks.filter(task => !['completed', 'cancelled'].includes(task.status)).length;
  const paymentIncidents = app.state.payments.filter(payment => ['late', 'suspended'].includes(payment.status) && services.some(service => service.id === payment.serviceId)).length;
  const alerts = getAlerts();
  $('#navRestaurants').textContent = restaurants.length;
  $('#navTasks').textContent = pendingTasks;
  $('#navPayments').textContent = paymentIncidents;
  $('#alertCount').textContent = alerts.length;
  $('#profileName').textContent = user.name;
  $('#profileRole').textContent = ROLE_LABELS[user.role] || user.role;
  $('#profileAvatar').textContent = initials(user.name);
  $('#topAvatar').textContent = initials(user.name);
}

function getAlerts() {
  const alerts = [];
  visibleServices().forEach(service => {
    const restaurant = restaurantById(service.restaurantId);
    const payment = app.state.payments.find(item => item.serviceId === service.id && item.cycleStart === iso(serviceCycleStart(service)));
    if (payment?.status === 'late') alerts.push({ type: 'payment', tone: 'red', title: `${restaurant.name} tiene un pago retrasado`, text: `${plan(service.planCode).name} · vence desde ${formatDate(payment.dueDate, { short: true, year: false })}` });
    if (payment?.status === 'suspended') alerts.push({ type: 'payment', tone: 'red', title: `${restaurant.name} esta suspendido`, text: 'Ha pasado el margen de pago configurado.' });
    const notice = cancellationNoticeDate(service);
    const today = parseDate(iso());
    if (notice >= today && notice <= addDays(today, 3)) alerts.push({ type: 'renewal', tone: 'amber', title: `Aviso de cancelacion de ${restaurant.name}`, text: `${plan(service.planCode).name} debe avisar antes del ${formatDate(notice, { short: true })}` });
    const totals = quotaTotals(service);
    if (totals.limit && totals.percent >= 80) alerts.push({ type: 'quota', tone: totals.percent >= 100 ? 'red' : 'amber', title: `${restaurant.name} se acerca al limite`, text: `${plan(service.planCode).name}: ${totals.used}/${totals.limit} consumidos` });
  });
  app.state.tasks
    .filter(task => task.status === 'waiting' && visibleServices().some(service => service.id === task.serviceId))
    .forEach(task => alerts.push({ type: 'waiting', tone: 'blue', title: `${task.title}`, text: `${restaurantById(task.restaurantId)?.name || 'Restaurante'} espera respuesta del cliente` }));
  return alerts;
}

function renderHome() {
  const services = visibleServices();
  const restaurants = visibleRestaurants();
  const tasks = app.state.tasks.filter(task => services.some(service => service.id === task.serviceId));
  const currentPayments = app.state.payments.filter(payment => services.some(service => service.id === payment.serviceId) && payment.cycleStart.startsWith(monthKey(new Date())));
  const activeServices = services.filter(service => service.status !== 'cancelled');
  const received = currentPayments.filter(payment => payment.status === 'paid').reduce((sum, payment) => sum + Number(payment.receivedAmount || 0), 0);
  const expected = currentPayments.reduce((sum, payment) => sum + Number(payment.receivedAmount || 0), 0);
  const pendingTasks = tasks.filter(task => !['completed', 'cancelled'].includes(task.status));
  const incidents = currentPayments.filter(payment => ['late', 'suspended'].includes(payment.status));
  const alerts = getAlerts();
  $('#view-inicio').innerHTML = `
    <div class="page-heading">
      <div><p class="eyebrow">${new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date()).toUpperCase()}</p><h1>Buenos dias, ${esc(getCurrentUser().name.split(' ')[0])}</h1><p>Esto es lo que necesita tu atencion hoy.</p></div>
      <button class="primary-button" data-action="open-restaurant-modal"><span>＋</span> Anadir restaurante</button>
    </div>
    <div class="summary-grid">
      <article class="summary-card balance-card"><div class="summary-top"><span class="summary-icon mint">€</span><span class="trend up">${Math.round((received / Math.max(expected, 1)) * 100)}%</span></div><p>Cobrado este mes</p><h2>${euro(received)}</h2><small>Neto recibido con IVA e IRPF aplicado</small></article>
      <article class="summary-card"><div class="summary-top"><span class="summary-icon blue">▦</span><span class="trend neutral">${activeServices.length} servicios</span></div><p>Restaurantes activos</p><h2>${restaurants.length}</h2><small>${services.filter(s => s.planCode !== 'menu').length} planes web · ${services.filter(s => s.planCode === 'menu').length} Menu Diario</small></article>
      <article class="summary-card"><div class="summary-top"><span class="summary-icon amber">✓</span><span class="trend warning">${pendingTasks.filter(task => task.priority === 'high').length} urgentes</span></div><p>Trabajos pendientes</p><h2>${pendingTasks.length}</h2><small>${tasks.filter(task => task.status === 'completed' && task.completedAt?.startsWith(iso())).length} completados hoy</small></article>
      <article class="summary-card"><div class="summary-top"><span class="summary-icon rose">!</span><span class="trend danger">Revisar</span></div><p>Pagos con incidencia</p><h2>${incidents.length}</h2><small>${currentPayments.filter(payment => payment.status === 'late').length} retrasados · ${currentPayments.filter(payment => payment.status === 'suspended').length} suspendidos</small></article>
    </div>
    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-heading"><div><p class="eyebrow">AVISOS</p><h3>Atencion prioritaria</h3></div><button class="text-button" data-action="show-alerts">Ver todo</button></div>
        ${alerts.length ? alerts.slice(0, 6).map(alert => `
          <div class="attention-row">
            <span class="status-dot ${alert.tone}"></span>
            <div class="attention-main"><strong>${esc(alert.title)}</strong><p>${esc(alert.text)}</p></div>
            <div class="attention-meta"><strong>${esc(alert.type)}</strong><small>Ahora</small></div>
            <button class="small-button" data-view-target="${alert.type === 'payment' ? 'pagos' : 'trabajos'}">Abrir</button>
          </div>
        `).join('') : emptyState('✓', 'Sin avisos importantes', 'Todo esta controlado ahora mismo.')}
      </section>
      <section class="panel">
        <div class="panel-heading"><div><p class="eyebrow">CARGA</p><h3>Equipo</h3></div><button class="text-button" data-view-target="equipo">Gestionar</button></div>
        <div class="workload-list">${app.state.members.filter(m => m.active).map(memberLoad).join('')}</div>
        <div class="load-legend"><span><i class="legend-dot green"></i>Normal</span><span><i class="legend-dot orange"></i>Alta</span></div>
      </section>
    </div>
    <section class="panel restaurant-preview">
      <div class="panel-heading"><div><p class="eyebrow">CLIENTES</p><h3>Restaurantes con mantenimiento</h3></div><button class="text-button" data-view-target="restaurantes">Ver todos →</button></div>
      <div class="table-scroll"><div class="restaurant-table">${restaurantTable(restaurants.slice(0, 6))}</div></div>
    </section>
  `;
}

function memberLoad(member) {
  const tasks = app.state.tasks.filter(task => task.assignedTo === member.id && !['completed', 'cancelled'].includes(task.status));
  const services = app.state.services.filter(service => service.assignedTo === member.id && service.status !== 'cancelled');
  const percent = Math.min(100, tasks.length * 16 + services.length * 8);
  return `
    <div class="member-load">
      <span class="avatar ${member.role === 'owner' ? 'avatar-green' : member.role === 'admin' ? 'peach' : 'sky'}">${initials(member.name)}</span>
      <div><strong>${esc(member.name)}</strong><span class="progress"><i style="width:${percent}%"></i></span></div>
      <b>${tasks.length}</b>
    </div>
  `;
}

function restaurantTable(restaurants) {
  return `
    <div class="table-row table-head"><span>Restaurante</span><span>Servicios</span><span>Renovacion</span><span>Responsable</span><span>Estado</span><span></span></div>
    ${restaurants.map(restaurant => {
      const services = servicesForRestaurant(restaurant.id);
      const mainService = services[0];
      const renewal = mainService ? formatDate(serviceCycleEnd(mainService), { short: true, year: false }) : 'Sin servicio';
      return `
        <button class="table-row restaurant-link" data-action="open-restaurant" data-id="${restaurant.id}">
          <span class="restaurant-name"><i class="restaurant-logo ${logoClass(restaurant.id)}">${initials(restaurant.name)}</i><span><strong>${esc(restaurant.name)}</strong><small>${esc(restaurant.city || restaurant.address || '')}</small></span></span>
          <span>${services.map(servicePill).join('') || '<i class="status-pill pending">Sin servicio</i>'}</span>
          <span><strong>${renewal}</strong><small>${mainService ? `Avisar ${formatDate(cancellationNoticeDate(mainService), { short: true, year: false })}` : ''}</small></span>
          <span>${services.map(service => assignedLabel(service.assignedTo)).join('') || '-'}</span>
          <span>${statusPill(mainService?.status || restaurant.status)}</span>
          <span>→</span>
        </button>
      `;
    }).join('')}
  `;
}

function logoClass(id) {
  const classes = ['gold', 'teal', 'blue-logo', 'green-logo'];
  return classes[Math.abs(hash(id)) % classes.length];
}

function hash(value) {
  return String(value).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function servicePill(service) {
  return `<i class="service-pill ${plan(service.planCode).className}">${esc(plan(service.planCode).name)}</i>`;
}

function statusPill(status) {
  const className = status === 'active' ? 'active' : status === 'late' ? 'late' : status === 'suspended' ? 'late' : status === 'paid' ? 'active' : status === 'ready' ? 'ready' : 'pending';
  const labels = { active: 'Activo', late: 'Retrasado', suspended: 'Suspendido', cancelled: 'Cancelado', pending: 'Sin pagar', paid: 'Pagado', ready: 'Listo' };
  return `<i class="status-pill ${className}">${labels[status] || esc(status)}</i>`;
}

function assignedLabel(memberId) {
  const member = memberById(memberId);
  if (!member) return '';
  return `<strong class="assigned"><i class="avatar tiny ${member.role === 'admin' ? 'peach' : 'sky'}">${initials(member.name)}</i>${esc(member.name)}</strong>`;
}

function renderRestaurants() {
  const query = app.search.trim().toLowerCase();
  const restaurants = visibleRestaurants().filter(restaurant => !query || `${restaurant.name} ${restaurant.email} ${restaurant.phone}`.toLowerCase().includes(query));
  $('#view-restaurantes').innerHTML = `
    <div class="page-heading compact"><div><p class="eyebrow">CLIENTES</p><h1>Restaurantes</h1><p>Ficha completa de planes, Menu Diario, pagos y trabajos.</p></div><button class="primary-button" data-action="open-restaurant-modal">＋ Anadir restaurante</button></div>
    <div class="toolbar">
      <label class="filter-search"><span>⌕</span><input value="${esc(app.search)}" data-action="search-input" placeholder="Buscar restaurante..."></label>
      <div class="toolbar-right"><button class="secondary-button" data-action="open-service-modal">＋ Anadir servicio</button><button class="secondary-button" data-action="export-restaurants">Exportar</button></div>
    </div>
    <div class="restaurant-card-grid">${restaurants.map(restaurantCard).join('') || emptyState('▦', 'No hay restaurantes', 'Anade el primer cliente para empezar.')}</div>
  `;
}

function restaurantCard(restaurant) {
  const services = servicesForRestaurant(restaurant.id);
  const tasks = app.state.tasks.filter(task => task.restaurantId === restaurant.id && !['completed', 'cancelled'].includes(task.status));
  const paymentIssues = app.state.payments.filter(payment => payment.restaurantId === restaurant.id && ['late', 'suspended'].includes(payment.status));
  const usage = services.reduce((sum, service) => sum + quotaTotals(service).percent, 0) / Math.max(services.length, 1);
  return `
    <article class="restaurant-card ${paymentIssues.length ? 'alert-card' : ''}" data-action="open-restaurant" data-id="${restaurant.id}">
      <div class="restaurant-card-top"><i class="restaurant-logo large ${logoClass(restaurant.id)}">${initials(restaurant.name)}</i>${statusPill(paymentIssues.length ? 'late' : 'active')}</div>
      <h3>${esc(restaurant.name)}</h3>
      <p>${esc(restaurant.address || restaurant.email || '')}</p>
      <div class="service-line">${services.map(servicePill).join('') || '<i class="status-pill pending">Sin servicio</i>'}</div>
      <div class="card-divider"></div>
      <div class="card-stats">
        <span><small>Trabajos</small><strong>${tasks.length}</strong></span>
        <span><small>Pago</small><strong>${paymentIssues.length ? 'Revisar' : 'OK'}</strong></span>
        <span><small>Uso</small><strong>${Math.round(usage)}%</strong></span>
      </div>
      <div class="usage-mini ${usage > 90 ? 'danger-use' : ''}"><span><b>${Math.round(usage)}%</b> de cuotas usadas</span><span class="mini-bar"><i style="width:${Math.min(100, usage)}%"></i></span></div>
      <button class="card-link">Abrir ficha <span>→</span></button>
    </article>
  `;
}

function renderRestaurantDetail() {
  const restaurants = visibleRestaurants();
  if (!app.selectedRestaurantId || !restaurants.some(item => item.id === app.selectedRestaurantId)) app.selectedRestaurantId = restaurants[0]?.id;
  const restaurant = restaurantById(app.selectedRestaurantId);
  if (!restaurant) {
    $('#view-restaurante-detalle').innerHTML = emptyState('▦', 'Sin restaurantes visibles', 'Cuando tengas clientes apareceran aqui.');
    return;
  }
  const services = servicesForRestaurant(restaurant.id);
  const tabs = ['servicios', 'trabajos', 'meses', 'archivos'];
  $('#view-restaurante-detalle').innerHTML = `
    <button class="back-button" data-view-target="restaurantes">← Volver a restaurantes</button>
    <div class="detail-header">
      <div class="detail-identity">
        <i class="restaurant-logo xl ${logoClass(restaurant.id)}">${initials(restaurant.name)}</i>
        <div><div class="title-with-status"><h1>${esc(restaurant.name)}</h1>${statusPill(restaurant.status)}</div><p>${esc(restaurant.address || '')}</p><div class="contact-line"><span>${esc(restaurant.email || '')}</span><i></i><span>${esc(restaurant.phone || '')}</span></div></div>
      </div>
      <div class="detail-actions"><button class="secondary-button" data-action="open-restaurant-modal" data-id="${restaurant.id}">Editar ficha</button><button class="primary-button" data-action="open-task-modal" data-restaurant="${restaurant.id}">＋ Nuevo cambio</button></div>
    </div>
    <div class="detail-tabs">${tabs.map(tab => `<button class="${app.detailTab === tab ? 'active' : ''}" data-action="detail-tab" data-tab="${tab}">${tabLabel(tab)}</button>`).join('')}</div>
    ${detailTabContent(restaurant, services)}
  `;
  if (canManage()) {
    $('#view-restaurante-detalle .detail-actions')?.insertAdjacentHTML('beforeend', `<button class="secondary-button danger-outline" data-action="delete-restaurant" data-id="${restaurant.id}">Borrar restaurante</button>`);
  }
}

function tabLabel(tab) {
  return { servicios: 'Servicios', trabajos: 'Trabajos', meses: 'Ficha mensual', archivos: 'Informes y archivos' }[tab] || tab;
}

function detailTabContent(restaurant, services) {
  if (app.detailTab === 'trabajos') return restaurantTasksTab(restaurant, services);
  if (app.detailTab === 'meses') return restaurantMonthsTab(restaurant);
  if (app.detailTab === 'archivos') return restaurantFilesTab(restaurant);
  return `
    <div class="detail-layout">
      <div class="detail-main">
        ${services.map(serviceCard).join('') || emptyState('◇', 'Sin servicios activos', 'Anade un plan o Menu Diario a este restaurante.')}
      </div>
      <aside class="detail-aside">
        ${renewalPanel(services[0])}
        ${teamPanel(services)}
        ${reportPanel(restaurant)}
      </aside>
    </div>
  `;
}

function serviceCard(service) {
  const p = plan(service.planCode);
  const restaurant = restaurantById(service.restaurantId);
  const usage = quotaUsage(service);
  const totals = quotaTotals(service);
  const amounts = paymentAmounts(Number(service.monthlyBase || p.price));
  return `
    <section class="service-card ${service.planCode === 'menu' ? 'menu-service' : 'premium-service'}">
      <div class="service-header">
        <div><span class="service-icon">${service.planCode === 'menu' ? '▤' : '◇'}</span><div><p>${esc(p.label)}</p><h3>${esc(p.name)}</h3></div></div>
        ${statusPill(service.status)}
      </div>
      <div class="service-contract">
        <span><small>Precio base</small><strong>${euro(service.monthlyBase)} <i>+ IVA</i></strong></span>
        <span><small>Cobro neto</small><strong>${euro(amounts.received)} <i>IVA ${app.state.settings.ivaRate}% · IRPF ${app.state.settings.irpfRate}%</i></strong></span>
        <span><small>Compromiso</small><strong>${service.commitmentMonths} mes${service.commitmentMonths > 1 ? 'es' : ''} <i>${service.autoRenew ? 'renueva igual' : 'sin renovacion'}</i></strong></span>
        <span><small>Responsable</small>${assignedLabel(service.assignedTo)}</span>
      </div>
      <div class="quota-heading"><h4>Cuotas del ciclo actual</h4><span>${formatDate(serviceCycleStart(service), { short: true })} - ${formatDate(serviceCycleEnd(service), { short: true })}</span></div>
      <div class="quota-grid">
        ${Object.entries(usage).map(([key, item]) => quotaItem(key, item)).join('')}
      </div>
      <div class="service-actions">
        <button class="small-button" data-action="open-task-modal" data-restaurant="${service.restaurantId}" data-service="${service.id}">Registrar cambio</button>
        ${canManage() ? `<button class="small-button" data-action="open-service-modal" data-id="${service.id}">Editar servicio</button><button class="small-button" data-action="open-plan-change-modal" data-id="${service.id}">Cambiar plan</button><button class="small-button danger-text" data-action="cancel-service" data-id="${service.id}">Cancelar</button>` : ''}
      </div>
      <div class="service-note">Uso total: ${totals.used}/${totals.limit} (${totals.percent}%). ${restaurant ? esc(restaurant.name) : ''}</div>
    </section>
  `;
}

function quotaItem(key, item) {
  const percent = item.limit ? Math.min(100, Math.round((item.used / item.limit) * 100)) : 0;
  return `
    <article class="quota-item">
      <div class="quota-number"><strong>${item.limit - item.used}</strong><span>de ${item.limit}</span></div>
      <p>${esc(taskTypeLabel(key))}</p>
      <span class="quota-bar ${percent >= 100 ? 'full' : ''}"><i style="width:${percent}%"></i></span>
      <small>${item.used} usados</small>
    </article>
  `;
}

function renewalPanel(service) {
  if (!service) return `<section class="panel no-shadow next-renewal"><p class="eyebrow">RENOVACION</p><p>Sin servicio activo.</p></section>`;
  const end = serviceCycleEnd(service);
  const notice = cancellationNoticeDate(service);
  return `
    <section class="panel no-shadow next-renewal">
      <p class="eyebrow">PROXIMA RENOVACION</p>
      <div class="date-block"><strong>${String(end.getDate()).padStart(2, '0')}</strong><span>${new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(end).toUpperCase()}<br>${end.getFullYear()}</span></div>
      <p>${service.autoRenew ? `Renueva automaticamente por ${service.commitmentMonths} mes${service.commitmentMonths > 1 ? 'es' : ''}.` : 'No renovara automaticamente.'}</p>
      <div class="renewal-warning">Avisar antes del ${formatDate(notice, { short: true })} para cancelar.</div>
      <button class="secondary-button full-width" data-action="open-service-modal" data-id="${service.id}">Gestionar renovacion</button>
    </section>
  `;
}

function teamPanel(services) {
  return `
    <section class="panel no-shadow">
      <div class="panel-heading"><h3>Equipo asignado</h3>${canManage() ? '<button class="icon-button" data-action="open-service-modal">＋</button>' : ''}</div>
      ${services.map(service => {
        const member = memberById(service.assignedTo);
        return `<div class="assigned-member"><span class="avatar ${member?.role === 'admin' ? 'peach' : 'sky'}">${initials(member?.name)}</span><div><strong>${esc(member?.name || 'Sin asignar')}</strong><small>${esc(plan(service.planCode).name)} · Responsable</small></div><button class="icon-button" data-action="open-service-modal" data-id="${service.id}">⋮</button></div>`;
      }).join('') || '<div class="assigned-member"><div><strong>Sin responsables</strong><small>Anade un servicio para asignar equipo.</small></div></div>'}
    </section>
  `;
}

function reportPanel(restaurant) {
  const report = app.state.reports.filter(item => item.restaurantId === restaurant.id).sort((a, b) => b.month.localeCompare(a.month))[0];
  return `
    <section class="panel no-shadow">
      <div class="panel-heading"><h3>Informe mensual</h3>${report ? statusPill(report.status) : '<span></span>'}</div>
      <div class="report-preview"><span>PDF</span><div><strong>${report ? `Informe ${report.month}` : 'Sin informe'}</strong><small>${report ? `Generado ${formatDateTime(report.generatedAt)}` : 'Genera el primer informe mensual'}</small></div></div>
      <button class="primary-button full-width" data-action="${report ? 'download-report' : 'generate-report'}" data-id="${report?.id || restaurant.id}">${report ? '↓ Descargar informe' : 'Generar informe'}</button>
    </section>
  `;
}

function restaurantTasksTab(restaurant, services) {
  const serviceIds = new Set(services.map(service => service.id));
  const tasks = app.state.tasks.filter(task => serviceIds.has(task.serviceId)).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  return `
    <section class="panel no-shadow recent-work">
      <div class="panel-heading"><div><p class="eyebrow">ACTIVIDAD</p><h3>Trabajos de ${esc(restaurant.name)}</h3></div><button class="primary-button" data-action="open-task-modal" data-restaurant="${restaurant.id}">＋ Registrar cambio</button></div>
      <div class="timeline">${tasks.map(timelineRow).join('') || emptyState('✓', 'Sin trabajos', 'Todavia no hay cambios registrados.')}</div>
    </section>
  `;
}

function restaurantMonthsTab(restaurant) {
  const months = lastMonths(6);
  return `<div class="month-grid">${months.map(month => monthCard(restaurant, month)).join('')}</div>`;
}

function monthCard(restaurant, month) {
  const tasks = app.state.tasks.filter(task => task.restaurantId === restaurant.id && (task.completedAt || task.requestedAt || '').startsWith(month));
  const completed = tasks.filter(task => task.status === 'completed').length;
  const incidents = tasks.filter(task => task.type === 'incidents').length;
  return `
    <article>
      <span>${month}</span>
      <h3>${tasks.length} trabajos</h3>
      <p>${completed} completados · ${incidents} incidencias</p>
      <button data-action="generate-report" data-id="${restaurant.id}" data-month="${month}">Generar ficha →</button>
    </article>
  `;
}

function restaurantFilesTab(restaurant) {
  const reports = app.state.reports.filter(item => item.restaurantId === restaurant.id).sort((a, b) => b.month.localeCompare(a.month));
  return `
    <div class="report-grid">${reports.map(reportCard).join('') || emptyState('▤', 'Sin informes', 'Genera fichas mensuales para comparar meses.')}</div>
  `;
}

function lastMonths(amount) {
  const months = [];
  let cursor = startOfMonth(new Date());
  for (let i = 0; i < amount; i += 1) {
    months.push(monthKey(cursor));
    cursor = addMonths(cursor, -1);
  }
  return months;
}

function timelineRow(task) {
  const service = app.state.services.find(item => item.id === task.serviceId);
  const canDeleteTask = canManage() || task.assignedTo === app.state.currentUserId;
  return `
    <div class="timeline-row">
      <span class="${task.status === 'completed' ? 'timeline-check' : 'timeline-wait'}">${task.status === 'completed' ? '✓' : '◷'}</span>
      <div><strong>${esc(task.title)}</strong><p>${esc(taskTypeLabel(task.type))} · ${esc(plan(service?.planCode).name)} · ${esc(STATUS_LABELS[task.status])}</p>${canDeleteTask ? `<button class="small-button danger-text" data-action="delete-task" data-id="${task.id}">Borrar</button>` : ''}</div>
      <time>${formatDateTime(task.completedAt || task.startedAt || task.requestedAt)}</time>
    </div>
  `;
}

function renderTasks() {
  const services = visibleServices();
  let tasks = app.state.tasks.filter(task => services.some(service => service.id === task.serviceId));
  if (app.taskFilter === 'mine') tasks = tasks.filter(task => task.assignedTo === app.state.currentUserId);
  if (app.taskFilter === 'urgent') tasks = tasks.filter(task => task.priority === 'high');
  const columns = [
    ['requested', 'Solicitados'],
    ['assigned', 'Asignados'],
    ['in_progress', 'En proceso'],
    ['waiting', 'Esperando cliente'],
    ['completed', 'Completados'],
  ];
  $('#view-trabajos').innerHTML = `
    <div class="page-heading compact"><div><p class="eyebrow">OPERACIONES</p><h1>Trabajos</h1><p>Cambios, revisiones e incidencias de todos los restaurantes.</p></div><button class="primary-button" data-action="open-task-modal">＋ Nuevo cambio</button></div>
    <div class="task-stats">
      <span><strong>${tasks.filter(t => t.status === 'requested').length}</strong>Solicitados</span>
      <span><strong>${tasks.filter(t => t.status === 'in_progress').length}</strong>En proceso</span>
      <span><strong>${tasks.filter(t => t.status === 'waiting').length}</strong>Esperando cliente</span>
      <span><strong>${tasks.filter(t => t.status === 'completed').length}</strong>Completados</span>
    </div>
    <div class="toolbar"><div class="filter-group"><button class="filter-button ${app.taskFilter === 'all' ? 'active' : ''}" data-action="task-filter" data-filter="all">Todos</button><button class="filter-button ${app.taskFilter === 'mine' ? 'active' : ''}" data-action="task-filter" data-filter="mine">Mis trabajos</button><button class="filter-button ${app.taskFilter === 'urgent' ? 'active' : ''}" data-action="task-filter" data-filter="urgent">Urgentes</button></div><button class="secondary-button" data-action="export-tasks">Exportar</button></div>
    <div class="kanban">${columns.map(([status, label]) => taskColumn(status, label, tasks.filter(task => task.status === status))).join('')}</div>
  `;
}

function taskColumn(status, label, tasks) {
  return `
    <section class="kanban-column ${status === 'completed' ? 'completed-column' : ''}">
      <div class="kanban-title"><h3>${label} <b>${tasks.length}</b></h3><button data-action="open-task-modal">＋</button></div>
      ${tasks.map(taskCard).join('') || '<div class="soft-empty">Sin trabajos</div>'}
    </section>
  `;
}

function taskCard(task) {
  const restaurant = restaurantById(task.restaurantId);
  const service = app.state.services.find(item => item.id === task.serviceId);
  const member = memberById(task.assignedTo);
  const nextAction = task.status === 'requested' || task.status === 'assigned' ? 'start-task' : task.status === 'in_progress' || task.status === 'waiting' ? 'complete-task' : '';
  const canDeleteTask = canManage() || task.assignedTo === app.state.currentUserId;
  return `
    <article class="task-card ${task.priority === 'high' ? 'urgent' : ''} ${task.status === 'waiting' ? 'waiting' : ''} ${task.status === 'completed' ? 'done' : ''}">
      <div><span class="task-type ${plan(service?.planCode).className}">${esc(taskTypeLabel(task.type))} ×${Number(task.quantity || 1)}</span><button data-action="open-task-modal" data-id="${task.id}">⋮</button></div>
      <h4>${esc(task.title)}</h4>
      <p>${esc(restaurant?.name || '')} · ${esc(plan(service?.planCode).name)}</p>
      <div class="task-footer"><span class="avatar tiny ${member?.role === 'admin' ? 'peach' : 'sky'}">${initials(member?.name || '?')}</span><time>${formatDateTime(task.completedAt || task.startedAt || task.requestedAt)}</time></div>
      <div class="task-actions">
        ${nextAction ? `<button class="small-button" data-action="${nextAction}" data-id="${task.id}">${nextAction === 'start-task' ? 'Empezar' : 'Completar'}</button>` : ''}
        ${task.status !== 'completed' && task.status !== 'cancelled' ? `<button class="small-button" data-action="wait-task" data-id="${task.id}">Esperar</button>` : ''}
        ${canDeleteTask ? `<button class="small-button danger-text" data-action="delete-task" data-id="${task.id}">Borrar</button>` : ''}
      </div>
    </article>
  `;
}

function renderCalendar() {
  const monthStart = app.calendarMonth;
  const monthEnd = endOfMonth(monthStart);
  const start = addDays(monthStart, -((monthStart.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => addDays(start, index));
  const events = calendarEvents(monthStart, monthEnd);
  $('#view-calendario').innerHTML = `
    <div class="page-heading compact"><div><p class="eyebrow">PLANIFICACION</p><h1>Calendario</h1><p>Renovaciones, trabajos, fechas de cobro y avisos.</p></div><button class="primary-button" data-action="open-task-modal">＋ Nuevo cambio</button></div>
    <div class="calendar-layout">
      <section class="panel calendar-panel">
        <div class="calendar-toolbar"><button data-action="calendar-prev">‹</button><h2>${new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(monthStart)}</h2><button data-action="calendar-next">›</button><button class="today-button" data-action="calendar-today">Hoy</button></div>
        <div class="calendar-grid">
          ${['LUN','MAR','MIE','JUE','VIE','SAB','DOM'].map(day => `<span class="week-day">${day}</span>`).join('')}
          ${days.map(day => calendarDay(day, monthStart, events)).join('')}
        </div>
      </section>
      <aside class="panel agenda"><div class="panel-heading"><h3>Proximos eventos</h3><button class="icon-button" data-action="calendar-today">⌂</button></div>${events.slice(0, 8).map(event => `<div class="agenda-day"><span>${formatDate(event.date, { short: true, year: false }).toUpperCase()}</span><article><i class="agenda-dot ${event.tone}"></i><div><strong>${esc(event.title)}</strong><p>${esc(event.text)}</p></div></article></div>`).join('') || emptyState('□', 'Sin eventos', 'Este mes no hay eventos destacados.')}</aside>
    </div>
  `;
}

function calendarEvents(monthStart, monthEnd) {
  const services = visibleServices();
  const events = [];
  services.forEach(service => {
    const restaurant = restaurantById(service.restaurantId);
    const renewal = serviceCycleEnd(service);
    const notice = cancellationNoticeDate(service);
    const payment = app.state.payments.find(item => item.serviceId === service.id && item.cycleStart === iso(serviceCycleStart(service)));
    if (renewal >= monthStart && renewal <= monthEnd) events.push({ date: renewal, tone: 'green', title: `Renovacion ${restaurant?.name}`, text: plan(service.planCode).name, kind: 'renew' });
    if (notice >= monthStart && notice <= monthEnd) events.push({ date: notice, tone: 'amber', title: `Limite cancelacion`, text: `${restaurant?.name} · ${plan(service.planCode).name}`, kind: 'notice' });
    if (payment) {
      const due = parseDate(payment.dueDate);
      if (due >= monthStart && due <= monthEnd) events.push({ date: due, tone: payment.status === 'paid' ? 'green' : payment.status === 'late' ? 'amber' : 'blue', title: `Cobro ${restaurant?.name}`, text: `${euro(payment.invoiceTotal)} factura · ${euro(payment.receivedAmount)} neto`, kind: 'payment' });
    }
  });
  app.state.tasks
    .filter(task => visibleServices().some(service => service.id === task.serviceId))
    .forEach(task => {
      const date = new Date(task.requestedAt);
      if (date >= monthStart && date <= monthEnd) events.push({ date, tone: task.priority === 'high' ? 'amber' : 'blue', title: task.title, text: restaurantById(task.restaurantId)?.name || '', kind: 'task' });
    });
  return events.sort((a, b) => a.date - b.date);
}

function calendarDay(day, monthStart, events) {
  const dayEvents = events.filter(event => iso(event.date) === iso(day));
  const muted = day.getMonth() !== monthStart.getMonth();
  const today = iso(day) === iso();
  const event = dayEvents[0];
  return `<span class="${muted ? 'muted-day' : ''} ${today ? 'today' : ''} ${event ? `${event.kind}-event event-day` : ''}">${day.getDate()}${event ? `<i>${esc(dayEvents.length > 1 ? `${dayEvents.length} eventos` : event.title)}</i>` : ''}</span>`;
}

function renderPayments() {
  const services = visibleServices();
  let payments = app.state.payments.filter(payment => services.some(service => service.id === payment.serviceId));
  if (app.paymentFilter !== 'all') payments = payments.filter(payment => payment.status === app.paymentFilter);
  payments = payments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const currentMonth = monthKey(new Date());
  const monthPayments = app.state.payments.filter(payment => payment.cycleStart.startsWith(currentMonth) && services.some(service => service.id === payment.serviceId));
  const planned = monthPayments.reduce((sum, item) => sum + Number(item.receivedAmount || 0), 0);
  const paid = monthPayments.filter(item => item.status === 'paid').reduce((sum, item) => sum + Number(item.receivedAmount || 0), 0);
  const pending = monthPayments.filter(item => item.status !== 'paid').reduce((sum, item) => sum + Number(item.receivedAmount || 0), 0);
  $('#view-pagos').innerHTML = `
    <div class="page-heading compact"><div><p class="eyebrow">SEGUIMIENTO MANUAL</p><h1>Pagos</h1><p>Cada pago calcula base, IVA, IRPF y neto recibido.</p></div><button class="secondary-button" data-action="export-payments">↓ Exportar listado</button></div>
    <div class="payment-summary"><article><small>Previsto este mes</small><h2>${euro(planned)}</h2><span>Neto recibido</span></article><article><small>Cobrado</small><h2>${euro(paid)}</h2><span>${Math.round((paid / Math.max(planned, 1)) * 100)}%</span></article><article class="payment-alert"><small>Pendiente o retrasado</small><h2>${euro(pending)}</h2><span>${monthPayments.filter(p => p.status !== 'paid').length} pagos</span></article></div>
    <section class="panel payment-panel"><div class="toolbar"><div class="filter-group">${['all','paid','pending','late','suspended'].map(status => `<button class="filter-button ${app.paymentFilter === status ? 'active' : ''}" data-action="payment-filter" data-filter="${status}">${status === 'all' ? 'Todos' : PAYMENT_LABELS[status]}</button>`).join('')}</div><button class="select-button">${new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date())}</button></div><div class="payment-table table-scroll">${paymentTable(payments)}</div></section>
  `;
}

function paymentTable(payments) {
  return `
    <div class="payment-row payment-head"><span>Restaurante</span><span>Servicio</span><span>Vencimiento</span><span>Factura</span><span>Estado</span><span></span></div>
    ${payments.map(payment => {
      const restaurant = restaurantById(payment.restaurantId);
      const service = app.state.services.find(item => item.id === payment.serviceId);
      return `
        <div class="payment-row">
          <span class="restaurant-name"><i class="restaurant-logo ${logoClass(payment.restaurantId)}">${initials(restaurant?.name)}</i><strong>${esc(restaurant?.name || '')}</strong></span>
          <span>${esc(plan(service?.planCode).name)}<small>Base ${euro(payment.baseAmount)} · IVA ${euro(payment.ivaAmount)} · IRPF ${euro(payment.irpfAmount)}</small></span>
          <span><strong>${formatDate(payment.dueDate, { short: true })}</strong><small>Ciclo ${formatDate(payment.cycleStart, { short: true, year: false })} - ${formatDate(payment.cycleEnd, { short: true, year: false })}</small></span>
          <span><strong>${euro(payment.invoiceTotal)}</strong><small>Neto ${euro(payment.receivedAmount)}</small></span>
          <span>${statusPill(payment.status)}</span>
          <span class="row-actions">${payment.status !== 'paid' ? `<button class="small-button payment-done" data-action="mark-paid" data-id="${payment.id}">Marcar pagado</button>` : `<button class="small-button" data-action="toggle-fiometra" data-id="${payment.id}">${payment.sentToFiometra ? 'En Fiometra' : 'Pasar a Fiometra'}</button>`}</span>
        </div>
      `;
    }).join('') || emptyState('€', 'Sin pagos', 'Los pagos se crean segun el aniversario de cada servicio.')}
  `;
}

function renderReports() {
  const restaurants = visibleRestaurants();
  let reports = app.state.reports.filter(report => restaurants.some(restaurant => restaurant.id === report.restaurantId));
  if (app.reportFilter !== 'all') reports = reports.filter(report => report.restaurantId === app.reportFilter);
  reports = reports.sort((a, b) => b.month.localeCompare(a.month));
  $('#view-informes').innerHTML = `
    <div class="page-heading compact"><div><p class="eyebrow">DOCUMENTACION</p><h1>Informes mensuales</h1><p>Historial de servicio descargable en PDF por restaurante.</p></div><button class="primary-button" data-action="open-report-modal">＋ Generar informe</button></div>
    <div class="toolbar"><div class="filter-group"><button class="filter-button ${app.reportFilter === 'all' ? 'active' : ''}" data-action="report-filter" data-filter="all">Todos</button>${restaurants.map(restaurant => `<button class="filter-button ${app.reportFilter === restaurant.id ? 'active' : ''}" data-action="report-filter" data-filter="${restaurant.id}">${esc(restaurant.name)}</button>`).join('')}</div></div>
    <div class="report-grid">${reports.map(reportCard).join('') || emptyState('PDF', 'Sin informes', 'Genera un informe mensual cuando termine el ciclo.')}</div>
  `;
}

function reportCard(report) {
  const restaurant = restaurantById(report.restaurantId);
  return `
    <article class="report-card">
      <div class="report-cover ${logoClass(report.restaurantId).includes('blue') ? 'blue-cover' : 'teal-cover'}"><span>${report.month.slice(5)}</span><b>${report.month.slice(0, 4)}</b></div>
      <div>${statusPill(report.status)}<h3>${esc(restaurant?.name || '')}</h3><p>${esc(report.summary || 'Informe mensual')}</p><small>Generado ${formatDateTime(report.generatedAt)}</small></div>
      <button class="icon-button" data-action="download-report" data-id="${report.id}">↓</button>
    </article>
  `;
}

function renderTeam() {
  $('#view-equipo').innerHTML = `
    <div class="page-heading compact"><div><p class="eyebrow">PERSONAS Y PERMISOS</p><h1>Equipo</h1><p>El propietario y administradores gestionan miembros y asignaciones.</p></div>${canManage() ? '<button class="primary-button" data-action="open-member-modal">＋ Invitar miembro</button>' : ''}</div>
    <div class="team-grid">${app.state.members.filter(member => member.active).map(teamCard).join('')}</div>
  `;
}

function teamCard(member) {
  const services = app.state.services.filter(service => service.assignedTo === member.id && service.status !== 'cancelled');
  const tasks = app.state.tasks.filter(task => task.assignedTo === member.id && !['completed', 'cancelled'].includes(task.status));
  const canRemove = canManage() && member.role !== 'owner' && member.id !== app.state.currentUserId;
  return `
    <article class="team-card ${member.role === 'owner' ? 'owner-card' : ''}">
      <div class="team-top"><span class="avatar big ${member.role === 'owner' ? 'avatar-green' : member.role === 'admin' ? 'peach' : 'sky'}">${initials(member.name)}</span><span class="role-pill ${member.role}">${ROLE_LABELS[member.role]}</span></div>
      <h3>${esc(member.name)}</h3><p>${esc(member.email)}</p>
      <div class="team-stats"><span><strong>${services.length}</strong>Servicios</span><span><strong>${tasks.length}</strong>Pendientes</span></div>
      <button class="secondary-button full-width" data-action="open-member-modal" data-id="${member.id}">Gestionar permisos</button>
      ${canRemove ? `<button class="secondary-button full-width danger-outline" data-action="remove-member" data-id="${member.id}">Expulsar miembro</button>` : ''}
    </article>
  `;
}

function renderPlans() {
  $('#view-planes').innerHTML = `
    <div class="page-heading compact"><div><p class="eyebrow">CATALOGO INTERNO</p><h1>Planes y servicios</h1><p>Precios, limites y condiciones configurados en Cuotly.</p></div><button class="secondary-button" data-action="open-settings-prices">Editar impuestos</button></div>
    <div class="plan-grid">${Object.values(PLAN_CATALOG).map(planCard).join('')}</div>
  `;
}

function planCard(p) {
  return `
    <article class="plan-card ${p.className}-plan ${p.code === 'impulso' ? 'popular' : ''}">
      ${p.code === 'impulso' ? '<span class="popular-tag">MAS CONTRATADO</span>' : ''}
      <span class="plan-label">${esc(p.label)}</span>
      <h2>${esc(p.name)}</h2>
      <div class="plan-price"><strong>${euro(p.price)}</strong><span>/ mes + IVA</span></div>
      <ul>${p.includes.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
      <div class="price-matrix">${Object.entries(p.prices).map(([months, price]) => `<span><b>${months}m</b>${euro(price)}/mes</span>`).join('')}${p.code === 'menu' ? `<span><b>Premium</b>${euro(p.premiumPrice)}/mes</span>` : ''}</div>
      <button class="secondary-button full-width" data-action="open-service-modal" data-plan="${p.code}">Asignar plan</button>
    </article>
  `;
}

function renderSettings() {
  const tabs = [
    ['general', 'General'],
    ['calendario', 'Calendario laboral'],
    ['notificaciones', 'Notificaciones'],
    ['seguridad', 'Seguridad y accesos'],
    ['integraciones', 'Integraciones'],
  ];
  $('#view-ajustes').innerHTML = `
    <div class="page-heading compact"><div><p class="eyebrow">CONFIGURACION</p><h1>Ajustes</h1><p>Calendario laboral, avisos, impuestos y preferencias.</p></div></div>
    <div class="settings-layout">
      <section class="panel settings-menu">${tabs.map(([key, label]) => `<button class="${app.settingsTab === key ? 'active' : ''}" data-action="settings-tab" data-tab="${key}">${label}</button>`).join('')}</section>
      <section class="panel settings-content">${settingsTabContent()}</section>
    </div>
  `;
}

function settingsTabContent() {
  const s = app.state.settings;
  if (app.settingsTab === 'calendario') {
    return `
      <h2>Calendario laboral de Madrid</h2>
      <form id="settingsCalendarForm">
        <label>Dias laborables<select name="workdays"><option value="1,2,3,4,5,6" ${s.workdays.join(',') === '1,2,3,4,5,6' ? 'selected' : ''}>Lunes a sabado</option><option value="1,2,3,4,5">Lunes a viernes</option></select></label>
        <label>Nuevo festivo<div class="inline-fields wide-inline"><input name="holidayDate" type="date"><input name="holidayName" placeholder="Nombre del festivo"><button class="secondary-button">Anadir</button></div></label>
      </form>
      <div class="holiday-list">${s.holidays.sort((a, b) => a.date.localeCompare(b.date)).map(item => `<div><span><strong>${formatDate(item.date, { short: true })}</strong><small>${esc(item.name)}</small></span><button class="icon-button" data-action="remove-holiday" data-id="${item.id}">x</button></div>`).join('')}</div>
    `;
  }
  if (app.settingsTab === 'notificaciones') {
    return `
      <h2>Notificaciones y avisos</h2>
      <form id="settingsNotificationsForm">
        <label>Dias laborables para cancelar<input name="cancelNoticeWorkdays" type="number" min="1" value="${s.cancelNoticeWorkdays}"></label>
        <label>Margen de pago<div class="inline-fields"><input name="paymentGraceDays" type="number" min="0" value="${s.paymentGraceDays}"><span>dias laborables +</span><input name="paymentGraceHours" type="number" min="0" value="${s.paymentGraceHours}"><span>horas</span></div></label>
        <label class="toggle-row"><span><strong>Suspension automatica</strong><small>Suspender cuando termine el margen adicional</small></span><input name="autoSuspend" type="checkbox" ${s.autoSuspend ? 'checked' : ''}></label>
        <button class="primary-button">Guardar avisos</button>
      </form>
    `;
  }
  if (app.settingsTab === 'seguridad') {
    return `
      <h2>Seguridad y accesos</h2>
      <p class="settings-copy">Cuotly usara las mismas cuentas que Fiometra cuando se publique con Supabase. El propietario siempre conserva el control total.</p>
      <div class="access-preview">${app.state.members.map(member => `<div><span class="avatar tiny ${member.role === 'owner' ? 'avatar-green' : 'sky'}">${initials(member.name)}</span><strong>${esc(member.name)}</strong><small>${ROLE_LABELS[member.role]}</small></div>`).join('')}</div>
      <button class="secondary-button" data-action="open-member-modal">Gestionar equipo</button>
    `;
  }
  if (app.settingsTab === 'integraciones') {
    return `
      <h2>Integraciones</h2>
      <label class="toggle-row"><span><strong>Preparar ventas para Fiometra</strong><small>Los pagos marcados como cobrados guardan base, IVA, IRPF y neto recibido.</small></span><input type="checkbox" checked disabled></label>
      <label>IVA de mantenimiento<input value="${s.ivaRate}%" disabled></label>
      <label>IRPF de mantenimiento<input value="${s.irpfRate}%" disabled></label>
      <button class="secondary-button" data-action="export-payments">Exportar pagos para Fiometra</button>
    `;
  }
  return `
    <h2>Preferencias generales</h2>
    <form id="settingsGeneralForm">
      <label>Nombre del espacio<input name="workspaceName" value="${esc(s.workspaceName)}"></label>
      <label>Zona horaria<select name="timezone"><option value="Europe/Madrid" selected>Europe/Madrid</option></select></label>
      <label>IVA (%)<input name="ivaRate" type="number" min="0" step="0.01" value="${s.ivaRate}"></label>
      <label>IRPF (%)<input name="irpfRate" type="number" min="0" step="0.01" value="${s.irpfRate}"></label>
      <button class="primary-button">Guardar cambios</button>
    </form>
    <div class="settings-danger"><button class="secondary-button danger-outline" data-action="reset-demo">Reiniciar datos de prueba</button></div>
  `;
}

function emptyState(icon, title, text) {
  return `<div class="empty-detail inline-empty"><span>${icon}</span><h2>${esc(title)}</h2><p>${esc(text)}</p></div>`;
}

function openModal(html) {
  $('#modalRoot').innerHTML = html;
  const modal = $('#modalRoot .modal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => modal.querySelector('input, select, textarea')?.focus(), 60);
}

function closeModal() {
  $('#modalRoot').innerHTML = '';
  document.body.style.overflow = '';
}

function modalFrame(title, eyebrow, body, sizeClass = '') {
  return `
    <div class="modal ${sizeClass}" aria-hidden="true"><div class="modal-backdrop" data-action="close-modal"></div><div class="modal-dialog"><div class="modal-header"><div><p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(title)}</h2></div><button class="icon-button" data-action="close-modal">x</button></div>${body}</div></div>
  `;
}

function openRestaurantModal(id) {
  const restaurant = restaurantById(id) || {};
  const isEdit = Boolean(restaurant.id);
  openModal(modalFrame(isEdit ? 'Editar restaurante' : 'Anadir restaurante', 'CLIENTE', `
    <form id="restaurantForm" data-id="${restaurant.id || ''}">
      <div class="form-grid">
        <label class="wide">Nombre del restaurante<input name="name" required value="${esc(restaurant.name || '')}" placeholder="Ej. Restaurante Central"></label>
        <label>Email<input name="email" type="email" value="${esc(restaurant.email || '')}" placeholder="cliente@restaurante.es"></label>
        <label>Telefono<input name="phone" value="${esc(restaurant.phone || '')}" placeholder="+34 600 000 000"></label>
        <label class="wide">Direccion<input name="address" value="${esc(restaurant.address || '')}" placeholder="Calle, numero, Madrid"></label>
        <label>Ciudad<input name="city" value="${esc(restaurant.city || 'Madrid')}"></label>
        <label>Estado<select name="status"><option value="active" ${restaurant.status !== 'paused' ? 'selected' : ''}>Activo</option><option value="paused" ${restaurant.status === 'paused' ? 'selected' : ''}>Pausado</option></select></label>
        <label class="wide">Notas<textarea name="notes" placeholder="Notas internas...">${esc(restaurant.notes || '')}</textarea></label>
      </div>
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">${isEdit ? 'Guardar ficha' : 'Crear restaurante'}</button></div>
    </form>
  `));
}

function openServiceModal(id, defaults = {}) {
  const service = app.state.services.find(item => item.id === id) || {};
  const isEdit = Boolean(service.id);
  const restaurantId = service.restaurantId || defaults.restaurantId || app.selectedRestaurantId || app.state.restaurants[0]?.id || '';
  const planCode = service.planCode || defaults.planCode || 'impulso';
  const months = Number(service.commitmentMonths || (planCode === 'menu' ? 1 : 6));
  openModal(modalFrame(isEdit ? 'Editar servicio' : 'Anadir servicio', 'PLAN CONTRATADO', `
    <form id="serviceForm" data-id="${service.id || ''}">
      <div class="form-grid">
        <label class="wide">Restaurante<select name="restaurantId" required>${app.state.restaurants.map(item => `<option value="${item.id}" ${item.id === restaurantId ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label>
        <label>Servicio<select name="planCode" required>${Object.values(PLAN_CATALOG).map(p => `<option value="${p.code}" ${p.code === planCode ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        <label>Compromiso<select name="commitmentMonths">${[1,3,6,9,12].map(value => `<option value="${value}" ${value === months ? 'selected' : ''}>${value} mes${value > 1 ? 'es' : ''}</option>`).join('')}</select></label>
        <label>Fecha de inicio<input name="startDate" type="date" value="${service.startDate || iso()}"></label>
        <label>Precio base mensual<input name="monthlyBase" type="number" min="0" step="0.01" value="${service.monthlyBase || serviceMonthlyBase(planCode, months, restaurantId)}"></label>
        <label>Responsable<select name="assignedTo">${app.state.members.filter(m => m.active).map(member => `<option value="${member.id}" ${member.id === (service.assignedTo || app.state.currentUserId) ? 'selected' : ''}>${esc(member.name)} · ${ROLE_LABELS[member.role]}</option>`).join('')}</select></label>
        <label class="toggle-row wide"><span><strong>Renovacion automatica</strong><small>Renueva el mismo numero de meses si no se cancela.</small></span><input name="autoRenew" type="checkbox" ${service.autoRenew !== false ? 'checked' : ''}></label>
      </div>
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">${isEdit ? 'Guardar servicio' : 'Crear servicio'}</button></div>
    </form>
  `));
}

function openTaskModal(id, defaults = {}) {
  const task = app.state.tasks.find(item => item.id === id) || {};
  const isEdit = Boolean(task.id);
  const restaurantId = task.restaurantId || defaults.restaurantId || app.selectedRestaurantId || visibleRestaurants()[0]?.id || '';
  const services = servicesForRestaurant(restaurantId);
  const serviceId = task.serviceId || defaults.serviceId || services[0]?.id || visibleServices()[0]?.id || '';
  openModal(modalFrame(isEdit ? 'Editar cambio' : 'Nuevo cambio', 'TRABAJO', `
    <form id="taskForm" data-id="${task.id || ''}">
      <div class="form-grid">
        <label class="wide">Restaurante<select name="restaurantId" required>${visibleRestaurants().map(item => `<option value="${item.id}" ${item.id === restaurantId ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label>
        <label>Servicio<select name="serviceId" required>${visibleServices().filter(service => service.restaurantId === restaurantId || service.id === serviceId).map(service => `<option value="${service.id}" ${service.id === serviceId ? 'selected' : ''}>${esc(plan(service.planCode).name)} · ${esc(restaurantById(service.restaurantId)?.name || '')}</option>`).join('')}</select></label>
        <label>Tipo de cambio<select name="type">${Object.entries(TASK_TYPES).map(([key, label]) => `<option value="${key}" ${key === (task.type || 'small') ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>
        <label>Cantidad<input name="quantity" type="number" min="1" value="${task.quantity || 1}"></label>
        <label>Responsable<select name="assignedTo">${app.state.members.filter(m => m.active).map(member => `<option value="${member.id}" ${member.id === (task.assignedTo || getCurrentUser().id) ? 'selected' : ''}>${esc(member.name)}</option>`).join('')}</select></label>
        <label>Prioridad<select name="priority"><option value="normal" ${task.priority !== 'high' ? 'selected' : ''}>Normal</option><option value="high" ${task.priority === 'high' ? 'selected' : ''}>Urgente</option></select></label>
        <label class="wide">Nombre del cambio<input name="title" required value="${esc(task.title || '')}" placeholder="Ej. Actualizar precios de la carta"></label>
        <label class="wide">Descripcion<textarea name="description" placeholder="Explica que ha solicitado el restaurante...">${esc(task.description || '')}</textarea></label>
      </div>
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">${isEdit ? 'Guardar cambio' : 'Crear cambio'}</button></div>
    </form>
  `));
}

function openMemberModal(id) {
  const member = app.state.members.find(item => item.id === id) || {};
  const isEdit = Boolean(member.id);
  openModal(modalFrame(isEdit ? 'Gestionar miembro' : 'Invitar miembro', 'EQUIPO', `
    <form id="memberForm" data-id="${member.id || ''}">
      <div class="form-grid">
        <label>Nombre<input name="name" required value="${esc(member.name || '')}"></label>
        <label>Email<input name="email" type="email" required value="${esc(member.email || '')}"></label>
        <label class="wide">Permiso<select name="role"><option value="worker" ${member.role === 'worker' ? 'selected' : ''}>Trabajador: solo sus servicios</option><option value="admin" ${member.role === 'admin' ? 'selected' : ''}>Administrador: puede gestionar todo</option>${member.role === 'owner' ? '<option value="owner" selected>Propietario</option>' : ''}</select></label>
      </div>
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">${isEdit ? 'Guardar permisos' : 'Crear invitacion'}</button></div>
    </form>
  `));
}

function openPlanChangeModal(id) {
  const service = app.state.services.find(item => item.id === id);
  if (!service) return;
  openModal(modalFrame('Cambiar plan', 'CAMBIO INMEDIATO', `
    <form id="planChangeForm" data-id="${service.id}">
      <div class="form-grid">
        <label class="wide">Nuevo plan<select name="planCode">${Object.values(PLAN_CATALOG).map(p => `<option value="${p.code}" ${p.code === service.planCode ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        <label>Compromiso<select name="commitmentMonths">${[1,3,6,9,12].map(value => `<option value="${value}" ${value === Number(service.commitmentMonths) ? 'selected' : ''}>${value} mes${value > 1 ? 'es' : ''}</option>`).join('')}</select></label>
        <label class="wide">Nota<textarea name="notes">Cambio inmediato. Se conserva lo consumido y se calcula la diferencia proporcional.</textarea></label>
      </div>
      <div class="change-preview">${planChangePreview(service, service.planCode, service.commitmentMonths)}</div>
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">Aplicar cambio</button></div>
    </form>
  `));
}

function planChangePreview(service, newPlan, newMonths) {
  const today = new Date();
  const cycleStart = serviceCycleStart(service, today);
  const cycleEnd = serviceCycleEnd(service, today);
  const totalDays = Math.max(1, Math.ceil((cycleEnd - cycleStart) / 86400000) + 1);
  const remainingDays = Math.max(0, Math.ceil((cycleEnd - today) / 86400000));
  const oldBase = Number(service.monthlyBase || 0);
  const newBase = serviceMonthlyBase(newPlan, Number(newMonths || 1), service.restaurantId);
  const diff = round((newBase - oldBase) * (remainingDays / totalDays));
  return `<p><strong>Diferencia proporcional:</strong> ${euro(diff)} base (${remainingDays}/${totalDays} dias restantes del ciclo).</p>`;
}

function openReportModal() {
  openModal(modalFrame('Generar informe mensual', 'PDF', `
    <form id="reportForm">
      <div class="form-grid">
        <label class="wide">Restaurante<select name="restaurantId">${visibleRestaurants().map(item => `<option value="${item.id}">${esc(item.name)}</option>`).join('')}</select></label>
        <label>Mes<input name="month" type="month" value="${monthKey(new Date())}"></label>
      </div>
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">Generar PDF</button></div>
    </form>
  `));
}

function handleRestaurantSubmit(form) {
  const data = Object.fromEntries(new FormData(form));
  const id = form.dataset.id || uid('rest');
  const existing = restaurantById(id);
  const payload = {
    id,
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    address: data.address.trim(),
    city: data.city.trim(),
    notes: data.notes.trim(),
    status: data.status,
    createdAt: existing?.createdAt || iso(),
  };
  if (existing) Object.assign(existing, payload);
  else {
    app.state.restaurants.push(payload);
    app.selectedRestaurantId = id;
  }
  closeModal();
  showToast(existing ? 'Ficha del restaurante guardada' : 'Restaurante creado');
  showView(existing ? app.view : 'restaurante-detalle', { restaurantId: id });
}

function handleServiceSubmit(form) {
  const data = Object.fromEntries(new FormData(form));
  const id = form.dataset.id || uid('svc');
  const existing = app.state.services.find(item => item.id === id);
  const months = Number(data.commitmentMonths || 1);
  const payload = {
    id,
    restaurantId: data.restaurantId,
    planCode: data.planCode,
    startDate: data.startDate || iso(),
    commitmentMonths: data.planCode === 'menu' ? 1 : months,
    monthlyBase: round(data.monthlyBase || serviceMonthlyBase(data.planCode, months, data.restaurantId)),
    status: existing?.status || 'active',
    autoRenew: Boolean(data.autoRenew),
    assignedTo: data.assignedTo,
    cancelAtEnd: existing?.cancelAtEnd || false,
    createdAt: existing?.createdAt || iso(),
  };
  if (existing) Object.assign(existing, payload);
  else app.state.services.push(payload);
  app.selectedRestaurantId = data.restaurantId;
  closeModal();
  refreshBilling();
  showToast(existing ? 'Servicio actualizado' : 'Servicio anadido');
  showView('restaurante-detalle', { restaurantId: data.restaurantId });
}

function handleTaskSubmit(form) {
  const data = Object.fromEntries(new FormData(form));
  const id = form.dataset.id || uid('task');
  const existing = app.state.tasks.find(item => item.id === id);
  const service = app.state.services.find(item => item.id === data.serviceId);
  const payload = {
    id,
    restaurantId: service?.restaurantId || data.restaurantId,
    serviceId: data.serviceId,
    title: data.title.trim(),
    description: data.description.trim(),
    type: data.type,
    quantity: Number(data.quantity || 1),
    status: existing?.status || 'requested',
    priority: data.priority,
    assignedTo: data.assignedTo,
    requestedAt: existing?.requestedAt || nowIso(),
    startedAt: existing?.startedAt || '',
    completedAt: existing?.completedAt || '',
    createdBy: existing?.createdBy || app.state.currentUserId,
  };
  if (existing) Object.assign(existing, payload);
  else app.state.tasks.push(payload);
  closeModal();
  showToast(existing ? 'Cambio actualizado' : 'Cambio registrado');
  render();
}

function handleMemberSubmit(form) {
  const data = Object.fromEntries(new FormData(form));
  const id = form.dataset.id || uid('user');
  const existing = app.state.members.find(item => item.id === id);
  if (existing?.role === 'owner') data.role = 'owner';
  const payload = { id, name: data.name.trim(), email: data.email.trim(), role: data.role, active: true };
  if (existing) Object.assign(existing, payload);
  else app.state.members.push(payload);
  closeModal();
  showToast(existing ? 'Permisos actualizados' : 'Miembro anadido');
  render();
}

function handlePlanChangeSubmit(form) {
  const service = app.state.services.find(item => item.id === form.dataset.id);
  if (!service) return;
  const data = Object.fromEntries(new FormData(form));
  const oldBase = Number(service.monthlyBase || 0);
  const newBase = serviceMonthlyBase(data.planCode, Number(data.commitmentMonths), service.restaurantId);
  const diff = planChangePreview(service, data.planCode, data.commitmentMonths);
  Object.assign(service, {
    planCode: data.planCode,
    commitmentMonths: data.planCode === 'menu' ? 1 : Number(data.commitmentMonths),
    monthlyBase: newBase,
  });
  app.state.reminders.push({ id: uid('rem'), type: 'plan_change', serviceId: service.id, createdAt: nowIso(), notes: `${oldBase} -> ${newBase}. ${diff.replace(/<[^>]+>/g, '')}` });
  closeModal();
  showToast('Plan cambiado y diferencia registrada');
  render();
}

function generateReport(restaurantId, month = monthKey(new Date())) {
  const restaurant = restaurantById(restaurantId);
  const serviceIds = app.state.services.filter(service => service.restaurantId === restaurantId).map(service => service.id);
  const tasks = app.state.tasks.filter(task => serviceIds.includes(task.serviceId) && (task.completedAt || task.requestedAt || '').startsWith(month));
  const completed = tasks.filter(task => task.status === 'completed').length;
  const incidents = tasks.filter(task => task.type === 'incidents').length;
  const serviceNames = app.state.services.filter(service => service.restaurantId === restaurantId).map(service => plan(service.planCode).name).join(' + ');
  let report = app.state.reports.find(item => item.restaurantId === restaurantId && item.month === month);
  if (!report) {
    report = { id: uid('rep'), restaurantId, month, status: 'ready', generatedAt: nowIso(), summary: '' };
    app.state.reports.push(report);
  }
  report.generatedAt = nowIso();
  report.status = 'ready';
  report.summary = `${tasks.length} trabajos, ${completed} completados, ${incidents} incidencias, ${serviceNames || 'Sin servicio'}`;
  report.data = {
    restaurant: restaurant?.name,
    services: serviceNames,
    tasks: tasks.map(task => ({ title: task.title, type: taskTypeLabel(task.type), status: STATUS_LABELS[task.status], requestedAt: task.requestedAt, startedAt: task.startedAt, completedAt: task.completedAt, description: task.description })),
  };
  saveState();
  showToast('Informe generado');
  return report;
}

function downloadReport(reportId) {
  const report = app.state.reports.find(item => item.id === reportId) || generateReport(reportId);
  const restaurant = restaurantById(report.restaurantId);
  const serviceIds = app.state.services.filter(service => service.restaurantId === report.restaurantId).map(service => service.id);
  const tasks = app.state.tasks.filter(task => serviceIds.includes(task.serviceId) && (task.completedAt || task.requestedAt || '').startsWith(report.month));
  const lines = [
    `Cuotly - Informe mensual`,
    `Restaurante: ${restaurant?.name || ''}`,
    `Mes: ${report.month}`,
    `Servicios: ${app.state.services.filter(service => service.restaurantId === report.restaurantId).map(service => plan(service.planCode).name).join(' + ') || 'Sin servicio'}`,
    `Resumen: ${report.summary}`,
    '',
    'Trabajos:',
    ...tasks.flatMap(task => [
      `- ${task.title}`,
      `  Tipo: ${taskTypeLabel(task.type)} · Estado: ${STATUS_LABELS[task.status]} · Cantidad: ${task.quantity}`,
      `  Solicitado: ${formatDateTime(task.requestedAt)} · Inicio: ${formatDateTime(task.startedAt)} · Final: ${formatDateTime(task.completedAt)}`,
      `  Detalle: ${task.description || 'Sin descripcion'}`,
    ]),
    '',
    'Cuotas restantes:',
    ...app.state.services.filter(service => service.restaurantId === report.restaurantId).flatMap(service => {
      const usage = quotaUsage(service, parseDate(`${report.month}-15`));
      return [`${plan(service.planCode).name}:`, ...Object.entries(usage).map(([key, item]) => `  ${taskTypeLabel(key)}: ${Math.max(0, item.limit - item.used)} de ${item.limit}`)];
    }),
  ];
  const blob = buildPdfBlob(`Informe ${restaurant?.name || ''} ${report.month}`, lines);
  downloadBlob(blob, `cuotly-${slug(restaurant?.name || 'restaurante')}-${report.month}.pdf`);
}

function buildPdfBlob(title, lines) {
  const chunks = [];
  let y = 790;
  chunks.push('BT /F1 18 Tf 50 810 Td (' + pdfEscape(title) + ') Tj ET');
  lines.forEach((line, index) => {
    if (y < 45) return;
    const size = index < 5 ? 11 : 9;
    chunks.push(`BT /F1 ${size} Tf 50 ${y} Td (${pdfEscape(line)}) Tj ET`);
    y -= line ? 15 : 8;
  });
  const content = chunks.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

function pdfEscape(text) {
  return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[()\\]/g, '\\$&').slice(0, 110);
}

function slug(value) {
  return String(value || 'archivo').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
}

function exportPayments() {
  downloadCsv('cuotly-pagos.csv', [
    ['Restaurante', 'Servicio', 'Ciclo', 'Base', 'IVA', 'IRPF', 'Factura', 'Neto recibido', 'Estado'],
    ...app.state.payments.map(payment => {
      const service = app.state.services.find(item => item.id === payment.serviceId);
      return [restaurantById(payment.restaurantId)?.name, plan(service?.planCode).name, payment.cycleStart, payment.baseAmount, payment.ivaAmount, payment.irpfAmount, payment.invoiceTotal, payment.receivedAmount, PAYMENT_LABELS[payment.status]];
    }),
  ]);
}

function exportTasks() {
  downloadCsv('cuotly-trabajos.csv', [
    ['Restaurante', 'Servicio', 'Titulo', 'Tipo', 'Cantidad', 'Estado', 'Responsable', 'Solicitado', 'Completado'],
    ...app.state.tasks.map(task => {
      const service = app.state.services.find(item => item.id === task.serviceId);
      return [restaurantById(task.restaurantId)?.name, plan(service?.planCode).name, task.title, taskTypeLabel(task.type), task.quantity, STATUS_LABELS[task.status], memberById(task.assignedTo)?.name, task.requestedAt, task.completedAt];
    }),
  ]);
}

function exportRestaurants() {
  downloadCsv('cuotly-restaurantes.csv', [
    ['Nombre', 'Email', 'Telefono', 'Direccion', 'Servicios', 'Estado'],
    ...app.state.restaurants.map(restaurant => [restaurant.name, restaurant.email, restaurant.phone, restaurant.address, app.state.services.filter(service => service.restaurantId === restaurant.id).map(service => plan(service.planCode).name).join(' + '), restaurant.status]),
  ]);
}

function setTaskStatus(id, status) {
  const task = app.state.tasks.find(item => item.id === id);
  if (!task) return;
  task.status = status;
  if (status === 'in_progress' && !task.startedAt) task.startedAt = nowIso();
  if (status === 'waiting' && !task.startedAt) task.startedAt = nowIso();
  if (status === 'completed') {
    if (!task.startedAt) task.startedAt = nowIso();
    task.completedAt = nowIso();
  }
  showToast(status === 'completed' ? 'Cambio completado y cuota descontada' : 'Estado actualizado');
  render();
}

function removeMember(id) {
  const member = memberById(id);
  if (!member || member.role === 'owner') return;
  if (!confirm(`Expulsar a ${member.name}? Sus servicios quedaran sin reasignar.`)) return;
  member.active = false;
  app.state.services.filter(service => service.assignedTo === id).forEach(service => { service.assignedTo = app.state.currentUserId; });
  showToast('Miembro expulsado');
  render();
}

function deleteRestaurant(id) {
  if (!canManage()) return;
  const restaurant = restaurantById(id);
  if (!restaurant) return;
  const serviceIds = new Set(app.state.services.filter(service => service.restaurantId === id).map(service => service.id));
  const taskCount = app.state.tasks.filter(task => task.restaurantId === id || serviceIds.has(task.serviceId)).length;
  const serviceCount = serviceIds.size;
  const paymentCount = app.state.payments.filter(payment => payment.restaurantId === id || serviceIds.has(payment.serviceId)).length;
  const message = `Borrar ${restaurant.name}? Se eliminaran tambien ${serviceCount} servicios, ${taskCount} tareas, ${paymentCount} pagos e informes de este restaurante.`;
  if (!confirm(message)) return;
  app.state.restaurants = app.state.restaurants.filter(item => item.id !== id);
  app.state.services = app.state.services.filter(service => service.restaurantId !== id);
  app.state.tasks = app.state.tasks.filter(task => task.restaurantId !== id && !serviceIds.has(task.serviceId));
  app.state.payments = app.state.payments.filter(payment => payment.restaurantId !== id && !serviceIds.has(payment.serviceId));
  app.state.reports = app.state.reports.filter(report => report.restaurantId !== id);
  app.state.reminders = app.state.reminders.filter(reminder => reminder.restaurantId !== id && !serviceIds.has(reminder.serviceId));
  if (app.selectedRestaurantId === id) app.selectedRestaurantId = visibleRestaurants()[0]?.id || null;
  showToast('Restaurante borrado');
  showView('restaurantes');
}

function deleteTask(id) {
  const task = app.state.tasks.find(item => item.id === id);
  if (!task) return;
  if (!canManage() && task.assignedTo !== app.state.currentUserId) return;
  if (!confirm(`Borrar la tarea "${task.title}"? Si estaba completada, sus cuotas volveran a estar disponibles.`)) return;
  app.state.tasks = app.state.tasks.filter(item => item.id !== id);
  showToast('Tarea borrada');
  render();
}

function cancelService(id) {
  const service = app.state.services.find(item => item.id === id);
  if (!service) return;
  const remainingMonths = Math.max(0, Math.ceil((commitmentEnd(service) - new Date()) / (1000 * 60 * 60 * 24 * 30)));
  const fee = remainingMonths * Number(service.monthlyBase || 0);
  if (!confirm(`Cancelar ${plan(service.planCode).name}? Penalizacion aproximada: ${euro(fee)} base + IVA si quedan meses de compromiso.`)) return;
  service.status = 'cancelled';
  service.cancelledAt = nowIso();
  app.state.reminders.push({ id: uid('rem'), type: 'cancellation', serviceId: id, createdAt: nowIso(), notes: `Cancelado. Restante estimado: ${euro(fee)} base.` });
  showToast('Servicio cancelado');
  render();
}

function markPaymentPaid(id) {
  const payment = app.state.payments.find(item => item.id === id);
  if (!payment) return;
  payment.status = 'paid';
  payment.paidAt = nowIso();
  payment.method ||= 'Transferencia';
  const service = app.state.services.find(item => item.id === payment.serviceId);
  if (service && service.status !== 'cancelled') service.status = 'active';
  showToast('Pago marcado como recibido');
  render();
}

function toggleFiometra(id) {
  const payment = app.state.payments.find(item => item.id === id);
  if (!payment) return;
  payment.sentToFiometra = !payment.sentToFiometra;
  showToast(payment.sentToFiometra ? 'Pago preparado para Fiometra' : 'Pago quitado de Fiometra');
  render();
}

function handleSettingsSubmit(form) {
  const data = Object.fromEntries(new FormData(form));
  if (form.id === 'settingsGeneralForm') {
    app.state.settings.workspaceName = data.workspaceName.trim();
    app.state.settings.ivaRate = Number(data.ivaRate || 21);
    app.state.settings.irpfRate = Number(data.irpfRate || 15);
  }
  if (form.id === 'settingsNotificationsForm') {
    app.state.settings.cancelNoticeWorkdays = Number(data.cancelNoticeWorkdays || 3);
    app.state.settings.paymentGraceDays = Number(data.paymentGraceDays || 3);
    app.state.settings.paymentGraceHours = Number(data.paymentGraceHours || 12);
    app.state.settings.autoSuspend = Boolean(data.autoSuspend);
  }
  if (form.id === 'settingsCalendarForm') {
    app.state.settings.workdays = String(data.workdays).split(',').map(Number);
    if (data.holidayDate && data.holidayName) app.state.settings.holidays.push({ id: uid('hol'), date: data.holidayDate, name: data.holidayName.trim() });
  }
  showToast('Ajustes guardados');
  render();
}

function resetDemo() {
  if (!confirm('Reiniciar los datos de Cuotly?')) return;
  localStorage.removeItem(storageKey());
  loadState();
  showToast('Datos reiniciados');
  showView('inicio');
}

function showAlertsModal() {
  const alerts = getAlerts();
  openModal(modalFrame('Avisos de Cuotly', 'CONTROL', `
    <div class="modal-list">${alerts.map(alert => `<article><span class="status-dot ${alert.tone}"></span><div><strong>${esc(alert.title)}</strong><p>${esc(alert.text)}</p></div></article>`).join('') || emptyState('✓', 'Sin avisos', 'No hay alertas pendientes.')}</div>
    <div class="modal-actions"><button class="primary-button" data-action="close-modal">Cerrar</button></div>
  `));
}

function handleClick(event) {
  if (event.defaultPrevented) return;
  const actionEl = event.target.closest('[data-action]');
  const viewEl = event.target.closest('[data-view], [data-view-target]');
  if (viewEl && !actionEl) {
    showView(viewEl.dataset.view || viewEl.dataset.viewTarget);
    return;
  }
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  const id = actionEl.dataset.id;
  if (action === 'close-modal') { closeModal(); return; }
  if (action === 'logout') { logout(); return; }
  if (action === 'auth-mode') { renderAuthScreen(actionEl.dataset.mode || 'login'); return; }
  if (action === 'auth-google') { handleGoogleLogin(); return; }
  if (action === 'show-alerts') showAlertsModal();
  if (action === 'open-restaurant') showView('restaurante-detalle', { restaurantId: id });
  if (action === 'open-restaurant-modal') openRestaurantModal(id);
  if (action === 'open-service-modal') openServiceModal(id, { restaurantId: actionEl.dataset.restaurant, planCode: actionEl.dataset.plan });
  if (action === 'open-task-modal') openTaskModal(id, { restaurantId: actionEl.dataset.restaurant, serviceId: actionEl.dataset.service });
  if (action === 'open-member-modal') openMemberModal(id);
  if (action === 'open-plan-change-modal') openPlanChangeModal(id);
  if (action === 'open-report-modal') openReportModal();
  if (action === 'detail-tab') { app.detailTab = actionEl.dataset.tab; renderRestaurantDetail(); }
  if (action === 'task-filter') { app.taskFilter = actionEl.dataset.filter; renderTasks(); }
  if (action === 'payment-filter') { app.paymentFilter = actionEl.dataset.filter; renderPayments(); }
  if (action === 'report-filter') { app.reportFilter = actionEl.dataset.filter; renderReports(); }
  if (action === 'settings-tab') { app.settingsTab = actionEl.dataset.tab; renderSettings(); }
  if (action === 'start-task') setTaskStatus(id, 'in_progress');
  if (action === 'complete-task') setTaskStatus(id, 'completed');
  if (action === 'wait-task') setTaskStatus(id, 'waiting');
  if (action === 'mark-paid') markPaymentPaid(id);
  if (action === 'toggle-fiometra') toggleFiometra(id);
  if (action === 'remove-member') removeMember(id);
  if (action === 'delete-restaurant') deleteRestaurant(id);
  if (action === 'delete-task') deleteTask(id);
  if (action === 'cancel-service') cancelService(id);
  if (action === 'download-report') downloadReport(id);
  if (action === 'generate-report') { const report = generateReport(id, actionEl.dataset.month || monthKey(new Date())); downloadReport(report.id); render(); }
  if (action === 'export-payments') exportPayments();
  if (action === 'export-tasks') exportTasks();
  if (action === 'export-restaurants') exportRestaurants();
  if (action === 'remove-holiday') { app.state.settings.holidays = app.state.settings.holidays.filter(item => item.id !== id); render(); }
  if (action === 'calendar-prev') { app.calendarMonth = addMonths(app.calendarMonth, -1); renderCalendar(); }
  if (action === 'calendar-next') { app.calendarMonth = addMonths(app.calendarMonth, 1); renderCalendar(); }
  if (action === 'calendar-today') { app.calendarMonth = startOfMonth(new Date()); renderCalendar(); }
  if (action === 'open-settings-prices') { app.settingsTab = 'general'; showView('ajustes'); }
  if (action === 'reset-demo') resetDemo();
}

function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  if (form.id === 'authLoginForm') {
    handleAuthLogin(form);
    return;
  }
  if (form.id === 'authRegisterForm') {
    handleAuthRegister(form);
    return;
  }
  if (form.id === 'restaurantForm') handleRestaurantSubmit(form);
  if (form.id === 'serviceForm') handleServiceSubmit(form);
  if (form.id === 'taskForm') handleTaskSubmit(form);
  if (form.id === 'memberForm') handleMemberSubmit(form);
  if (form.id === 'planChangeForm') handlePlanChangeSubmit(form);
  if (form.id === 'reportForm') {
    const data = Object.fromEntries(new FormData(form));
    const report = generateReport(data.restaurantId, data.month);
    closeModal();
    downloadReport(report.id);
    render();
  }
  if (form.id.startsWith('settings')) handleSettingsSubmit(form);
}

function handleInput(event) {
  if (event.target.matches('[data-action="search-input"], #globalSearch')) {
    app.search = event.target.value;
    if (app.view === 'restaurantes') renderRestaurants();
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

function startApp() {
  loadState();
  app.selectedRestaurantId = visibleRestaurants()[0]?.id || null;
  showAppShell();
  registerServiceWorker();
  render();
  app.booted = true;
}

async function init() {
  document.addEventListener('click', handleClick);
  document.addEventListener('submit', handleSubmit);
  document.addEventListener('input', handleInput);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeModal();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      $('#globalSearch')?.focus();
    }
  });
  $('#openDrawer')?.addEventListener('click', () => {
    $('#sidebar').classList.add('open');
    $('#drawerBackdrop').classList.add('show');
  });
  $('#closeDrawer')?.addEventListener('click', closeDrawer);
  $('#drawerBackdrop')?.addEventListener('click', closeDrawer);
  $all('.nav-item[data-view]').forEach(item => item.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    showView(item.dataset.view);
  }));
  const canStart = await setupAuth();
  if (canStart) startApp();
}

init();

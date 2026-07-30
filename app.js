const STORAGE_KEY = 'cuotly_state_v1';

const PLAN_CATALOG = {
  presencia: {
    code: 'presencia',
    name: 'Plan Presencia',
    label: 'ESENCIAL',
    className: 'presencia',
    price: 119,
    prices: { 1: 119 },
    quotas: { small: 8, medium: 0, large: 0, photos: 5 },
    response: '48-72 h laborables',
    backupEvery: 3,
    report: ['Solicitudes recibidas', 'Cambios pequenos y fotografias', 'Cambios adicionales', 'Errores corregidos', 'Incidencias pendientes', 'Estado general de la web'],
    timing: { response: '48-72 h laborables', delivery: 'Ejecucion habitual: 2-4 dias laborables', urgent: 'Urgencias: respuesta en 6 h de atencion' },
    includes: ['Revision mensual completa', '8 cambios pequenos por ciclo', '5 cambios fotograficos por ciclo', 'Atencion de incidencias urgentes', 'Copia de seguridad trimestral', 'Informe mensual', 'Espanol e ingles incluidos'],
  },
  impulso: {
    code: 'impulso',
    name: 'Plan Impulso',
    label: 'PRINCIPAL',
    className: 'impulso',
    price: 199,
    prices: { 1: 199 },
    quotas: { small: 16, medium: 3, large: 0, photos: 12, external_incident: 2 },
    response: '24-48 h laborables',
    backupEvery: 3,
    report: ['Solicitudes y cambios realizados', 'Cambios pequenos, medianos y fotograficos', 'Cambios adicionales', 'Incidencias externas gestionadas', 'Contenido desactualizado', 'Sugerencias y proximos pasos'],
    timing: { response: '24-48 h laborables', delivery: 'Pequenos y fotos: 1-3 dias laborables', urgent: 'Urgencias: respuesta en 4 h de atencion' },
    includes: ['Revision avanzada de la web', '16 cambios pequenos por ciclo', '3 cambios medianos por ciclo', '12 cambios fotograficos por ciclo', 'Revision de reservas y plataformas externas', '2 incidencias externas gestionadas', 'Copia trimestral e informe ampliado', 'Espanol e ingles incluidos', 'Atencion prioritaria'],
  },
  premium: {
    code: 'premium',
    name: 'Plan Premium',
    label: 'AVANZADO',
    className: 'premium',
    price: 399,
    prices: { 1: 399 },
    quotas: { small: 25, medium: 5, large: 1, photos: 24, external_incident: 3 },
    response: '12-24 h laborables',
    backupEvery: 1,
    report: ['Tareas, cambios y cuotas', 'Incidencias externas', 'Contenido y sugerencias', 'Revision tecnica, seguridad y rendimiento', 'Notas SEO basicas', 'Estado de copia de seguridad', 'Estado general de la web'],
    timing: { response: '12-24 h laborables', delivery: 'Pequenos y fotos: 1-2 dias laborables', urgent: 'Urgencias: respuesta en 3 h de atencion' },
    includes: ['Revision Premium de la web', '25 cambios pequenos por ciclo', '5 cambios medianos por ciclo', '1 cambio grande por ciclo', '24 cambios fotograficos por ciclo', 'SEO basico y soporte prioritario', 'Copia mensual e informe Premium', '3 incidencias externas gestionadas', 'Espanol e ingles incluidos'],
  },
  menu: {
    code: 'menu',
    name: 'Menu Diario',
    label: 'SERVICIO INDEPENDIENTE',
    className: 'menu',
    price: 169,
    premiumPrice: 149,
    prices: { 1: 169 },
    quotas: { menu_update: 25 },
    response: 'Lunes a viernes',
    timing: { response: 'Envio antes de las 21:00 del dia anterior', delivery: 'Publicacion antes de las 08:00', urgent: 'Revision y correccion propia incluidas' },
    report: [],
    includes: ['Hasta 25 actualizaciones por ciclo', 'Publicacion de lunes a viernes, incluidos festivos entre semana', 'Envio antes de las 21:00 y primera version antes de las 22:00', 'Correcciones hasta las 06:45 y publicacion antes de las 08:00', 'Recepcion por WhatsApp o correo, por escrito o fotografia clara', 'Revision basica y correccion de errores propios', 'Sin informe mensual'],
  },
};

const TASK_TYPES = {
  small: 'Cambio pequeno',
  medium: 'Cambio mediano',
  large: 'Cambio grande',
  photos: 'Fotografias',
  external_incident: 'Incidencia externa',
  review: 'Revision de la web',
  backup: 'Copia de seguridad',
  seo: 'Revision SEO basica',
  suggestion: 'Sugerencia de mejora',
  incident: 'Incidencia',
  menu_update: 'Menu Diario',
  menu_structure: 'Modificacion sencilla de estructura',
  menu_restructure: 'Reestructuracion completa del menu',
  menu_other: 'Otros trabajos de Menu Diario',
};

const BASE_PLAN_CODES = ['presencia', 'impulso', 'premium'];
const BASE_QUOTA_TYPES = ['small', 'medium', 'large', 'photos'];
const EXTRA_PACKAGES = {
  small: [{ quantity: 1, price: 15 }, { quantity: 2, price: 25 }, { quantity: 5, price: 55 }, { quantity: 10, price: 95 }],
  photos: [{ quantity: 1, price: 12 }, { quantity: 2, price: 22 }, { quantity: 5, price: 50 }, { quantity: 10, price: 90 }, { quantity: 12, price: 105 }],
  medium: [{ quantity: 1, price: 50 }, { quantity: 2, price: 90 }, { quantity: 3, price: 125 }],
  large: [{ quantity: 1, price: 140 }, { quantity: 2, price: 250 }],
};

const MENU_EXTRA_RULES = {
  menu_update: { label: 'Publicacion adicional', unit: 'publicacion', price: 10, fixed: true },
  menu_structure: { label: 'Modificacion sencilla de estructura', unit: 'modificacion', price: 25, fixed: true },
  menu_restructure: { label: 'Reestructuracion completa', unit: 'proyecto', price: 60, fixed: false },
  menu_other: { label: 'Otros trabajos', unit: 'hora', price: 40, fixed: true },
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
  cancelled: 'Cancelado',
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
  accountTab: 'perfil',
  calendarMonth: startOfMonth(new Date()),
  search: '',
  auth: {
    client: null,
    session: null,
    user: null,
    ready: false,
    mode: 'login',
    mfaEnrollment: null,
    mfaFactor: null,
    mfaBusy: false,
  },
  workspace: {
    id: '',
    name: '',
    workspaces: [],
    needsSetup: false,
    accessCheckTimer: null,
  },
  persistence: {
    loading: false,
    saveTimer: null,
    cloudAvailable: true,
    lastCloudError: '',
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
  const suffix = [app.auth.user?.id, app.workspace.id].filter(Boolean).join('_');
  return suffix ? `${STORAGE_KEY}_${suffix}` : STORAGE_KEY;
}

function workspaceSelectionKey() {
  return app.auth.user?.id ? `cuotly_workspace_${app.auth.user.id}` : 'cuotly_workspace';
}

function getAuthName(user) {
  const meta = user?.user_metadata || {};
  return meta.full_name || meta.name || meta.display_name || user?.email?.split('@')[0] || 'Propietario';
}

function getAuthEmail(user) {
  return user?.email || '';
}

function accountProfile() {
  const meta = app.auth.user?.user_metadata || {};
  return {
    fullName: meta.full_name || meta.name || getAuthName(app.auth.user),
    phone: meta.phone || '',
    jobTitle: meta.job_title || '',
    bio: meta.bio || '',
    avatarUrl: meta.avatar_url || meta.avatarUrl || '',
    notifications: meta.notification_preferences || { app: true, push: false, assignments: true, reminders: true, payments: true },
  };
}

function avatarMarkup(name, avatarUrl, classes = 'avatar avatar-green') {
  return `<span class="${classes}${avatarUrl ? ' image-avatar' : ''}"${avatarUrl ? ` style="background-image:url('${esc(avatarUrl)}')"` : ''}>${avatarUrl ? '' : esc(initials(name))}</span>`;
}

function emailProviderEnabled() {
  return (app.auth.user?.app_metadata?.providers || []).includes('email');
}

function authErrorMessage(error, fallback) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('email not confirmed')) return 'La cuenta existe, pero falta confirmar el email antes de iniciar sesion.';
  if (message.includes('invalid login credentials')) return 'Email o contrasena incorrectos. Si creaste la cuenta con Google, entra con Google.';
  if (message.includes('user already registered')) return 'Ese email ya tiene cuenta. Inicia sesion o usa Google.';
  if (message.includes('signup disabled')) return 'El registro por email esta desactivado en Supabase.';
  return fallback;
}

function applyAuthUserToState() {
  if (!app.state || !app.auth.user) return;
  const authEmail = getAuthEmail(app.auth.user).toLowerCase();
  const matchedMember = app.state.members.find(member => String(member.email || '').toLowerCase() === authEmail);
  if (matchedMember) {
    matchedMember.name = matchedMember.name || getAuthName(app.auth.user);
    matchedMember.email = getAuthEmail(app.auth.user);
    matchedMember.active = true;
    app.state.currentUserId = matchedMember.id;
    if (matchedMember.role === 'owner') app.state.ownerUserId = app.auth.user.id;
    return;
  }
  const owner = app.state.members.find(member => member.role === 'owner') || app.state.members[0];
  if (!owner) return;
  owner.id = 'user_owner';
  owner.name = getAuthName(app.auth.user);
  owner.email = getAuthEmail(app.auth.user);
  owner.role = 'owner';
  owner.active = true;
  app.state.currentUserId = owner.id;
  app.state.ownerUserId = app.auth.user.id;
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

function renderMfaScreen(mode, message = '') {
  const authScreen = $('#authScreen');
  $('#appShell')?.classList.add('hidden');
  authScreen.classList.remove('hidden');
  const setup = mode === 'setup';
  const enrollment = app.auth.mfaEnrollment;
  authScreen.innerHTML = `
    <section class="auth-card mfa-card">
      <div class="auth-brand"><span class="brand-mark">Q</span><strong>Cuotly</strong></div>
      ${message ? `<div class="auth-message">${esc(message)}</div>` : ''}
      <p class="eyebrow">SEGURIDAD OBLIGATORIA</p>
      <h1>${setup ? 'Protege tu cuenta' : 'Confirma tu acceso'}</h1>
      <p>${setup ? 'Añade Cuotly a Google Authenticator, Microsoft Authenticator o una app equivalente. También podrás añadir un segundo autenticador como respaldo desde tu cuenta.' : 'Introduce el código de seis cifras de tu aplicación de autenticación.'}</p>
      ${setup && enrollment ? `<div class="mfa-qr">${enrollment.totp?.qr_code ? `<img src="${esc(enrollment.totp.qr_code)}" alt="Código QR para autenticador">` : ''}<code>${esc(enrollment.totp?.secret || '')}</code></div>` : ''}
      ${setup && !enrollment ? '<button class="primary-button full-width" data-action="start-mfa-enroll">Generar código de seguridad</button>' : `
        <form id="mfaVerifyForm" class="auth-form" data-mode="${setup ? 'setup' : 'verify'}">
          <label>Código de autenticación<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required placeholder="000000"></label>
          <button class="primary-button full-width">Verificar y continuar</button>
        </form>`}
      <button class="text-button auth-switch" data-action="logout">Cerrar sesión</button>
    </section>
  `;
}

function needsAccountCompletion() {
  const meta = app.auth.user?.user_metadata || {};
  return Boolean(meta.cuotly_invite_id) && !meta.account_completed;
}

function renderAccountCompletion(message = '') {
  const authScreen = $('#authScreen');
  $('#appShell')?.classList.add('hidden');
  authScreen.classList.remove('hidden');
  authScreen.innerHTML = `
    <section class="auth-card">
      <div class="auth-brand"><span class="brand-mark">Q</span><strong>Cuotly</strong></div>
      ${message ? `<div class="auth-message">${esc(message)}</div>` : ''}
      <h1>Completa tu cuenta</h1>
      <p>Esta será tu cuenta personal. Podrás tener tu propio espacio y decidir si aceptas las invitaciones que recibas.</p>
      <form id="accountCompletionForm" class="auth-form">
        <label>Nombre<input name="name" autocomplete="name" required maxlength="80"></label>
        <label>Contraseña<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
        <label>Repite la contraseña<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></label>
        <button class="primary-button full-width">Continuar</button>
      </form>
    </section>
  `;
}

async function handleAccountCompletion(form) {
  const data = Object.fromEntries(new FormData(form));
  if (data.password !== data.confirmPassword) { renderAccountCompletion('Las contraseñas no coinciden.'); return; }
  const { error } = await app.auth.client.auth.updateUser({ password: data.password, data: { ...(app.auth.user?.user_metadata || {}), name: data.name.trim(), full_name: data.name.trim(), account_completed: true } });
  if (error) { renderAccountCompletion(error.message || 'No se pudo completar la cuenta.'); return; }
  const { data: sessionData } = await app.auth.client.auth.getSession();
  app.auth.session = sessionData?.session || app.auth.session;
  app.auth.user = app.auth.session?.user || app.auth.user;
  await startApp();
}

async function getVerifiedMfaFactors() {
  const { data, error } = await app.auth.client.auth.mfa.listFactors();
  if (error) throw error;
  return [...(data?.totp || [])].filter(item => item.status === 'verified');
}

async function mfaGate() {
  if (!app.auth.client || !app.auth.user) return false;
  const { data, error } = await app.auth.client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) {
    renderMfaScreen('verify', 'No se pudo comprobar la seguridad de la cuenta. Inténtalo de nuevo.');
    return false;
  }
  if (data?.currentLevel === 'aal2') return true;
  try {
    const factors = await getVerifiedMfaFactors();
    app.auth.mfaFactor = factors[0] || null;
    renderMfaScreen(factors.length ? 'verify' : 'setup');
  } catch {
    renderMfaScreen('verify', 'No se pudo preparar la verificación en dos pasos.');
  }
  return false;
}

async function startMfaEnrollment() {
  if (!app.auth.client || app.auth.mfaBusy) return;
  app.auth.mfaBusy = true;
  try {
    const { data, error } = await app.auth.client.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Cuotly ${new Date().toLocaleDateString('es-ES')}` });
    if (error) throw error;
    app.auth.mfaEnrollment = data;
    app.auth.mfaFactor = data;
    renderMfaScreen('setup');
  } catch (error) {
    renderMfaScreen('setup', error.message || 'No se pudo generar el código de seguridad.');
  } finally {
    app.auth.mfaBusy = false;
  }
}

async function verifyMfa(form) {
  if (!app.auth.client || app.auth.mfaBusy) return;
  const code = String(new FormData(form).get('code') || '').replace(/\s/g, '');
  const factorId = app.auth.mfaEnrollment?.id || app.auth.mfaFactor?.id;
  if (!factorId || !/^\d{6}$/.test(code)) {
    renderMfaScreen(form.dataset.mode || 'verify', 'Escribe los seis números de tu autenticador.');
    return;
  }
  app.auth.mfaBusy = true;
  try {
    const { data: challenge, error: challengeError } = await app.auth.client.auth.mfa.challenge({ factorId });
    if (challengeError) throw challengeError;
    const { error } = await app.auth.client.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    if (error) throw error;
    const { data } = await app.auth.client.auth.getSession();
    app.auth.session = data?.session || app.auth.session;
    app.auth.user = app.auth.session?.user || app.auth.user;
    app.auth.mfaEnrollment = null;
    await startApp();
  } catch (error) {
    renderMfaScreen(form.dataset.mode || 'verify', error.message || 'El código no es válido.');
  } finally {
    app.auth.mfaBusy = false;
  }
}

function showAppShell() {
  $('#authScreen')?.classList.add('hidden');
  $('#appShell')?.classList.remove('hidden');
}

function renderWorkspaceGate(message = '') {
  const authScreen = $('#authScreen');
  $('#appShell')?.classList.add('hidden');
  authScreen.classList.remove('hidden');
  const workspaces = app.workspace.workspaces || [];
  authScreen.innerHTML = `
    <section class="auth-card workspace-gate">
      <div class="auth-brand"><span class="brand-mark">Q</span><strong>Cuotly</strong></div>
      ${message ? `<div class="auth-message">${esc(message)}</div>` : ''}
      <h1>${workspaces.length ? 'Elige tu espacio' : 'Crea tu espacio de trabajo'}</h1>
      <p>${workspaces.length ? 'Tu cuenta puede pertenecer a varios espacios de Cuotly. Elige donde quieres trabajar.' : 'No tienes acceso a ningun espacio activo. Puedes crear el tuyo desde aqui.'}</p>
      ${workspaces.length ? `<div class="workspace-list">${workspaces.map(space => `<button class="secondary-button workspace-choice" data-action="switch-workspace" data-id="${space.id}"><span><strong>${esc(space.name)}</strong><small>${esc(ROLE_LABELS[space.role] || space.role)}</small></span><b>Entrar</b></button>`).join('')}</div>` : ''}
      <form id="workspaceCreateForm" class="auth-form workspace-create-form">
        <label>Nombre del nuevo espacio<input name="workspaceName" required maxlength="120" placeholder="Ej. Casa Paco o Madrid"></label>
        <button class="primary-button full-width">Crear espacio</button>
      </form>
      <button class="text-button auth-switch" data-action="logout">Cerrar sesion</button>
    </section>
  `;
}

async function createWorkspaceFromForm(form) {
  const token = await getAccessToken();
  if (!token) return;
  // A workspace can use any non-empty name: one word, one letter, or several words.
  const name = String(new FormData(form).get('workspaceName') || '').trim().replace(/\s+/g, ' ');
  if (!name) {
    renderWorkspaceGate('Escribe un nombre para el espacio.');
    return;
  }
  const button = form.querySelector('button');
  button.disabled = true;
  button.textContent = 'Creando...';
  try {
    const response = await fetch('/api/shared-state', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'create-workspace', name, state: seedState() }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'No se pudo crear el espacio.');
    app.workspace.id = result.workspace.id;
    app.workspace.name = result.workspace.name;
    app.workspace.workspaces = result.workspaces || [];
    app.workspace.needsSetup = false;
    localStorage.setItem(workspaceSelectionKey(), app.workspace.id);
    app.state = normalizeState(result.state);
    applyAuthUserToState();
    showAppShell();
    app.selectedRestaurantId = null;
    render();
    app.booted = true;
    startWorkspaceAccessCheck();
    showToast('Espacio de trabajo creado');
  } catch (error) {
    renderWorkspaceGate(error.message || 'No se pudo crear el espacio.');
  }
}

async function switchWorkspace(id) {
  if (!id) return;
  localStorage.setItem(workspaceSelectionKey(), id);
  app.workspace.id = id;
  app.workspace.needsSetup = false;
  app.booted = false;
  await startApp();
}

async function deleteWorkspace(id) {
  const space = (app.workspace.workspaces || []).find(item => item.id === id);
  if (!space || space.role !== 'owner') {
    showToast('Solo el propietario puede eliminar este espacio.');
    return;
  }
  if (!confirm(`Eliminar definitivamente el espacio "${space.name}"? Se borraran sus restaurantes, servicios, trabajos, pagos, informes y miembros. Esta accion no se puede deshacer.`)) return;
  const token = await getAccessToken();
  if (!token) return;
  try {
    const response = await fetch('/api/shared-state', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'delete-workspace', workspaceId: id }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'No se pudo eliminar el espacio.');
    app.workspace.workspaces = result.workspaces || [];
    if (id === app.workspace.id) {
      stopWorkspaceAccessCheck();
      localStorage.removeItem(workspaceSelectionKey());
      app.workspace.id = '';
      app.workspace.name = '';
      app.workspace.needsSetup = true;
      app.booted = false;
      app.state = null;
      renderWorkspaceGate(app.workspace.workspaces.length ? 'Espacio eliminado. Elige otro espacio para continuar.' : 'Espacio eliminado. Crea un nuevo espacio para continuar.');
    } else {
      renderSettings();
      showToast('Espacio eliminado');
    }
  } catch (error) {
    showToast(error.message || 'No se pudo eliminar el espacio.');
  }
}

function stopWorkspaceAccessCheck() {
  if (app.workspace.accessCheckTimer) clearInterval(app.workspace.accessCheckTimer);
  app.workspace.accessCheckTimer = null;
}

async function checkWorkspaceAccess() {
  if (!app.auth.client || !app.auth.user || !app.workspace.id || !app.booted) return;
  const token = await getAccessToken();
  if (!token) return;
  try {
    const response = await fetch(`/api/shared-state?workspaceId=${encodeURIComponent(app.workspace.id)}`, { headers: { authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.needsSetup || !result.workspace?.id || result.workspace.id !== app.workspace.id) {
      stopWorkspaceAccessCheck();
      app.workspace.id = '';
      app.workspace.name = '';
      app.workspace.workspaces = result.workspaces || [];
      app.workspace.needsSetup = true;
      app.booted = false;
      app.state = null;
      renderWorkspaceGate('Tu acceso a este espacio ha terminado. Elige otro espacio o crea uno nuevo.');
    }
  } catch {
    // A temporary network error should never close an active work session.
  }
}

function startWorkspaceAccessCheck() {
  stopWorkspaceAccessCheck();
  if (!app.auth.client || !app.auth.user || !app.workspace.id) return;
  app.workspace.accessCheckTimer = setInterval(checkWorkspaceAccess, 15000);
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
      stopWorkspaceAccessCheck();
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
    renderAuthScreen('login', authErrorMessage(error, 'Revisa el email o la contrasena e intentalo de nuevo.'));
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
    options: { data: { name: data.name.trim(), full_name: data.name.trim(), account_completed: true } },
  });
  if (error) {
    renderAuthScreen('register', authErrorMessage(error, 'No se ha podido crear la cuenta. Revisa los datos.'));
    return;
  }
  if (!result.session) {
    renderAuthScreen('login', 'Cuenta creada. Revisa tu email y confirma la cuenta antes de iniciar sesion.');
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
  stopWorkspaceAccessCheck();
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

async function getAccessToken() {
  if (!app.auth.client) return '';
  if (app.auth.session?.access_token) return app.auth.session.access_token;
  const { data } = await app.auth.client.auth.getSession();
  app.auth.session = data?.session || null;
  app.auth.user = app.auth.session?.user || null;
  return app.auth.session?.access_token || '';
}

async function createClientPortal(restaurantId) {
  if (!isOwner()) return;
  const token = await getAccessToken();
  const restaurant = restaurantById(restaurantId);
  if (!token || !restaurant) return;
  try {
    const response = await fetch('/api/client-portal', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'create-portal', workspaceId: app.workspace.id, restaurantId }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.portal?.id) throw new Error(result.error || 'No se pudo crear el panel del restaurante.');
    restaurant.clientPortalId = result.portal.id;
    saveState();
    showToast('Panel de restaurante creado');
    renderRestaurantDetail();
  } catch (error) {
    showToast(error.message || 'No se pudo crear el panel.');
  }
}

function openClientPortal(restaurantId) {
  const restaurant = restaurantById(restaurantId);
  if (!restaurant?.clientPortalId) {
    showToast('Crea primero el panel privado de este restaurante.');
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set('clientPortal', restaurant.clientPortalId);
  url.searchParams.delete('clientInvite');
  window.location.assign(url.toString());
}

function openClientPortalInviteModal(restaurantId) {
  const restaurant = restaurantById(restaurantId);
  if (!isOwner() || !restaurant?.clientPortalId) {
    showToast('Crea primero el panel privado del restaurante.');
    return;
  }
  openModal(modalFrame('Anadir cliente al panel', 'PANEL DE RESTAURANTE', `
    <form id="clientPortalInviteForm" data-restaurant="${restaurant.id}" data-portal="${restaurant.clientPortalId}">
      <p class="modal-copy">Se enviara un email para que esta persona cree su propia cuenta o entre con la que ya tiene. Al aceptarlo solo vera este restaurante.</p>
      <label>Email del propietario o miembro<input name="email" type="email" required autocomplete="email"></label>
      <label>Permiso<select name="role"><option value="owner">Propietario del restaurante</option><option value="editor">Puede solicitar y editar</option><option value="viewer">Solo consultar</option></select></label>
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">Enviar invitacion</button></div>
    </form>
  `));
}

async function handleClientPortalInvite(form) {
  if (!isOwner()) return;
  const token = await getAccessToken();
  if (!token) return;
  const data = Object.fromEntries(new FormData(form));
  try {
    const response = await fetch('/api/client-portal', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'invite-client', portalId: form.dataset.portal, email: data.email, role: data.role }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'No se pudo enviar la invitacion.');
    closeModal();
    showToast('Invitacion enviada al restaurante');
  } catch (error) {
    showToast(error.message || 'No se pudo enviar la invitacion.');
  }
}

async function clientPortalApi(action, body = {}, method = 'POST') {
  const token = await getAccessToken();
  if (!token) throw new Error('Tu sesion ha terminado.');
  const url = method === 'GET'
    ? `/api/client-portal?action=${encodeURIComponent(action)}&${new URLSearchParams(body)}`
    : '/api/client-portal';
  const response = await fetch(url, {
    method,
    headers: { ...(method === 'GET' ? {} : { 'content-type': 'application/json' }), authorization: `Bearer ${token}` },
    body: method === 'GET' ? undefined : JSON.stringify({ action, ...body }),
  });
  const output = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(output.error || 'No se pudo completar la accion.');
  return output;
}

function clientRequestActions(request, portalId) {
  if (request.status === 'pending') return `
    <button class="secondary-button" data-action="client-request-update" data-portal="${portalId}" data-request="${request.id}" data-status="accepted">Aceptar</button>
    <button class="secondary-button danger-outline" data-action="client-request-update" data-portal="${portalId}" data-request="${request.id}" data-status="rejected">Rechazar</button>`;
  if (['pause', 'cancellation', 'extra_package', 'restaurant_link'].includes(request.kind)) return '';
  if (request.status === 'accepted') return `<button class="secondary-button" data-action="client-request-update" data-portal="${portalId}" data-request="${request.id}" data-status="in_progress">Empezar</button>`;
  if (request.status === 'in_progress' || request.status === 'waiting') return `
    <button class="secondary-button" data-action="client-request-update" data-portal="${portalId}" data-request="${request.id}" data-status="waiting">Esperar respuesta</button>
    <button class="primary-button" data-action="client-request-update" data-portal="${portalId}" data-request="${request.id}" data-status="completed">Completar</button>`;
  return '';
}

async function openClientRequestInbox(restaurantId) {
  const restaurant = restaurantById(restaurantId);
  if (!restaurant?.clientPortalId) {
    showToast('Este restaurante todavia no tiene panel privado.');
    return;
  }
  try {
    const result = await clientPortalApi('bootstrap', { portalId: restaurant.clientPortalId }, 'GET');
    const requests = result.data?.requests || [];
    openModal(modalFrame(`Solicitudes de ${restaurant.name}`, 'PANEL DE RESTAURANTE', `
      <p class="modal-copy">Estas solicitudes solo pertenecen a este restaurante. Al aceptarlas se crea el trabajo correspondiente y se reserva su saldo.</p>
      <div class="modal-list client-request-inbox">
        ${requests.map(request => `
          <article>
            <div>
              <strong>${esc(request.title)}</strong>
              <p>${esc(request.description || 'Sin descripcion')}</p>
              <small>${formatDateTime(request.requestedAt)} · ${esc(STATUS_LABELS[request.status] || request.status)} · ${request.source === 'web_editor' ? 'Solicitada desde Editar mi web' : esc(request.kind)}</small>
            </div>
            <div class="modal-actions compact">
              <button class="secondary-button" data-action="open-client-request-chat" data-portal="${restaurant.clientPortalId}" data-request="${request.id}" data-title="${esc(request.title)}">Chat</button>
              ${clientRequestActions(request, restaurant.clientPortalId)}
            </div>
          </article>`).join('') || '<p class="settings-copy">No hay solicitudes del restaurante.</p>'}
      </div>
      <div class="modal-actions"><button class="secondary-button" data-action="close-modal">Cerrar</button></div>
    `));
  } catch (error) {
    showToast(error.message || 'No se pudieron abrir las solicitudes.');
  }
}

async function updateClientRequest(portalId, requestId, status) {
  let reason = '';
  if (status === 'rejected') {
    reason = window.prompt('Indica brevemente el motivo del rechazo.') || '';
    if (!reason.trim()) return;
  }
  try {
    await clientPortalApi('maintenance-request-update', { portalId, requestId, status, reason });
    closeModal();
    showToast(status === 'completed' ? 'Solicitud completada y saldo actualizado.' : 'Solicitud actualizada.');
    renderRestaurantDetail();
  } catch (error) {
    showToast(error.message || 'No se pudo actualizar la solicitud.');
  }
}

function clientAttachmentLink(attachment) {
  if (!attachment?.path) return '';
  return `<button class="attachment-link" data-action="open-client-attachment" data-portal="${esc(attachment.path.split('/')[1] || '')}" data-path="${esc(attachment.path)}">${esc(attachment.name || 'Archivo adjunto')}</button>`;
}

async function openClientRequestChat(portalId, requestId, title) {
  try {
    const result = await clientPortalApi('messages', { portalId, requestId }, 'GET');
    const messages = result.messages || [];
    openModal(modalFrame(title || 'Chat de solicitud', 'CONVERSACION', `
      <div class="client-request-chat">
        ${messages.map(message => `<article class="${message.side === 'maintenance' ? 'from-maintenance' : 'from-client'}"><p>${esc(message.body)}</p><small>${message.side === 'maintenance' ? 'Equipo de mantenimiento' : 'Restaurante'} · ${formatDateTime(message.createdAt)}</small>${(message.attachments || []).map(clientAttachmentLink).join('')}</article>`).join('') || '<p class="settings-copy">Todavia no hay mensajes.</p>'}
      </div>
      <form id="maintenanceClientMessageForm" data-portal="${portalId}" data-request="${requestId}">
        <label>Responder<textarea name="message" required maxlength="8000"></textarea></label>
        <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cerrar</button><button class="primary-button">Enviar respuesta</button></div>
      </form>
    `));
  } catch (error) {
    showToast(error.message || 'No se pudo abrir el chat.');
  }
}

async function sendMaintenanceClientMessage(form) {
  const body = Object.fromEntries(new FormData(form));
  try {
    await clientPortalApi('send-message', { portalId: form.dataset.portal, requestId: form.dataset.request, message: body.message });
    await openClientRequestChat(form.dataset.portal, form.dataset.request, 'Chat de solicitud');
    showToast('Respuesta enviada.');
  } catch (error) {
    showToast(error.message || 'No se pudo enviar la respuesta.');
  }
}

async function openClientAttachment(portalId, path) {
  try {
    const token = await getAccessToken();
    const response = await fetch('/api/client-upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'signed-url', portalId, path }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.url) throw new Error(result.error || 'No se pudo abrir el archivo.');
    window.open(result.url, '_blank', 'noopener');
  } catch (error) {
    showToast(error.message || 'No se pudo abrir el archivo.');
  }
}

async function sendMemberInvitation(member, mode = 'invite') {
  const token = await getAccessToken();
  if (!token) throw new Error('Tienes que iniciar sesion para invitar miembros.');

  const response = await fetch('/api/invite-member', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      workspaceId: app.workspace.id,
      memberId: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      mode,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'No se pudo enviar la invitacion.');
  return result;
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

function isOwner() {
  return getCurrentUser()?.role === 'owner';
}

function canViewPayments() {
  return isOwner();
}

function canViewReports() {
  return canManage();
}

function canCreateRestaurant() {
  return isOwner();
}

function canDeleteRestaurant() {
  return isOwner();
}

function canManageMembers() {
  return isOwner();
}

function serviceMemberIds(service) {
  const values = Array.isArray(service?.assignedMemberIds)
    ? service.assignedMemberIds
    : (service?.assignedTo ? [service.assignedTo] : []);
  return [...new Set(values.filter(Boolean))];
}

function isAssignedToService(service, memberId = app.state.currentUserId) {
  return serviceMemberIds(service).includes(memberId);
}

function primaryServiceMemberId(service) {
  return serviceMemberIds(service)[0] || '';
}

function canOperateService(service) {
  if (!service) return false;
  return canManage() || isAssignedToService(service);
}

function canCancelService(service) {
  return Boolean(service) && canManage();
}

function canManageServiceTeam() {
  return canManage();
}

function canSeeTask(task) {
  const service = app.state.services.find(item => item.id === task?.serviceId);
  if (!service || !canSeeService(service)) return false;
  return canManage() || task.assignedTo === app.state.currentUserId;
}

function memberRestaurantIds(member) {
  return Array.isArray(member?.restaurantIds) ? member.restaurantIds.filter(Boolean) : [];
}

function memberCanAccessRestaurant(member, restaurantId) {
  if (!member || !restaurantId) return false;
  if (member.role === 'owner') return true;
  const restaurantIds = memberRestaurantIds(member);
  if (member.role === 'admin' && restaurantIds.length === 0) return true;
  if (restaurantIds.includes(restaurantId)) return true;
  return app.state.services.some(service => service.restaurantId === restaurantId && isAssignedToService(service, member.id));
}

function canSeeRestaurant(restaurantId) {
  return memberCanAccessRestaurant(getCurrentUser(), restaurantId);
}

function canSeeService(service) {
  const user = getCurrentUser();
  if (!user) return false;
  if (user.role === 'owner' || user.role === 'admin') return memberCanAccessRestaurant(user, service.restaurantId);
  return isAssignedToService(service, user.id);
}

function visibleServices() {
  return app.state.services.filter(service => canSeeService(service));
}

function visibleRestaurants() {
  const serviceRestaurantIds = new Set(visibleServices().map(service => service.restaurantId));
  return app.state.restaurants.filter(restaurant => serviceRestaurantIds.has(restaurant.id) || canSeeRestaurant(restaurant.id));
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

function eligibleMembersForRestaurant(restaurantId, selectedId = '') {
  const selected = memberById(selectedId);
  const members = app.state.members.filter(member => {
    if (!member.active) return false;
    if (member.role === 'owner' || member.role === 'admin') return true;
    return memberCanAccessRestaurant(member, restaurantId);
  });
  if (selected && selected.active && !members.some(member => member.id === selected.id)) members.push(selected);
  return members;
}

function tasksForService(serviceId) {
  return app.state.tasks.filter(task => task.serviceId === serviceId && canSeeTask(task));
}

function daysBetween(start, end) {
  const from = parseDate(start);
  const to = parseDate(end);
  return Math.max(0, Math.round((to - from) / 86400000));
}

function initializeServiceCycle(service, reference = new Date()) {
  if (service.cycleStartDate && service.cycleEndDate) return;
  let start = parseDate(service.startDate || iso());
  let end = addDays(addMonths(start, 1), -1);
  let cycleIndex = 1;
  const frozenAt = service.pausedAt ? parseDate(service.pausedAt) : null;
  const target = frozenAt && frozenAt < reference ? frozenAt : reference;
  while (target > end) {
    start = addDays(end, 1);
    end = addDays(addMonths(start, 1), -1);
    cycleIndex += 1;
  }
  service.cycleStartDate = iso(start);
  service.cycleEndDate = iso(end);
  service.cycleIndex = Number(service.cycleIndex || cycleIndex);
}

function serviceCycleStart(service, reference = new Date()) {
  initializeServiceCycle(service, reference);
  return parseDate(service.cycleStartDate);
}

function serviceCycleEnd(service, reference = new Date()) {
  initializeServiceCycle(service, reference);
  return parseDate(service.cycleEndDate);
}

function serviceNextPaymentDate(service, reference = new Date()) {
  return addDays(serviceCycleEnd(service, reference), 1);
}

function commitmentEnd(service) {
  const base = service.commitmentStartDate || service.startDate;
  const initialMonths = Number(service.initialCommitmentMonths || service.commitmentMonths || 3);
  const completedPauses = (service.pauseHistory || []).reduce((sum, pause) => sum + Number(pause.days || 0), 0);
  return addDays(addMonths(parseDate(base), initialMonths), completedPauses);
}

function cancellationNoticeDate(service) {
  return addDays(serviceNextPaymentDate(service), -3);
}

function pauseDuration(service) {
  return (service.pauseHistory || []).reduce((sum, pause) => sum + Number(pause.days || 0), 0);
}

function isServicePaused(service) {
  return service.status === 'paused' || Boolean(service.pausedAt);
}

function activeBaseService(restaurantId) {
  return app.state.services.find(service =>
    service.restaurantId === restaurantId &&
    BASE_PLAN_CODES.includes(service.planCode) &&
    !['cancelled'].includes(service.status)
  );
}

function currentPaymentForService(service, reference = new Date()) {
  const cycleStart = iso(serviceCycleStart(service, reference));
  return app.state.payments.find(payment => payment.serviceId === service.id && payment.cycleStart === cycleStart);
}

function isPremiumCurrent(restaurantId) {
  const premium = app.state.services.find(service => service.restaurantId === restaurantId && service.planCode === 'premium' && service.status === 'active');
  return Boolean(premium && currentPaymentForService(premium)?.status === 'paid');
}

function serviceMonthlyBase(planCode, _months, restaurantId) {
  const p = plan(planCode);
  if (planCode === 'menu') return isPremiumCurrent(restaurantId) ? p.premiumPrice : p.price;
  return p.price;
}

function quotaKeysForService(service) {
  if (service.planCode === 'menu') return ['menu_update'];
  const keys = [...BASE_QUOTA_TYPES];
  if (Number(plan(service.planCode).quotas.external_incident || 0) > 0) keys.push('external_incident');
  return keys;
}

function quotaTypeForTask(task) {
  if (task.type === 'section') return 'medium';
  if (task.type === 'incidents') return 'external_incident';
  return task.type;
}

function cycleCreditLimit(service, type, reference = new Date()) {
  const p = plan(service.planCode);
  const base = Number(p.quotas[type] || 0);
  const cycleStart = iso(serviceCycleStart(service, reference));
  const extras = (service.extraCredits || [])
    .filter(extra => extra.status === 'paid' && extra.type === type && extra.cycleStart === cycleStart)
    .reduce((sum, extra) => sum + Number(extra.quantity || 0), 0);
  return base + extras;
}

function quotaUsage(service, reference = new Date()) {
  const start = serviceCycleStart(service, reference);
  const end = serviceCycleEnd(service, reference);
  const usage = {};
  quotaKeysForService(service).forEach(type => {
    usage[type] = { used: 0, limit: cycleCreditLimit(service, type, reference) };
  });
  app.state.tasks
    .filter(task => task.serviceId === service.id && task.consumesQuota !== false && (task.status === 'completed' || task.quotaConsumedAt))
    .filter(task => {
      const completed = new Date(task.quotaConsumedAt || task.completedAt || 0);
      return completed >= start && completed <= addDays(end, 1);
    })
    .forEach(task => {
      const type = quotaTypeForTask(task);
      if (!usage[type]) return;
      usage[type].used += Number(task.quantity || 1);
    });

  if (usage.external_incident) {
    usage.external_incident.used = app.state.tasks.filter(task => {
      if (task.serviceId !== service.id || quotaTypeForTask(task) !== 'external_incident') return false;
      if (task.status === 'cancelled') return false;
      const date = new Date(task.reservedAt || task.startedAt || task.completedAt || 0);
      return date >= start && date <= addDays(end, 1) && Boolean(task.reservedAt || task.startedAt || task.completedAt);
    }).reduce((sum, task) => sum + Number(task.quantity || 1), 0);
  }
  return usage;
}

function quotaTotals(service) {
  const usage = quotaUsage(service);
  const keys = Object.keys(usage).filter(key => key !== 'external_incident');
  const totalLimit = keys.reduce((sum, key) => sum + Number(usage[key].limit || 0), 0);
  const totalUsed = keys.reduce((sum, key) => sum + Number(usage[key].used || 0), 0);
  return { used: totalUsed, limit: totalLimit, percent: totalLimit ? Math.round((totalUsed / totalLimit) * 100) : 0 };
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
  if (existingStatus === 'paid' || existingStatus === 'cancelled') return existingStatus;
  const due = parseDate(dueDate);
  const today = parseDate(iso());
  if (today <= due) return 'pending';
  return daysBetween(due, today) > 3 ? 'cancelled' : 'late';
}

function applyPendingPlanChange(service) {
  const pending = service.pendingPlanChange;
  if (!pending || parseDate(pending.effectiveAt) > parseDate(iso())) return;
  service.planCode = pending.planCode;
  service.monthlyBase = Number(pending.monthlyBase || serviceMonthlyBase(pending.planCode, 1, service.restaurantId));
  service.initialCommitmentMonths = 3;
  service.commitmentStartDate = pending.effectiveAt;
  service.pendingPlanChange = null;
}

function advanceServiceCycle(service, reference = new Date()) {
  initializeServiceCycle(service, reference);
  if (isServicePaused(service) || service.status === 'cancelled') return;
  const today = parseDate(iso(reference));
  while (today > parseDate(service.cycleEndDate)) {
    if (service.cancelAtEnd && parseDate(service.cancelEffectiveAt || serviceNextPaymentDate(service)) <= serviceNextPaymentDate(service)) {
      service.status = 'cancelled';
      service.cancelledAt ||= nowIso();
      service.cancelReason ||= 'cancelacion_programada';
      return;
    }
    service.cycleStartDate = iso(addDays(parseDate(service.cycleEndDate), 1));
    service.cycleEndDate = iso(addDays(addMonths(parseDate(service.cycleStartDate), 1), -1));
    service.cycleIndex = Number(service.cycleIndex || 1) + 1;
    applyPendingPlanChange(service);
  }
}

function createCyclePayment(service) {
  const cycleStart = iso(serviceCycleStart(service));
  const cycleEnd = iso(serviceCycleEnd(service));
  if (service.planCode === 'menu') service.monthlyBase = serviceMonthlyBase('menu', 1, service.restaurantId);
  const base = Number(service.monthlyBase || serviceMonthlyBase(service.planCode, 1, service.restaurantId));
  const amounts = paymentAmounts(base);
  const payment = {
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
    kind: 'subscription',
  };
  app.state.payments.push(payment);
  return payment;
}

function ensureBackupTask(service) {
  const every = Number(plan(service.planCode).backupEvery || 0);
  if (!every || service.status !== 'active' || Number(service.cycleIndex || 1) % every !== 0) return;
  const cycleStart = iso(serviceCycleStart(service));
  const existing = app.state.tasks.some(task => task.serviceId === service.id && task.type === 'backup' && task.autoKey === `backup-${cycleStart}`);
  if (existing) return;
  app.state.tasks.push({
    id: uid('task'),
    restaurantId: service.restaurantId,
    serviceId: service.id,
    title: 'Realizar copia de seguridad',
    description: `Copia programada del ciclo iniciado el ${formatDate(cycleStart, { short: true })}.`,
    type: 'backup',
    quantity: 1,
    consumesQuota: false,
    status: 'requested',
    priority: 'normal',
    assignedTo: service.assignedTo,
    requestedAt: nowIso(),
    startedAt: '',
    completedAt: '',
    createdBy: app.state.currentUserId,
    autoKey: `backup-${cycleStart}`,
  });
}

function refreshBilling() {
  if (!canViewPayments()) return;
  const services = app.state.services.filter(service => service.status !== 'cancelled');
  services.forEach(service => {
    initializeServiceCycle(service);
    if (isServicePaused(service)) return;
    advanceServiceCycle(service);
    if (service.status === 'cancelled') return;
    const cycleStart = iso(serviceCycleStart(service));
    const cycleEnd = iso(serviceCycleEnd(service));
    let payment = app.state.payments.find(item => item.serviceId === service.id && item.cycleStart === cycleStart && (!item.kind || item.kind === 'subscription'));
    if (!payment) payment = createCyclePayment(service);
    if (payment.status !== 'paid') {
      const base = Number(service.monthlyBase || serviceMonthlyBase(service.planCode, 1, service.restaurantId));
      const amounts = paymentAmounts(base);
      Object.assign(payment, { cycleEnd, baseAmount: amounts.base, ivaAmount: amounts.iva, irpfAmount: amounts.irpf, invoiceTotal: amounts.invoiceTotal, receivedAmount: amounts.received });
    }
    payment.status = paymentStatusForDate(payment.dueDate, payment.status);
    if (payment.status === 'paid') service.status = 'active';
    if (payment.status === 'late') service.status = 'suspended';
    if (payment.status === 'cancelled') {
      service.status = 'cancelled';
      service.cancelledAt ||= nowIso();
      service.cancelReason ||= 'impago';
      app.state.reminders.push({ id: uid('rem'), type: 'auto_cancellation', serviceId: service.id, createdAt: nowIso(), notes: 'Cancelado automaticamente tras 3 dias naturales de impago.' });
    }
    if (payment.status === 'paid') ensureBackupTask(service);
  });
  app.state.services.filter(service => service.planCode === 'menu' && service.status !== 'cancelled' && !isServicePaused(service)).forEach(service => {
    const payment = currentPaymentForService(service);
    if (!payment || payment.status === 'paid') return;
    const base = serviceMonthlyBase('menu', 1, service.restaurantId);
    service.monthlyBase = base;
    const amounts = paymentAmounts(base);
    Object.assign(payment, { baseAmount: amounts.base, ivaAmount: amounts.iva, irpfAmount: amounts.irpf, invoiceTotal: amounts.invoiceTotal, receivedAmount: amounts.received });
  });
}

function seedState() {
  const today = iso(new Date());
  return {
    version: 5,
    currentUserId: 'user_owner',
    ownerUserId: '',
    settings: {
      workspaceName: 'Mi espacio',
      timezone: 'Europe/Madrid',
      ivaRate: 21,
      irpfRate: 15,
      cancelNoticeDays: 3,
      autoCancelDays: 3,
      workdays: [1, 2, 3, 4, 5, 6],
      holidays: [
        { id: 'hol_1', date: '2026-01-01', name: 'Año Nuevo' },
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
    members: [{ id: 'user_owner', name: '', email: '', role: 'owner', active: true, restaurantIds: [] }],
    restaurants: [],
    services: [],
    tasks: [],
    payments: [],
    reports: [],
    reminders: [],
  };

  // Legacy demo data retained below only for source-history compatibility.
  return {
    version: 3,
    currentUserId: 'user_owner',
    settings: {
      workspaceName: 'Mi espacio',
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

function normalizeState(state) {
  const seeded = seedState();
  state.version = 6;
  state.settings = { ...seeded.settings, ...(state.settings || {}) };
  state.members ||= [];
  state.restaurants ||= [];
  state.services ||= [];
  state.tasks ||= [];
  state.payments ||= [];
  state.reports ||= [];
  state.reminders ||= [];
  state.archivedMembers ||= [];
  state.services.forEach(service => {
    service.initialCommitmentMonths = Number(service.initialCommitmentMonths || 3);
    service.commitmentStartDate ||= service.startDate || iso();
    service.extraCredits ||= [];
    service.pauseHistory ||= [];
    service.assignedMemberIds = serviceMemberIds(service);
    service.assignedTo = primaryServiceMemberId(service);
    service.cancelAtEnd = Boolean(service.cancelAtEnd);
    if (service.planCode === 'menu') service.pauseAllowed = false;
    if (service.status === 'late') service.status = 'suspended';
    initializeServiceCycle(service);
  });
  state.tasks.forEach(task => {
    if (task.type === 'section') task.type = 'medium';
    if (task.type === 'calls') task.type = 'incident';
    if (task.type === 'incidents') task.type = 'external_incident';
    if (task.consumesQuota === undefined) task.consumesQuota = ['small', 'medium', 'large', 'photos', 'external_incident', 'menu_update'].includes(task.type);
  });
  state.members.forEach(member => {
    member.restaurantIds = memberRestaurantIds(member);
    if (member.active === undefined) member.active = true;
  });
  state.restaurants.forEach(restaurant => {
    restaurant.noteEntries ||= [];
    if (restaurant.notes && !restaurant.noteEntries.length) {
      restaurant.noteEntries.push({
        id: uid('note'),
        text: restaurant.notes,
        authorId: state.ownerUserId || 'user_owner',
        authorName: 'Propietario',
        createdAt: restaurant.createdAt || nowIso(),
        legacy: true,
      });
    }
  });
  return state;
}

async function loadCloudState() {
  if (!app.auth.client || !app.auth.user) return null;
  const token = await getAccessToken();
  if (token) {
    try {
      const preferred = localStorage.getItem(workspaceSelectionKey()) || '';
      const response = await fetch(`/api/shared-state${preferred ? `?workspaceId=${encodeURIComponent(preferred)}` : ''}`, { headers: { authorization: `Bearer ${token}` } });
      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        app.persistence.cloudAvailable = true;
        app.persistence.lastCloudError = '';
        app.workspace.id = result.workspace?.id || '';
        app.workspace.name = result.workspace?.name || '';
        app.workspace.workspaces = result.workspaces || [];
        app.workspace.needsSetup = Boolean(result.needsSetup);
        if (app.workspace.id) localStorage.setItem(workspaceSelectionKey(), app.workspace.id);
        return result.state || null;
      }
      if (result.error === 'WORKSPACE_ACCESS_REVOKED') {
        app.workspace.id = '';
        app.workspace.name = '';
        app.workspace.workspaces = result.workspaces || [];
        app.workspace.needsSetup = true;
        return null;
      }
    } catch (error) {
      app.persistence.lastCloudError = error.message || 'No se pudo cargar el espacio compartido';
    }
  }
  app.persistence.cloudAvailable = false;
  return null;
}

async function saveCloudStateNow() {
  if (!app.auth.client || !app.auth.user || !app.state || app.persistence.loading) return;
  const payload = JSON.parse(JSON.stringify(app.state));
  payload.ownerUserId = payload.ownerUserId || app.auth.user.id;
  const token = await getAccessToken();
  if (token) {
    try {
      const response = await fetch('/api/shared-state', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ workspaceId: app.workspace.id, state: payload }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && !result.needsSetup) {
        app.persistence.cloudAvailable = true;
        app.persistence.lastCloudError = '';
        return;
      }
      if (result.needsSetup || result.error === 'WORKSPACE_ACCESS_REVOKED') {
        stopWorkspaceAccessCheck();
        app.workspace.id = '';
        app.workspace.name = '';
        app.workspace.workspaces = result.workspaces || [];
        app.workspace.needsSetup = true;
        app.booted = false;
        app.state = null;
        renderWorkspaceGate('Tu acceso a este espacio ha terminado.');
        return;
      }
    } catch (error) {
      app.persistence.lastCloudError = error.message || 'No se pudo guardar el espacio compartido';
    }
  }
  app.persistence.cloudAvailable = false;
  app.persistence.lastCloudError ||= 'No se pudo guardar el espacio compartido';
}

function scheduleCloudSave() {
  if (!app.auth.client || !app.auth.user || app.persistence.loading) return;
  clearTimeout(app.persistence.saveTimer);
  app.persistence.saveTimer = setTimeout(() => {
    saveCloudStateNow();
  }, 650);
}

async function loadState() {
  app.persistence.loading = true;
  const cloudState = await loadCloudState();
  if (cloudState) {
    app.state = normalizeState(cloudState);
    applyAuthUserToState();
    refreshBilling();
    app.persistence.loading = false;
    saveState();
    return;
  }
  if (app.auth.client && app.auth.user && app.workspace.needsSetup) {
    app.persistence.loading = false;
    return;
  }
  const stored = localStorage.getItem(storageKey());
  if (!stored) {
    app.state = seedState();
    applyAuthUserToState();
    refreshBilling();
    app.persistence.loading = false;
    saveState();
    return;
  }
  try {
    app.state = JSON.parse(stored);
    if (!app.state || typeof app.state !== 'object') {
      app.state = seedState();
      applyAuthUserToState();
      refreshBilling();
      app.persistence.loading = false;
      saveState();
      return;
    }
    app.state = normalizeState(app.state);
    applyAuthUserToState();
    refreshBilling();
    app.persistence.loading = false;
    saveState();
  } catch {
    app.state = seedState();
    applyAuthUserToState();
    refreshBilling();
    app.persistence.loading = false;
    saveState();
  }
}

function saveState() {
  if (!app.state) return;
  localStorage.setItem(storageKey(), JSON.stringify(app.state));
  scheduleCloudSave();
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
    cuenta: renderAccount,
  };
  renderers[app.view]?.();
  saveState();
}

function updateShell() {
  const user = getCurrentUser();
  const profile = accountProfile();
  const restaurants = visibleRestaurants();
  const services = visibleServices();
  const tasks = app.state.tasks.filter(task => services.some(service => service.id === task.serviceId) && canSeeTask(task));
  const pendingTasks = tasks.filter(task => !['completed', 'cancelled'].includes(task.status)).length;
  const paymentIncidents = canViewPayments() ? app.state.payments.filter(payment => ['late', 'suspended'].includes(payment.status) && services.some(service => service.id === payment.serviceId)).length : 0;
  const alerts = getAlerts();
  $('#navRestaurants').textContent = restaurants.length;
  $('#navTasks').textContent = pendingTasks;
  $('#navPayments').textContent = paymentIncidents;
  $('#navPayments')?.closest('.nav-item')?.classList.toggle('hidden', !canViewPayments());
  $('[data-view="informes"]')?.classList.toggle('hidden', !canViewReports());
  $('#alertCount').textContent = alerts.length;
  $('#profileName').textContent = profile.fullName;
  $('#profileRole').textContent = ROLE_LABELS[user.role] || user.role;
  ['#profileAvatar', '#topAvatar'].forEach(selector => {
    const avatar = $(selector);
    if (!avatar) return;
    avatar.textContent = profile.avatarUrl ? '' : initials(profile.fullName);
    avatar.classList.toggle('image-avatar', Boolean(profile.avatarUrl));
    avatar.style.backgroundImage = profile.avatarUrl ? `url("${profile.avatarUrl}")` : '';
  });
}

function getAlerts() {
  const alerts = [];
  visibleServices().forEach(service => {
    const restaurant = restaurantById(service.restaurantId);
    const payment = app.state.payments.find(item => item.serviceId === service.id && item.cycleStart === iso(serviceCycleStart(service)));
    if (canViewPayments() && payment?.status === 'late') alerts.push({ type: 'payment', tone: 'red', title: `${restaurant.name} tiene un pago retrasado`, text: `${plan(service.planCode).name} · vence desde ${formatDate(payment.dueDate, { short: true, year: false })}` });
    if (canViewPayments() && service.status === 'suspended') alerts.push({ type: 'payment', tone: 'red', title: `${restaurant.name} esta suspendido`, text: 'No se trabaja hasta confirmar el pago pendiente.' });
    if (canViewPayments() && service.status === 'cancelled' && service.cancelReason === 'impago') alerts.push({ type: 'payment', tone: 'red', title: `${restaurant.name} fue cancelado por impago`, text: 'Han pasado 3 dias naturales sin pago.' });
    const notice = cancellationNoticeDate(service);
    const today = parseDate(iso());
    if (notice >= today && notice <= addDays(today, 3)) alerts.push({ type: 'renewal', tone: 'amber', title: `Aviso de cancelacion de ${restaurant.name}`, text: `${plan(service.planCode).name} debe avisar antes del ${formatDate(notice, { short: true })}` });
    const totals = quotaTotals(service);
    if (totals.limit && totals.percent >= 80) alerts.push({ type: 'quota', tone: totals.percent >= 100 ? 'red' : 'amber', title: `${restaurant.name} se acerca al limite`, text: `${plan(service.planCode).name}: ${totals.used}/${totals.limit} consumidos` });
  });
  app.state.tasks
    .filter(task => task.status === 'waiting' && visibleServices().some(service => service.id === task.serviceId) && canSeeTask(task))
    .forEach(task => alerts.push({ type: 'waiting', tone: 'blue', title: `${task.title}`, text: `${restaurantById(task.restaurantId)?.name || 'Restaurante'} espera respuesta del cliente` }));
  return alerts;
}

function renderHome() {
  const services = visibleServices();
  const restaurants = visibleRestaurants();
  const tasks = app.state.tasks.filter(task => services.some(service => service.id === task.serviceId) && canSeeTask(task));
  const currentPayments = canViewPayments() ? app.state.payments.filter(payment => services.some(service => service.id === payment.serviceId) && payment.cycleStart.startsWith(monthKey(new Date()))) : [];
  const activeServices = services.filter(service => service.status !== 'cancelled');
  const received = currentPayments.filter(payment => payment.status === 'paid').reduce((sum, payment) => sum + Number(payment.receivedAmount || 0), 0);
  const expected = currentPayments.reduce((sum, payment) => sum + Number(payment.receivedAmount || 0), 0);
  const pendingTasks = tasks.filter(task => !['completed', 'cancelled'].includes(task.status));
  const incidents = currentPayments.filter(payment => ['late', 'suspended'].includes(payment.status));
  const alerts = getAlerts();
  $('#view-inicio').innerHTML = `
    <div class="page-heading">
      <div><p class="eyebrow">${new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date()).toUpperCase()}</p><h1>Buenos dias, ${esc(getCurrentUser().name.split(' ')[0])}</h1><p>Esto es lo que necesita tu atencion hoy.</p></div>
      ${canCreateRestaurant() ? '<button class="primary-button" data-action="open-restaurant-modal"><span>＋</span> Anadir restaurante</button>' : ''}
    </div>
    <div class="summary-grid">
      ${canViewPayments() ? `<article class="summary-card balance-card"><div class="summary-top"><span class="summary-icon mint">€</span><span class="trend up">${Math.round((received / Math.max(expected, 1)) * 100)}%</span></div><p>Cobrado este mes</p><h2>${euro(received)}</h2><small>Neto recibido con IVA e IRPF aplicado</small></article>` : ''}
      <article class="summary-card"><div class="summary-top"><span class="summary-icon blue">▦</span><span class="trend neutral">${activeServices.length} servicios</span></div><p>Restaurantes activos</p><h2>${restaurants.length}</h2><small>${services.filter(s => s.planCode !== 'menu').length} planes web · ${services.filter(s => s.planCode === 'menu').length} Menu Diario</small></article>
      <article class="summary-card"><div class="summary-top"><span class="summary-icon amber">✓</span><span class="trend warning">${pendingTasks.filter(task => task.priority === 'high').length} urgentes</span></div><p>Trabajos pendientes</p><h2>${pendingTasks.length}</h2><small>${tasks.filter(task => task.status === 'completed' && task.completedAt?.startsWith(iso())).length} completados hoy</small></article>
      ${canViewPayments() ? `<article class="summary-card"><div class="summary-top"><span class="summary-icon rose">!</span><span class="trend danger">Revisar</span></div><p>Pagos con incidencia</p><h2>${incidents.length}</h2><small>${currentPayments.filter(payment => payment.status === 'late').length} retrasados · ${currentPayments.filter(payment => payment.status === 'suspended').length} suspendidos</small></article>` : ''}
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
  const services = app.state.services.filter(service => isAssignedToService(service, member.id) && service.status !== 'cancelled');
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
          <span>${services.map(service => assignedMembersLabel(service)).join('') || '-'}</span>
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
  const className = status === 'active' ? 'active' : status === 'paused' ? 'ready' : status === 'late' ? 'late' : status === 'suspended' ? 'late' : status === 'paid' ? 'active' : status === 'ready' ? 'ready' : 'pending';
  const labels = { active: 'Activo', paused: 'Pausado', late: 'Retrasado', suspended: 'Suspendido', cancelled: 'Cancelado', pending: 'Sin pagar', paid: 'Pagado', ready: 'Listo' };
  return `<i class="status-pill ${className}">${labels[status] || esc(status)}</i>`;
}

function assignedLabel(memberId) {
  const member = memberById(memberId);
  if (!member) return '';
  return `<strong class="assigned"><i class="avatar tiny ${member.role === 'admin' ? 'peach' : 'sky'}">${initials(member.name)}</i>${esc(member.name)}</strong>`;
}

function assignedMembersLabel(service) {
  const members = serviceMemberIds(service).map(memberById).filter(Boolean);
  if (!members.length) return '<span class="muted-note">Sin asignar</span>';
  return `<span class="assigned-member-stack">${members.map(member => `<i class="avatar tiny ${member.role === 'admin' ? 'peach' : member.role === 'owner' ? 'avatar-green' : 'sky'}" title="${esc(member.name)}">${initials(member.name)}</i>`).join('')}<small>${members.map(member => esc(member.name)).join(', ')}</small></span>`;
}

function renderRestaurantsLegacy() {
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

function renderRestaurants() {
  const query = app.search.trim().toLowerCase();
  const restaurants = visibleRestaurants().filter(restaurant => !query || `${restaurant.name} ${restaurant.email} ${restaurant.phone}`.toLowerCase().includes(query));
  const headingActions = canCreateRestaurant() ? '<button class="primary-button" data-action="open-restaurant-modal">+ Anadir restaurante</button>' : '';
  const toolbarActions = [
    canManage() ? '<button class="secondary-button" data-action="open-service-modal">+ Anadir servicio</button>' : '',
    canManage() ? '<button class="secondary-button" data-action="export-restaurants">Exportar</button>' : '',
  ].join('');
  const description = canViewPayments()
    ? 'Ficha completa de planes, Menu Diario, pagos y trabajos.'
    : 'Ficha de los restaurantes y servicios a los que tienes acceso.';
  $('#view-restaurantes').innerHTML = `
    <div class="page-heading compact"><div><p class="eyebrow">CLIENTES</p><h1>Restaurantes</h1><p>${description}</p></div>${headingActions}</div>
    <div class="toolbar"><label class="filter-search"><span>⌕</span><input value="${esc(app.search)}" data-action="search-input" placeholder="Buscar restaurante..."></label><div class="toolbar-right">${toolbarActions}</div></div>
    <div class="restaurant-card-grid">${restaurants.map(restaurantCard).join('') || emptyState('□', 'No hay restaurantes', canCreateRestaurant() ? 'Anade el primer cliente para empezar.' : 'Todavia no tienes restaurantes asignados.')}</div>
  `;
}

function restaurantCard(restaurant) {
  const services = servicesForRestaurant(restaurant.id);
  const tasks = app.state.tasks.filter(task => task.restaurantId === restaurant.id && !['completed', 'cancelled'].includes(task.status));
  const paymentIssues = canViewPayments() ? app.state.payments.filter(payment => payment.restaurantId === restaurant.id && ['late', 'suspended'].includes(payment.status)) : [];
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
        <span><small>${canViewPayments() ? 'Pago' : 'Acceso'}</small><strong>${canViewPayments() ? (paymentIssues.length ? 'Revisar' : 'OK') : 'Asignado'}</strong></span>
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
      <div class="detail-actions">
        ${isOwner() ? `<button class="secondary-button" data-action="${restaurant.clientPortalId ? 'open-client-portal' : 'create-client-portal'}" data-id="${restaurant.id}">${restaurant.clientPortalId ? 'Ver panel' : 'Crear panel'}</button>` : ''}
        ${isOwner() && restaurant.clientPortalId ? `<button class="secondary-button" data-action="open-client-portal-invite" data-id="${restaurant.id}">Anadir cliente</button>` : ''}
        ${restaurant.clientPortalId ? `<button class="secondary-button" data-action="open-client-requests" data-id="${restaurant.id}">Solicitudes cliente</button>` : ''}
        ${canManage() ? `<button class="secondary-button" data-action="open-restaurant-modal" data-id="${restaurant.id}">Editar ficha</button>` : ''}
        <button class="secondary-button" data-action="open-note-modal" data-id="${restaurant.id}">Añadir nota</button>
        ${canManage() ? `<button class="secondary-button" data-action="open-service-modal" data-restaurant="${restaurant.id}">Añadir servicio</button>` : ''}
        <button class="primary-button" data-action="open-task-modal" data-restaurant="${restaurant.id}">＋ Nuevo cambio</button>
      </div>
    </div>
    <div class="detail-tabs">${tabs.map(tab => `<button class="${app.detailTab === tab ? 'active' : ''}" data-action="detail-tab" data-tab="${tab}">${tabLabel(tab)}</button>`).join('')}</div>
    ${detailTabContent(restaurant, services)}
  `;
  if (canDeleteRestaurant()) {
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
        ${restaurantNotesPanel(restaurant)}
        ${reportPanel(restaurant)}
      </aside>
    </div>
  `;
}

function restaurantNotesPanelLegacy(restaurant) {
  const notes = [...(restaurant.noteEntries || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return `
    <section class="panel no-shadow">
      <div class="panel-heading"><h3>Notas internas</h3><button class="icon-button" data-action="open-note-modal" data-id="${restaurant.id}" title="Añadir nota">＋</button></div>
      <div class="restaurant-notes">${notes.slice(0, 4).map(note => `<article><strong>${esc(note.authorName || memberById(note.authorId)?.name || 'Miembro')}</strong><small>${formatDateTime(note.createdAt)}</small><p>${esc(note.text)}</p></article>`).join('') || '<p class="settings-copy">Todavía no hay notas internas.</p>'}</div>
    </section>
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
        <span><small>Compromiso</small><strong>3 meses iniciales <i>despues, renovacion mensual</i></strong></span>
        <span><small>Equipo</small>${assignedMembersLabel(service)}</span>
      </div>
      <div class="quota-heading"><h4>${service.planCode === 'menu' ? 'Actualizaciones del ciclo' : 'Cuotas del ciclo actual'}</h4><span>${isServicePaused(service) ? 'Ciclo congelado' : `${formatDate(serviceCycleStart(service), { short: true })} - ${formatDate(serviceCycleEnd(service), { short: true })}`}</span></div>
      <div class="quota-grid">
        ${Object.entries(usage).map(([key, item]) => quotaItem(key, item)).join('')}
      </div>
      <div class="service-actions">
        <button class="small-button" data-action="open-task-modal" data-restaurant="${service.restaurantId}" data-service="${service.id}" ${service.status !== 'active' ? 'disabled title="El servicio no esta activo"' : ''}>Registrar cambio</button>
        ${isOwner() ? `<button class="small-button" data-action="open-extra-credit-modal" data-id="${service.id}">Añadir credito</button>` : ''}
        ${canManage() ? `<button class="small-button" data-action="open-service-modal" data-id="${service.id}">Editar servicio</button>` : ''}
        ${canOperateService(service) && service.planCode !== 'menu' ? `<button class="small-button" data-action="open-plan-change-modal" data-id="${service.id}">Cambiar plan</button><button class="small-button" data-action="${isServicePaused(service) ? 'resume-service' : 'open-pause-modal'}" data-id="${service.id}">${isServicePaused(service) ? 'Reanudar' : 'Pausar'}</button>` : ''}
        ${canCancelService(service) ? `<button class="small-button danger-text" data-action="cancel-service" data-id="${service.id}">Cancelar</button>` : ''}
      </div>
      <div class="service-note">Uso total: ${totals.used}/${totals.limit} (${totals.percent}%). ${restaurant ? esc(restaurant.name) : ''}</div>
    </section>
  `;
}

function quotaItem(key, item) {
  const percent = item.limit ? Math.min(100, Math.round((item.used / item.limit) * 100)) : 0;
  return `
    <article class="quota-item">
      <div class="quota-number"><strong>${item.used}/${item.limit}</strong><span>${item.limit ? `${Math.max(0, item.limit - item.used)} restantes` : 'Sin cuota incluida'}</span></div>
      <p>${esc(taskTypeLabel(key))}</p>
      <span class="quota-bar ${percent >= 100 ? 'full' : ''}"><i style="width:${percent}%"></i></span>
      <small>${item.used} usados</small>
    </article>
  `;
}

function renewalPanel(service) {
  if (!service) return `<section class="panel no-shadow next-renewal"><p class="eyebrow">RENOVACION</p><p>Sin servicio activo.</p></section>`;
  const end = serviceNextPaymentDate(service);
  const notice = cancellationNoticeDate(service);
  return `
    <section class="panel no-shadow next-renewal">
      <p class="eyebrow">PROXIMA RENOVACION</p>
      <div class="date-block"><strong>${String(end.getDate()).padStart(2, '0')}</strong><span>${new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(end).toUpperCase()}<br>${end.getFullYear()}</span></div>
      <p>${isServicePaused(service) ? 'Servicio pausado: se conserva el tiempo y las cuotas restantes.' : service.cancelAtEnd ? 'Cancelacion programada al terminar este ciclo.' : 'Renueva automaticamente cada mes.'}</p>
      <div class="renewal-warning">Avisar antes del ${formatDate(notice, { short: true })} para cancelar.</div>
      ${canManage() ? `<button class="secondary-button full-width" data-action="open-service-modal" data-id="${service.id}">Gestionar renovacion</button>` : ''}
    </section>
  `;
}

function teamPanel(services) {
  return `
    <section class="panel no-shadow">
      <div class="panel-heading"><h3>Equipo asignado</h3></div>
      ${services.map(service => {
        const members = serviceMemberIds(service).map(memberById).filter(Boolean);
        return `<div class="team-service-row"><div><strong>${esc(plan(service.planCode).name)}</strong><small>${members.length ? `${members.length} persona(s) asignada(s)` : 'Sin asignar'}</small></div>${canManageServiceTeam() ? `<button class="icon-button" data-action="open-service-team-modal" data-id="${service.id}" title="Asignar equipo">＋</button>` : ''}</div><div class="assigned-member-list">${members.map(member => `<div class="assigned-member"><span class="avatar ${member.role === 'admin' ? 'peach' : member.role === 'owner' ? 'avatar-green' : 'sky'}">${initials(member.name)}</span><div><strong>${esc(member.name)}</strong><small>${esc(ROLE_LABELS[member.role])}</small></div></div>`).join('') || '<div class="assigned-member"><div><strong>Sin responsables</strong><small>Asigna miembros de tu equipo a este servicio.</small></div></div>'}</div>`;
      }).join('') || '<div class="assigned-member"><div><strong>Sin responsables</strong><small>Anade un servicio para asignar equipo.</small></div></div>'}
    </section>
  `;
}

function reportPanel(restaurant) {
  if (!canViewReports()) return '';
  const hasBasePlan = app.state.services.some(service => service.restaurantId === restaurant.id && BASE_PLAN_CODES.includes(service.planCode));
  if (!hasBasePlan) return `
    <section class="panel no-shadow">
      <div class="panel-heading"><h3>Informe mensual</h3></div>
      <p class="settings-copy">Menu Diario no incluye informe mensual.</p>
    </section>
  `;
  const report = app.state.reports.filter(item => item.restaurantId === restaurant.id).sort((a, b) => b.month.localeCompare(a.month))[0];
  return `
    <section class="panel no-shadow">
      <div class="panel-heading"><h3>Informe mensual</h3>${report ? statusPill(report.status) : '<span></span>'}</div>
      <div class="report-preview"><span>PDF</span><div><strong>${report ? `Informe ${report.month}` : 'Sin informe'}</strong><small>${report ? `Generado ${formatDateTime(report.generatedAt)}` : 'Genera el primer informe mensual'}</small></div></div>
      ${report
        ? `<button class="primary-button full-width" data-action="download-report" data-id="${report.id}">↓ Descargar informe</button>`
        : canManage()
          ? `<button class="primary-button full-width" data-action="generate-report" data-id="${restaurant.id}">Generar informe</button>`
          : '<p class="muted-note">El propietario o un administrador puede generar el informe cuando termine el ciclo.</p>'}
    </section>
  `;
}

function restaurantTasksTab(restaurant, services) {
  const serviceIds = new Set(services.map(service => service.id));
  const tasks = app.state.tasks.filter(task => serviceIds.has(task.serviceId) && canSeeTask(task)).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  const columns = [
    ['requested', 'Solicitados'],
    ['assigned', 'Asignados'],
    ['in_progress', 'En proceso'],
    ['waiting', 'Esperando cliente'],
    ['completed', 'Completados'],
  ];
  return `
    <section class="panel no-shadow recent-work">
      <div class="panel-heading"><div><p class="eyebrow">ACTIVIDAD</p><h3>Trabajos de ${esc(restaurant.name)}</h3></div><button class="primary-button" data-action="open-task-modal" data-restaurant="${restaurant.id}">＋ Registrar cambio</button></div>
      <div class="kanban restaurant-kanban">${columns.map(([status, label]) => taskColumn(status, label, tasks.filter(task => task.status === status))).join('')}</div>
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
  const incidents = tasks.filter(task => quotaTypeForTask(task) === 'external_incident' || task.type === 'incident').length;
  return `
    <article>
      <span>${month}</span>
      <h3>${tasks.length} trabajos</h3>
      <p>${completed} completados · ${incidents} incidencias</p>
      ${canManage()
        ? `<button data-action="generate-report" data-id="${restaurant.id}" data-month="${month}">Generar ficha →</button>`
        : '<small>Ficha disponible cuando la genere un administrador.</small>'}
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
  const canDeleteTask = canSeeTask(task);
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
  let tasks = app.state.tasks.filter(task => services.some(service => service.id === task.serviceId) && canSeeTask(task));
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
  const canDeleteTask = canSeeTask(task);
  return `
    <article class="task-card ${task.priority === 'high' ? 'urgent' : ''} ${task.status === 'waiting' ? 'waiting' : ''} ${task.status === 'completed' ? 'done' : ''}">
      <div><span class="task-type ${plan(service?.planCode).className}">${esc(taskTypeLabel(task.type))} ×${Number(task.quantity || 1)}</span><button data-action="open-task-modal" data-id="${task.id}">⋮</button></div>
      <h4>${esc(task.title)}</h4>
      <p>${esc(restaurant?.name || '')} · ${esc(plan(service?.planCode).name)}</p>
      <div class="task-footer"><span class="avatar tiny ${member?.role === 'admin' ? 'peach' : 'sky'}" title="${esc(member?.name || task.assignedName || 'Sin responsable')}">${initials(member?.name || task.assignedName || '?')}</span><time>${formatDateTime(task.completedAt || task.startedAt || task.requestedAt)}</time></div>
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
    if (payment && canViewPayments()) {
      const due = parseDate(payment.dueDate);
      if (due >= monthStart && due <= monthEnd) events.push({ date: due, tone: payment.status === 'paid' ? 'green' : payment.status === 'late' ? 'amber' : 'blue', title: `Cobro ${restaurant?.name}`, text: `${euro(payment.invoiceTotal)} factura · ${euro(payment.receivedAmount)} neto`, kind: 'payment' });
    }
  });
  app.state.tasks
    .filter(task => visibleServices().some(service => service.id === task.serviceId) && canSeeTask(task))
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
  if (!canViewPayments()) {
    $('#view-pagos').innerHTML = emptyState('€', 'Acceso restringido', 'Solo el propietario puede consultar y confirmar pagos.');
    return;
  }
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
    <section class="panel payment-panel"><div class="toolbar"><div class="filter-group">${['all','paid','pending','late','suspended','cancelled'].map(status => `<button class="filter-button ${app.paymentFilter === status ? 'active' : ''}" data-action="payment-filter" data-filter="${status}">${status === 'all' ? 'Todos' : PAYMENT_LABELS[status]}</button>`).join('')}</div><button class="select-button">${new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date())}</button></div><div class="payment-table table-scroll">${paymentTable(payments)}</div></section>
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
  if (!canViewReports()) {
    $('#view-informes').innerHTML = emptyState('PDF', 'Acceso restringido', 'Los informes los consultan el propietario y los administradores.');
    return;
  }
  const restaurants = visibleRestaurants();
  let reports = app.state.reports.filter(report => restaurants.some(restaurant => restaurant.id === report.restaurantId));
  if (app.reportFilter !== 'all') reports = reports.filter(report => report.restaurantId === app.reportFilter);
  reports = reports.sort((a, b) => b.month.localeCompare(a.month));
  $('#view-informes').innerHTML = `
    <div class="page-heading compact"><div><p class="eyebrow">DOCUMENTACION</p><h1>Informes mensuales</h1><p>Historial de servicio descargable en PDF por restaurante.</p></div>${canManage() ? '<button class="primary-button" data-action="open-report-modal">＋ Generar informe</button>' : ''}</div>
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
  const current = getCurrentUser();
  const members = current.role === 'worker'
    ? app.state.members.filter(member => member.active && (member.role === 'owner' || member.id === current.id))
    : app.state.members.filter(member => member.active);
  $('#view-equipo').innerHTML = `
    <div class="page-heading compact"><div><p class="eyebrow">PERSONAS Y PERMISOS</p><h1>Equipo</h1><p>${isOwner() ? 'Gestiona altas, accesos y asignaciones.' : current.role === 'admin' ? 'Consulta el equipo y asigna personas desde cada servicio.' : 'Solo ves al propietario y tu propia ficha.'}</p></div>${canManageMembers() ? '<button class="primary-button" data-action="open-member-modal">＋ Invitar miembro</button>' : ''}</div>
    <div class="team-grid">${members.map(teamCard).join('')}</div>
  `;
}

function teamCard(member) {
  const services = app.state.services.filter(service => isAssignedToService(service, member.id) && service.status !== 'cancelled');
  const tasks = app.state.tasks.filter(task => task.assignedTo === member.id && !['completed', 'cancelled'].includes(task.status));
  const canRemove = canManageMembers() && member.role !== 'owner' && member.id !== app.state.currentUserId;
  const restaurantIds = memberRestaurantIds(member);
  const restaurantScope = member.role === 'owner'
    ? 'Todos los restaurantes'
    : restaurantIds.length
      ? restaurantIds.map(id => restaurantById(id)?.name).filter(Boolean).join(', ')
      : member.role === 'admin' ? 'Todos los restaurantes' : 'Solo planes asignados';
  return `
    <article class="team-card ${member.role === 'owner' ? 'owner-card' : ''}">
      <div class="team-top">${avatarMarkup(member.name, member.avatarUrl, `avatar big ${member.role === 'owner' ? 'avatar-green' : member.role === 'admin' ? 'peach' : 'sky'}`)}<span class="role-pill ${member.role}">${ROLE_LABELS[member.role]}</span></div>
      <h3>${esc(member.name)}</h3><p>${esc(member.email)}</p>
      ${member.invitedAt ? `<p><small>Invitacion enviada ${formatDateTime(member.invitedAt)}</small></p>` : ''}
      ${member.registeredUser ? '<p><small>Usuario ya registrado</small></p>' : ''}
      <p><small>Acceso: ${esc(restaurantScope)}</small></p>
      <div class="team-stats"><span><strong>${services.length}</strong>Servicios</span><span><strong>${tasks.length}</strong>Pendientes</span></div>
      ${canManageMembers() ? `<button class="secondary-button full-width" data-action="open-member-modal" data-id="${member.id}">Gestionar permisos</button>` : ''}
      ${canRemove ? `<button class="secondary-button full-width danger-outline" data-action="remove-member" data-id="${member.id}">Expulsar miembro</button>` : ''}
    </article>
  `;
}

function renderPlansLegacy() {
  $('#view-planes').innerHTML = `
    <div class="page-heading compact"><div><p class="eyebrow">CATALOGO INTERNO</p><h1>Planes y servicios</h1><p>Precios, limites y condiciones configurados en Cuotly.</p></div><button class="secondary-button" data-action="open-settings-prices">Editar impuestos</button></div>
    <div class="plan-grid">${Object.values(PLAN_CATALOG).map(planCard).join('')}</div>
  `;
}

function renderPlans() {
  $('#view-planes').innerHTML = `
    <div class="page-heading compact"><div><p class="eyebrow">CATALOGO INTERNO</p><h1>Planes y servicios</h1><p>Precios, limites y condiciones configurados en Cuotly.</p></div>${isOwner() ? '<button class="secondary-button" data-action="open-settings-prices">Editar impuestos</button>' : ''}</div>
    <div class="plan-grid">${Object.values(PLAN_CATALOG).map(planCard).join('')}</div>
  `;
}

function planCard(p) {
  const timing = p.timing || {};
  return `
    <article class="plan-card ${p.className}-plan ${p.code === 'impulso' ? 'popular' : ''}">
      ${p.code === 'impulso' ? '<span class="popular-tag">MAS CONTRATADO</span>' : ''}
      <span class="plan-label">${esc(p.label)}</span>
      <h2>${esc(p.name)}</h2>
      <div class="plan-price"><strong>${euro(p.price)}</strong><span>/ mes + IVA</span></div>
      <ul>${p.includes.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
      <div class="price-matrix">
        <span><b>Facturacion</b>Mensual · permanencia inicial de 3 meses</span>
        <span><b>Respuesta</b>${esc(timing.response || p.response)}</span>
        ${timing.delivery ? `<span><b>Plazo habitual</b>${esc(timing.delivery)}</span>` : ''}
        ${timing.urgent ? `<span><b>Prioridad</b>${esc(timing.urgent)}</span>` : ''}
        ${p.code === 'menu' ? `<span><b>Con Premium activo</b>${euro(p.premiumPrice)}/mes</span>` : ''}
      </div>
      ${canManage() ? `<button class="secondary-button full-width" data-action="open-service-modal" data-plan="${p.code}">Asignar plan</button>` : ''}
    </article>
  `;
}

function renderAccount() {
  const profile = accountProfile();
  const tabs = [['perfil', 'Perfil'], ['espacios', 'Mis espacios'], ['seguridad', 'Seguridad'], ['notificaciones', 'Notificaciones'], ['privacidad', 'Privacidad']];
  $('#view-cuenta').innerHTML = `
    <div class="page-heading compact"><div><p class="eyebrow">CUENTA PERSONAL</p><h1>Mi cuenta</h1><p>Tu perfil es privado. Los espacios en los que trabajas y tus permisos se gestionan por separado.</p></div></div>
    <div class="settings-layout account-layout">
      <section class="panel settings-menu">${tabs.map(([key, label]) => `<button class="${app.accountTab === key ? 'active' : ''}" data-action="account-tab" data-tab="${key}">${label}</button>`).join('')}</section>
      <section class="panel settings-content">${accountTabContent(profile)}</section>
    </div>
  `;
}

function accountTabContent(profile) {
  if (app.accountTab === 'espacios') {
    const spaces = app.workspace.workspaces || [];
    return `
      <h2>Mis espacios</h2>
      <p class="settings-copy">Cada espacio mantiene sus restaurantes, equipo y datos separados. Tu cuenta puede ser propietaria de varios y colaborar en otros.</p>
      <div class="workspace-list settings-workspaces">${spaces.map(space => `<article class="workspace-row ${space.id === app.workspace.id ? 'active-space' : ''}"><button class="secondary-button workspace-choice" data-action="switch-workspace" data-id="${space.id}"><span><strong>${esc(space.name)}</strong><small>${esc(ROLE_LABELS[space.role] || space.role)}</small></span><b>${space.id === app.workspace.id ? 'Actual' : 'Abrir'}</b></button>${space.role === 'owner' ? `<button class="small-button danger-text" data-action="delete-workspace" data-id="${space.id}">Eliminar</button>` : ''}</article>`).join('')}</div>
      <form id="workspaceCreateForm" class="settings-danger"><h2>Crear espacio</h2><p class="settings-copy">El nuevo espacio será privado y empezará vacío.</p><label>Nombre del espacio<input name="workspaceName" required maxlength="120" placeholder="El nombre que quieras"></label><button class="secondary-button">Crear espacio</button></form>
    `;
  }
  if (app.accountTab === 'seguridad') {
    const provider = emailProviderEnabled();
    return `
      <h2>Seguridad</h2>
      <label>Email de la cuenta<input value="${esc(getAuthEmail(app.auth.user))}" disabled></label>
      <div class="security-card"><div><strong>Contraseña</strong><p>${provider ? 'Tu cuenta puede acceder con email y contraseña.' : 'Entraste con Google. Puedes crear una contraseña para tener ambas formas de acceso.'}</p></div><button class="secondary-button" data-action="open-password-modal">${provider ? 'Cambiar contraseña' : 'Crear contraseña'}</button></div>
      <div class="security-card"><div><strong>Verificación en dos pasos</strong><p>Está activada y es obligatoria para acceder a Cuotly.</p></div><button class="secondary-button" data-action="open-backup-mfa">Añadir autenticador de respaldo</button></div>
      <p class="muted-note">Guarda el autenticador de respaldo en otro dispositivo. Supabase no ofrece códigos de recuperación.</p>
    `;
  }
  if (app.accountTab === 'notificaciones') {
    const n = profile.notifications;
    return `
      <h2>Notificaciones</h2>
      <p class="settings-copy">Los avisos se muestran dentro de Cuotly. Puedes permitir avisos del navegador para recibirlos también en el móvil cuando tengas la aplicación abierta.</p>
      <form id="accountNotificationsForm">
        <label class="toggle-row"><span><strong>Avisos en Cuotly</strong><small>Alertas dentro de tu cuenta.</small></span><input name="app" type="checkbox" ${n.app !== false ? 'checked' : ''}></label>
        <label class="toggle-row"><span><strong>Avisos en este dispositivo</strong><small>Solicita permiso al navegador para mostrar avisos en ordenador o móvil.</small></span><input name="push" type="checkbox" ${n.push ? 'checked' : ''}></label>
        <label class="toggle-row"><span><strong>Trabajos asignados</strong><small>Cuando te asignen o actualicen un cambio.</small></span><input name="assignments" type="checkbox" ${n.assignments !== false ? 'checked' : ''}></label>
        <label class="toggle-row"><span><strong>Pagos y renovaciones</strong><small>Solo si tu permiso te permite verlos.</small></span><input name="payments" type="checkbox" ${n.payments !== false ? 'checked' : ''}></label>
        <button class="primary-button">Guardar preferencias</button>
      </form>
    `;
  }
  if (app.accountTab === 'privacidad') {
    return `
      <h2>Privacidad y datos</h2>
      <p class="settings-copy">Puedes descargar los datos de tu cuenta: perfil, preferencias, espacios y permisos. No contiene contraseñas, códigos de autenticación ni datos privados de otras personas.</p>
      <div class="security-card"><div><strong>Descargar mis datos</strong><p>Genera un archivo privado en formato JSON.</p></div><button class="secondary-button" data-action="export-account-data">Descargar datos</button></div>
      <div class="settings-danger"><h2>Eliminar cuenta</h2><p>Se eliminarán tus espacios propios y tu perfil. En los espacios de otros se conservará el historial de tareas y notas como “Cuenta eliminada”.</p><button class="danger-button" data-action="open-delete-account-modal">Eliminar mi cuenta</button></div>
    `;
  }
  return `
    <h2>Perfil</h2>
    <p class="settings-copy">Tu nombre y tu foto ayudan al equipo a identificarte. El resto de los datos solo los ves tú.</p>
    <form id="accountProfileForm">
      <div class="account-profile-head">${avatarMarkup(profile.fullName, profile.avatarUrl, 'avatar large-avatar avatar-green')}<label class="avatar-upload">Cambiar foto<input name="avatar" type="file" accept="image/png,image/jpeg,image/webp"></label></div>
      <div class="form-grid">
        <label>Nombre<input name="fullName" maxlength="80" value="${esc(profile.fullName)}"></label>
        <label>Email<input value="${esc(getAuthEmail(app.auth.user))}" disabled></label>
        <label>Teléfono<input name="phone" maxlength="40" value="${esc(profile.phone)}" placeholder="Opcional"></label>
        <label>Cargo<input name="jobTitle" maxlength="80" value="${esc(profile.jobTitle)}" placeholder="Ej. Responsable de mantenimiento"></label>
        <label class="wide">Bio breve<textarea name="bio" maxlength="280" placeholder="Solo visible para ti">${esc(profile.bio)}</textarea></label>
      </div>
      <button class="primary-button">Guardar perfil</button>
    </form>
  `;
}

async function uploadAccountAvatar(file) {
  if (!file || !file.name || !file.size) return accountProfile().avatarUrl;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('La foto debe ser JPG, PNG o WEBP y pesar menos de 2 MB.');
  const path = `${app.auth.user.id}/avatar.${file.name.split('.').pop().toLowerCase()}`;
  const { error } = await app.auth.client.storage.from('cuotly-avatars').upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type });
  if (error) throw error;
  const { data } = app.auth.client.storage.from('cuotly-avatars').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

async function updateAccountProfile(values) {
  const token = await getAccessToken();
  const response = await fetch('/api/account', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'profile', profile: values }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'No se pudo guardar el perfil.');
  app.auth.user.user_metadata = { ...(app.auth.user.user_metadata || {}), ...result.profile };
  const currentMember = getCurrentUser();
  if (currentMember) {
    currentMember.name = result.profile.full_name;
    currentMember.avatarUrl = result.profile.avatar_url || '';
  }
  return result.profile;
}

async function handleAccountProfileSubmit(form) {
  const data = new FormData(form);
  const button = form.querySelector('button.primary-button');
  button.disabled = true;
  button.textContent = 'Guardando...';
  try {
    const avatarUrl = await uploadAccountAvatar(data.get('avatar'));
    await updateAccountProfile({ full_name: String(data.get('fullName') || '').trim() || accountProfile().fullName || getAuthName(app.auth.user), phone: data.get('phone'), job_title: data.get('jobTitle'), bio: data.get('bio'), avatar_url: avatarUrl, notification_preferences: accountProfile().notifications });
    render();
    showToast('Perfil actualizado');
  } catch (error) {
    showToast(error.message || 'No se pudo guardar el perfil.');
    button.disabled = false;
    button.textContent = 'Guardar perfil';
  }
}

async function handleAccountNotifications(form) {
  const data = new FormData(form);
  const preferences = { app: data.has('app'), push: data.has('push'), assignments: data.has('assignments'), reminders: true, payments: data.has('payments') };
  if (preferences.push && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
  if (preferences.push && 'Notification' in window && Notification.permission === 'denied') {
    preferences.push = false;
    showToast('El navegador tiene los avisos bloqueados. Puedes activarlos desde sus ajustes.');
  }
  try {
    await updateAccountProfile({ full_name: accountProfile().fullName, phone: accountProfile().phone, job_title: accountProfile().jobTitle, bio: accountProfile().bio, avatar_url: accountProfile().avatarUrl, notification_preferences: preferences });
    renderAccount();
    showToast('Preferencias guardadas');
  } catch (error) { showToast(error.message || 'No se pudieron guardar las preferencias.'); }
}

function openPasswordModal() {
  const provider = emailProviderEnabled();
  openModal(modalFrame(provider ? 'Cambiar contraseña' : 'Crear contraseña', 'SEGURIDAD', `
    <form id="accountPasswordForm"><div class="form-grid">${provider ? '<label class="wide">Contraseña actual<input name="currentPassword" type="password" autocomplete="current-password" required></label>' : ''}<label class="wide">Nueva contraseña<input name="newPassword" type="password" autocomplete="new-password" minlength="8" required></label><label class="wide">Repite la nueva contraseña<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></label></div><div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">Guardar contraseña</button></div></form>
  `));
}

async function handlePasswordSubmit(form) {
  const data = Object.fromEntries(new FormData(form));
  if (data.newPassword !== data.confirmPassword) { showToast('Las contraseñas no coinciden.'); return; }
  if (emailProviderEnabled()) {
    const config = window.CUOTLY_CONFIG || {};
    const verification = await fetch(`${String(config.supabaseUrl || '').replace(/\/+$/, '')}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: config.supabaseAnonKey || '', 'content-type': 'application/json' },
      body: JSON.stringify({ email: getAuthEmail(app.auth.user), password: data.currentPassword }),
    });
    if (!verification.ok) { showToast('La contraseña actual no es correcta.'); return; }
  }
  const { error } = await app.auth.client.auth.updateUser({ password: data.newPassword });
  if (error) { showToast(error.message || 'No se pudo guardar la contraseña.'); return; }
  closeModal();
  showToast('Contraseña actualizada');
}

function openDeleteAccountModal() {
  openModal(modalFrame('Eliminar mi cuenta', 'ACCIÓN DEFINITIVA', `<form id="deleteAccountForm"><p class="settings-copy">Esta acción no se puede deshacer. Escribe <strong>ELIMINAR</strong> para confirmar.</p><label>Confirmación<input name="confirmation" autocomplete="off" required></label><div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="danger-button">Eliminar mi cuenta</button></div></form>`));
}

async function handleDeleteAccount(form) {
  const confirmation = String(new FormData(form).get('confirmation') || '');
  const token = await getAccessToken();
  const response = await fetch('/api/account', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'delete-account', confirmation }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { showToast(result.error || 'No se pudo eliminar la cuenta.'); return; }
  await logout();
  renderAuthScreen('register', 'Tu cuenta y tus espacios propios se han eliminado.');
}

function exportAccountData() {
  const profile = accountProfile();
  const payload = { exportedAt: nowIso(), profile: { name: profile.fullName, email: getAuthEmail(app.auth.user), phone: profile.phone, jobTitle: profile.jobTitle, bio: profile.bio, avatarUrl: profile.avatarUrl, notifications: profile.notifications }, spaces: (app.workspace.workspaces || []).map(space => ({ name: space.name, role: ROLE_LABELS[space.role] || space.role })), security: { twoFactor: 'enabled', passwordAccess: emailProviderEnabled() } };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'cuotly-mis-datos.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

function renderSettings() {
  const ownerTabs = [
    ['general', 'General'],
    ['calendario', 'Calendario laboral'],
    ['notificaciones', 'Notificaciones'],
    ['seguridad', 'Seguridad y accesos'],
    ['integraciones', 'Integraciones'],
  ];
  const tabs = isOwner() ? ownerTabs : [['general', 'Información del espacio']];
  if (!tabs.some(([key]) => key === app.settingsTab)) app.settingsTab = 'general';
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
        <label>Cancelacion<input value="3 dias naturales antes del siguiente cobro" disabled></label>
        <label>Pago vencido<input value="Suspension al finalizar el dia de vencimiento" disabled></label>
        <label class="toggle-row"><span><strong>Cancelacion automatica por impago</strong><small>Tras 3 dias naturales sin pago, el servicio se cancela y se bloquea el trabajo.</small></span><input name="autoSuspend" type="checkbox" checked disabled></label>
      </form>
    `;
  }
  if (app.settingsTab === 'seguridad') {
    const inactive = app.state.members.filter(member => member.active === false && member.role !== 'owner');
    return `
      <h2>Seguridad y accesos</h2>
      <p class="settings-copy">El propietario conserva el control total de este espacio. Cada miembro mantiene una cuenta privada que puede usar también en otros espacios.</p>
      <div class="access-preview">${app.state.members.map(member => `<div><span class="avatar tiny ${member.role === 'owner' ? 'avatar-green' : 'sky'}">${initials(member.name)}</span><strong>${esc(member.name)}</strong><small>${ROLE_LABELS[member.role]}</small></div>`).join('')}</div>
      ${isOwner() ? '<button class="secondary-button" data-action="open-member-modal">Gestionar equipo</button>' : ''}
      ${isOwner() ? `<div class="settings-danger"><h2>Miembros anteriores</h2><p class="settings-copy">Los expulsados no tienen acceso. Puedes reactivarlos conservando sus asignaciones o eliminarlos definitivamente durante 20 días.</p>${inactive.length ? `<div class="former-members">${inactive.map(member => `<article><div><strong>${esc(member.name)}</strong><small>${esc(member.email)}${member.removedAt ? ` · Expulsado ${formatDateTime(member.removedAt)}` : ''}</small></div><div class="row-actions"><button class="small-button" data-action="restore-member" data-id="${member.id}">Reactivar</button><button class="small-button danger-text" data-action="purge-member" data-id="${member.id}">Eliminar</button></div></article>`).join('')}</div>` : '<p class="muted-note">No hay miembros anteriores.</p>'}</div>` : ''}
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
  if (!isOwner()) {
    return `
      <h2>Informacion del espacio</h2>
      <p class="settings-copy">Estos ajustes los gestiona el propietario del espacio.</p>
      <div class="security-card"><div><strong>${esc(s.workspaceName || 'Mi espacio')}</strong><p>Espacio de trabajo actual.</p></div></div>
      <div class="security-card"><div><strong>Zona horaria</strong><p>${esc(s.timezone || 'Europe/Madrid')}</p></div></div>
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
  if (!canManage()) return;
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
        <label class="wide">URL publica de la web<input name="publicUrl" type="url" value="${esc(restaurant.publicUrl || '')}" placeholder="https://www.restaurante.es"></label>
        ${isOwner() ? `<label class="wide">Enlace editor de LandingSite<input name="editorUrl" type="url" value="${esc(restaurant.editorUrl || '')}" placeholder="https://landingsite.ai/..."><small>Solo el propietario de mantenimiento puede gestionar este acceso.</small></label>` : ''}
        <label class="wide">Notas<textarea name="notes" placeholder="Notas internas...">${esc(restaurant.notes || '')}</textarea></label>
      </div>
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">${isEdit ? 'Guardar ficha' : 'Crear restaurante'}</button></div>
    </form>
  `));
}

function openNoteModalLegacy(id) {
  const restaurant = restaurantById(id);
  if (!restaurant || !canSeeRestaurant(id)) return;
  openModal(modalFrame('Añadir nota interna', 'RESTAURANTE', `
    <form id="restaurantNoteForm" data-id="${restaurant.id}">
      <div class="form-grid"><label class="wide">Nota<textarea name="text" required placeholder="Información útil para el equipo, contexto del cliente o seguimiento..."></textarea></label></div>
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">Guardar nota</button></div>
    </form>
  `));
}

function handleRestaurantNoteSubmitLegacy(form) {
  const restaurant = restaurantById(form.dataset.id);
  const text = String(new FormData(form).get('text') || '').trim();
  if (!restaurant || !text || !canSeeRestaurant(restaurant.id)) return;
  const user = getCurrentUser();
  restaurant.noteEntries ||= [];
  restaurant.noteEntries.push({ id: uid('note'), text, authorId: user.id, authorName: user.name, createdAt: nowIso() });
  closeModal();
  showToast('Nota compartida con el equipo');
  render();
}

function restaurantNotesPanel(restaurant) {
  const notes = [...(restaurant.noteEntries || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const cards = notes.slice(0, 4).map(note => {
    const canEdit = canManage() || note.authorId === app.state.currentUserId;
    return `<article><div class="note-meta"><div><strong>${esc(note.authorName || memberById(note.authorId)?.name || 'Miembro')}</strong><small>${formatDateTime(note.createdAt)}${note.updatedAt ? ' · editada' : ''}</small></div>${canEdit ? `<button class="text-button" data-action="open-note-modal" data-id="${restaurant.id}" data-note="${note.id}">Editar</button>` : ''}</div><p>${esc(note.text)}</p></article>`;
  }).join('');
  return `
    <section class="panel no-shadow">
      <div class="panel-heading"><h3>Notas internas</h3><button class="icon-button" data-action="open-note-modal" data-id="${restaurant.id}" title="Anadir nota">+</button></div>
      <div class="restaurant-notes">${cards || '<p class="settings-copy">Todavia no hay notas internas.</p>'}</div>
    </section>
  `;
}

function openNoteModal(id, noteId = '') {
  const restaurant = restaurantById(id);
  const note = (restaurant?.noteEntries || []).find(item => item.id === noteId);
  if (!restaurant || !canSeeRestaurant(id)) return;
  if (note && !canManage() && note.authorId !== app.state.currentUserId) {
    showToast('Solo puedes editar tus propias notas.');
    return;
  }
  const isEdit = Boolean(note);
  openModal(modalFrame(isEdit ? 'Editar nota interna' : 'Anadir nota interna', 'RESTAURANTE', `
    <form id="restaurantNoteForm" data-id="${restaurant.id}" data-note="${note?.id || ''}">
      <div class="form-grid"><label class="wide">Nota<textarea name="text" required placeholder="Informacion para el equipo, contexto del cliente o seguimiento...">${esc(note?.text || '')}</textarea></label></div>
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">${isEdit ? 'Guardar cambios' : 'Guardar nota'}</button></div>
    </form>
  `));
}

function handleRestaurantNoteSubmit(form) {
  const restaurant = restaurantById(form.dataset.id);
  const text = String(new FormData(form).get('text') || '').trim();
  const noteId = form.dataset.note || '';
  if (!restaurant || !text || !canSeeRestaurant(restaurant.id)) return;
  const user = getCurrentUser();
  restaurant.noteEntries ||= [];
  const existing = restaurant.noteEntries.find(note => note.id === noteId);
  if (existing) {
    if (!canManage() && existing.authorId !== user.id) {
      showToast('Solo puedes editar tus propias notas.');
      return;
    }
    existing.text = text;
    existing.updatedAt = nowIso();
  } else {
    restaurant.noteEntries.push({ id: uid('note'), text, authorId: user.id, authorName: user.name, createdAt: nowIso() });
  }
  closeModal();
  showToast(existing ? 'Nota actualizada' : 'Nota compartida con el equipo');
  render();
}

function openServiceModal(id, defaults = {}) {
  if (!canManage()) {
    showToast('Solo el propietario o un administrador puede crear y editar servicios.');
    return;
  }
  const service = app.state.services.find(item => item.id === id) || {};
  const isEdit = Boolean(service.id);
  const restaurantId = service.restaurantId || defaults.restaurantId || app.selectedRestaurantId || app.state.restaurants[0]?.id || '';
  const planCode = service.planCode || defaults.planCode || 'impulso';
  const restaurantOptions = visibleRestaurants();
  const selectablePlans = Object.values(PLAN_CATALOG).filter(p => {
    if (isEdit) return p.code === service.planCode;
    if (p.code === 'menu') return !app.state.services.some(item => item.restaurantId === restaurantId && item.planCode === 'menu' && item.status !== 'cancelled');
    const active = activeBaseService(restaurantId);
    return !active || active.planCode === p.code;
  });
  openModal(modalFrame(isEdit ? 'Editar servicio' : 'Anadir servicio', 'PLAN CONTRATADO', `
    <form id="serviceForm" data-id="${service.id || ''}">
      <div class="form-grid">
        <label class="wide">Restaurante<select name="restaurantId" required>${restaurantOptions.map(item => `<option value="${item.id}" ${item.id === restaurantId ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label>
        <label>Servicio<select name="planCode" required>${selectablePlans.map(p => `<option value="${p.code}" ${p.code === planCode ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        <label>Condiciones<input value="3 meses iniciales · renovacion mensual" disabled></label>
        <label class="date-field">Fecha de inicio<input name="startDate" type="date" value="${service.startDate || iso()}"></label>
        <label>Precio base mensual<input name="monthlyBase" type="number" min="0" step="0.01" value="${service.monthlyBase || serviceMonthlyBase(planCode, 1, restaurantId)}"></label>
        <div class="wide assignment-box"><div class="assignment-title"><strong>Equipo responsable</strong><small>Puedes asignar varias personas al mismo servicio. Las tareas se repartirán solo entre ellas.</small></div><div class="check-grid">${app.state.members.filter(m => m.active).map(member => `<label class="check-card"><input type="checkbox" name="assignedMemberIds" value="${member.id}" ${serviceMemberIds(service).includes(member.id) || (!isEdit && member.id === app.state.currentUserId) ? 'checked' : ''}><span><strong>${esc(member.name)}</strong><small>${esc(ROLE_LABELS[member.role])}</small></span></label>`).join('')}</div></div>
        <label class="toggle-row wide"><span><strong>Renovacion automatica mensual</strong><small>El primer cobro debe confirmarse antes de activar el servicio.</small></span><input name="autoRenew" type="checkbox" checked disabled></label>
      </div>
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">${isEdit ? 'Guardar servicio' : 'Crear servicio'}</button></div>
    </form>
  `));
}

function openServiceTeamModal(id) {
  const service = app.state.services.find(item => item.id === id);
  if (!service || !canManageServiceTeam()) return;
  const assigned = serviceMemberIds(service);
  const members = app.state.members.filter(member => member.active);
  openModal(modalFrame('Asignar equipo', 'EQUIPO DEL SERVICIO', `
    <form id="serviceTeamForm" data-id="${service.id}">
      <div class="modal-list">
        <p class="muted-note">${esc(plan(service.planCode).name)} · ${esc(restaurantById(service.restaurantId)?.name || '')}</p>
        ${members.map(member => `<label class="check-card"><input type="checkbox" name="assignedMemberIds" value="${member.id}" ${assigned.includes(member.id) ? 'checked' : ''}><span><strong>${esc(member.name)}</strong><small>${esc(ROLE_LABELS[member.role])}</small></span></label>`).join('')}
      </div>
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">Guardar equipo</button></div>
    </form>
  `));
}

function taskTypesForService(service) {
  if (!service) return TASK_TYPES;
  if (service.planCode === 'menu') return {
    menu_update: TASK_TYPES.menu_update,
    menu_structure: TASK_TYPES.menu_structure,
    menu_restructure: TASK_TYPES.menu_restructure,
    menu_other: TASK_TYPES.menu_other,
    incident: TASK_TYPES.incident,
  };
  const types = {
    small: TASK_TYPES.small,
    medium: TASK_TYPES.medium,
    large: TASK_TYPES.large,
    photos: TASK_TYPES.photos,
    review: TASK_TYPES.review,
    backup: TASK_TYPES.backup,
    suggestion: TASK_TYPES.suggestion,
    incident: TASK_TYPES.incident,
  };
  if (service.planCode === 'premium') types.seo = TASK_TYPES.seo;
  if (Number(plan(service.planCode).quotas.external_incident || 0)) types.external_incident = TASK_TYPES.external_incident;
  return types;
}

function extraPackageSummary(service) {
  const items = (service.extraCredits || []).filter(extra => extra.cycleStart === iso(serviceCycleStart(service)));
  if (!items.length) return 'Sin creditos adicionales en este ciclo.';
  return items.map(extra => `${taskTypeLabel(extra.type)}: ${extra.quantity} · ${extra.status === 'paid' ? 'pagado' : 'pendiente'}`).join(' | ');
}

function openExtraCreditModal(id) {
  const service = app.state.services.find(item => item.id === id);
  if (!service || !isOwner()) return;
  const isMenu = service.planCode === 'menu';
  const available = isMenu
    ? Object.entries(MENU_EXTRA_RULES).map(([key, rule]) => [key, `${rule.label} · ${rule.fixed ? `${euro(rule.price)}/${rule.unit}` : `desde ${euro(rule.price)}`}`])
    : BASE_QUOTA_TYPES.map(type => [type, taskTypeLabel(type)]);
  openModal(modalFrame(isMenu ? 'Servicio adicional' : 'Creditos adicionales', 'SERVICIO EXTRA', `
    <form id="extraCreditForm" data-id="${service.id}">
      <div class="form-grid">
        <label>Tipo<select name="type" id="extraCreditType">${available.map(([key, label]) => `<option value="${key}">${esc(label)}</option>`).join('')}</select></label>
        <label id="extraCreditQuantityLabel">Cantidad<input id="extraCreditQuantity" name="quantity" type="number" min="1" value="1" required></label>
        <label>Importe base sin IVA<input id="extraCreditPrice" name="price" type="number" min="0" step="0.01" value="${isMenu ? '10' : '15'}" placeholder="Presupuesto"></label>
        <label>Estado<select name="status"><option value="pending">Pendiente de pago</option><option value="paid">Aprobado y pagado</option></select></label>
        <label class="wide">Detalle / presupuesto<textarea name="notes" placeholder="Paquete elegido, aprobacion del cliente o condicion especial..."></textarea></label>
      </div>
      <p class="muted-note" id="extraCreditPriceHint">${isMenu ? 'Los servicios adicionales se registran y facturan por separado. Solo las publicaciones adicionales aumentan la cuota al marcarse como pagadas.' : 'Paquetes vigentes: pequeños 1/2/5/10 (15/25/55/95 €), fotos 1/2/5/10/12 (12/22/50/90/105 €), medianos 1/2/3 (50/90/125 €) y grandes 1/2 (140/250 €). El credito se suma solo al confirmar el pago.'}</p>
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">Guardar credito</button></div>
    </form>
  `));
  if (isMenu) setupMenuExtraCreditPricing();
}

function setupMenuExtraCreditPricing() {
  const typeInput = $('#extraCreditType');
  const quantityInput = $('#extraCreditQuantity');
  const priceInput = $('#extraCreditPrice');
  const quantityLabel = $('#extraCreditQuantityLabel');
  const hint = $('#extraCreditPriceHint');
  if (!typeInput || !quantityInput || !priceInput || !quantityLabel || !hint) return;
  const update = () => {
    const rule = MENU_EXTRA_RULES[typeInput.value];
    if (!rule) return;
    const isProject = typeInput.value === 'menu_restructure';
    quantityInput.max = isProject ? '1' : '';
    if (isProject) quantityInput.value = '1';
    quantityLabel.firstChild.textContent = rule.unit === 'hora' ? 'Horas ' : 'Cantidad ';
    priceInput.readOnly = Boolean(rule.fixed);
    priceInput.min = String(rule.price);
    if (rule.fixed) priceInput.value = String(round(rule.price * Math.max(1, Number(quantityInput.value || 1))));
    else if (Number(priceInput.value || 0) < rule.price) priceInput.value = String(rule.price);
    hint.textContent = rule.fixed
      ? `${rule.label}: ${euro(rule.price)} por ${rule.unit}. El importe se calcula automaticamente sin IVA.`
      : `${rule.label}: desde ${euro(rule.price)} sin IVA. Puedes indicar el presupuesto final acordado con el cliente.`;
  };
  typeInput.addEventListener('change', update);
  quantityInput.addEventListener('input', update);
  update();
}

function openTaskModal(id, defaults = {}) {
  const task = app.state.tasks.find(item => item.id === id) || {};
  const isEdit = Boolean(task.id);
  const restaurantId = task.restaurantId || defaults.restaurantId || app.selectedRestaurantId || visibleRestaurants()[0]?.id || '';
  const services = servicesForRestaurant(restaurantId);
  const serviceId = task.serviceId || defaults.serviceId || services[0]?.id || visibleServices()[0]?.id || '';
  const activeService = app.state.services.find(service => service.id === serviceId);
  if (activeService && !canOperateService(activeService)) {
    showToast('No tienes acceso a ese servicio.');
    return;
  }
  const isMenu = activeService?.planCode === 'menu';
  const types = taskTypesForService(activeService);
  openModal(modalFrame(isEdit ? 'Editar cambio' : 'Nuevo cambio', 'TRABAJO', `
    <form id="taskForm" data-id="${task.id || ''}">
      <div class="form-grid">
        <label class="wide">Restaurante<select name="restaurantId" required>${visibleRestaurants().map(item => `<option value="${item.id}" ${item.id === restaurantId ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label>
        <label>Servicio<select name="serviceId" required>${visibleServices().filter(service => service.restaurantId === restaurantId || service.id === serviceId).map(service => `<option value="${service.id}" ${service.id === serviceId ? 'selected' : ''}>${esc(plan(service.planCode).name)} · ${esc(restaurantById(service.restaurantId)?.name || '')}</option>`).join('')}</select></label>
        <label>Tipo de trabajo<select name="type">${Object.entries(types).map(([key, label]) => `<option value="${key}" ${key === (task.type || (isMenu ? 'menu_update' : 'small')) ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>
        <label>Cantidad<input name="quantity" type="number" min="1" value="${task.quantity || 1}"></label>
        <label>Responsable<select name="assignedTo">${(canManage() ? serviceMemberIds(activeService).map(memberById).filter(Boolean) : [getCurrentUser()]).map(member => `<option value="${member.id}" ${member.id === (task.assignedTo || getCurrentUser().id) ? 'selected' : ''}>${esc(member.name)}</option>`).join('')}</select></label>
        <label>Prioridad<select name="priority"><option value="normal" ${task.priority !== 'high' ? 'selected' : ''}>Normal</option><option value="high" ${task.priority === 'high' ? 'selected' : ''}>Urgente</option></select></label>
        <label class="wide">Nombre del cambio<input name="title" required value="${esc(task.title || '')}" placeholder="Ej. Actualizar precios de la carta"></label>
        <label class="wide">Descripcion<textarea name="description" placeholder="Explica que ha solicitado el restaurante...">${esc(task.description || '')}</textarea></label>
        ${isMenu ? `
          <label class="date-field">Fecha del menu<input name="menuDate" type="date" value="${esc(task.menuMeta?.menuDate || iso())}"></label>
          <label>Informacion recibida<input name="menuReceivedAt" type="datetime-local" value="${esc(task.menuMeta?.receivedAt || '')}"></label>
          <label>Primera version<input name="menuFirstVersionAt" type="datetime-local" value="${esc(task.menuMeta?.firstVersionAt || '')}"></label>
          <label>Correcciones<input name="menuCorrectionsAt" type="datetime-local" value="${esc(task.menuMeta?.correctionsAt || '')}"></label>
          <label>Publicado a las<input name="menuPublishedAt" type="datetime-local" value="${esc(task.menuMeta?.publishedAt || '')}"></label>
          <label class="wide">Publicacion / incidencias<textarea name="menuNotes" placeholder="Retraso, incidencia o aclaracion necesaria...">${esc(task.menuMeta?.notes || '')}</textarea></label>
          <p class="muted-note wide">Horario del servicio: informacion antes de las 21:00 del dia anterior, primera version antes de las 22:00, correcciones hasta las 06:45 y publicacion antes de las 08:00.</p>
        ` : ''}
      </div>
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">${isEdit ? 'Guardar cambio' : 'Crear cambio'}</button></div>
    </form>
  `));
}

function openMemberModal(id) {
  if (!canManageMembers()) return;
  const member = app.state.members.find(item => item.id === id) || {};
  const isEdit = Boolean(member.id);
  const assignedRestaurantIds = memberRestaurantIds(member);
  const restaurantAccessFields = app.state.restaurants.map(restaurant => `
    <label class="check-card">
      <input type="checkbox" name="restaurantIds" value="${restaurant.id}" ${assignedRestaurantIds.includes(restaurant.id) ? 'checked' : ''}>
      <span><strong>${esc(restaurant.name)}</strong><small>${esc(app.state.services.filter(service => service.restaurantId === restaurant.id).map(service => plan(service.planCode).name).join(' + ') || 'Sin plan')}</small></span>
    </label>
  `).join('');
  openModal(modalFrame(isEdit ? 'Gestionar miembro' : 'Invitar miembro', 'EQUIPO', `
    <form id="memberForm" data-id="${member.id || ''}">
      <div class="form-grid">
        ${isEdit ? `<label class="wide">Miembro<input value="${esc(member.name)} · ${esc(member.email)}" disabled></label>` : '<label class="wide">Email<input name="email" type="email" required placeholder="persona@email.com"></label>'}
        <label class="wide">Permiso<select name="role"><option value="worker" ${member.role === 'worker' ? 'selected' : ''}>Trabajador: solo sus servicios</option><option value="admin" ${member.role === 'admin' ? 'selected' : ''}>Administrador: puede gestionar todo</option>${member.role === 'owner' ? '<option value="owner" selected>Propietario</option>' : ''}</select></label>
        ${member.role !== 'owner' ? `<div class="wide assignment-box"><div class="assignment-title"><strong>Restaurantes asignados</strong><small>Marca uno o varios restaurantes. Si no marcas ninguno, los trabajadores solo veran los planes que tengan asignados directamente.</small></div><div class="check-grid">${restaurantAccessFields || '<p class="muted-note">Primero crea un restaurante.</p>'}</div></div>` : ''}
        ${!isEdit ? '<p class="muted-note wide">La persona recibirá una invitación. Si ya tiene cuenta, tendrá que aceptarla; si no, creará su cuenta privada y después decidirá si se une.</p>' : ''}
      </div>
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">${isEdit ? 'Guardar permisos' : 'Enviar invitación'}</button></div>
    </form>
  `));
}

function openPlanChangeModal(id) {
  const service = app.state.services.find(item => item.id === id);
  if (!service || service.planCode === 'menu' || !canOperateService(service)) return;
  const currentRank = BASE_PLAN_CODES.indexOf(service.planCode);
  openModal(modalFrame('Cambiar plan', 'GESTION DE PLAN', `
    <form id="planChangeForm" data-id="${service.id}">
      <div class="form-grid">
        <label class="wide">Nuevo plan<select name="planCode">${BASE_PLAN_CODES.map(code => `<option value="${code}" ${code === service.planCode ? 'selected' : ''}>${esc(plan(code).name)}</option>`).join('')}</select></label>
        <label class="wide">Nota<textarea name="notes">Al subir de plan se conserva lo consumido y se cobra la diferencia proporcional. Las bajadas se aplican al proximo ciclo cuando ya no haya permanencia.</textarea></label>
      </div>
      <div class="change-preview">${planChangePreview(service, service.planCode)}</div>
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">Aplicar cambio</button></div>
    </form>
  `));
}

function planChangePreview(service, newPlan) {
  const today = new Date();
  const cycleStart = serviceCycleStart(service, today);
  const cycleEnd = serviceCycleEnd(service, today);
  const totalDays = Math.max(1, Math.ceil((cycleEnd - cycleStart) / 86400000) + 1);
  const remainingDays = Math.max(0, Math.ceil((cycleEnd - today) / 86400000));
  const oldBase = Number(service.monthlyBase || 0);
  const newBase = serviceMonthlyBase(newPlan, 1, service.restaurantId);
  const diff = round((newBase - oldBase) * (remainingDays / totalDays));
  const newRank = BASE_PLAN_CODES.indexOf(newPlan);
  const oldRank = BASE_PLAN_CODES.indexOf(service.planCode);
  if (newRank < oldRank) return `<p><strong>Bajada de plan:</strong> se programara para la siguiente renovacion, solo cuando termine la permanencia inicial. No se pierden los cambios ya consumidos.</p>`;
  return `<p><strong>Diferencia proporcional:</strong> ${euro(diff)} base (${remainingDays}/${totalDays} dias restantes del ciclo). El nuevo compromiso inicial sera de 3 meses.</p>`;
}

function openReportModal() {
  if (!canManage()) {
    showToast('Solo el propietario o un administrador puede generar informes.');
    return;
  }
  const reportableRestaurants = visibleRestaurants().filter(restaurant => app.state.services.some(service => service.restaurantId === restaurant.id && BASE_PLAN_CODES.includes(service.planCode)));
  if (!reportableRestaurants.length) {
    showToast('Anade un plan web al restaurante antes de generar un informe.');
    return;
  }
  openModal(modalFrame('Generar informe mensual', 'PDF', `
    <form id="reportForm">
      <div class="form-grid">
        <label class="wide">Restaurante<select name="restaurantId">${reportableRestaurants.map(item => `<option value="${item.id}">${esc(item.name)}</option>`).join('')}</select></label>
        <label>Mes<input name="month" type="month" value="${monthKey(new Date())}"></label>
      </div>
      ${reportableRestaurants.length ? '' : '<p class="muted-note">Menu Diario no genera informe mensual. Añade un plan web al restaurante para crear informes.</p>'}
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">Generar PDF</button></div>
    </form>
  `));
}

function handleRestaurantSubmit(form) {
  const data = Object.fromEntries(new FormData(form));
  const id = form.dataset.id || uid('rest');
  const existing = restaurantById(id);
  if ((!existing && !canCreateRestaurant()) || (existing && !canManage())) return;
  const payload = {
    id,
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    address: data.address.trim(),
    city: data.city.trim(),
    publicUrl: data.publicUrl.trim(),
    editorUrl: isOwner() ? data.editorUrl.trim() : (existing?.editorUrl || ''),
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
  if (!canManage()) return;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  const id = form.dataset.id || uid('svc');
  const existing = app.state.services.find(item => item.id === id);
  const existingBasePlan = !existing && data.planCode !== 'menu' ? activeBaseService(data.restaurantId) : null;
  if (existingBasePlan && existingBasePlan.id !== id) {
    showToast('Ese restaurante ya tiene un plan principal. Usa Cambiar plan para sustituirlo.');
    return;
  }
  const duplicateMenu = !existing && data.planCode === 'menu' && app.state.services.some(item => item.restaurantId === data.restaurantId && item.planCode === 'menu' && item.status !== 'cancelled');
  if (duplicateMenu) {
    showToast('Ese restaurante ya tiene Menu Diario activo.');
    return;
  }
  const payload = {
    id,
    restaurantId: data.restaurantId,
    planCode: data.planCode,
    startDate: data.startDate || iso(),
    commitmentMonths: 3,
    initialCommitmentMonths: existing?.initialCommitmentMonths || 3,
    commitmentStartDate: existing?.commitmentStartDate || data.startDate || iso(),
    monthlyBase: round(data.monthlyBase || serviceMonthlyBase(data.planCode, 1, data.restaurantId)),
    status: existing?.status || 'pending',
    autoRenew: true,
    assignedMemberIds: formData.getAll('assignedMemberIds').filter(Boolean),
    assignedTo: '',
    cancelAtEnd: existing?.cancelAtEnd || false,
    createdAt: existing?.createdAt || iso(),
    cycleStartDate: existing?.cycleStartDate || data.startDate || iso(),
    cycleEndDate: existing?.cycleEndDate || iso(addDays(addMonths(parseDate(data.startDate || iso()), 1), -1)),
    cycleIndex: existing?.cycleIndex || 1,
    extraCredits: existing?.extraCredits || [],
    pauseHistory: existing?.pauseHistory || [],
  };
  if (!payload.assignedMemberIds.length) payload.assignedMemberIds = [app.state.currentUserId];
  payload.assignedTo = payload.assignedMemberIds[0] || '';
  if (existing) Object.assign(existing, payload);
  else app.state.services.push(payload);
  app.selectedRestaurantId = data.restaurantId;
  closeModal();
  refreshBilling();
  showToast(existing ? 'Servicio actualizado' : 'Servicio anadido');
  showView('restaurante-detalle', { restaurantId: data.restaurantId });
}

function handleServiceTeamSubmit(form) {
  if (!canManageServiceTeam()) return;
  const service = app.state.services.find(item => item.id === form.dataset.id);
  if (!service) return;
  const ids = new FormData(form).getAll('assignedMemberIds').filter(Boolean);
  service.assignedMemberIds = [...new Set(ids)];
  service.assignedTo = service.assignedMemberIds[0] || '';
  closeModal();
  showToast('Equipo del servicio actualizado');
  render();
}

function handleTaskSubmit(form) {
  const data = Object.fromEntries(new FormData(form));
  const id = form.dataset.id || uid('task');
  const existing = app.state.tasks.find(item => item.id === id);
  const isEdit = Boolean(existing);
  const service = app.state.services.find(item => item.id === data.serviceId);
  if (!service) {
    showToast('Selecciona un servicio valido.');
    return;
  }
  if (!canOperateService(service)) {
    showToast('No tienes permiso para registrar cambios en este servicio.');
    return;
  }
  if (!isEdit && service.status !== 'active') {
    showToast('No puedes registrar trabajos en un servicio pausado, pendiente, suspendido o cancelado.');
    return;
  }
  const type = data.type;
  const consumesQuota = ['small', 'medium', 'large', 'photos', 'external_incident', 'menu_update'].includes(type);
  const assignedTo = canManage() ? data.assignedTo : app.state.currentUserId;
  const payload = {
    id,
    restaurantId: service?.restaurantId || data.restaurantId,
    serviceId: data.serviceId,
    title: data.title.trim(),
    description: data.description.trim(),
    type,
    quantity: Number(data.quantity || 1),
    consumesQuota,
    status: existing?.status || 'requested',
    priority: data.priority,
    assignedTo,
    assignedName: memberById(assignedTo)?.name || existing?.assignedName || '',
    requestedAt: existing?.requestedAt || nowIso(),
    startedAt: existing?.startedAt || '',
    completedAt: existing?.completedAt || '',
    createdBy: existing?.createdBy || app.state.currentUserId,
  };
  if (!isAssignedToService(service, payload.assignedTo)) {
    showToast('La tarea debe asignarse a una persona del equipo de ese servicio.');
    return;
  }
  if (service.planCode === 'menu') {
    const menuDate = data.menuDate || '';
    const day = menuDate ? parseDate(menuDate).getDay() : 0;
    if (menuDate && (day === 0 || day === 6)) {
      showToast('Menu Diario se programa de lunes a viernes. Los fines de semana se presupuestan aparte.');
      return;
    }
    const receivedAt = data.menuReceivedAt || '';
    const cutoff = menuDate ? new Date(`${iso(addDays(parseDate(menuDate), -1))}T21:00:00`) : null;
    payload.menuMeta = {
      menuDate,
      receivedAt,
      firstVersionAt: data.menuFirstVersionAt || '',
      correctionsAt: data.menuCorrectionsAt || '',
      publishedAt: data.menuPublishedAt || '',
      notes: data.menuNotes?.trim() || '',
      late: Boolean(cutoff && receivedAt && new Date(receivedAt) > cutoff),
    };
  }
  if (existing) Object.assign(existing, payload);
  else app.state.tasks.push(payload);
  closeModal();
  showToast(existing ? 'Cambio actualizado' : 'Cambio registrado');
  render();
}

async function handleExtraCreditSubmit(form) {
  const data = Object.fromEntries(new FormData(form));
  const service = app.state.services.find(item => item.id === form.dataset.id);
  if (!service || !isOwner()) return;
  const quantity = Number(data.quantity || 0);
  if (!quantity) {
    showToast('Indica una cantidad valida.');
    return;
  }
  const menuRule = service.planCode === 'menu' ? MENU_EXTRA_RULES[data.type] : null;
  let extraPrice = round(data.price || 0);
  if (menuRule) {
    extraPrice = menuRule.fixed
      ? round(menuRule.price * quantity)
      : round(Math.max(menuRule.price, Number(data.price || 0)));
  }
  if (extraPrice <= 0) {
    showToast('Indica un importe valido para el servicio adicional.');
    return;
  }
  service.extraCredits ||= [];
  const extraCredit = {
    id: uid('credit'),
    type: data.type,
    quantity,
    price: extraPrice,
    status: data.status,
    notes: data.notes?.trim() || '',
    cycleStart: iso(serviceCycleStart(service)),
    createdAt: nowIso(),
    paidAt: '',
  };
  service.extraCredits.push(extraCredit);
  const amounts = paymentAmounts(extraCredit.price);
  const payment = {
    id: uid('pay'), restaurantId: service.restaurantId, serviceId: service.id,
    cycleStart: iso(serviceCycleStart(service)), cycleEnd: iso(serviceCycleEnd(service)), dueDate: iso(),
    baseAmount: amounts.base, ivaAmount: amounts.iva, irpfAmount: amounts.irpf,
    invoiceTotal: amounts.invoiceTotal, receivedAmount: amounts.received,
    status: 'pending', method: '', notes: extraCredit.notes || `Credito adicional: ${taskTypeLabel(extraCredit.type)} x${extraCredit.quantity}.`,
    paidAt: '', sentToFiometra: false, kind: 'extra_credit', extraCreditId: extraCredit.id,
  };
  app.state.payments.push(payment);
  closeModal();
  if (data.status === 'paid') {
    await markPaymentPaid(payment.id);
    return;
  }
  showToast('Credito guardado como pendiente de pago');
  render();
}

async function handleMemberSubmit(form) {
  if (!canManageMembers()) return;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  const id = form.dataset.id || uid('user');
  const existing = app.state.members.find(item => item.id === id);
  if (existing?.role === 'owner') data.role = 'owner';
  const restaurantIds = data.role === 'owner' ? [] : formData.getAll('restaurantIds').map(String);
  const payload = {
    id,
    name: existing?.name || '',
    email: (existing?.email || data.email || '').trim().toLowerCase(),
    role: data.role,
    active: true,
    invitedAt: existing?.invitedAt || '',
    registeredUser: existing?.registeredUser || false,
    addedAt: existing?.addedAt || '',
    restaurantIds,
  };

  const submitButton = form.querySelector('button.primary-button');
  const previousText = submitButton?.textContent || '';
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = existing ? 'Guardando...' : 'Enviando invitación...';
  }

  try {
    if (existing) {
      Object.assign(existing, payload);
      await saveCloudStateNow();
      showToast('Permisos actualizados');
    } else {
      await sendMemberInvitation(payload);
      showToast('Invitación enviada. Se unirá cuando la acepte.');
    }
    closeModal();
    render();
  } catch (error) {
    showToast(error.message || 'No se pudo enviar la invitacion');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = previousText;
    }
  }
}

function restoreMember(id) {
  if (!canManageMembers()) return;
  const member = memberById(id);
  if (!member || member.role === 'owner') return;
  member.active = true;
  member.removedAt = '';
  showToast('Miembro reactivado con sus asignaciones anteriores');
  render();
}

async function purgeMember(id) {
  if (!canManageMembers()) return;
  const member = memberById(id);
  if (!member || member.role === 'owner') return;
  if (!confirm(`Eliminar definitivamente a ${member.name}? Sus tareas y notas conservarán el historial, pero ese email no podrá volver a este espacio durante 20 días.`)) return;
  try {
    // Persist a recent expulsion before requesting the permanent removal.
    await saveCloudStateNow();
    const token = await getAccessToken();
    const response = await fetch('/api/shared-state', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'purge-member', workspaceId: app.workspace.id, memberId: id, memberEmail: member.email, memberName: member.name }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'No se pudo eliminar el miembro.');
    app.state.tasks.forEach(task => {
      if (task.assignedTo === id && !task.assignedName) task.assignedName = member.name;
      if (task.createdBy === id && !task.createdByName) task.createdByName = member.name;
    });
    app.state.members = app.state.members.filter(item => item.id !== id);
    app.state.services.forEach(service => {
      service.assignedMemberIds = serviceMemberIds(service).filter(memberId => memberId !== id);
      service.assignedTo = service.assignedMemberIds[0] || '';
    });
    showToast('Miembro eliminado definitivamente');
    render();
  } catch (error) {
    showToast(error.message || 'No se pudo eliminar el miembro.');
  }
}

function handlePlanChangeSubmit(form) {
  const service = app.state.services.find(item => item.id === form.dataset.id);
  if (!service || !canOperateService(service)) return;
  const data = Object.fromEntries(new FormData(form));
  const newPlan = data.planCode;
  const oldRank = BASE_PLAN_CODES.indexOf(service.planCode);
  const newRank = BASE_PLAN_CODES.indexOf(newPlan);
  if (newPlan === service.planCode) {
    closeModal();
    return;
  }
  const oldBase = Number(service.monthlyBase || 0);
  const newBase = serviceMonthlyBase(newPlan, 1, service.restaurantId);
  if (newRank < oldRank) {
    if (new Date() < commitmentEnd(service)) {
      showToast('La bajada de plan solo se puede programar despues de la permanencia inicial de 3 meses.');
      return;
    }
    service.pendingPlanChange = {
      planCode: newPlan,
      monthlyBase: newBase,
      effectiveAt: iso(serviceNextPaymentDate(service)),
      requestedAt: nowIso(),
      notes: data.notes?.trim() || '',
    };
    app.state.reminders.push({ id: uid('rem'), type: 'plan_downgrade', serviceId: service.id, createdAt: nowIso(), notes: `Bajada a ${plan(newPlan).name} programada para el siguiente ciclo.` });
    closeModal();
    showToast('Bajada de plan programada para la siguiente renovacion');
    render();
    return;
  }
  const cycleStart = serviceCycleStart(service);
  const cycleEnd = serviceCycleEnd(service);
  const totalDays = Math.max(1, daysBetween(cycleStart, addDays(cycleEnd, 1)));
  const remainingDays = Math.max(0, daysBetween(new Date(), addDays(cycleEnd, 1)));
  const difference = round((newBase - oldBase) * (remainingDays / totalDays));
  Object.assign(service, {
    planCode: newPlan,
    monthlyBase: newBase,
    initialCommitmentMonths: 3,
    commitmentStartDate: iso(),
    pendingPlanChange: null,
  });
  if (difference > 0) {
    const amounts = paymentAmounts(difference);
    app.state.payments.push({
      id: uid('pay'), restaurantId: service.restaurantId, serviceId: service.id,
      cycleStart: iso(cycleStart), cycleEnd: iso(cycleEnd), dueDate: iso(),
      baseAmount: amounts.base, ivaAmount: amounts.iva, irpfAmount: amounts.irpf,
      invoiceTotal: amounts.invoiceTotal, receivedAmount: amounts.received,
      status: 'pending', method: '', notes: `Diferencia proporcional por subida a ${plan(newPlan).name}.`, paidAt: '', sentToFiometra: false, kind: 'plan_change',
    });
  }
  app.state.reminders.push({ id: uid('rem'), type: 'plan_upgrade', serviceId: service.id, createdAt: nowIso(), notes: `${plan(newPlan).name}. Diferencia proporcional: ${euro(difference)} base.` });
  closeModal();
  showToast(difference > 0 ? 'Plan actualizado y diferencia proporcional creada' : 'Plan actualizado');
  render();
}

function generateReport(restaurantId, month = monthKey(new Date())) {
  if (!canManage()) {
    showToast('Solo el propietario o un administrador puede generar informes.');
    return null;
  }
  const restaurant = restaurantById(restaurantId);
  const reportServices = app.state.services.filter(service => service.restaurantId === restaurantId && BASE_PLAN_CODES.includes(service.planCode));
  if (!reportServices.length) {
    showToast('Menu Diario no incluye informe mensual.');
    return null;
  }
  const serviceIds = reportServices.map(service => service.id);
  const tasks = app.state.tasks.filter(task => serviceIds.includes(task.serviceId) && (task.completedAt || task.requestedAt || '').startsWith(month));
  const completed = tasks.filter(task => task.status === 'completed').length;
  const incidents = tasks.filter(task => quotaTypeForTask(task) === 'external_incident' || task.type === 'incident').length;
  const serviceNames = reportServices.map(service => plan(service.planCode).name).join(' + ');
  const reportPlan = plan(reportServices[0].planCode);
  let report = app.state.reports.find(item => item.restaurantId === restaurantId && item.month === month);
  if (!report) {
    report = { id: uid('rep'), restaurantId, month, status: 'ready', generatedAt: nowIso(), summary: '' };
    app.state.reports.push(report);
  }
  report.generatedAt = nowIso();
  report.status = 'ready';
  report.summary = `${tasks.length} trabajos, ${completed} completados, ${incidents} incidencias, ${serviceNames}`;
  report.data = {
    restaurant: restaurant?.name,
    services: serviceNames,
    plan: reportPlan.name,
    sections: reportPlan.report,
    quotas: reportServices.map(service => ({ name: plan(service.planCode).name, usage: quotaUsage(service, parseDate(`${month}-15`)) })),
    tasks: tasks.map(task => ({ title: task.title, type: taskTypeLabel(task.type), status: STATUS_LABELS[task.status], requestedAt: task.requestedAt, startedAt: task.startedAt, completedAt: task.completedAt, description: task.description })),
  };
  saveState();
  showToast('Informe generado');
  return report;
}

function downloadReport(reportId) {
  const report = app.state.reports.find(item => item.id === reportId) || generateReport(reportId);
  if (!report) return;
  const restaurant = restaurantById(report.restaurantId);
  const reportServices = app.state.services.filter(service => service.restaurantId === report.restaurantId && BASE_PLAN_CODES.includes(service.planCode));
  const serviceIds = reportServices.map(service => service.id);
  const tasks = app.state.tasks.filter(task => serviceIds.includes(task.serviceId) && (task.completedAt || task.requestedAt || '').startsWith(report.month));
  const lines = [
    `Cuotly - Informe mensual`,
    `Restaurante: ${restaurant?.name || ''}`,
    `Mes: ${report.month}`,
    `Plan: ${reportServices.map(service => plan(service.planCode).name).join(' + ') || 'Sin servicio'}`,
    `Resumen: ${report.summary}`,
    '',
    'Contenido del informe:',
    ...(report.data?.sections || []).map(section => `- ${section}`),
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
    ...reportServices.flatMap(service => {
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
  const service = app.state.services.find(item => item.id === task.serviceId);
  if (!service) return;
  if (!canSeeTask(task)) return;
  if (service.status !== 'active' && status !== 'cancelled') {
    showToast('No se puede trabajar mientras el servicio este pendiente, suspendido, pausado o cancelado.');
    return;
  }
  const quotaType = quotaTypeForTask(task);
  const usage = quotaUsage(service);
  const needsReservation = quotaType === 'external_incident' && ['in_progress', 'waiting', 'completed'].includes(status);
  if (needsReservation && !task.reservedAt) {
    const item = usage.external_incident;
    if (!item || item.used + Number(task.quantity || 1) > item.limit) {
      showToast('No quedan incidencias externas incluidas. Registra este trabajo como presupuesto aparte.');
      return;
    }
    task.reservedAt = nowIso();
  }
  if (status === 'completed' && task.consumesQuota && quotaType !== 'external_incident') {
    const item = usage[quotaType];
    const wasCompleted = task.status === 'completed';
    if (!wasCompleted && (!item || item.used + Number(task.quantity || 1) > item.limit)) {
      showToast('No queda cuota disponible. Añade y confirma un credito adicional antes de completarlo.');
      return;
    }
  }
  task.status = status;
  if (status === 'in_progress' && !task.startedAt) task.startedAt = nowIso();
  if (status === 'waiting' && !task.startedAt) task.startedAt = nowIso();
  if (status === 'completed') {
    if (!task.startedAt) task.startedAt = nowIso();
    task.completedAt = nowIso();
    if (task.consumesQuota && quotaType !== 'external_incident') task.quotaConsumedAt ||= task.completedAt;
  }
  if (status === 'cancelled') {
    task.cancelledAt = nowIso();
    task.reservedAt = '';
  }
  showToast(status === 'completed' ? 'Cambio completado y cuota descontada' : 'Estado actualizado');
  render();
}

function removeMember(id) {
  if (!canManageMembers()) return;
  const member = memberById(id);
  if (!member || member.role === 'owner') return;
  if (!confirm(`Expulsar a ${member.name}? Perdera el acceso de inmediato, pero podras reactivarlo desde Ajustes.`)) return;
  member.active = false;
  member.removedAt = nowIso();
  showToast('Miembro expulsado');
  render();
}

function deleteRestaurant(id) {
  if (!canDeleteRestaurant()) return;
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
  if (!canSeeTask(task)) return;
  if (!confirm(`Borrar la tarea "${task.title}"? Si estaba completada, sus cuotas volveran a estar disponibles.`)) return;
  app.state.tasks = app.state.tasks.filter(item => item.id !== id);
  showToast('Tarea borrada');
  render();
}

function openPauseModal(id) {
  const service = app.state.services.find(item => item.id === id);
  if (!service || !canOperateService(service) || service.planCode === 'menu') return;
  openModal(modalFrame('Pausar servicio', 'PAUSA EXCEPCIONAL', `
    <form id="pauseServiceForm" data-id="${service.id}">
      <div class="form-grid">
        <label class="date-field">Fecha de inicio<input name="pausedAt" type="date" value="${iso()}" required></label>
        <label>Duracion prevista<input name="plannedDays" type="number" min="1" max="31" value="7" required></label>
        <label class="wide">Motivo interno<textarea name="notes" placeholder="Motivo de la pausa y confirmacion con el restaurante..."></textarea></label>
      </div>
      <p class="muted-note">La pausa congela el tiempo pendiente y todas las cuotas del ciclo. No se crean ni se ejecutan trabajos durante la pausa.</p>
      <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">Cancelar</button><button class="primary-button">Pausar servicio</button></div>
    </form>
  `));
}

function handlePauseServiceSubmit(form) {
  const data = Object.fromEntries(new FormData(form));
  const service = app.state.services.find(item => item.id === form.dataset.id);
  if (!service || !canOperateService(service)) return;
  const pausedAt = data.pausedAt || iso();
  service.pausedAt = `${pausedAt}T00:00:00.000Z`;
  service.status = 'paused';
  service.pausePlanDays = Math.min(31, Math.max(1, Number(data.plannedDays || 1)));
  service.pauseNotes = data.notes?.trim() || '';
  app.state.reminders.push({ id: uid('rem'), type: 'service_paused', serviceId: service.id, createdAt: nowIso(), notes: `Pausa iniciada el ${pausedAt}. ${service.pauseNotes}`.trim() });
  closeModal();
  showToast('Servicio pausado y cuotas congeladas');
  render();
}

function resumeService(id) {
  const service = app.state.services.find(item => item.id === id);
  if (!service || !canOperateService(service) || !service.pausedAt) return;
  const pausedAt = parseDate(service.pausedAt);
  const days = daysBetween(pausedAt, new Date());
  service.pauseHistory ||= [];
  service.pauseHistory.push({ startedAt: iso(pausedAt), endedAt: iso(), days, notes: service.pauseNotes || '' });
  service.cycleEndDate = iso(addDays(serviceCycleEnd(service), days));
  service.pausedAt = '';
  service.pausePlanDays = 0;
  service.pauseNotes = '';
  service.status = currentPaymentForService(service)?.status === 'paid' ? 'active' : 'pending';
  app.state.reminders.push({ id: uid('rem'), type: 'service_resumed', serviceId: service.id, createdAt: nowIso(), notes: `Servicio reanudado tras ${days} dia(s) de pausa.` });
  showToast('Servicio reanudado; se conserva el tiempo y las cuotas restantes');
  render();
}

function cancelService(id) {
  const service = app.state.services.find(item => item.id === id);
  if (!service || !canCancelService(service)) return;
  const nextPayment = serviceNextPaymentDate(service);
  const notice = cancellationNoticeDate(service);
  const remainingMonths = Math.max(0, Math.ceil((commitmentEnd(service) - nextPayment) / (1000 * 60 * 60 * 24 * 30)));
  const fee = remainingMonths * Number(service.monthlyBase || 0);
  const lateNotice = new Date() > notice;
  const effective = lateNotice ? addMonths(nextPayment, 1) : nextPayment;
  if (!confirm(`Programar cancelacion de ${plan(service.planCode).name} para ${formatDate(effective, { short: true })}?${remainingMonths ? ` Quedan aproximadamente ${remainingMonths} mensualidades de permanencia (${euro(fee)} base).` : ''}`)) return;
  service.cancelAtEnd = true;
  service.cancelRequestedAt = nowIso();
  service.cancelEffectiveAt = iso(effective);
  if (fee > 0 && !app.state.payments.some(payment => payment.serviceId === service.id && payment.kind === 'cancellation_fee' && payment.status !== 'cancelled')) {
    const amounts = paymentAmounts(fee);
    app.state.payments.push({
      id: uid('pay'), restaurantId: service.restaurantId, serviceId: service.id,
      cycleStart: iso(serviceCycleStart(service)), cycleEnd: iso(serviceCycleEnd(service)), dueDate: iso(effective),
      baseAmount: amounts.base, ivaAmount: amounts.iva, irpfAmount: amounts.irpf,
      invoiceTotal: amounts.invoiceTotal, receivedAmount: amounts.received,
      status: 'pending', method: '', notes: `Liquidacion de permanencia pendiente (${remainingMonths} mensualidad(es)).`, paidAt: '', sentToFiometra: false, kind: 'cancellation_fee',
    });
  }
  app.state.reminders.push({ id: uid('rem'), type: 'cancellation', serviceId: id, createdAt: nowIso(), notes: `Cancelacion programada para ${iso(effective)}.${lateNotice ? ' Aviso fuera de plazo: se mantiene un ciclo adicional.' : ''}${remainingMonths ? ` Permanencia pendiente estimada: ${euro(fee)} base.` : ''}` });
  showToast('Cancelacion programada al finalizar el ciclo aplicable');
  render();
}

async function sendPaymentToFiometra(payment) {
  if (!payment || payment.sentToFiometra) return { ok: true, skipped: true };
  const token = await getAccessToken();
  if (!token) throw new Error('AUTH_REQUIRED');
  const service = app.state.services.find(item => item.id === payment.serviceId);
  const restaurant = restaurantById(payment.restaurantId);
  const response = await fetch('/api/fiometra-payment', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      payment: {
        ...payment,
        irpfRate: Number(app.state.settings.irpfRate || 15),
      },
      restaurant,
      service: service ? {
        ...service,
        planName: plan(service.planCode).name,
      } : null,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'No se pudo registrar en Fiometra.');
  payment.sentToFiometra = true;
  payment.fiometraSaleId = result.saleId || payment.fiometraSaleId || '';
  return result;
}

async function markPaymentPaid(id) {
  const payment = app.state.payments.find(item => item.id === id);
  if (!payment) return;
  payment.status = 'paid';
  payment.paidAt = nowIso();
  payment.method ||= 'Transferencia';
  const service = app.state.services.find(item => item.id === payment.serviceId);
  if (service && payment.kind === 'extra_credit') {
    const extra = (service.extraCredits || []).find(item => item.id === payment.extraCreditId);
    if (extra) {
      extra.status = 'paid';
      extra.paidAt = nowIso();
    }
  }
  if (service && payment.kind !== 'extra_credit' && service.status !== 'cancelled') service.status = 'active';
  try {
    await sendPaymentToFiometra(payment);
    showToast('Pago recibido y registrado en Fiometra');
  } catch (error) {
    payment.sentToFiometra = false;
    showToast(error.message === 'AUTH_REQUIRED' ? 'Pago recibido. Inicia sesion para pasarlo a Fiometra.' : `Pago recibido. Fiometra pendiente: ${error.message}`);
  }
  saveState();
  render();
}

async function toggleFiometra(id) {
  const payment = app.state.payments.find(item => item.id === id);
  if (!payment) return;
  if (!payment.sentToFiometra) {
    try {
      await sendPaymentToFiometra(payment);
      saveState();
      showToast('Pago registrado en Fiometra');
    } catch (error) {
      showToast(error.message || 'No se pudo pasar a Fiometra');
    }
    render();
    return;
  }
  payment.sentToFiometra = !payment.sentToFiometra;
  saveState();
  showToast(payment.sentToFiometra ? 'Pago preparado para Fiometra' : 'Pago quitado de Fiometra');
  render();
}

function handleSettingsSubmit(form) {
  if (!isOwner()) {
    showToast('Solo el propietario puede modificar los ajustes del espacio.');
    return;
  }
  const data = Object.fromEntries(new FormData(form));
  if (form.id === 'settingsGeneralForm') {
    app.state.settings.workspaceName = data.workspaceName.trim();
    app.state.settings.ivaRate = Number(data.ivaRate || 21);
    app.state.settings.irpfRate = Number(data.irpfRate || 15);
  }
  if (form.id === 'settingsNotificationsForm') {
    app.state.settings.cancelNoticeDays = 3;
    app.state.settings.autoCancelDays = 3;
    app.state.settings.autoSuspend = true;
  }
  if (form.id === 'settingsCalendarForm') {
    app.state.settings.workdays = String(data.workdays).split(',').map(Number);
    if (data.holidayDate && data.holidayName) app.state.settings.holidays.push({ id: uid('hol'), date: data.holidayDate, name: data.holidayName.trim() });
  }
  showToast('Ajustes guardados');
  render();
}

function showAlertsModal() {
  const alerts = getAlerts();
  openModal(modalFrame('Avisos de Cuotly', 'CONTROL', `
    <div class="modal-list">${alerts.map(alert => `<article><span class="status-dot ${alert.tone}"></span><div><strong>${esc(alert.title)}</strong><p>${esc(alert.text)}</p></div></article>`).join('') || emptyState('✓', 'Sin avisos', 'No hay alertas pendientes.')}</div>
    <div class="modal-actions"><button class="primary-button" data-action="close-modal">Cerrar</button></div>
  `));
}

async function handleClick(event) {
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
  if (action === 'open-account') { app.accountTab = 'perfil'; showView('cuenta'); return; }
  if (action === 'auth-mode') { renderAuthScreen(actionEl.dataset.mode || 'login'); return; }
  if (action === 'auth-google') { handleGoogleLogin(); return; }
  if (action === 'start-mfa-enroll') { await startMfaEnrollment(); return; }
  if (action === 'account-tab') { app.accountTab = actionEl.dataset.tab; renderAccount(); return; }
  if (action === 'open-password-modal') { openPasswordModal(); return; }
  if (action === 'open-backup-mfa') { app.auth.mfaEnrollment = null; closeModal(); renderMfaScreen('setup'); return; }
  if (action === 'open-delete-account-modal') { openDeleteAccountModal(); return; }
  if (action === 'export-account-data') { exportAccountData(); return; }
  if (action === 'answer-invitation') { await answerInvitation(id, actionEl.dataset.answer); return; }
  if (action === 'switch-workspace') { await switchWorkspace(id); return; }
  if (action === 'delete-workspace') { await deleteWorkspace(id); return; }
  if (action === 'show-alerts') showAlertsModal();
  if (action === 'open-restaurant') showView('restaurante-detalle', { restaurantId: id });
  if (action === 'open-restaurant-modal') openRestaurantModal(id);
  if (action === 'open-service-modal') openServiceModal(id, { restaurantId: actionEl.dataset.restaurant, planCode: actionEl.dataset.plan });
  if (action === 'create-client-portal') await createClientPortal(id);
  if (action === 'open-client-portal') openClientPortal(id);
  if (action === 'open-client-portal-invite') openClientPortalInviteModal(id);
  if (action === 'open-client-requests') await openClientRequestInbox(id);
  if (action === 'client-request-update') await updateClientRequest(actionEl.dataset.portal, actionEl.dataset.request, actionEl.dataset.status);
  if (action === 'open-client-request-chat') await openClientRequestChat(actionEl.dataset.portal, actionEl.dataset.request, actionEl.dataset.title);
  if (action === 'open-client-attachment') await openClientAttachment(actionEl.dataset.portal, actionEl.dataset.path);
  if (action === 'open-service-team-modal') openServiceTeamModal(id);
  if (action === 'open-task-modal') openTaskModal(id, { restaurantId: actionEl.dataset.restaurant, serviceId: actionEl.dataset.service });
  if (action === 'open-extra-credit-modal') openExtraCreditModal(id);
  if (action === 'open-pause-modal') openPauseModal(id);
  if (action === 'resume-service') resumeService(id);
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
  if (action === 'mark-paid') await markPaymentPaid(id);
  if (action === 'toggle-fiometra') await toggleFiometra(id);
  if (action === 'remove-member') removeMember(id);
  if (action === 'restore-member') restoreMember(id);
  if (action === 'purge-member') await purgeMember(id);
  if (action === 'open-note-modal') openNoteModal(id, actionEl.dataset.note || '');
  if (action === 'delete-restaurant') deleteRestaurant(id);
  if (action === 'delete-task') deleteTask(id);
  if (action === 'cancel-service') cancelService(id);
  if (action === 'download-report') downloadReport(id);
  if (action === 'generate-report') { const report = generateReport(id, actionEl.dataset.month || monthKey(new Date())); if (report) downloadReport(report.id); render(); }
  if (action === 'export-payments') exportPayments();
  if (action === 'export-tasks') exportTasks();
  if (action === 'export-restaurants') exportRestaurants();
  if (action === 'remove-holiday') { app.state.settings.holidays = app.state.settings.holidays.filter(item => item.id !== id); render(); }
  if (action === 'calendar-prev') { app.calendarMonth = addMonths(app.calendarMonth, -1); renderCalendar(); }
  if (action === 'calendar-next') { app.calendarMonth = addMonths(app.calendarMonth, 1); renderCalendar(); }
  if (action === 'calendar-today') { app.calendarMonth = startOfMonth(new Date()); renderCalendar(); }
  if (action === 'open-settings-prices') { app.settingsTab = 'general'; showView('ajustes'); }
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
  if (form.id === 'accountCompletionForm') { handleAccountCompletion(form); return; }
  if (form.id === 'mfaVerifyForm') { verifyMfa(form); return; }
  if (form.id === 'accountProfileForm') { handleAccountProfileSubmit(form); return; }
  if (form.id === 'accountNotificationsForm') { handleAccountNotifications(form); return; }
  if (form.id === 'accountPasswordForm') { handlePasswordSubmit(form); return; }
  if (form.id === 'deleteAccountForm') { handleDeleteAccount(form); return; }
  if (form.id === 'restaurantForm') handleRestaurantSubmit(form);
  if (form.id === 'serviceForm') handleServiceSubmit(form);
  if (form.id === 'taskForm') handleTaskSubmit(form);
  if (form.id === 'serviceTeamForm') handleServiceTeamSubmit(form);
  if (form.id === 'restaurantNoteForm') handleRestaurantNoteSubmit(form);
  if (form.id === 'clientPortalInviteForm') { handleClientPortalInvite(form); return; }
  if (form.id === 'maintenanceClientMessageForm') { sendMaintenanceClientMessage(form); return; }
  if (form.id === 'extraCreditForm') handleExtraCreditSubmit(form);
  if (form.id === 'pauseServiceForm') handlePauseServiceSubmit(form);
  if (form.id === 'memberForm') handleMemberSubmit(form);
  if (form.id === 'planChangeForm') handlePlanChangeSubmit(form);
  if (form.id === 'workspaceCreateForm') { createWorkspaceFromForm(form); return; }
  if (form.id === 'reportForm') {
    const data = Object.fromEntries(new FormData(form));
    const report = generateReport(data.restaurantId, data.month);
    closeModal();
    if (report) downloadReport(report.id);
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

async function ensurePersonalWorkspace() {
  const token = await getAccessToken();
  if (!token) return;
  const response = await fetch('/api/shared-state', { headers: { authorization: `Bearer ${token}` } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'No se pudieron cargar tus espacios.');
  const spaces = result.workspaces || [];
  const personal = spaces.find(space => space.role === 'owner');
  if (personal) {
    app.workspace.workspaces = spaces;
    return;
  }
  const created = await fetch('/api/shared-state', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'create-workspace', name: 'Mi espacio', state: seedState() }),
  });
  const createdResult = await created.json().catch(() => ({}));
  if (!created.ok) throw new Error(createdResult.error || 'No se pudo crear Mi espacio.');
  app.workspace.workspaces = createdResult.workspaces || [];
  // A personal space is always available after creating the account, even when an invitation is pending.
  if (!localStorage.getItem(workspaceSelectionKey())) localStorage.setItem(workspaceSelectionKey(), createdResult.workspace.id);
}

async function checkInvitationFromLink() {
  const inviteId = new URLSearchParams(window.location.search).get('invite');
  if (!inviteId || !app.auth.user) return;
  const token = await getAccessToken();
  const response = await fetch(`/api/invitation-response?inviteId=${encodeURIComponent(inviteId)}`, { headers: { authorization: `Bearer ${token}` } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.invitation?.status !== 'pending') return;
  const invitation = result.invitation;
  openModal(modalFrame('Invitación a un espacio', 'CUOTLY', `
    <div class="invite-decision"><p>Te han invitado al espacio <strong>${esc(invitation.workspaceName)}</strong> como <strong>${esc(ROLE_LABELS[invitation.role] || invitation.role)}</strong>.</p><p class="settings-copy">Tu cuenta y tu espacio personal seguirán siendo privados. Decide si quieres unirte.</p></div>
    <div class="modal-actions"><button class="secondary-button" data-action="answer-invitation" data-answer="reject" data-id="${esc(inviteId)}">Rechazar</button><button class="primary-button" data-action="answer-invitation" data-answer="accept" data-id="${esc(inviteId)}">Aceptar invitación</button></div>
  `));
}

async function answerInvitation(inviteId, answer) {
  const token = await getAccessToken();
  if (!token) return;
  const response = await fetch('/api/invitation-response', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ inviteId, answer }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { showToast(result.error || 'No se pudo responder la invitación.'); return; }
  const url = new URL(window.location.href);
  url.searchParams.delete('invite');
  window.history.replaceState({}, '', url);
  closeModal();
  app.workspace.workspaces = result.workspaces || app.workspace.workspaces;
  if (answer === 'accept' && result.workspaceId) localStorage.setItem(workspaceSelectionKey(), result.workspaceId);
  showToast(answer === 'accept' ? 'Te has unido al espacio.' : 'Invitación rechazada.');
  app.booted = false;
  await startApp();
}

async function startApp() {
  if (!app.auth.user) return;
  if (window.CuotlyClientPortal?.requested?.()) {
    if (needsAccountCompletion()) { renderAccountCompletion(); return; }
    const clientMfaReady = await mfaGate();
    if (!clientMfaReady) return;
    await window.CuotlyClientPortal.start({ client: app.auth.client, user: app.auth.user, getToken: getAccessToken });
    return;
  }
  if (needsAccountCompletion()) { renderAccountCompletion(); return; }
  const mfaReady = await mfaGate();
  if (!mfaReady) return;
  try {
    await ensurePersonalWorkspace();
  } catch (error) {
    renderAuthScreen('login', error.message || 'No se pudo preparar tu cuenta.');
    return;
  }
  await loadState();
  if (app.workspace.needsSetup) {
    stopWorkspaceAccessCheck();
    renderWorkspaceGate();
    return;
  }
  app.selectedRestaurantId = visibleRestaurants()[0]?.id || null;
  showAppShell();
  registerServiceWorker();
  render();
  app.booted = true;
  startWorkspaceAccessCheck();
  await checkInvitationFromLink();
  if (app.auth.client && !app.persistence.cloudAvailable) {
    showToast('Falta ejecutar la actualizacion de Supabase para sincronizar dispositivos');
  }
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
  if (canStart) await startApp();
}

init();

(() => {
  const query = () => new URLSearchParams(location.search);
  const pendingClientInviteKey = 'cuotly_pending_client_invite';
  const pendingClientInvite = () => query().get('clientInvite') || localStorage.getItem(pendingClientInviteKey) || '';
  const inviteFromLink = query().get('clientInvite');
  if (inviteFromLink) localStorage.setItem(pendingClientInviteKey, inviteFromLink);
  const clientPanelRequested = () => query().has('clientPortal') || query().has('clientOnly') || Boolean(pendingClientInvite());
  const state = { client:null, user:null, getToken:null, portalId:'', data:null, portals:[], view:'inicio', preview:false, busy:false, mobileMenu:false, webGuideLanguage:localStorage.getItem('cuotly_web_guide_language') || 'es', webSection:'editor', analyticsPeriod:'monthly', analytics:null, analyticsLoading:false };
  const root = () => document.querySelector('#clientPanelRoot');
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const formatDate = value => value ? new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value)) : 'Sin fecha';
  const initials = value => String(value || 'C').split(/\s+/).slice(0,2).map(word => word[0] || '').join('').toUpperCase();
  const roleName = value => ({owner:'Propietario',editor:'Editor',viewer:'Solo consultar'})[value] || value;
  const pill = status => `<span class="cp-pill ${esc(status)}">${esc(({pending:'Pendiente',accepted:'Aceptada',in_progress:'En proceso',waiting:'Esperando respuesta',completed:'Completada',cancelled:'Cancelada',rejected:'Rechazada',paid:'Pagado',late:'Retrasado',suspended:'Suspendido'}[status] || status))}</span>`;
  const showToast = message => { const el=document.querySelector('#clientToast'); if(!el) return; el.textContent=message; el.classList.add('show'); clearTimeout(window.clientToastTimer); window.clientToastTimer=setTimeout(()=>el.classList.remove('show'),2800); };
  async function token(){ return state.getToken ? state.getToken() : null; }
  async function api(action, body={}, method='POST'){
    const access = await token(); if(!access) throw new Error('Tu sesion ha terminado.');
    const url = method === 'GET' ? `/api/client-portal?action=${encodeURIComponent(action)}&${new URLSearchParams(body)}` : '/api/client-portal';
    const response=await fetch(url,{method,headers:{...(method==='GET'?{}:{'content-type':'application/json'}),authorization:`Bearer ${access}`},body:method==='GET'?undefined:JSON.stringify({action,...body})});
    const result=await response.json().catch(()=>({})); if(!response.ok) throw new Error(result.error || 'No se pudo completar la accion.'); return result;
  }
  function isClient(){ return Boolean(state.data?.member); }
  function canEdit(){ return ['owner','editor'].includes(state.data?.member?.role); }
  function canManageClientTeam(){ return state.data?.permissions?.canManageClientTeam===true; }
  function canOpenWebEditor(){ return state.data?.permissions?.canOpenWebEditor===true; }
  function canManageWebGuide(){ return state.data?.permissions?.canManageWebGuide===true; }
  function nav(){ return [{id:'inicio',label:'Inicio'},{id:'web',label:'Mi web'},{id:'solicitudes',label:'Solicitudes'},{id:'calendario',label:'Calendario'},{id:'plan',label:'Plan y pagos'},{id:'informes',label:'Informes'},{id:'restaurante',label:'Mi restaurante'},{id:'equipo',label:'Mi equipo'},{id:'perfil',label:'Perfil'}]; }
  function pageHeading(title, copy='', actions=''){ return `<div class="cp-page-heading"><div><h2>${esc(title)}</h2>${copy?`<p>${esc(copy)}</p>`:''}</div><div class="cp-actions">${actions}</div></div>`; }
  function serviceCard(service){ const quotas=Object.entries(service.quotas||{}); return `<section class="cp-card cp-service ${service.planCode==='menu'?'menu':''}"><span class="cp-label">SERVICIO ACTIVO</span><h3>${esc(service.name)}</h3><p>Renovacion: ${formatDate(service.cycle?.end)} · ${service.status==='active'?'Activo':'No disponible'}</p><div class="cp-quota-list">${quotas.map(([type,item])=>`<div class="cp-quota"><span>${esc(({small:'Cambios pequenos',medium:'Cambios medianos',large:'Cambios grandes',photos:'Fotografias',menu_update:'Actualizaciones'}[type]||type))}</span><b>${item.available}/${item.limit}</b></div>`).join('')}</div></section>`; }
  function dashboard(){ const d=state.data, services=d.services||[], requests=d.requests||[]; const active=requests.filter(item=>!['completed','cancelled','rejected'].includes(item.status)); const next=services.map(item=>item.cycle?.end).filter(Boolean).sort()[0]; return `${pageHeading(`Hola, ${state.user?.user_metadata?.full_name || state.user?.email?.split('@')[0] || 'bienvenido'}`,d.restaurant?.name || '')}${state.preview?'<div class="cp-banner">Estás viendo este panel como parte del mantenimiento. Los botones de cliente están desactivados.</div>':''}<div class="cp-grid four"><section class="cp-card cp-stat"><span class="cp-label">RESTAURANTE</span><strong>${esc(d.restaurant.name)}</strong><small>Panel privado</small></section><section class="cp-card cp-stat"><span class="cp-label">SOLICITUDES ABIERTAS</span><strong>${active.length}</strong><small>En seguimiento</small></section><section class="cp-card cp-stat"><span class="cp-label">SIGUIENTE RENOVACION</span><strong>${next?formatDate(next):'--'}</strong><small>Consulta tu plan</small></section><section class="cp-card cp-stat"><span class="cp-label">SERVICIOS</span><strong>${services.length}</strong><small>Activos para tu restaurante</small></section></div><div class="cp-grid two" style="margin-top:16px"><section class="cp-card"><h3>Tu saldo de cambios</h3><p>Solo se muestran los cambios que puedes solicitar al equipo de mantenimiento.</p><div class="cp-grid two" style="margin-top:14px">${services.map(serviceCard).join('')||'<div class="cp-empty">No hay servicios activos.</div>'}</div></section><section class="cp-card"><h3>Acciones rápidas</h3><p>Pide un cambio, consulta una solicitud o revisa los datos de tu restaurante.</p><div class="cp-actions" style="margin-top:18px">${canEdit()?'<button class="cp-primary" data-cp-action="open-request">Solicitar cambio</button>':''}<button class="cp-secondary" data-cp-view="solicitudes">Ver solicitudes</button><button class="cp-secondary" data-cp-view="plan">Ver plan y pagos</button></div></section></div><section class="cp-card" style="margin-top:16px"><h3>Actividad reciente</h3><div class="cp-list" style="margin-top:13px">${requests.slice(0,5).map(requestCard).join('')||'<div class="cp-empty">Todavía no hay solicitudes.</div>'}</div></section>`; }
  function requestCard(request){ return `<article class="cp-request" data-cp-action="open-request-detail" data-id="${request.id}"><div><h3>${esc(request.title)}</h3><p>${esc(request.description || 'Sin descripción')}</p><div class="cp-meta">${formatDate(request.requestedAt)} · ${request.source==='web_editor'?'Solicitada desde Editar mi web':'Sin cambios asignados'}${request.source!=='web_editor'&&request.selectedAllocations?.length?` · ${request.selectedAllocations.map(item=>`${item.quantity} ${item.type}`).join(', ')}`:''}</div></div><div>${pill(request.status)}</div></article>`; }
  function requestsPage(){ const requests=state.data.requests||[]; return `${pageHeading('Solicitudes','Sigue cada cambio que has pedido al equipo.',canEdit()?'<button class="cp-primary" data-cp-action="open-request">Solicitar cambio</button>':'') }<div class="cp-list">${requests.map(requestCard).join('')||'<div class="cp-empty">No hay solicitudes todavía.</div>'}</div>`; }
  function calendarPage(){ const rows=[...(state.data.tasks||[])].sort((a,b)=>new Date(a.requestedAt)-new Date(b.requestedAt)); return `${pageHeading('Calendario','Cambios y publicaciones programadas para tu restaurante.')}<section class="cp-card"><table class="cp-table"><thead><tr><th>Fecha</th><th>Trabajo</th><th>Tipo</th><th>Estado</th></tr></thead><tbody>${rows.map(task=>`<tr><td>${formatDate(task.startedAt||task.requestedAt)}</td><td>${esc(task.title)}</td><td>${esc(task.type)}</td><td>${pill(task.status)}</td></tr>`).join('')||'<tr><td colspan="4">Todavía no hay trabajos programados.</td></tr>'}</tbody></table></section>`; }
  function planPage(){ const d=state.data; return `${pageHeading('Plan y pagos','Consulta tus servicios, cambios disponibles y facturas.') }<div class="cp-grid two">${(d.services||[]).map(serviceCard).join('')||'<div class="cp-empty">No hay servicios activos.</div>'}</div><section class="cp-card" style="margin-top:16px"><h3>Pagos y facturas</h3><table class="cp-table"><thead><tr><th>Ciclo</th><th>Vencimiento</th><th>Importe</th><th>Estado</th><th></th></tr></thead><tbody>${(d.payments||[]).map(payment=>`<tr><td>${formatDate(payment.cycleStart)} - ${formatDate(payment.cycleEnd)}</td><td>${formatDate(payment.dueDate)}</td><td>${Number(payment.total||0).toFixed(2)} €</td><td>${pill(payment.status)}</td><td>${payment.invoiceUrl?`<a class="cp-secondary" href="${esc(payment.invoiceUrl)}" target="_blank" rel="noopener">Factura</a>`:''}</td></tr>`).join('')||'<tr><td colspan="5">No hay pagos disponibles.</td></tr>'}</tbody></table><div class="cp-actions" style="margin-top:16px"><button class="cp-secondary" data-cp-action="communicate-payment">Comunicar pago realizado</button><button class="cp-secondary" data-cp-action="open-extra-package">Solicitar paquete adicional</button>${state.data.member?.role==='owner'?'<button class="cp-danger" data-cp-action="open-pause">Solicitar pausa o baja</button>':''}</div></section>`; }
  function reportsPage(){ const reports=state.data.reports||[]; return `${pageHeading('Informes','Informes mensuales de tus servicios de mantenimiento.')}<section class="cp-card"><div class="cp-list">${reports.map(report=>`<article class="cp-request"><div><h3>Informe ${esc(report.month)}</h3><p>Generado el ${formatDate(report.generatedAt)}</p></div>${report.filePath?`<a class="cp-secondary" href="${esc(report.filePath)}" target="_blank" rel="noopener">Descargar</a>`:pill(report.status)}</article>`).join('')||'<div class="cp-empty">Aún no hay informes disponibles.</div>'}</div></section>`; }
  function restaurantPage(){ const restaurant=state.data.restaurant; return `${pageHeading('Mi restaurante','Los datos de contacto que aparecerán en tu ficha.')}<section class="cp-card"><form class="cp-form" id="clientRestaurantForm"><div class="split"><label>Nombre<input name="name" value="${esc(restaurant.name)}" ${canEdit()?'':'disabled'}></label><label>Email<input type="email" name="email" value="${esc(restaurant.email)}" ${canEdit()?'':'disabled'}></label></div><div class="split"><label>Teléfono<input name="phone" value="${esc(restaurant.phone)}" ${canEdit()?'':'disabled'}></label><label>Ciudad<input name="city" value="${esc(restaurant.city)}" ${canEdit()?'':'disabled'}></label></div><label>Dirección<input name="address" value="${esc(restaurant.address)}" ${canEdit()?'':'disabled'}></label><label>URL pública de tu web<input value="${esc(restaurant.publicUrl)}" disabled><small class="cp-url">Esta dirección solo la gestiona el equipo de mantenimiento.</small></label>${canEdit()?'<div class="cp-actions"><button class="cp-primary">Guardar cambios</button></div>':''}</form></section>`; }
  function teamPage(){ const members=state.data.clientMembers||[]; const restaurantOwner=state.data.member?.role==='owner'; const canInvite=canManageClientTeam(); return `${pageHeading('Mi equipo','Personas de tu restaurante que pueden acceder a este panel.',canInvite?'<button class="cp-primary" data-cp-action="open-client-invite">Añadir persona</button>':'')}<section class="cp-card"><div class="cp-list">${members.length?members.map(member=>`<article class="cp-request"><div><h3>${esc(member.name||member.email)}</h3><p>${esc(member.email)} · ${esc(roleName(member.role))}</p></div>${restaurantOwner?`<button class="cp-secondary" data-cp-action="open-member-edit" data-id="${member.id}">Gestionar</button>`:''}</article>`).join(''):'<div class="cp-empty">Solo tú tienes acceso por ahora.</div>'}</div></section>`; }
  function profilePage(){ const meta=state.user?.user_metadata||{}; return `${pageHeading('Mi perfil','Tu perfil es privado y funciona en todos tus espacios de Quotly.')}<section class="cp-card"><form class="cp-form" id="clientProfileForm"><label>Nombre<input name="full_name" value="${esc(meta.full_name||meta.name||'')}"></label><label>Email<input value="${esc(state.user?.email||'')}" disabled><small>El email no se puede cambiar desde aquí.</small></label><div class="split"><label>Teléfono<input name="phone" value="${esc(meta.phone||'')}"></label><label>Puesto<input name="job_title" value="${esc(meta.job_title||'')}"></label></div><label>Sobre mí<textarea name="bio">${esc(meta.bio||'')}</textarea></label><div class="cp-actions"><button class="cp-primary">Guardar perfil</button><button type="button" class="cp-danger" data-cp-action="logout">Cerrar sesión</button></div></form></section><section class="cp-card" style="margin-top:16px"><h3>Mis restaurantes</h3><div class="cp-list">${(state.portals||[]).map(portal=>`<button class="cp-space-option" data-cp-action="switch-portal" data-id="${portal.id}"><span><strong>${esc(portal.restaurantName)}</strong><small>${esc(roleName(portal.role))}</small></span><b>Entrar</b></button>`).join('')}</div></section>`; }
  function guideItemCard(item,index){
    const media = `${item.imageUrl ? `<img class="cp-guide-image" src="${esc(item.imageUrl)}" alt="Guia visual del paso ${index + 1}">` : ''}${item.videoUrl ? `<a class="cp-guide-video" href="${esc(item.videoUrl)}" target="_blank" rel="noopener">Ver video del paso</a>` : ''}`;
    return `<article class="cp-guide-step"><span class="cp-guide-number">${index + 1}</span><div class="cp-guide-copy"><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p>${media}<button class="cp-secondary" data-cp-action="open-web-help">Necesito ayuda con este paso</button></div></article>`;
  }
  function clientAnalyticsMetric(label, value){
    return `<article class="cp-analytics-metric"><span>${esc(label)}</span><strong>${Number(value || 0).toLocaleString('es-ES')}</strong></article>`;
  }
  function clientAnalyticsList(title, rows, key, valueKey){
    return `<section class="cp-analytics-list"><h3>${esc(title)}</h3>${rows?.length ? rows.map(row=>`<div><span>${esc(row[key] || 'Sin datos')}</span><b>${Number(row[valueKey] || 0).toLocaleString('es-ES')}</b></div>`).join('') : '<p>Aun no hay datos para este periodo.</p>'}</section>`;
  }
  function clientPerformancePage(){
    const analytics=state.analytics;
    const labels={daily:'Dia',monthly:'Mes',quarterly:'Trimestre',yearly:'Ano'};
    const controls=`<div class="cp-analytics-toolbar"><div class="cp-web-tabs compact">${Object.entries(labels).map(([period,label])=>`<button class="${state.analyticsPeriod===period?'active':''}" data-cp-action="analytics-period" data-period="${period}">${label}</button>`).join('')}</div><button class="cp-secondary" data-cp-action="analytics-refresh">Actualizar</button></div>`;
    if(state.analyticsLoading) return `<section class="cp-card cp-analytics-empty"><span class="cp-label">GOOGLE ANALYTICS 4</span><h3>Consultando el rendimiento de tu web...</h3><p>Estamos preparando el resumen de este periodo.</p></section>`;
    if(!analytics?.configured) return `<section class="cp-card cp-analytics-empty"><span class="cp-label">GOOGLE ANALYTICS 4</span><h3>Rendimiento web</h3><p>${esc(analytics?.message || 'El equipo de mantenimiento activara el seguimiento cuando tu web este publicada y configurada.')}</p></section>`;
    const actions=(analytics.actions||[]).filter(item=>Number(item.count||0)>0);
    return `<section class="cp-analytics-head"><div><span class="cp-label">GOOGLE ANALYTICS 4</span><h3>Rendimiento web</h3><p>${esc(analytics.range?.startDate || '')} al ${esc(analytics.range?.endDate || '')}</p></div>${controls}</section>
      <section class="cp-analytics-metrics">${clientAnalyticsMetric('Usuarios',analytics.totals?.users)}${clientAnalyticsMetric('Sesiones',analytics.totals?.sessions)}${clientAnalyticsMetric('Vistas',analytics.totals?.pageViews)}${clientAnalyticsMetric('Sesiones con interaccion',analytics.totals?.engagedSessions)}</section>
      <section class="cp-analytics-grid">${clientAnalyticsList('Dos paginas mas visitadas',analytics.topPages,'path','views')}${clientAnalyticsList('Acciones en tu web',actions,'label','count')}</section>
      <p class="cp-analytics-note">Las reservas y pedidos muestran clics de interes. Las conversiones confirmadas se incorporaran cuando la plataforma permita conectarlas.</p>`;
  }
  function webPage(){
    const d = state.data;
    const canOpen = canOpenWebEditor();
    const editorAvailable = d.portal?.editorAvailable === true;
    const accessAction = editorAvailable
      ? (canOpen ? '<button class="cp-primary" data-cp-action="open-web-editor">Abrir editor</button>' : '<button class="cp-secondary" disabled>Acceso al editor restringido</button>')
      : (canEdit() ? '<button class="cp-primary" data-cp-action="request-editor-access">Solicitar acceso al editor</button>' : '<button class="cp-secondary" disabled>Editor pendiente de configurar</button>');
    const publicAction = d.restaurant?.publicUrl ? '<button class="cp-secondary" data-cp-action="open-public-web">Ver mi web</button>' : '<button class="cp-secondary" disabled>Web publica pendiente</button>';
    const helpAction = canEdit() ? '<button class="cp-secondary" data-cp-action="open-web-help">Solicitar ayuda</button>' : '<button class="cp-secondary" disabled>Solicitar ayuda</button>';
    const guideEditor = canManageWebGuide() ? '<button class="cp-secondary" data-cp-action="open-web-guide-editor">Editar guia</button>' : '';
    const editorPage=`
      <section class="cp-web-hero cp-card">
        <div><span class="cp-label">TU ESPACIO WEB</span><h3>Gestiona tu web con claridad</h3><p>Los cambios hechos en LandingSite se publican desde LandingSite y no consumen los cambios de tu plan de mantenimiento.</p></div>
        <div class="cp-actions">${accessAction}${publicAction}${helpAction}</div>
      </section>
      <section class="cp-banner cp-web-reminder"><strong>Antes de publicar:</strong> revisa la version movil, el idioma y que la informacion importante sea correcta.</section>
      <section class="cp-card cp-guide-entry"><div><span class="cp-label">GUIA GENERAL</span><h3>Aprende a editar tu web</h3><p>Consulta los pasos cuando los necesites, en espanol o en ingles.</p></div><div class="cp-actions"><button class="cp-secondary" data-cp-action="open-web-guide">Ver guia</button>${guideEditor}</div></section>`;
    return `${pageHeading('Mi web','Edita tu web en LandingSite y consulta su rendimiento.')}
      <div class="cp-web-tabs"><button class="${state.webSection==='editor'?'active':''}" data-cp-action="set-web-section" data-section="editor">Editar mi web</button><button class="${state.webSection==='performance'?'active':''}" data-cp-action="set-web-section" data-section="performance">Rendimiento</button></div>
      ${state.webSection==='performance'?clientPerformancePage():editorPage}`;
  }
  async function loadPortalAnalytics(force=false){
    if(state.analyticsLoading || (!force && state.analytics?.configured && state.analyticsPeriod===state.analytics.period)) return;
    state.analyticsLoading=true;render();
    try{const result=await api('analytics-summary',{portalId:state.portalId,period:state.analyticsPeriod});state.analytics={...(result.analytics||{}),period:state.analyticsPeriod};}
    catch(error){state.analytics={configured:false,message:error.message||'No se pudo consultar Google Analytics.',period:state.analyticsPeriod};}
    finally{state.analyticsLoading=false;if(state.view==='web'&&state.webSection==='performance')render();}
  }
  function render(){
    const rootEl=root(); if(!rootEl||!state.data) return;
    const current=nav().find(item=>item.id===state.view)||nav()[0];
    const content={inicio:dashboard,web:webPage,solicitudes:requestsPage,calendario:calendarPage,plan:planPage,informes:reportsPage,restaurante:restaurantPage,equipo:teamPage,perfil:profilePage}[current.id]();
    document.body.classList.toggle('cp-menu-open', state.mobileMenu);
    rootEl.innerHTML=`<div class="cp-shell ${state.mobileMenu?'menu-open':''}">
      <aside class="cp-sidebar" id="clientSidebar" aria-label="Navegación del panel">
        <div class="cp-brand"><b>Q</b><div><strong>Quotly</strong><small>Panel de restaurante</small></div><button class="cp-sidebar-close" data-cp-action="close-mobile-menu" aria-label="Cerrar menú">×</button></div>
        <nav class="cp-nav">${nav().map(item=>`<button class="${state.view===item.id?'active':''}" data-cp-view="${item.id}"><i>${item.id==='inicio'?'⌂':'·'}</i>${item.label}</button>`).join('')}</nav>
        <div class="cp-sidebar-bottom"><button class="cp-space-switch" data-cp-action="open-profile"><span>${esc(state.data.restaurant.name)}</span><b>⌄</b></button>${state.data.permissions?.canReturnToMaintenance?'<button class="cp-return-maintenance" data-cp-action="return-to-maintenance">← Volver a mantenimiento</button>':''}<button class="cp-logout" data-cp-action="logout">Cerrar sesión</button></div>
      </aside>
      <button class="cp-mobile-backdrop" data-cp-action="close-mobile-menu" aria-label="Cerrar menú"></button>
      <main class="cp-main"><header class="cp-topbar"><div class="cp-topbar-title"><button class="cp-menu-toggle" data-cp-action="toggle-mobile-menu" aria-label="Abrir menú" aria-controls="clientSidebar" aria-expanded="${state.mobileMenu}">☰</button><div><h1>${esc(current.label)}</h1><p>${esc(state.data.restaurant.name)}</p></div></div><div class="cp-user"><span>${(state.data.notifications||[]).filter(n=>!n.read_at).length} avisos</span><i class="cp-avatar">${initials(state.user?.user_metadata?.full_name||state.user?.email)}</i></div></header><section class="cp-content">${content}</section></main>
    </div><div id="clientModal"></div><div class="cp-toast" id="clientToast"></div>`;
  }
  function modal(title, body){ document.querySelector('#clientModal').innerHTML=`<div class="cp-modal-backdrop"><section class="cp-modal"><div class="cp-modal-head"><div><span class="cp-label">QUOTLY</span><h2>${esc(title)}</h2></div><button class="cp-modal-close" data-cp-action="close-modal">×</button></div><div class="cp-modal-body">${body}</div></section></div>`; }
  function closeModal(){ const el=document.querySelector('#clientModal'); if(el) el.innerHTML=''; }
  async function bootstrap(portalId){ const result=await api('bootstrap',{portalId},'GET'); state.portals=result.portals||[]; if(!portalId){ renderPicker(); return; } state.portalId=portalId; state.data=result.data; state.preview=result.mode==='maintenance-preview'; state.view='inicio'; state.webSection='editor'; state.analytics=null; state.analyticsLoading=false; render(); }
  function renderPicker(){ const r=root(); document.querySelector('#authScreen')?.classList.add('hidden'); document.querySelector('#appShell')?.classList.add('hidden'); r.classList.remove('hidden'); r.innerHTML=`<div class="cp-space-picker"><span class="cp-label">QUOTLY</span><h1>Elige tu restaurante</h1><p>Tu cuenta puede acceder a varios paneles de restaurante.</p>${state.portals.map(portal=>`<button class="cp-space-option" data-cp-action="switch-portal" data-id="${portal.id}"><span><strong>${esc(portal.restaurantName)}</strong><small>${esc(roleName(portal.role))}</small></span><b>Entrar</b></button>`).join('')||'<div class="cp-empty">No tienes ningún panel de restaurante asignado.</div>'}<div class="cp-actions" style="margin-top:20px"><button class="cp-secondary" data-cp-action="logout">Cerrar sesión</button></div></div>`; }
  async function openRequest(){ const services=(state.data.services||[]).filter(item=>item.status==='active'&&item.planCode!=='menu'); const menus=(state.data.services||[]).filter(item=>item.status==='active'&&item.planCode==='menu'); if(!services.length&&!menus.length){showToast('No tienes servicios activos para solicitar un cambio.');return;} modal('Solicitar un cambio',`<form class="cp-form" id="clientRequestForm"><label>Servicio<select name="serviceId">${[...services,...menus].map(item=>`<option value="${item.id}">${esc(item.name)}</option>`).join('')}</select></label><label>Nombre del cambio<input name="title" required maxlength="180" placeholder="Ej. Actualizar los platos de la carta"></label><label>Explica lo que necesitas<textarea name="description" required maxlength="8000" placeholder="Incluye los textos, precios, enlaces o fotos necesarios."></textarea></label><div class="cp-actions"><button type="button" class="cp-secondary" data-cp-action="close-modal">Cancelar</button><button class="cp-primary">Analizar cambio</button></div></form>`); }
  async function analyze(form){ const data=Object.fromEntries(new FormData(form)); const button=form.querySelector('button.cp-primary'); button.disabled=true; button.textContent='Analizando...'; try{ const result=await fetch('/api/classify-change',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${await token()}`},body:JSON.stringify({workspaceId:state.data.portal.workspaceId,restaurantId:state.data.portal.restaurantId,serviceId:data.serviceId,title:data.title,description:data.description})}); const output=await result.json().catch(()=>({})); if(!result.ok) throw new Error(output.error||'No se pudo analizar.'); const choices=output.analysis.choices||[]; modal('Elige cómo usar tus cambios',`<form class="cp-form" id="clientRequestConfirmForm" data-service="${esc(data.serviceId)}" data-title="${esc(data.title)}" data-description="${esc(data.description)}"><p>${esc(output.analysis.summary)}</p><p>${esc(output.analysis.explanation)}</p>${output.analysis.quoteRequired?'<div class="cp-banner">Esta solicitud puede requerir presupuesto. Puedes enviarla para que el equipo la revise.</div>':''}<div class="cp-list">${choices.map((choice,index)=>`<label class="cp-choice"><input type="radio" name="choice" value="${index}" ${index===0?'checked':''}><strong>${esc(choice.label)}</strong><small>${esc(choice.explanation)} · ${choice.allocations.map(a=>`${a.quantity} ${a.type}`).join(', ')||'Presupuesto aparte'}</small></label>`).join('')}</div><input type="hidden" name="analysis" value="${esc(JSON.stringify(output.analysis))}"><input type="hidden" name="choices" value="${esc(JSON.stringify(choices))}"><div class="cp-actions"><button type="button" class="cp-secondary" data-cp-action="close-modal">Cancelar</button><button class="cp-primary">Enviar solicitud</button></div></form>`); }catch(error){showToast(error.message);}finally{button.disabled=false;button.textContent='Analizar cambio';} }
  async function submitRequest(form){ const f=new FormData(form), choices=JSON.parse(f.get('choices')||'[]'), selection=choices[Number(f.get('choice')||0)]||{}; try{await api('create-request',{portalId:state.portalId,serviceId:form.dataset.service,title:form.dataset.title,description:form.dataset.description,allocations:selection.allocations||[],proposedAllocations:choices,analysis:JSON.parse(f.get('analysis')||'{}')}); closeModal(); await bootstrap(state.portalId); state.view='solicitudes'; render(); showToast('Solicitud enviada al equipo de mantenimiento.');}catch(error){showToast(error.message);} }
  async function openRequestDetail(id){ const request=(state.data.requests||[]).find(item=>item.id===id); if(!request)return; let messages=[]; try{messages=(await api('messages',{portalId:state.portalId,requestId:id},'GET')).messages||[];}catch{} modal(request.title,`<div class="cp-list"><p>${esc(request.description)}</p><div>${pill(request.status)}</div></div><div class="cp-chat" style="margin-top:18px">${messages.map(message=>`<div class="cp-message ${message.side}">${esc(message.body)}<small>${message.side==='restaurant'?'Restaurante':'Equipo de mantenimiento'} · ${formatDate(message.createdAt)}</small></div>`).join('')||'<p class="cp-empty">Todavía no hay mensajes.</p>'}</div><form class="cp-form" id="clientMessageForm" data-request="${id}" style="margin-top:14px"><label>Escribe un mensaje<textarea name="message" required></textarea></label><div class="cp-actions"><button class="cp-primary">Enviar mensaje</button>${canEdit()&&!['completed','rejected','cancelled'].includes(request.status)?'<button type="button" class="cp-danger" data-cp-action="cancel-request" data-id="'+id+'">Cancelar solicitud</button>':''}</div></form>`); }
  async function sendMessage(form){ try{await api('send-message',{portalId:state.portalId,requestId:form.dataset.request,message:new FormData(form).get('message')}); closeModal(); await bootstrap(state.portalId); showToast('Mensaje enviado.');}catch(error){showToast(error.message);} }
  function inviteForm(){ modal('Añadir persona',`<form class="cp-form" id="clientInviteForm"><label>Email<input name="email" type="email" required></label><label>Acceso<select name="role"><option value="viewer">Solo consultar</option><option value="editor">Puede editar</option><option value="owner">Propietario</option></select></label><div class="cp-modal-actions"><button type="button" class="cp-secondary" data-cp-action="close-modal">Cancelar</button><button class="cp-primary">Enviar invitación</button></div></form>`); }
  function memberForm(id){ const member=(state.data.clientMembers||[]).find(item=>item.id===id); if(!member)return; modal('Gestionar acceso',`<form class="cp-form" id="clientMemberForm" data-id="${id}"><p>${esc(member.name||member.email)} · ${esc(member.email)}</p><label>Acceso<select name="role">${['owner','editor','viewer'].map(role=>`<option value="${role}" ${member.role===role?'selected':''}>${roleName(role)}</option>`).join('')}</select></label><label><input name="active" type="checkbox" checked> Mantener acceso a este restaurante</label><div class="cp-modal-actions"><button type="button" class="cp-secondary" data-cp-action="close-modal">Cancelar</button><button class="cp-primary">Guardar</button></div></form>`); }
  function pauseForm(){ modal('Solicitar pausa o baja',`<form class="cp-form" id="clientPauseForm"><label>Acción<select name="type"><option value="pause">Solicitar pausa</option><option value="cancel">Solicitar baja</option></select></label><label>Explicación<textarea name="description" required placeholder="Indica el motivo y la fecha deseada."></textarea></label><div class="cp-modal-actions"><button type="button" class="cp-secondary" data-cp-action="close-modal">Cancelar</button><button class="cp-primary">Enviar solicitud</button></div></form>`); }
  async function profileSave(form){ const fields=Object.fromEntries(new FormData(form)); try{const access=await token();const result=await fetch('/api/account',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${access}`},body:JSON.stringify({action:'profile',profile:fields})});const out=await result.json().catch(()=>({}));if(!result.ok)throw new Error(out.error||'No se pudo guardar.'); state.user={...state.user,user_metadata:{...state.user.user_metadata,...out.profile}};showToast('Perfil actualizado.');render();}catch(error){showToast(error.message);} }
  function returnToMaintenance(){
    const workspaceId=state.data?.portal?.workspaceId;
    if(workspaceId&&state.user?.id) localStorage.setItem(`cuotly_workspace_${state.user.id}`,workspaceId);
    const url=new URL(location.href);
    url.searchParams.delete('clientPortal');
    url.searchParams.delete('clientOnly');
    url.searchParams.delete('clientInvite');
    localStorage.removeItem(pendingClientInviteKey);
    location.href=url.pathname+(url.search||'')+url.hash;
  }
  async function logout(){localStorage.removeItem(pendingClientInviteKey);await state.client?.auth.signOut();location.href=location.pathname;}
  async function communicatePayment(){const service=state.data.services?.[0];const text=encodeURIComponent(`Hola, soy ${state.data.restaurant.name}. He realizado el pago de ${service?.name||'mi mantenimiento'} y quiero comunicarlo.`);location.href=`https://wa.me/34674248322?text=${text}`;}
  async function action(event){ const target=event.target.closest('[data-cp-action],[data-cp-view]');if(!target)return; const view=target.dataset.cpView;if(view){state.view=view;render();return;} const name=target.dataset.cpAction; if(name==='logout')return logout(); if(name==='close-modal')return closeModal();if(name==='open-request')return openRequest();if(name==='open-request-detail')return openRequestDetail(target.dataset.id);if(name==='open-client-invite')return inviteForm();if(name==='open-member-edit')return memberForm(target.dataset.id);if(name==='open-pause')return pauseForm();if(name==='open-extra-package'){location.href='https://wa.me/34674248322?text='+encodeURIComponent(`Hola, soy ${state.data.restaurant.name} y quiero solicitar un paquete adicional de cambios.`);return;}if(name==='communicate-payment')return communicatePayment();if(name==='open-profile'){state.view='perfil';render();return;}if(name==='switch-portal'){const url=new URL(location.href);url.searchParams.set('clientPortal',target.dataset.id);url.searchParams.delete('clientInvite');location.href=url.toString();return;}if(name==='cancel-request'){if(!confirm('¿Cancelar esta solicitud? Si el equipo ya la ha empezado, los cambios se consumirán.'))return;try{await api('cancel-request',{portalId:state.portalId,requestId:target.dataset.id});closeModal();await bootstrap(state.portalId);showToast('Solicitud cancelada.');}catch(error){showToast(error.message);}} }
  async function submit(event){const form=event.target;if(!(form instanceof HTMLFormElement))return;event.preventDefault();if(form.id==='clientRequestForm')return analyze(form);if(form.id==='clientRequestConfirmForm')return submitRequest(form);if(form.id==='clientMessageForm')return sendMessage(form);if(form.id==='clientRestaurantForm'){try{await api('update-restaurant-profile',{portalId:state.portalId,profile:Object.fromEntries(new FormData(form))});await bootstrap(state.portalId);showToast('Ficha actualizada.');}catch(error){showToast(error.message);}return;}if(form.id==='clientInviteForm'){try{await api('invite-client',{portalId:state.portalId,email:new FormData(form).get('email'),role:new FormData(form).get('role')});closeModal();showToast('Invitación enviada.');}catch(error){showToast(error.message);}return;}if(form.id==='clientMemberForm'){try{const f=new FormData(form);await api('update-client-member',{portalId:state.portalId,memberId:form.dataset.id,role:f.get('role'),active:f.get('active')==='on'});closeModal();await bootstrap(state.portalId);showToast('Acceso actualizado.');}catch(error){showToast(error.message);}return;}if(form.id==='clientPauseForm'){const f=new FormData(form);try{await api(f.get('type')==='pause'?'request-service-pause':'request-cancellation',{portalId:state.portalId,title:f.get('type')==='pause'?'Solicitud de pausa':'Solicitud de baja',description:f.get('description')});closeModal();await bootstrap(state.portalId);showToast('Solicitud enviada.');}catch(error){showToast(error.message);}return;}if(form.id==='clientProfileForm')return profileSave(form);}
  window.CuotlyClientPortal={requested:()=>query().has('clientPortal')||query().has('clientInvite'),start:async context=>{state.client=context.client;state.user=context.user;state.getToken=context.getToken;document.querySelector('#authScreen')?.classList.add('hidden');document.querySelector('#appShell')?.classList.add('hidden');root()?.classList.remove('hidden');document.removeEventListener('click',action);document.addEventListener('click',action);document.removeEventListener('submit',submit);document.addEventListener('submit',submit);try{const invite=query().get('clientInvite');let portalId=query().get('clientPortal');if(invite){const accepted=await api('accept-client-invite',{inviteId:invite});portalId=accepted.portalId;const url=new URL(location.href);url.searchParams.delete('clientInvite');url.searchParams.set('clientPortal',portalId);history.replaceState({},'',url);}await bootstrap(portalId);}catch(error){root().innerHTML=`<div class="cp-space-picker"><h1>No se pudo abrir el panel</h1><p>${esc(error.message)}</p><button class="cp-secondary" data-cp-action="logout">Cerrar sesión</button></div>`;}}};
  function closeModal(){
    state.pendingFiles=[];
    const el=document.querySelector('#clientModal');
    if(el) el.innerHTML='';
  }
  function attachmentsMarkup(items){
    const rows=Array.isArray(items)?items:[];
    if(!rows.length)return '';
    return `<div class="cp-attachments">${rows.map(item=>`<button type="button" class="cp-attachment" data-cp-action="open-attachment" data-path="${esc(item.path)}">Adjunto: ${esc(item.name||'Archivo')}</button>`).join('')}</div>`;
  }
  async function uploadClientFiles(fileList){
    const files=[...fileList||[]].slice(0,8);
    if(!files.length)return [];
    if(files.some(file=>file.size>6*1024*1024))throw new Error('Cada archivo puede ocupar como maximo 6 MB.');
    const accepted=new Set(['image/jpeg','image/png','image/webp','application/pdf']);
    if(files.some(file=>!accepted.has(file.type)))throw new Error('Solo puedes adjuntar JPG, PNG, WEBP o PDF.');
    return Promise.all(files.map(async file=>{
      const access=await token();
      const prepared=await fetch('/api/client-upload',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${access}`},body:JSON.stringify({action:'signed-upload',portalId:state.portalId,name:file.name,mime:file.type,size:file.size})});
      const signed=await prepared.json().catch(()=>({}));
      if(!prepared.ok)throw new Error(signed.error||'No se pudo preparar el archivo.');
      const uploaded=await fetch(signed.uploadUrl,{method:'PUT',headers:{'content-type':file.type},body:file});
      if(!uploaded.ok)throw new Error(`No se pudo subir ${file.name}.`);
      return signed.attachment;
    }));
  }
  async function openAttachment(path){
    const tab=window.open('about:blank','_blank');
    try{
      const access=await token();
      const response=await fetch('/api/client-upload',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${access}`},body:JSON.stringify({action:'signed-url',portalId:state.portalId,path})});
      const output=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(output.error||'No se pudo abrir el archivo.');
      if(tab)tab.location.href=output.url;else window.open(output.url,'_blank','noopener');
    }catch(error){if(tab)tab.close();showToast(error.message);}
  }
  function restaurantPage(){
    const restaurant=state.data.restaurant;
    return `${pageHeading('Mi restaurante','Los datos de contacto que aparecen en tu ficha.')}<section class="cp-card"><form class="cp-form" id="clientRestaurantForm"><div class="split"><label>Nombre<input name="name" value="${esc(restaurant.name)}" ${canEdit()?'':'disabled'}></label><label>Email<input type="email" name="email" value="${esc(restaurant.email)}" ${canEdit()?'':'disabled'}></label></div><div class="split"><label>Telefono<input name="phone" value="${esc(restaurant.phone)}" ${canEdit()?'':'disabled'}></label><label>Ciudad<input name="city" value="${esc(restaurant.city)}" ${canEdit()?'':'disabled'}></label></div><label>Direccion<input name="address" value="${esc(restaurant.address)}" ${canEdit()?'':'disabled'}></label><label>Horario de apertura<textarea name="openingHours" ${canEdit()?'':'disabled'} placeholder="Ej. Lunes a viernes de 13:00 a 16:00 y de 20:00 a 23:30">${esc(restaurant.openingHours||'')}</textarea></label><label>Redes sociales<textarea name="socialLinks" ${canEdit()?'':'disabled'} placeholder="Instagram, Facebook, TikTok o enlaces de redes">${esc(restaurant.socialLinks||'')}</textarea></label><label>URL publica de tu web<input value="${esc(restaurant.publicUrl)}" disabled><small class="cp-url">Esta direccion solo la gestiona el equipo de mantenimiento.</small></label>${canEdit()?'<div class="cp-actions"><button class="cp-primary">Guardar cambios</button></div>':''}</form></section>`;
  }
  async function openRequest(){
    const services=(state.data.services||[]).filter(item=>item.status==='active');
    if(!services.length){showToast('No tienes servicios activos para solicitar un cambio.');return;}
    state.pendingFiles=[];
    modal('Solicitar un cambio',`<form class="cp-form" id="clientRequestForm"><label>Servicio<select name="serviceId">${services.map(item=>`<option value="${item.id}">${esc(item.name)}</option>`).join('')}</select></label><label>Nombre del cambio<input name="title" required maxlength="180" placeholder="Ej. Actualizar los platos de la carta"></label><label>Explica lo que necesitas<textarea name="description" required maxlength="8000" placeholder="Incluye los textos, precios, enlaces o fotos necesarios."></textarea></label><label>Fotos o PDF (opcional)<input name="attachments" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple><small>Hasta 8 archivos, maximo 6 MB por archivo.</small></label><div class="cp-actions"><button type="button" class="cp-secondary" data-cp-action="close-modal">Cancelar</button><button class="cp-primary">Analizar cambio</button></div></form>`);
  }
  async function analyze(form){
    const data=Object.fromEntries(new FormData(form));
    state.pendingFiles=[...form.querySelector('[name="attachments"]')?.files||[]];
    const button=form.querySelector('button.cp-primary');button.disabled=true;button.textContent='Analizando...';
    try{
      const response=await fetch('/api/classify-change',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${await token()}`},body:JSON.stringify({workspaceId:state.data.portal.workspaceId,restaurantId:state.data.portal.restaurantId,serviceId:data.serviceId,title:data.title})});
      const output=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(output.error||'No se pudo analizar.');
      const choices=output.analysis.choices||[];
      modal('Elige como usar tus cambios',`<form class="cp-form" id="clientRequestConfirmForm" data-service="${esc(data.serviceId)}" data-title="${esc(data.title)}" data-description="${esc(data.description)}"><p>${esc(output.analysis.summary)}</p><p>${esc(output.analysis.explanation)}</p>${output.analysis.quoteRequired?'<div class="cp-banner">Esta solicitud puede requerir presupuesto. Puedes enviarla para que el equipo la revise.</div>':''}<div class="cp-list">${choices.map((choice,index)=>`<label class="cp-choice"><input type="radio" name="choice" value="${index}" ${index===0?'checked':''}><strong>${esc(choice.label)}</strong><small>${esc(choice.explanation)} - ${choice.allocations.map(item=>`${item.quantity} ${item.type}`).join(', ')||'Presupuesto aparte'}</small></label>`).join('')}</div><input type="hidden" name="analysis" value="${esc(JSON.stringify(output.analysis))}"><input type="hidden" name="choices" value="${esc(JSON.stringify(choices))}"><div class="cp-actions"><button type="button" class="cp-secondary" data-cp-action="close-modal">Cancelar</button><button class="cp-primary">Enviar solicitud</button></div></form>`);
    }catch(error){showToast(error.message);}finally{button.disabled=false;button.textContent='Analizar cambio';}
  }
  async function submitRequest(form){
    const fields=new FormData(form),choices=JSON.parse(fields.get('choices')||'[]'),selection=choices[Number(fields.get('choice')||0)]||{};
    const button=form.querySelector('button.cp-primary');button.disabled=true;button.textContent='Enviando...';
    try{
      const attachments=await uploadClientFiles(state.pendingFiles||[]);
      await api('create-request',{portalId:state.portalId,serviceId:form.dataset.service,title:form.dataset.title,description:form.dataset.description,allocations:selection.allocations||[],proposedAllocations:choices,analysis:JSON.parse(fields.get('analysis')||'{}'),attachments});
      closeModal();await bootstrap(state.portalId);state.view='solicitudes';render();showToast('Solicitud enviada al equipo de mantenimiento.');
    }catch(error){showToast(error.message);}finally{button.disabled=false;button.textContent='Enviar solicitud';}
  }
  async function openRequestDetail(id){
    const request=(state.data.requests||[]).find(item=>item.id===id);if(!request)return;
    let messages=[];try{messages=(await api('messages',{portalId:state.portalId,requestId:id},'GET')).messages||[];}catch{}
    modal(request.title,`<div class="cp-list"><p>${esc(request.description)}</p>${attachmentsMarkup(request.attachments)}<div>${pill(request.status)}</div></div><div class="cp-chat" style="margin-top:18px">${messages.map(message=>`<div class="cp-message ${message.side}">${esc(message.body)}${attachmentsMarkup(message.attachments)}<small>${message.side==='restaurant'?'Restaurante':'Equipo de mantenimiento'} - ${formatDate(message.createdAt)}</small></div>`).join('')||'<p class="cp-empty">Todavia no hay mensajes.</p>'}</div><form class="cp-form" id="clientMessageForm" data-request="${id}" style="margin-top:14px"><label>Escribe un mensaje<textarea name="message" required></textarea></label><label>Fotos o PDF (opcional)<input name="attachments" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple></label><div class="cp-actions"><button class="cp-primary">Enviar mensaje</button>${canEdit()&&!['completed','rejected','cancelled'].includes(request.status)?`<button type="button" class="cp-danger" data-cp-action="cancel-request" data-id="${id}">Cancelar solicitud</button>`:''}</div></form>`);
  }
  async function sendMessage(form){
    const button=form.querySelector('button.cp-primary');button.disabled=true;button.textContent='Enviando...';
    try{const attachments=await uploadClientFiles(form.querySelector('[name="attachments"]')?.files||[]);await api('send-message',{portalId:state.portalId,requestId:form.dataset.request,message:new FormData(form).get('message'),attachments});closeModal();await bootstrap(state.portalId);showToast('Mensaje enviado.');}catch(error){showToast(error.message);}finally{button.disabled=false;button.textContent='Enviar mensaje';}
  }
  function pauseForm(){
    const services=(state.data.services||[]).filter(item=>item.status!=='cancelled');
    if(!services.length){showToast('No hay servicios disponibles para gestionar.');return;}
    modal('Solicitar pausa o baja',`<form class="cp-form" id="clientPauseForm"><label>Servicio<select name="serviceId">${services.map(item=>`<option value="${item.id}">${esc(item.name)}${item.planCode==='menu'?' (solo baja)':''}</option>`).join('')}</select></label><label>Accion<select name="type"><option value="pause">Solicitar pausa (maximo 31 dias)</option><option value="cancel">Solicitar baja</option></select></label><label>Duracion solicitada de la pausa<input name="plannedDays" type="number" min="1" max="31" value="31"><small>Solo se aplica a los planes Presencia, Impulso o Premium. El servicio se reanudara automaticamente al terminar.</small></label><label>Explicacion<textarea name="description" required placeholder="Indica el motivo y la fecha deseada."></textarea></label><div class="cp-modal-actions"><button type="button" class="cp-secondary" data-cp-action="close-modal">Cancelar</button><button class="cp-primary">Enviar solicitud</button></div></form>`);
  }
  function editorReminderKey(){ return `cuotly_editor_reminder_${state.portalId}_${state.user?.id || 'guest'}`; }
  function openEditorReminder(){
    modal('Antes de editar tu web',`<div class="cp-checklist"><p>En LandingSite los cambios se publican desde su propio editor y no consumen cambios de tu mantenimiento.</p><label><input type="checkbox"> He revisado la version movil.</label><label><input type="checkbox"> He comprobado el idioma.</label><label><input type="checkbox"> La informacion que voy a cambiar es correcta.</label></div><div class="cp-modal-actions"><button type="button" class="cp-secondary" data-cp-action="open-web-editor-hide-reminder">No volver a mostrar</button><button type="button" class="cp-primary" data-cp-action="open-web-editor-confirm">Aceptar y abrir editor</button></div>`);
  }
  function openWebGuide(){
    const language=state.webGuideLanguage==='en'?'en':'es';
    const guide=Array.isArray(state.data.webGuide?.[language])?state.data.webGuide[language]:[];
    modal('Guia para editar tu web',`<section class="cp-guide-toolbar"><div><p>Repasa el proceso antes de abrir LandingSite. Los cambios se publican desde su editor.</p></div><div class="cp-language-toggle"><button class="${language==='es'?'active':''}" data-cp-action="set-web-guide-language" data-language="es">ES</button><button class="${language==='en'?'active':''}" data-cp-action="set-web-guide-language" data-language="en">EN</button></div></section><section class="cp-guide-list">${guide.map(guideItemCard).join('')||'<div class="cp-empty">La guia estara disponible proximamente.</div>'}</section>`);
  }
  async function launchWebEditor(){
    const tab=window.open('about:blank','_blank');
    if(tab) tab.opener=null;
    try{
      const result=await api('open-web-editor',{portalId:state.portalId});
      if(tab) tab.location.href=result.url;
      else window.open(result.url,'_blank','noopener');
      closeModal();
    }catch(error){ if(tab) tab.close(); showToast(error.message); }
  }
  async function requestEditorAccess(){
    if(!canEdit()){showToast('Pide al propietario del restaurante que solicite el acceso.');return;}
    try{await api('request-editor-access',{portalId:state.portalId});await bootstrap(state.portalId);showToast('Solicitud enviada al mantenimiento.');}catch(error){showToast(error.message);}
  }
  function openWebHelp(){
    if(!canEdit()){showToast('Solo el propietario o un administrador del restaurante puede solicitar ayuda.');return;}
    const services=(state.data.services||[]).filter(item=>item.status==='active');
    if(!services.length){showToast('No hay servicios activos para abrir una solicitud.');return;}
    state.pendingFiles=[];
    modal('Solicitar ayuda con mi web',`<form class="cp-form" id="webHelpForm"><p>Tu mensaje abrira una conversacion con el equipo de mantenimiento y no consumira cambios hasta que el equipo valore la solicitud.</p><label>Servicio<select name="serviceId">${services.map(item=>`<option value="${item.id}">${esc(item.name)}</option>`).join('')}</select></label><label>Asunto<input name="title" required maxlength="120" placeholder="Ej. Necesito ayuda con la carta"></label><label>Explica lo que necesitas<textarea name="description" required maxlength="8000" placeholder="Indica donde esta el problema y que te gustaria conseguir."></textarea></label><label>Captura o PDF (opcional)<input name="attachments" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple><small>Hasta 8 archivos, maximo 6 MB por archivo.</small></label><div class="cp-modal-actions"><button type="button" class="cp-secondary" data-cp-action="close-modal">Cancelar</button><button class="cp-primary">Enviar al mantenimiento</button></div></form>`);
  }
  async function submitWebHelp(form){
    const data=new FormData(form),button=form.querySelector('button.cp-primary');button.disabled=true;button.textContent='Enviando...';
    try{
      const attachments=await uploadClientFiles(form.querySelector('[name="attachments"]')?.files||[]);
      await api('create-request',{portalId:state.portalId,serviceId:data.get('serviceId'),title:`Ayuda con Editar mi web: ${data.get('title')}`,description:data.get('description'),kind:'incident',allocations:[],proposedAllocations:[],analysis:{source:'web_editor'},attachments});
      closeModal();await bootstrap(state.portalId);state.view='solicitudes';render();showToast('Tu ayuda se ha enviado al mantenimiento.');
    }catch(error){showToast(error.message);}finally{button.disabled=false;button.textContent='Enviar al mantenimiento';}
  }
  function guideFields(language,label){
    const items=state.data.webGuide?.[language]||[];
    return `<section class="cp-guide-editor-group"><h3>${label}</h3>${items.map((item,index)=>`<details ${index===0?'open':''}><summary>Paso ${index+1}: ${esc(item.title)}</summary><div class="cp-form cp-guide-editor-fields"><label>Titulo<input name="${language}_title_${index}" maxlength="160" value="${esc(item.title)}"></label><label>Explicacion<textarea name="${language}_body_${index}" maxlength="1800">${esc(item.body)}</textarea></label><label>URL de captura (opcional)<input name="${language}_image_${index}" type="url" value="${esc(item.imageUrl||'')}" placeholder="https://..."></label><label>URL de video (opcional)<input name="${language}_video_${index}" type="url" value="${esc(item.videoUrl||'')}" placeholder="https://..."></label></div></details>`).join('')}</section>`;
  }
  function openWebGuideEditor(){
    if(!canManageWebGuide()){showToast('Solo el propietario de mantenimiento puede editar la guia.');return;}
    modal('Editar guia de Mi web',`<form class="cp-form" id="webGuideForm"><p>Esta guia se muestra a los restaurantes de este espacio. Puedes anadir enlaces a capturas y videos ya publicados.</p>${guideFields('es','Espanol')}${guideFields('en','English')}<div class="cp-modal-actions"><button type="button" class="cp-secondary" data-cp-action="close-modal">Cancelar</button><button class="cp-primary">Guardar guia</button></div></form>`);
  }
  async function saveWebGuide(form){
    const data=new FormData(form);
    const language=key=>(state.data.webGuide?.[key]||[]).map((item,index)=>({title:data.get(`${key}_title_${index}`),body:data.get(`${key}_body_${index}`),imageUrl:data.get(`${key}_image_${index}`),videoUrl:data.get(`${key}_video_${index}`)}));
    try{await api('update-web-guide',{portalId:state.portalId,guide:{es:language('es'),en:language('en')}});closeModal();await bootstrap(state.portalId);state.view='web';render();showToast('Guia actualizada.');}catch(error){showToast(error.message);}
  }
  async function action(event){
    const target=event.target.closest('[data-cp-action],[data-cp-view]');if(!target)return;
    const view=target.dataset.cpView;if(view){state.view=view;state.mobileMenu=false;render();return;}
    const name=target.dataset.cpAction;
    if(name==='toggle-mobile-menu'){state.mobileMenu=!state.mobileMenu;render();return;}
    if(name==='close-mobile-menu'){state.mobileMenu=false;render();return;}
    if(name==='return-to-maintenance')return returnToMaintenance();if(name==='logout')return logout();if(name==='close-modal')return closeModal();if(name==='open-request')return openRequest();if(name==='open-request-detail')return openRequestDetail(target.dataset.id);if(name==='open-attachment')return openAttachment(target.dataset.path);if(name==='open-client-invite')return inviteForm();if(name==='open-member-edit')return memberForm(target.dataset.id);if(name==='open-pause')return pauseForm();
    if(name==='set-web-guide-language'){state.webGuideLanguage=target.dataset.language==='en'?'en':'es';localStorage.setItem('cuotly_web_guide_language',state.webGuideLanguage);if(document.querySelector('#clientModal .cp-guide-list'))return openWebGuide();render();return;}
    if(name==='open-web-guide')return openWebGuide();
    if(name==='open-web-guide-editor')return openWebGuideEditor();
    if(name==='open-web-help')return openWebHelp();
    if(name==='set-web-section'){
      state.webSection=target.dataset.section==='performance'?'performance':'editor';
      render();
      if(state.webSection==='performance') await loadPortalAnalytics();
      return;
    }
    if(name==='analytics-period'){
      state.analyticsPeriod=target.dataset.period||'monthly';
      await loadPortalAnalytics(true);
      return;
    }
    if(name==='analytics-refresh') return loadPortalAnalytics(true);
    if(name==='request-editor-access')return requestEditorAccess();
    if(name==='open-public-web'){
      const url=state.data.restaurant?.publicUrl;
      if(url) window.open(url,'_blank','noopener');
      else showToast('La web publica todavia no esta configurada.');
      return;
    }
    if(name==='open-web-editor'){
      if(!canOpenWebEditor()){showToast('No tienes permiso para abrir el editor.');return;}
      if(!state.data.portal?.editorAvailable)return requestEditorAccess();
      if(localStorage.getItem(editorReminderKey())==='hidden')return launchWebEditor();
      return openEditorReminder();
    }
    if(name==='open-web-editor-confirm')return launchWebEditor();
    if(name==='open-web-editor-hide-reminder'){localStorage.setItem(editorReminderKey(),'hidden');return launchWebEditor();}
    if(name==='open-extra-package'){
      try{await api('request-extra-package',{portalId:state.portalId,title:'Solicitud de paquete adicional',description:'El restaurante quiere solicitar un paquete adicional de cambios.'});showToast('Solicitud registrada. Se abrira WhatsApp para concretarla.');location.href='https://wa.me/34674248322?text='+encodeURIComponent(`Hola, soy ${state.data.restaurant.name} y quiero solicitar un paquete adicional de cambios.`);}catch(error){showToast(error.message);}return;
    }
    if(name==='communicate-payment')return communicatePayment();if(name==='open-profile'){state.view='perfil';state.mobileMenu=false;render();return;}if(name==='switch-portal'){const url=new URL(location.href);url.searchParams.set('clientPortal',target.dataset.id);url.searchParams.delete('clientInvite');location.href=url.toString();return;}
    if(name==='cancel-request'){
      if(!confirm('Cancelar esta solicitud? Si el equipo ya la ha empezado, los cambios se consumiran.'))return;
      try{await api('cancel-request',{portalId:state.portalId,requestId:target.dataset.id});closeModal();await bootstrap(state.portalId);showToast('Solicitud cancelada.');}catch(error){showToast(error.message);}
    }
  }
  async function submit(event){
    const form=event.target;if(!(form instanceof HTMLFormElement))return;event.preventDefault();
    if(form.id==='clientRequestForm')return analyze(form);if(form.id==='clientRequestConfirmForm')return submitRequest(form);if(form.id==='clientMessageForm')return sendMessage(form);
    if(form.id==='webHelpForm')return submitWebHelp(form);
    if(form.id==='webGuideForm')return saveWebGuide(form);
    if(form.id==='clientRestaurantForm'){try{await api('update-restaurant-profile',{portalId:state.portalId,profile:Object.fromEntries(new FormData(form))});await bootstrap(state.portalId);showToast('Ficha actualizada.');}catch(error){showToast(error.message);}return;}
    if(form.id==='clientInviteForm'){try{const data=new FormData(form);await api('invite-client',{portalId:state.portalId,email:data.get('email'),role:data.get('role')});closeModal();showToast('Invitacion enviada.');}catch(error){showToast(error.message);}return;}
    if(form.id==='clientMemberForm'){try{const data=new FormData(form);await api('update-client-member',{portalId:state.portalId,memberId:form.dataset.id,role:data.get('role'),active:data.get('active')==='on'});closeModal();await bootstrap(state.portalId);showToast('Acceso actualizado.');}catch(error){showToast(error.message);}return;}
    if(form.id==='clientPauseForm'){const data=new FormData(form);try{await api(data.get('type')==='pause'?'request-service-pause':'request-cancellation',{portalId:state.portalId,serviceId:data.get('serviceId'),plannedDays:data.get('plannedDays'),title:data.get('type')==='pause'?'Solicitud de pausa':'Solicitud de baja',description:data.get('description')});closeModal();await bootstrap(state.portalId);showToast('Solicitud enviada.');}catch(error){showToast(error.message);}return;}
    if(form.id==='clientProfileForm')return profileSave(form);
  }
  function handleClientKeydown(event){
    if(event.key==='Escape'&&state.mobileMenu){
      state.mobileMenu=false;
      render();
    }
  }
  document.removeEventListener('keydown',handleClientKeydown);
  document.addEventListener('keydown',handleClientKeydown);
  const originalClientPanelStart = window.CuotlyClientPortal.start;
  window.CuotlyClientPortal.requested = clientPanelRequested;
  window.CuotlyClientPortal.start = async context => {
    const invite = pendingClientInvite();
    if (invite && !query().has('clientInvite')) {
      const url = new URL(location.href);
      url.searchParams.set('clientInvite', invite);
      url.searchParams.set('clientOnly', '1');
      history.replaceState({}, '', url);
    }
    const result = await originalClientPanelStart(context);
    if (query().has('clientPortal')) localStorage.removeItem(pendingClientInviteKey);
    return result;
  };
})();

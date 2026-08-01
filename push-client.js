(function () {
  const authHeaders = token => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' });
  function toUint8Array(value) {
    const padding = '='.repeat((4 - (value.length % 4)) % 4);
    const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
  }
  async function registration() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') throw new Error('Instala Quotly desde una dirección HTTPS para activar avisos.');
    await navigator.serviceWorker.register('sw.js');
    return navigator.serviceWorker.ready;
  }
  async function subscribe(token, preferences = {}) {
    if (!('Notification' in window) || !('PushManager' in window)) throw new Error('Este navegador no admite avisos push.');
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('No se ha concedido permiso para mostrar avisos.');
    const reg = await registration();
    const keyResponse = await fetch('/api/push-subscription?action=public-key', { headers: { authorization: `Bearer ${token}` } });
    const keyResult = await keyResponse.json().catch(() => ({}));
    if (!keyResponse.ok || !keyResult.publicKey) throw new Error(keyResult.error || 'Faltan las claves de avisos en Vercel.');
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8Array(keyResult.publicKey) });
    const response = await fetch('/api/push-subscription?action=subscribe', { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ subscription: subscription.toJSON(), preferences }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'No se pudo registrar este móvil.');
    return subscription;
  }
  async function unsubscribe(token) {
    const reg = await registration();
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return;
    await fetch('/api/push-subscription?action=unsubscribe', { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ endpoint: subscription.endpoint }) });
    await subscription.unsubscribe();
  }
  async function test(token) {
    const response = await fetch('/api/push-subscription?action=test', { method: 'POST', headers: authHeaders(token), body: '{}' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'No se pudo enviar el aviso de prueba.');
    return result;
  }
  window.CuotlyPush = { subscribe, unsubscribe, test };
}());

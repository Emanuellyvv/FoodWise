/* ==========================================================================
   FOODWISE — SERVICE WORKER (sw.js)
   Permite notificações do sistema e a instalação como aplicativo.
   Não guarda arquivos em cache (o site sempre carrega a versão mais nova).
   ========================================================================== */

// Ativa o service worker assim que ele é instalado
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()));

// Necessário para o navegador considerar o site instalável (não altera nada)
self.addEventListener('fetch', () => {});

// Ao clicar na notificação, abre a página de acompanhamento
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      if (janelas.length > 0) return janelas[0].focus();
      return self.clients.openWindow('acompanharpedido.html');
    })
  );
});

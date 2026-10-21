/* Gerado por src-app/build-web.py. Na instalação, busca cada arquivo no servidor (cache:'reload'): o cache comum do navegador traria a versão anterior. Versão do app: 0.9.9 (piloto 14) */
const CACHE = 'funat-campo-2fac797db444';
const ARQUIVOS = ["./", "app.css", "app.js", "apple-touch-icon.png", "capacitor.js", "compartilhado.js", "config.js", "exif.js", "geo.js", "icone-192.png", "icone-512.png", "icone-mascara-512.png", "index.html", "itinerario.js", "leaflet.css", "leaflet.js", "manifest.webmanifest", "modelo.js", "plataforma.js", "rota.js"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
/* Sem internet o app TEM de abrir: qualquer abertura de página (ícone, recarregar, endereço com ?…) cai no index guardado.
   Pedido "do servidor" (forçar atualização) tenta a rede e, sem sinal, usa o guardado. */
const guardado = req => caches.match(req, {ignoreSearch: true}).then(r => r || (req.mode === 'navigate' ? caches.match('./') : undefined));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;   // planilha e mapas: sempre pela rede
  if (u.pathname.endsWith('/versao.json')) return;                                 // a conferência de versão nunca vem do cache
  if (e.request.cache === 'reload' || e.request.cache === 'no-store') {
    e.respondWith(fetch(e.request).catch(() => guardado(e.request).then(r => r || Response.error())));
    return;
  }
  e.respondWith(guardado(e.request).then(r => r || fetch(e.request)));
});

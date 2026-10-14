/* Gerado por src-app/build-web.py. Na instalação, busca cada arquivo no servidor (cache:'reload'): o cache comum do navegador traria a versão anterior. Versão do app: 0.9.6 (piloto 11) */
const CACHE = 'funat-campo-6a10629f00ad';
const ARQUIVOS = ["./", "app.css", "app.js", "apple-touch-icon.png", "capacitor.js", "compartilhado.js", "config.js", "exif.js", "geo.js", "icone-192.png", "icone-512.png", "icone-mascara-512.png", "index.html", "itinerario.js", "leaflet.css", "leaflet.js", "manifest.webmanifest", "modelo.js", "plataforma.js", "rota.js"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;   // planilha e mapas: sempre pela rede
  if (u.pathname.endsWith('/versao.json')) return;                                 // a conferência de versão nunca vem do cache
  if (e.request.cache === 'reload' || e.request.cache === 'no-store') return;      // quem pede "do servidor" recebe do servidor
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request)));
});

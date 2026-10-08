/* Gerado por src-app/build-web.py. Na instalação, busca cada arquivo no servidor (cache:'reload'): o cache comum do navegador traria a versão anterior. Versão do app: 0.6.3 (piloto 4) */
const CACHE = 'funat-campo-fe02660er1';
const ARQUIVOS = ["./", "app.css", "app.js", "apple-touch-icon.png", "capacitor.js", "compartilhado.js", "config.js", "exif.js", "geo.js", "icone-192.png", "icone-512.png", "icone-mascara-512.png", "index.html", "manifest.webmanifest", "modelo.js", "plataforma.js"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;   // planilha e mapas: sempre pela rede
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request)));
});

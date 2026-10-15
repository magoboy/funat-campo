/* ===== App de campo — acesso ao aparelho (câmera, GPS, arquivos, compartilhar) =====
   No celular usa os plugins nativos do Capacitor. No navegador do computador (para testar as telas)
   cai em substitutos: <input type=file>, navigator.geolocation e localStorage.
   Tudo fica na memória interna do app: nada sai do aparelho nesta versão. */

const CAP = window.Capacitor;
const NATIVO = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
const IS_IOS = NATIVO && !!(CAP.getPlatform && CAP.getPlatform() === 'ios');
/* Versão web (iPhone sem App Store): o mesmo app, aberto no Safari e instalado na tela inicial.
   Dados no IndexedDB do aparelho; sem acesso à pasta da rede (o envio é "Salvar em Arquivos"). */
const MODO_WEB = !NATIVO && typeof CONFIG_APP!=='undefined' && CONFIG_APP.modo==='web';
const APPLE_WEB = MODO_WEB && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1));
const P = NATIVO ? {
 Camera: CAP.registerPlugin('Camera'), Geolocation: CAP.registerPlugin('Geolocation'), Filesystem: CAP.registerPlugin('Filesystem'),
 Share: CAP.registerPlugin('Share'), App: CAP.registerPlugin('App'), AppLauncher: CAP.registerPlugin('AppLauncher')
} : {};
const DIR = 'DATA';

function blobParaDataUrl(b){ return new Promise((res, rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=()=>rej(r.error); r.readAsDataURL(b); }); }
function soBase64(dataUrl){ const i=String(dataUrl).indexOf(','); return i>=0? dataUrl.slice(i+1) : dataUrl; }

/* Reduz a foto (lado maior maxPx) respeitando a orientação; devolve {data, w, h} em JPEG */
async function reduzirFoto(blob, maxPx){
 maxPx=maxPx||1600;
 let fonte=null;
 try{ fonte=await createImageBitmap(blob, {imageOrientation:'from-image'}); }catch(e){}
 if(!fonte){ fonte=await new Promise((res, rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=rej; im.src=URL.createObjectURL(blob); }); }
 let w=fonte.width, h=fonte.height; const k=Math.min(1, maxPx/Math.max(w,h)); w=Math.round(w*k); h=Math.round(h*k);
 const cv=document.createElement('canvas'); cv.width=w; cv.height=h; cv.getContext('2d').drawImage(fonte, 0, 0, w, h);
 if(fonte.close) fonte.close();
 return {data:cv.toDataURL('image/jpeg', 0.82), w:w, h:h};
}
/* Gira 90° no sentido horário */
function girarDataUrl(dataUrl){
 return new Promise((res, rej)=>{ const im=new Image(); im.onload=()=>{ const cv=document.createElement('canvas'); cv.width=im.height; cv.height=im.width;
  const cx=cv.getContext('2d'); cx.translate(cv.width/2, cv.height/2); cx.rotate(Math.PI/2); cx.drawImage(im, -im.width/2, -im.height/2);
  res({data:cv.toDataURL('image/jpeg', 0.82), w:cv.width, h:cv.height}); }; im.onerror=rej; im.src=dataUrl; });
}

/* ---------- arquivos ---------- */
const Arquivos = NATIVO ? {
 async listar(pasta){ try{ const r=await P.Filesystem.readdir({path:pasta, directory:DIR}); return r.files.map(f=>typeof f==='string'? f : f.name); }catch(e){ return []; } },
 async lerTexto(cam){ const r=await P.Filesystem.readFile({path:cam, directory:DIR, encoding:'utf8'}); return r.data; },
 async gravarTexto(cam, txt){ await P.Filesystem.writeFile({path:cam, directory:DIR, data:txt, encoding:'utf8', recursive:true}); },
 async gravarBase64(cam, b64){ await P.Filesystem.writeFile({path:cam, directory:DIR, data:b64, recursive:true}); },
 async lerBase64(cam){ const r=await P.Filesystem.readFile({path:cam, directory:DIR}); return r.data; },
 async apagar(cam){ try{ await P.Filesystem.deleteFile({path:cam, directory:DIR}); }catch(e){} },
 async apagarPasta(cam){ try{ await P.Filesystem.rmdir({path:cam, directory:DIR, recursive:true}); }catch(e){} },
 async url(cam){ const r=await P.Filesystem.getUri({path:cam, directory:DIR}); return CAP.convertFileSrc(r.uri); }
} : MODO_WEB ? (()=>{
 /* versão web: IndexedDB (cabe foto; o localStorage não) – uma "tabela" chave → texto */
 let banco=null;
 const abrir=()=>banco||(banco=new Promise((res, rej)=>{ const r=indexedDB.open('funat-campo', 1); r.onupgradeneeded=()=>r.result.createObjectStore('arquivos'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }));
 const op=async(modo, fn)=>{ const db=await abrir(); return await new Promise((res, rej)=>{ const t=db.transaction('arquivos', modo), st=t.objectStore('arquivos'); let out; const q=fn(st); if(q) q.onsuccess=()=>{ out=q.result; }; t.oncomplete=()=>res(out); t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error||new Error('armazenamento cheio')); }); };
 const ler=async c=>{ const v=await op('readonly', st=>st.get(c)); if(v===undefined) throw new Error('não existe'); return v; };
 return {
  async listar(pasta){ const p=pasta.replace(/\/?$/,'/'); const ks=await op('readonly', st=>st.getAllKeys()); return (ks||[]).filter(k=>k.startsWith(p) && k.slice(p.length).indexOf('/')<0).map(k=>k.slice(p.length)); },
  lerTexto:ler, lerBase64:ler,
  async gravarTexto(c, t){ await op('readwrite', st=>st.put(t, c)); },
  async gravarBase64(c, b){ await op('readwrite', st=>st.put(b, c)); },
  async apagar(c){ try{ await op('readwrite', st=>st.delete(c)); }catch(e){} },
  async apagarPasta(c){ const p=c.replace(/\/?$/,'/'); const ks=await op('readonly', st=>st.getAllKeys()); await op('readwrite', st=>{ (ks||[]).filter(k=>k.startsWith(p)).forEach(k=>st.delete(k)); }); },
  async url(c){ try{ return 'data:image/jpeg;base64,'+await ler(c); }catch(e){ return ''; } }
 };
})() : {
 /* navegador: localStorage, com prefixo, só para testar as telas */
 _k:c=>'funat-campo:'+c,
 async listar(pasta){ const p='funat-campo:'+pasta.replace(/\/?$/,'/'), out=[]; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k.startsWith(p) && k.slice(p.length).indexOf('/')<0) out.push(k.slice(p.length)); } return out; },
 async lerTexto(c){ const t=localStorage.getItem(this._k(c)); if(t===null) throw new Error('não existe'); return t; },
 async gravarTexto(c, t){ localStorage.setItem(this._k(c), t); },
 async gravarBase64(c, b){ localStorage.setItem(this._k(c), b); },
 async lerBase64(c){ const t=localStorage.getItem(this._k(c)); if(t===null) throw new Error('não existe'); return t; },
 async apagar(c){ localStorage.removeItem(this._k(c)); },
 async apagarPasta(c){ const p=this._k(c.replace(/\/?$/,'/')); Object.keys(localStorage).filter(k=>k.startsWith(p)).forEach(k=>localStorage.removeItem(k)); },
 async url(c){ return 'data:image/jpeg;base64,'+(localStorage.getItem(this._k(c))||''); }
};

/* ---------- câmera e galeria: devolvem Blobs do arquivo original (com EXIF) ---------- */
function escolherArquivosWeb(capturar, varios){
 return new Promise(res=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*'; if(capturar) inp.capture='environment'; if(varios) inp.multiple=true;
  inp.onchange=()=>res(Array.from(inp.files||[])); inp.addEventListener('cancel', ()=>res([])); inp.click(); });
}
async function blobDe(webPath){ const r=await fetch(webPath); return await r.blob(); }
function cancelou(e){ return /cancel|canceled|cancelled|No image|User cancelled/i.test(String(e && (e.message||e))); }

const Aparelho = {
 nativo: NATIVO,
 async tirarFoto(){
  if(!NATIVO) return (await escolherArquivosWeb(true, false))[0]||null;
  try{ const r=await P.Camera.takePhoto({quality:90, correctOrientation:true, saveToGallery:true, includeMetadata:true, editable:'no'});
       return r && r.webPath? await blobDe(r.webPath) : null; }
  catch(e){ if(cancelou(e)) return null; throw e; }
 },
 async daGaleria(){
  if(!NATIVO) return await escolherArquivosWeb(false, true);
  try{ const r=await P.Camera.chooseFromGallery({mediaType:0, allowMultipleSelection:true, limit:20, includeMetadata:true});
       const out=[]; for(const m of (r.results||[])) if(m.webPath) out.push(await blobDe(m.webPath)); return out; }
  catch(e){ if(cancelou(e)) return []; throw e; }
 },
 /* {lat, lon, precisao} ou erro com mensagem em português */
 async posicao(){
  const op={enableHighAccuracy:true, timeout:25000, maximumAge:0};
  if(NATIVO){
   try{ const st=await P.Geolocation.checkPermissions(); if(st.location!=='granted'){ const r=await P.Geolocation.requestPermissions({permissions:['location']}); if(r.location!=='granted') throw new Error('perm'); } }
   catch(e){ throw new Error('O app não tem permissão para usar a localização. Libere em Configurações › Apps › FUNAT Fiscalização › Permissões.'); }
   try{ const p=await P.Geolocation.getCurrentPosition(op); return {lat:p.coords.latitude, lon:p.coords.longitude, precisao:p.coords.accuracy}; }
   catch(e){ throw new Error(/disabled|desativ|location services/i.test(String(e.message))? 'A localização do celular está desligada. Ligue-a na barra de atalhos e tente de novo.' : 'Não foi possível obter a posição agora ('+(e.message||e)+'). Vá para céu aberto e tente de novo.'); }
  }
  if(!navigator.geolocation) throw new Error('Este navegador não informa a posição.');
  /* sem internet o GPS do iPhone demora mais (não tem a ajuda da rede): se a primeira tentativa esgotar o tempo,
     tenta de novo por mais 60 s e aceita uma posição de até 5 minutos atrás */
  const pedir=o=>new Promise((res, rej)=>navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude, lon:p.coords.longitude, precisao:p.coords.accuracy}), rej, o));
  try{ return await pedir(op); }
  catch(e){
   if(e && e.code===1) throw new Error('O site não tem permissão para usar a localização. No iPhone: Ajustes › Privacidade › Serviços de Localização › Safari (ou o app) › Durante o Uso.');
   if(e && e.code===3){ if(typeof ocupado==='function') ocupado('Sem internet o GPS demora mais. Fique em céu aberto…', {gps:true});
    try{ return await pedir({enableHighAccuracy:true, timeout:60000, maximumAge:300000}); }
    catch(e2){ throw new Error('O GPS não achou a posição. Sem internet ele demora mais: vá para céu aberto e tente de novo. Dá para registrar a posição depois; a vistoria não trava.'); } }
   throw new Error('Não foi possível obter a posição ('+((e && e.message)||e)+').');
  }
 },
 /* Grava o texto num arquivo temporário e abre a folha "Compartilhar" do Android */
 async compartilhar(nome, texto, titulo){
  if(!NATIVO){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([texto], {type:'application/json'})); a.download=nome; document.body.appendChild(a); a.click(); a.remove(); return; }
  const cam='exportar/'+nome;
  await P.Filesystem.writeFile({path:cam, directory:'CACHE', data:texto, encoding:'utf8', recursive:true});
  const u=await P.Filesystem.getUri({path:cam, directory:'CACHE'});
  await P.Share.share({title:titulo||nome, files:[u.uri], dialogTitle:'Enviar o arquivo da vistoria'});
 },
 async abrirMapa(lat, lon, rotulo){
  if(IS_IOS || APPLE_WEB){
   const rot = encodeURIComponent(rotulo || 'Vistoria');
   const urlMaps = 'maps://?ll=' + lat + ',' + lon + '&q=' + rot;
   const urlWeb = 'https://maps.apple.com/?ll=' + lat + ',' + lon + '&q=' + rot;
   if(NATIVO){
    try{ await P.AppLauncher.openUrl({url: urlMaps}); return; }catch(e){}
    try{ await P.AppLauncher.openUrl({url: urlWeb}); return; }catch(e){}
   }
   window.open(urlWeb, '_blank');
   return;
  }
  const url='geo:'+lat+','+lon+'?q='+lat+','+lon+'('+encodeURIComponent(rotulo||'Vistoria')+')';
  if(NATIVO){ try{ await P.AppLauncher.openUrl({url:url}); return; }catch(e){} }
  window.open('https://www.google.com/maps?q='+lat+','+lon, '_blank');
 },
 async abrirEndereco(texto){
  if(IS_IOS || APPLE_WEB){
   const q = encodeURIComponent(texto);
   const urlMaps = 'maps://?q=' + q;
   const urlWeb = 'https://maps.apple.com/?q=' + q;
   if(NATIVO){
    try{ await P.AppLauncher.openUrl({url: urlMaps}); return; }catch(e){}
    try{ await P.AppLauncher.openUrl({url: urlWeb}); return; }catch(e){}
   }
   window.open(urlWeb, '_blank');
   return;
  }
  const url='geo:0,0?q='+encodeURIComponent(texto);
  if(NATIVO){ try{ await P.AppLauncher.openUrl({url:url}); return; }catch(e){} }
  window.open('https://www.google.com/maps/search/'+encodeURIComponent(texto), '_blank');
 },
 /* rota do itinerário no Google Maps (app de mapas no celular; navegador no computador) */
 async abrirUrl(url){ if(NATIVO){ try{ await P.AppLauncher.openUrl({url:url}); return; }catch(e){} } window.open(url, '_blank'); },
 async compartilharTexto(titulo, texto){ if(NATIVO){ await P.Share.share({title:titulo, text:texto, dialogTitle:titulo}); return; }
  if(navigator.share){ try{ await navigator.share({title:titulo, text:texto}); return; }catch(e){ if(e && e.name==='AbortError') return; } }
  try{ await navigator.clipboard.writeText(texto); }catch(e){} },
 aoVoltar(cb){ if(NATIVO && !IS_IOS) P.App.addListener('backButton', cb); },
 sair(){
  if(IS_IOS){
   console.warn('[FUNAT] Aparelho.sair() ignorado no iOS (conforme App Store Review Guideline 2.5.8). O encerramento do app é gerenciado pelo sistema operacional.');
   return;
  }
  if(NATIVO) P.App.exitApp();
 }
};

/* ---------- pasta da FUNAT (plugin próprio PastaFunat, SMB) ----------
   No navegador, uma pasta simulada para testar as telas (nada sai do computador). */
const PASTA_BASE = 'FISCALIZAÇÃO\\FISCALIZAÇÃO 2026';
const erroWeb=()=>Object.assign(new Error('Na versão para iPhone o app não acessa a pasta da rede: use "Exportar" e salve na pasta VISTORIAS pelo app Arquivos.'), {code:'WEB'});
const Pasta = MODO_WEB ? new Proxy({}, {get:(_, k)=> k==='configuracao'? async()=>({temSenha:false, web:true}) : async()=>{ throw erroWeb(); }}) : NATIVO ? (()=>{ const pl=CAP.registerPlugin('PastaFunat');
 return {
  configuracao:()=>pl.configuracao(),
  salvar:o=>pl.salvarConfiguracao(o),
  apagar:()=>pl.apagarConfiguracao(),
  testar:caminho=>pl.testar({caminho:caminho||''}),
  listar:async caminho=>(await pl.listar({caminho:caminho||''})).itens,
  existe:async caminho=>(await pl.existe({caminho:caminho})).existe,
  enviar:o=>pl.enviar(o),
  listarJson:async (caminho, prof)=>(await pl.listarJson({caminho:caminho, profundidade:prof===undefined?2:prof})).itens,
  lerVarios:async (base, caminhos)=>(await pl.lerVarios({base:base, caminhos:caminhos})).arquivos,
  lerCompleto:(base, caminho)=>pl.lerCompleto({base:base, caminho:caminho}),
  encaminhar:o=>pl.encaminhar(o),
  /* atualização do app (0.8.0) */
  lerVersao:pasta=>pl.lerVersao({pasta:pasta}),
  baixarAtualizacao:async (o, aoProgresso)=>{ const h=await pl.addListener('progressoAtualizacao', p=>aoProgresso && aoProgresso(p.lidos, p.total));
   try{ return await pl.baixarAtualizacao({pasta:o.pasta, arquivo:o.arquivo, tamanho:String(o.tamanho), sha256:o.sha256}); } finally{ h.remove(); } },
  podeInstalar:async()=>(await pl.podeInstalar()).pode,
  abrirPermissaoInstalar:()=>pl.abrirPermissaoInstalar(),
  instalarAtualizacao:()=>pl.instalarAtualizacao(),
  apagarAtualizacao:()=>pl.apagarAtualizacao()
 }; })() : (()=>{
 const arvore={'FISCALIZAÇÃO':{'FISCALIZAÇÃO 2026':{'DOCUMENTOS PARA REVISÃO - DILMAR':{}, 'Documentos para revisão - FELIS':{}, 'DOCUMENTOS PARA REVISÃO  - MARCELO':{}, 'DOCUMENTOS PARA REVISÃO - TESTE JULIO':{}, 'modelos':{}}}};
 const no=c=>String(c||'').split('\\').filter(Boolean).reduce((a,k)=>a&&a[k], arvore);
 let conf={host:'192.168.31.34', compartilhamento:'funat', usuario:'', dominio:'', temSenha:false, modoTeste:true};
 const erro=(m,c)=>Object.assign(new Error(m),{code:c});
 return {
  configuracao:async()=>Object.assign({}, conf),
  salvar:async o=>{ conf=Object.assign(conf, {host:o.host, compartilhamento:o.compartilhamento, usuario:o.usuario, dominio:o.dominio}); if(o.senha) conf.temSenha=true; },
  apagar:async()=>{ conf.usuario=''; conf.temSenha=false; },
  testar:async c=>{ if(!conf.temSenha) throw erro('O acesso à pasta ainda não foi configurado.','SEM_CONFIG'); return {ok:true, existe:!!no(c)}; },
  listar:async c=>{ const n=no(c); if(!n) throw erro('Pasta não encontrada no servidor.','NAO_ACHOU'); return Object.keys(n).map(k=>({nome:k, pasta:typeof n[k]==='object', tamanho:0})); },
  existe:async c=>{ const p=c.split('\\'), f=p.pop(), n=no(p.join('\\')); return !!(n && n[f]); },
  enviar:async o=>{ const pp=o.destinoPasta.split('\\'); if(pp.length<3 || pp[pp.length-1].toUpperCase()!=='VISTORIAS' || !/^FISCALIZA/i.test(pp[0])) throw erro('Destino recusado: o app só grava na subpasta VISTORIAS de uma pasta dentro de FISCALIZAÇÃO.','DESTINO');
   const p=o.destinoPasta.split('\\'), ult=p.pop(), pai=no(p.join('\\')); if(!pai) throw erro('A pasta escolhida não existe mais no servidor.','NAO_ACHOU');
   pai[ult]=pai[ult]||{}; const cam=o.destinoPasta+'\\'+o.nome, meta=(window.__simArq=window.__simArq||{}), la=pai[ult][o.nome]? (meta[cam]||{id:'', mod:0}) : null;
   /* as mesmas regras do módulo nativo: só grava por cima do mesmo caso; reenvio exige o arquivo lá; data conferida */
   if(o.jaEnviado && !la) throw erro('A vistoria enviada antes não está mais em VISTORIAS. Nada foi gravado.','SUMIU');
   if(la && o.id){ if(la.id && la.id!==o.id) throw erro('Já existe na pasta um arquivo de OUTRO caso com o nome '+o.nome+'.','EXISTE'); if(Number(o.modificado)>0 && la.mod!==Number(o.modificado)) throw erro('O arquivo desta vistoria na pasta foi alterado no computador depois do envio.','MUDOU'); }
   const mod=Date.now(); pai[ult][o.nome]='arquivo'; meta[cam]={id:o.id||'', mod:mod}; return {caminho:o.destinoPasta+'\\'+o.nome, tamanho:1, em:mod, modificado:mod}; },
  /* documentos simulados: os exemplos de "04 - Testes e Exemplos/_teste" e um devolvido montado aqui */
  listarJson:async ()=>[{caminho:'Atend. 1234 - 18-09-2026.json', modificado:Date.now()-864e5*3, tamanho:2802},
   {caminho:'APROVADOS\\Relatorio_Fiscalizacao.json', modificado:Date.now()-864e5, tamanho:6722}, {caminho:'DEVOLVIDOS\\Atend. 999-2026.json', modificado:Date.now()-36e5, tamanho:900}],
  lerVarios:async (base, caminhos)=>Promise.all(caminhos.map(async c=>{
   if(/999/.test(c)) return {caminho:c, texto:JSON.stringify(docSimulado999())};
   const r=await fetch('/04%20-%20Testes%20e%20Exemplos/_teste/'+encodeURIComponent(c.split('\\').pop())); return {caminho:c, texto:await r.text()}; })),
  lerCompleto:async (base, c)=>({texto:JSON.stringify(docSimulado999()), modificado:1000, tamanho:900}),
  encaminhar:async o=>{ if(o.modificado!==1000) throw erro('O arquivo foi alterado na pasta depois que você abriu a correção.','MUDOU'); window.__encaminhado=o; return {caminho:o.base+'\\'+o.nome, renomeado:false}; },
  /* atualização simulada: no navegador, localStorage['funat-simular-atualizacao']='1' faz aparecer uma versão nova */
  lerVersao:async ()=>{ if(!conf.temSenha) throw erro('O acesso à pasta ainda não foi configurado.','SEM_CONFIG');
   if(localStorage.getItem('funat-simular-atualizacao')!=='1') return {existe:false};
   return {existe:true, texto:JSON.stringify({versao:'9.9.9 (simulada)', codigo:999, arquivo:'FUNAT Fiscalização 9.9.9.apk', tamanho:10515509, sha256:'0'.repeat(64), minimo:Number(localStorage.getItem('funat-simular-minimo')||0), novidades:['Itinerário do dia (simulado)','Atualização automática']})}; },
  baixarAtualizacao:async (o, aoProgresso)=>{ for(let l=0; l<o.tamanho; l+=2e6){ aoProgresso && aoProgresso(l, o.tamanho); await new Promise(r=>setTimeout(r,150)); } aoProgresso && aoProgresso(o.tamanho, o.tamanho); return {caminho:'simulado/atualizacao.apk', tamanho:o.tamanho}; },
  podeInstalar:async()=>localStorage.getItem('funat-simular-permissao')!=='0',
  abrirPermissaoInstalar:async()=>{ localStorage.setItem('funat-simular-permissao','1'); },
  instalarAtualizacao:async()=>{ window.__instalou=true; },
  apagarAtualizacao:async()=>{}
 }; })();
function docSimulado999(){ return {id:'dev999', tipoDocumento:'relatorio_simplificado', infracoes:[{}], elaborador:'Felisberto Oliveira da Silva', fiscal:'Felisberto Oliveira da Silva',
  simp:{expedienteTipo:'Atendimento', expedienteNum:'999/2026', atividade:'Cerâmica Vale do Capivari Ltda.', logradouro:'Rua A', numero:'10', referencia:'', bairro:'Capivari', coordE:'', coordN:'', responsavel:'', doc:'',
   datasVistoria:['2026-10-01'], corpo:'Em atendimento à denúncia, constatou-se a disposição de resíduos.', desfecho:'', fotos:[{legenda:'Vista geral', data:''},{legenda:'', data:''}]},
  revisao:{status:'devolvido', notas:[{id:'n1', campo:'localizacao', rotulo:'Localização', texto:'Falta indicar as coordenadas da área embargada.', autor:'Gabriel', data:new Date(Date.now()-36e5).toISOString(), resolvida:false},
    {id:'n2', campo:'fotos', rotulo:'Fotos', texto:'A foto 2 está sem legenda.', autor:'Gabriel', data:new Date(Date.now()-36e5).toISOString(), resolvida:false}],
   edicoes:[{id:'e1', campo:'narrativa', caminho:'simp.corpo', rotulo:'Narrativa da vistoria', antes:'Em atendimento a denuncia', depois:'Em atendimento à denúncia', autor:'Gabriel', data:new Date(Date.now()-36e5).toISOString(), gravadaEm:new Date().toISOString()}],
   historico:[{acao:'encaminhado para revisão', autor:'Felisberto Oliveira da Silva', papel:'elaborador', data:new Date(Date.now()-864e5*2).toISOString()}, {acao:'devolvido para correção', autor:'Gabriel', papel:'revisor', data:new Date(Date.now()-36e5).toISOString()}]}}; }

/* Grava o texto num arquivo do app e devolve o caminho para o plugin enviar (no navegador, só simula) */
/* No aparelho o arquivo temporário tem nome sem espaços nem acentos (o nome de verdade vai à parte, para a pasta) */
function nomeLocalSeguro(nome){ return String(nome).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9._-]+/g,'_'); }
async function arquivoParaEnvio(nome, texto){
 if(!NATIVO) return 'simulado/'+nome;
 const cam='envio/'+nomeLocalSeguro(nome);
 await P.Filesystem.writeFile({path:cam, directory:DIR, data:texto, encoding:'utf8', recursive:true});
 return (await P.Filesystem.getUri({path:cam, directory:DIR})).uri;
}
async function apagarArquivoDeEnvio(nome){ if(NATIVO){ try{ await P.Filesystem.deleteFile({path:'envio/'+nomeLocalSeguro(nome), directory:DIR}); }catch(e){} } }
function aoVoltarParaOApp(cb){ if(NATIVO) P.App.addListener('resume', cb); else document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) cb(); }); }

/* ---------- demandas da planilha (Apps Script publicado como aplicativo da web) ----------
   No celular o pedido sai pelo plugin nativo de HTTP (segue o redirecionamento do Google, sem CORS).
   A chave fica cifrada no cofre (plugin PastaFunat). No navegador: chave no localStorage e, com a
   URL "simulado", demandas de exemplo. */
/* ---------- rotas pelas ruas (OSRM público, como no RotaFácil) ----------
   Só vão as coordenadas das paradas (nada de protocolo, nome ou assunto). Sem internet, o app usa a linha reta. */
const OSRM='https://router.project-osrm.org';
async function pedirJson(url, ms){
 /* o servidor público do OSRM pede que o programa se identifique */
 if(NATIVO){ const r=await CAP.Plugins.CapacitorHttp.get({url:url, headers:{'User-Agent':'FUNAT-Fiscalizacao/'+(typeof CODIGO_APP!=='undefined'? CODIGO_APP : '')+' (FUNAT Tubarao/SC; app de campo)'}, connectTimeout:ms||15000, readTimeout:ms||20000}); if(r.status!==200) throw new Error('HTTP '+r.status); return typeof r.data==='string'? JSON.parse(r.data) : r.data; }
 const ctl=new AbortController(), t=setTimeout(()=>ctl.abort(), ms||20000);
 try{ const r=await fetch(url, {signal:ctl.signal}); if(!r.ok) throw new Error('HTTP '+r.status); return await r.json(); } finally{ clearTimeout(t); }
}
const Rotas = {
 /* matriz de distâncias (m) e tempos (s) pelas ruas, de todos para todos */
 async matriz(pts){
  const c=pts.map(p=>p.lng.toFixed(6)+','+p.lat.toFixed(6)).join(';');
  const o=await pedirJson(OSRM+'/table/v1/driving/'+c+'?annotations=distance,duration');
  if(o.code!=='Ok' || !o.distances || !o.durations) throw new Error('o serviço de rotas não respondeu');
  const fixa=(m, alt)=>m.map((l,i)=>l.map((v,j)=>v===null||v===undefined? alt[i][j] : v));   /* ponto sem rua por perto: linha reta */
  const reta=matrizLinhaReta(pts);
  return {dist:fixa(o.distances, reta.dist), dur:fixa(o.durations, reta.dur), fonte:'ruas'};
 },
 /* o desenho da rota na ordem escolhida (para o mapa); [[lat,lng],…] */
 async tracado(pts){
  const c=pts.map(p=>p.lng.toFixed(6)+','+p.lat.toFixed(6)).join(';');
  const o=await pedirJson(OSRM+'/route/v1/driving/'+c+'?overview=simplified&geometries=geojson');
  if(o.code!=='Ok' || !o.routes || !o.routes[0]) throw new Error('sem traçado');
  return o.routes[0].geometry.coordinates.map(x=>[+x[1].toFixed(5), +x[0].toFixed(5)]);
 }
};

const Planilha = {
 async chave(){ if(NATIVO){ try{ return (await CAP.registerPlugin('PastaFunat').chavePlanilha()).chave||''; }catch(e){ return ''; } } return localStorage.getItem('funat-campo-chave-planilha')||''; },
 async guardarChave(k){ if(NATIVO) await CAP.registerPlugin('PastaFunat').guardarChavePlanilha({chave:k}); else localStorage.setItem('funat-campo-chave-planilha', k); },
 async buscar(url, chave){
  if(!url) throw Object.assign(new Error('O endereço do script da planilha não está configurado.'), {code:'SEM_CONFIG'});
  if(!chave) throw Object.assign(new Error('Falta a chave da planilha (Meus dados › Demandas da planilha).'), {code:'SEM_CONFIG'});
  if(url==='simulado') return demandasSimuladas(chave);
  const alvo=url+(url.indexOf('?')<0?'?':'&')+'chave='+encodeURIComponent(chave)+'&equipe=1';
  let corpo;
  try{
   if(NATIVO){ const r=await CAP.Plugins.CapacitorHttp.get({url:alvo, connectTimeout:20000, readTimeout:30000}); if(r.status!==200) throw new Error('HTTP '+r.status); corpo=r.data; }
   else { const r=await fetch(alvo, {redirect:'follow'}); if(!r.ok) throw new Error('HTTP '+r.status); corpo=await r.text(); }
  }catch(e){ throw Object.assign(new Error('Sem acesso à internet agora (a lista é atualizada num Wi-Fi com internet, como o da FUNAT).'), {code:'SEM_REDE'}); }
  let o; try{ o=typeof corpo==='string'? JSON.parse(corpo) : corpo; }catch(e){ throw Object.assign(new Error('A planilha respondeu algo inesperado. Confira o endereço do script.'), {code:'RESPOSTA'}); }
  if(o && o.erro==='ocupado') throw Object.assign(new Error(o.mensagem||'A planilha está ocupada. Tente de novo em instantes.'), {code:'OCUPADO'});   // V50: outro celular está sendo atendido
  if(!o || !o.ok) throw Object.assign(new Error(o && o.erro==='chave'? 'Chave recusada pela planilha (errada ou desativada).' : 'Erro no script da planilha: '+((o&&o.mensagem)||'sem detalhes')), {code:o&&o.erro==='chave'?'CHAVE':'SCRIPT'});
  return o;
 }
};
function demandasSimuladas(chave){
 if(!/^[A-Z0-9]{4}(-?[A-Z0-9]{4}){3}$/i.test(chave)) throw Object.assign(new Error('Chave recusada pela planilha (errada ou desativada).'), {code:'CHAVE'});
 const r={ok:true, fiscal:'FELISBERTO', versaoScript:'49.0', geradoEm:new Date().toISOString(), demandas:[
  {linha:411, entrada:'30/01/2026', protocolo:'Memorando 1.998/2026', assunto:'Empreendimento Sem Licença', endereco:'São João ME - Rua João Bristot, 682', repasse:'30/01/2026', diligencias:'', observacoes:'', situacao:'nao_iniciada'},
  {linha:602, entrada:'22/09/2026', protocolo:'Atendimento 1.385/2026', assunto:'Construção em APP', endereco:'Vila Moema', repasse:'24/09/2026', diligencias:'', observacoes:'Denunciante pede retorno', situacao:'nao_iniciada'},
  {linha:640, entrada:'01/10/2026', protocolo:'999/2026', assunto:'Cerâmica Vale do Capivari', endereco:'Capivari de Baixo', repasse:'02/10/2026', diligencias:'Fiscalizado 03/10/2026', observacoes:'', situacao:'pendente_relatorio', situacaoTexto:'Pendente relatório (1Doc)'},
  {linha:590, entrada:'18/09/2026', protocolo:'Atendimento 1234/2026', assunto:'Poda irregular', endereco:'Centro - Rua Lauro Müller, 50', repasse:'18/09/2026', diligencias:'Fiscalizado 18/09/2026', observacoes:'', situacao:'em_analise', situacaoTexto:'Em análise técnica'}]};
 /* script V49: posição de cada endereço, a FUNAT e as demandas dos colegas (só consulta no app) */
 const pos=[[-28.4930,-49.0040],[-28.4990,-49.0225],null,[-28.4795,-49.0110]];
 r.demandas.forEach((d,i)=>{ if(pos[i]) d.posicao={lat:pos[i][0], lng:pos[i][1], precisao:'exata'}; else d.posicao={precisao:'nao_achou'}; });
 r.base={nome:'FUNAT', endereco:'Avenida Marechal Deodoro, 1311, Oficinas, Tubarão - SC, Brasil', posicao:{lat:-28.4846, lng:-49.0203, precisao:'numero'}};
 r.equipe=[
  {linha:650, entrada:'05/10/2026', protocolo:'Atendimento 1.399/2026', assunto:'Descarte irregular de resíduos', endereco:'Rua Coronel Cabral, 412, Centro', fiscal:'MARCELO', repasse:'06/10/2026', diligencias:'', situacao:'nao_iniciada', doColega:true, posicao:{lat:-28.4760, lng:-49.0080, precisao:'exata'}},
  {linha:651, entrada:'07/10/2026', protocolo:'Atendimento 1.412/2026', assunto:'Esgoto a céu aberto', endereco:'Rua Pedro Gomes, 88, Humaitá', fiscal:'MARCELO', repasse:'07/10/2026', diligencias:'', situacao:'nao_iniciada', doColega:true, posicao:{lat:-28.4650, lng:-49.0190, precisao:'numero'}},
  {linha:652, entrada:'08/10/2026', protocolo:'Memorando 31.201/2026', assunto:'Esgoto a céu aberto', endereco:'Rua Exemplo, nº 77, Oficinas', fiscal:'MARCELO', repasse:'08/10/2026', diligencias:'Retornar com a Casan', situacao:'em_andamento', doColega:true, posicao:{lat:-28.4880, lng:-49.0260, precisao:'rua'}},
  {linha:653, entrada:'09/10/2026', protocolo:'Atendimento 1.420/2026', assunto:'Supressão de vegetação', endereco:'Rua Laguna, 310, Oficinas', fiscal:'DILMAR', repasse:'09/10/2026', diligencias:'', situacao:'nao_iniciada', doColega:true, posicao:{lat:-28.4905, lng:-49.0300, precisao:'exata'}},
  {linha:654, entrada:'10/10/2026', protocolo:'Atendimento 1.433/2026', assunto:'Queima de resíduos', endereco:'Estrada Alto Pedrinhas', fiscal:'DILMAR', repasse:'10/10/2026', diligencias:'', situacao:'nao_iniciada', doColega:true, posicao:{precisao:'nao_achou'}}];
 return r;
}

/* Versão web: pede ao navegador para não apagar os dados do app quando faltar espaço */
if(MODO_WEB && navigator.storage && navigator.storage.persist){ navigator.storage.persist().catch(()=>{}); }

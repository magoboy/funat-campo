/* ===== App de campo — telas =====
   Rotas pelo endereço (#inicio, #vistorias, #nova, #v/<id>, #foto/<id>/<n>, #envios, #pronta/<id>, #config).
   Cada vistoria fica em vistorias/<id>.json e as fotos em fotos/<id>/<foto>.jpg, na memória interna do app. */

const VERSAO_APP = '0.9.9 (piloto 14)';
const CODIGO_APP = 23;              // sobe a cada APK: o Android só instala por cima versão com código maior
let VIST = [];                       // vistorias carregadas
let cfg = lerCfg();

function lerCfg(){ try{ return JSON.parse(localStorage.getItem('funat-campo-cfg')||'{}'); }catch(e){ return {}; } }
function gravarCfg(){ try{ localStorage.setItem('funat-campo-cfg', JSON.stringify(cfg)); }catch(e){} }
function esc(s){ return String(s===undefined||s===null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function primeiroNome(n){ return String(n||'').trim().split(/\s+/)[0]||''; }

/* ---------- ícones (traço simples, sem fonte externa) ---------- */
const ICONE = {
 voltar:'<path d="M15 18l-6-6 6-6"/>', fechar:'<path d="M6 6l12 12M18 6L6 18"/>', baixar:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', rota:'<circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="5" r="2.2"/><path d="M8.2 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.8"/>',
 casa:'<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>', lista:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
 camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', enviar:'<path d="M4 12l16-8-6 16-2-7z"/>',
 galeria:'<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="M20 15l-5-5-9 9"/>',
 pino:'<path d="M12 21s-6-5.5-6-11a6 6 0 0112 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
 alvo:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
 relogio:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', mais:'<path d="M12 5v14M5 12h14"/>',
 ok:'<path d="M5 12l5 5 9-10"/>', alerta:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
 lapis:'<path d="M4 20h4L19 9l-4-4L4 16z"/>', girar:'<path d="M20 12a8 8 0 11-3-6.2"/><path d="M20 4v5h-5"/>',
 lixo:'<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>', pessoa:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>',
 mapa:'<path d="M9 4l-5 2v14l5-2 6 2 5-2V4l-5 2z"/><path d="M9 4v14M15 6v14"/>', mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
 onda:'<path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 11v2"/>', busca:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
 arquivo:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>', pasta:'<path d="M3 6h6l2 2h10v11H3z"/>', aparelho:'<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>'
};
function ic(n, cls){ return '<svg class="ic'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" aria-hidden="true">'+(ICONE[n]||'')+'</svg>'; }

/* ---------- armazenamento ---------- */
/* Cada vistoria tem uma cópia de segurança, "<id>.json.novo", gravada ANTES do arquivo principal e apagada depois:
   se o app morrer no meio da gravação (a câmera abre e o Android fecha o app), sempre sobra uma cópia inteira. */
let VIST_ILEGIVEIS=[];
async function carregarVistorias(){
 const todos=await Arquivos.listar('vistorias'), nomes=todos.filter(n=>/\.json$/.test(n)), out=[], quebrados=[];
 const ler=async n=>{ const v=JSON.parse(await Arquivos.lerTexto('vistorias/'+n)); return v && v.id? v : null; };
 for(const n of nomes){
  let v=null; try{ v=await ler(n); }catch(e){}
  if(!v && todos.indexOf(n+'.novo')>=0){ try{ v=await ler(n+'.novo'); if(v) await Arquivos.gravarTexto('vistorias/'+n, JSON.stringify(v)); }catch(e){} }   // o principal ficou pela metade: vale a cópia
  if(v) out.push(v); else quebrados.push(n);
 }
 /* sobrou só a cópia (o app morreu antes de criar o principal) */
 for(const n of todos.filter(x=>/\.json\.novo$/.test(x) && nomes.indexOf(x.slice(0,-5))<0)){ try{ const v=await ler(n); if(v){ out.push(v); await Arquivos.gravarTexto('vistorias/'+n.slice(0,-5), JSON.stringify(v)); } }catch(e){ quebrados.push(n); } }
 VIST=out; VIST_ILEGIVEIS=quebrados;
 if(quebrados.length) setTimeout(()=>aviso(quebrados.length+' vistoria(s) guardada(s) neste aparelho não puderam ser lidas ('+quebrados.join(', ')+'). Não desinstale o app e avise o Julio.', 12000), 1500);
}
async function gravarVistoria(v){
 v.editadaEm=new Date().toISOString(); const txt=JSON.stringify(v), cam='vistorias/'+v.id+'.json';
 await Arquivos.gravarTexto(cam+'.novo', txt); await Arquivos.gravarTexto(cam, txt); await Arquivos.apagar(cam+'.novo');
 if(!VIST.includes(v)) VIST.push(v);
}
let timerGravar=null, vistoriaPendente=null;
function gravarDepois(v){ vistoriaPendente=v; clearTimeout(timerGravar); timerGravar=setTimeout(gravarAgora, 500); }
async function gravarAgora(){ clearTimeout(timerGravar); const v=vistoriaPendente; vistoriaPendente=null; if(v){ try{ await gravarVistoria(v); }catch(e){ aviso('Não foi possível salvar: '+(e.message||e)); } } }
function acharVistoria(id){ return VIST.find(v=>v.id===id)||null; }
function caminhoFoto(v, f){ return 'fotos/'+v.id+'/'+f.arquivo; }
const urlsFoto = {};
async function urlFoto(v, f){ const k=v.id+'/'+f.arquivo+'#'+(f.versao||0); if(!urlsFoto[k]){ const u=await Arquivos.url(caminhoFoto(v,f)); urlsFoto[k]=u+(Aparelho.nativo? '?v='+(f.versao||0) : ''); } return urlsFoto[k]; }
async function preencherImagens(v){ for(const im of $$('img[data-foto]')){ const f=v.fotos.find(x=>x.id===im.dataset.foto); if(f) im.src=await urlFoto(v, f); } }

/* ---------- avisos ---------- */
function aviso(texto, ms){ let t=$('#toast'); if(!t){ t=document.createElement('div'); t.id='toast'; t.setAttribute('role','status'); document.body.appendChild(t); }
 t.textContent=texto; t.classList.add('vis'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('vis'), ms||3200); }
function ocupado(texto, op){ let o=$('#ocupado'); if(texto===false){ if(o) o.remove(); return; } if(!o){ o=document.createElement('div'); o.id='ocupado'; document.body.appendChild(o); } o.innerHTML='<div class="cx">'+(op&&op.gps? '<div class="pulso-gps" aria-hidden="true"></div>' : '<div class="giro"></div>')+'<div>'+esc(texto)+'</div></div>'; }

/* ---------- moldura comum ---------- */
function topo(titulo, opc){ opc=opc||{};
 return '<header class="topo">'+(opc.voltar? '<button class="bt-ic" data-voltar aria-label="Voltar">'+ic('voltar')+'</button>' : '<span class="marca">'+ic('pino')+'</span>')+
  '<div class="tt"><small>FUNAT • TUBARÃO</small><h1>'+esc(titulo)+'</h1></div>'+(opc.direita||'<button class="bt-ic redondo" data-ir="#config" aria-label="Meus dados">'+ic('pessoa')+'</button>')+'</header>'; }
function navInferior(ativo){
 const it=(h, n, r)=>'<a href="'+h+'" class="'+(ativo===h?'at':'')+(h==='#camera'?' cam':'')+'"'+(ativo===h?' aria-current="page"':'')+'>'+ic(n)+'<span>'+r+'</span></a>';
 return '<nav class="nav-inf"><span class="nav-marca" aria-hidden="true">'+ic('pino')+'<b>FUNAT</b><small>TUBARÃO</small></span>'+it('#inicio','casa','Início')+it('#vistorias','lista','Vistorias')+it('#itinerario','rota','Itinerário')+(MODO_WEB? it('#camera','camera','Câmera') : it('#documentos','arquivo','Documentos'))+it('#envios','enviar','Envios')+'</nav>'; }
function faixaTeste(){ return '<div class="faixa">'+ic('aparelho')+'<span>'+(MODO_WEB? 'Salvo neste iPhone. Ao concluir, toque em “Exportar e salvar na pasta” e guarde o arquivo na sua pasta VISTORIAS.' : cfg.pasta? 'Salvo neste aparelho. Ao concluir, vai para a pasta “'+esc(cfg.pasta.nome)+'” quando estiver no Wi-Fi da FUNAT.' : 'Salvo neste aparelho. Configure a pasta da FUNAT em Meus dados para enviar.')+'</span></div>'; }
function tagTipo(t){ const d=TIPOS_DOC[t]||TIPOS_DOC.relatorio; return '<span class="tag t-'+t+'">'+esc(d.curto.toUpperCase())+'</span>'; }

/* ---------- cartões de vistoria ---------- */
function rotuloStatus(v){
 if(v.status==='a_vistoriar') return (ehRetorno(v)? numeroVisita(v)+'ª visita ainda não feita' : 'Ainda não vistoriada')+' · criada '+quandoRelativo(v.criadaEm);
 if(v.status==='em_andamento') return 'Em andamento · '+v.fotos.length+' foto'+(v.fotos.length===1?'':'s')+' · editada '+quandoRelativo(v.editadaEm);
 return v.precisaEnviar? (MODO_WEB||!cfg.pasta? 'Concluída · na fila para enviar' : 'Concluída · na fila para a pasta da FUNAT') : v.enviadaPor==='nuvem'? (v.recebidaEm? 'Concluída · recebida no computador '+quandoRelativo(v.recebidaEm) : 'Concluída · enviada pela internet '+quandoRelativo(v.enviadaEm)) : v.enviadaEm? 'Concluída · enviada para a pasta '+quandoRelativo(v.enviadaEm) : v.exportadaEm? 'Concluída · arquivo exportado '+quandoRelativo(v.exportadaEm) : 'Concluída';
}
function tagVisita(v){ return ehRetorno(v)? '<span class="tag t-visita">'+numeroVisita(v)+'ª VISITA</span>' : ''; }
function cartao(v){
 const local=[v.bairro, v.endereco].filter(Boolean).join(' · ');
 const acao= v.status==='a_vistoriar'? '<button class="bt pri" data-iniciar="'+v.id+'">'+ic('camera')+'Iniciar vistoria</button>'
          : v.status==='em_andamento'? '<button class="bt pri" data-ir="#v/'+v.id+'">'+ic('lapis')+'Continuar</button>'
          : '<button class="bt sec" data-ir="#v/'+v.id+'">Abrir</button><button class="bt claro" data-retorno-v="'+v.id+'">'+ic('girar')+'Voltar ao local</button>';
 const mapa= v.local? '<button class="bt txt" data-mapa="'+v.id+'">'+ic('mapa')+'Ver no mapa</button>' : '';
 return '<article class="cartao st-'+v.status+(selVist==='v:'+v.id?' sel':'')+'" data-sel="v:'+v.id+'"><div class="c-l1">'+tagTipo(v.tipoDocumento)+tagVisita(v)+'<b>'+esc(protocoloTexto(v))+'</b></div>'+
  (v.assunto? '<h3>'+esc(v.assunto)+'</h3>' : '')+(local? '<p class="loc">'+ic('pino')+esc(local)+'</p>' : '')+
  '<p class="st">'+esc(rotuloStatus(v))+'</p><div class="c-ac">'+acao+mapa+'</div></article>'; }
function ordenadas(lista){ return lista.slice().sort((a,b)=>String(b.editadaEm).localeCompare(String(a.editadaEm))); }

/* ======================= TELAS ======================= */
const TELAS = {};

TELAS.config = function(){
 const nomes=['Dilmar Orige Estevão','Felisberto Oliveira da Silva','Marcelo Cardoso'];
 return topo(cfg.nome? 'Meus dados' : 'Bem-vindo', {voltar:!!cfg.nome, direita:'<span></span>'})+
  '<main class="pag com-rodape"><section class="bloco"><h2>Quem usa este aparelho?</h2><p class="ajuda">O nome sai como elaborador nos documentos gerados a partir das vistorias.</p>'+
  '<label class="campo"><span>Seu nome completo</span><input id="cfNome" list="cfNomes" autocomplete="name" value="'+esc(cfg.nome||'')+'"></label>'+
  '<datalist id="cfNomes">'+nomes.map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist></section>'+
  (cfg.nome && MODO_WEB? '<section class="bloco"><h2>Pasta da FUNAT</h2><p class="ajuda">Nesta versão para iPhone, a vistoria vai para a pasta pelo app <b>Arquivos</b>: ao concluir, toque em “Exportar e salvar na pasta”.</p><button class="bt claro largo" data-ir="#arquivos-ajuda">'+ic('pasta')+'Como ligar o app Arquivos à pasta da FUNAT</button></section>' : '')+
  (cfg.nome && !MODO_WEB? '<section class="bloco"><h2>Pasta da FUNAT</h2><p class="ajuda">'+(cfg.pasta? 'Envia para: <b>'+esc(cfg.pasta.nome)+'</b> › VISTORIAS' : 'Ainda não configurada.')+'</p><button class="bt claro largo" data-ir="#pasta">'+ic('enviar')+(cfg.pasta?'Alterar acesso ou pasta':'Configurar acesso à pasta')+'</button></section>' : '')+
  (cfg.nome? '<section class="bloco"><h2>Demandas da planilha</h2><p class="ajuda">'+(cfg.planilhaAtiva? 'Ligado'+(DEMANDAS&&DEMANDAS.fiscal?': demandas de <b>'+esc(DEMANDAS.fiscal)+'</b>':'')+'.' : 'Desligado. Com a chave do seu nome, as demandas que o Pedro distribui para você aparecem em “Para vistoriar”.')+'</p><button class="bt claro largo" data-ir="#planilha">'+ic('lista')+(cfg.planilhaAtiva?'Chave e situação':'Ligar com a minha chave')+'</button></section>' : '')+
  blocoAtualizacaoWeb()+(cfg.nome? blocoSemInternet() : '')+'<section class="bloco"><h2>Sobre esta versão</h2><p class="ajuda">FUNAT Fiscalização '+esc(VERSAO_APP)+(MODO_WEB? '. Versão para iPhone: fotos, posições e anotações ficam neste iPhone até você exportar. Ao concluir, toque em “Exportar e salvar na pasta” e guarde o arquivo na sua pasta VISTORIAS pelo app Arquivos.' : '. Fotos, posições e anotações ficam neste aparelho. Ao concluir uma vistoria, o app a envia para a subpasta VISTORIAS da sua pasta, quando o celular está no Wi-Fi da FUNAT. Ele não grava em nenhum outro lugar da rede.')+'</p>'+
  (!MODO_WEB && cfg.nome? '<p class="ajuda">'+(atualizacaoDisponivel()? '<a href="#atualizar"><b>Nova versão '+esc(cfg.atualizacao.versao)+' disponível.</b></a>' : 'Atualizações: o app confere sozinho a pasta '+esc(PASTA_ATUALIZACAO)+' quando está no Wi-Fi da FUNAT'+(cfg.versaoConferidaEm? ' (última conferência '+esc(quandoRelativo(new Date(cfg.versaoConferidaEm).toISOString()))+')' : '')+'.')+(DEMANDAS && DEMANDAS.versaoScript? ' Script da planilha: versão '+esc(DEMANDAS.versaoScript)+'.' : '')+'</p><button class="bt claro largo" id="cfAtualizar">'+ic('baixar')+'Procurar atualização agora</button>' : '')+'</section>'+
  '<div class="rodape-fixo"><button class="bt pri largo" id="cfOk">'+(cfg.nome? 'Salvar' : 'Começar')+'</button></div></main>';
};
TELAS.config.ligar = function(){ ligarAtualizacaoWeb(); const ca=$('#cfAtualizar'); if(ca) ca.onclick=async()=>{ await conferirAtualizacao({forcar:true}); mostrar(true); };
 $('#cfOk').onclick=()=>{ const n=$('#cfNome').value.trim(); if(n.length<3){ aviso('Escreva o seu nome completo.'); $('#cfNome').focus(); return; } cfg.nome=n; gravarCfg(); location.hash='#inicio'; }; };

/* No início: devolvidos da minha pasta (o que precisa de ação) e um resumo do resto */
function blocoAtencao(){
 if(!cfg.pasta) return ''; const docs=docsDe(cfg.pasta); if(!docs.length) return '';
 const dev=docs.filter(d=>grupoDocumento(d)==='devolvido'), apr=docs.filter(d=>grupoDocumento(d)==='aprovado').length, rev=docs.filter(d=>grupoDocumento(d)==='revisor').length;
 return (dev.length? '<h2 class="secao g-devolvido">'+ic('alerta')+'Precisa da sua atenção <span class="cont">'+dev.length+'</span></h2>'+dev.map(cartaoDoc).join('') : '')+
  ((apr||rev)? '<a class="resumo-docs" href="#documentos">'+ic('arquivo')+'<span>'+[rev? rev+' com o revisor' : '', apr? apr+' aprovado'+(apr>1?'s':'')+' para postar no 1Doc' : ''].filter(Boolean).join(' · ')+'</span>'+ic('voltar','seta-dir')+'</a>' : '');
}
TELAS.inicio = function(){
 const a=ordenadas(VIST.filter(v=>v.status==='a_vistoriar')), e=ordenadas(VIST.filter(v=>v.status==='em_andamento')), c=pendentesEnvio(VIST), dp=demandasParaVistoriar(), limDem=5;
 return topo('Início')+'<main class="pag com-nav"><div class="ola"><div><h2>'+esc(saudacaoCampo())+', '+esc(primeiroNome(cfg.nome))+'</h2><p>'+esc(hojeExtenso())+'</p></div>'+
  chipEnvio()+'</div>'+faixaAtualizacao()+faixaSemInternet()+
  (c.length? '<a class="alerta-envio" href="#envios">'+ic('enviar')+'<span><b>'+c.length+' vistoria'+(c.length>1?'s':'')+' concluída'+(c.length>1?'s':'')+'</b> na fila para a pasta da FUNAT</span></a>' : '')+
  (correcoesComConflito().length? '<a class="alerta-envio conflito" href="#envios">'+ic('alerta')+'<span><b>'+correcoesComConflito().length+' correção(ões)</b> encontraram outra versão na pasta: escolha qual vale</span></a>' : '')+
  '<div class="duas-col inicio"><div class="col-b">'+(typeof cartaoItinerario==='function'? cartaoItinerario() : '')+
  blocoAtencao()+blocoRetornos()+'</div><div class="col-a">'+
  (e.length? '<h2 class="secao">Em andamento <span class="cont">'+e.length+'</span></h2>'+e.map(cartao).join('') : '')+
  '<h2 class="secao">Para vistoriar <span class="cont">'+(a.length+dp.length)+'</span></h2>'+linhaPlanilha()+((a.length||dp.length)? dp.slice(0,limDem).map(cartaoDemanda).join('')+(dp.length>limDem? '<a class="resumo-docs" href="#vistorias">'+ic('lista')+'<span>e mais '+(dp.length-limDem)+' demanda'+(dp.length-limDem>1?'s':'')+' da planilha</span>'+ic('voltar','seta-dir')+'</a>' : '')+a.map(cartao).join('') :
   '<div class="vazio">'+ic('lista')+'<p>Nenhuma vistoria agendada.</p><p class="ajuda">'+(cfg.planilhaAtiva? 'Nenhuma demanda aberta sem vistoria na última leitura da planilha.' : 'Ligue as demandas da planilha em Meus dados, ou toque em “Nova vistoria”.')+'</p></div>')+
  '</div></div></main><button class="fab" data-ir="#nova" aria-label="Nova vistoria">'+ic('mais')+'<span class="rot">Nova vistoria</span></button>'+navInferior('#inicio');
};

let abaVist='a_vistoriar', buscaVist='';
TELAS.vistorias = function(){
 if(abaVist==='retornos' && !retornosAgendados(VIST).length) abaVist='a_vistoriar';
 const q=buscaVist.trim().toLowerCase();
 const abas=[['a_vistoriar','Para vistoriar'],['em_andamento','Em andamento'],['concluida','Concluídas']].concat(cfg.planilhaAtiva? [['fiscalizadas','Já fiscalizadas']] : []).concat(retornosAgendados(VIST).length? [['retornos','Retornos']] : []);
 const casa=d=>!q || [d.protocolo,d.assunto,d.endereco,d.diligencias].join(' ').toLowerCase().includes(q);
 const dems=abaVist==='a_vistoriar'? demandasParaVistoriar().filter(casa) : abaVist==='fiscalizadas'? demandasFiscalizadas().filter(casa) : [];
 const contar=k=>k==='retornos'? retornosAgendados(VIST).length : k==='fiscalizadas'? demandasFiscalizadas().length : VIST.filter(v=>v.status===k).length+(k==='a_vistoriar'? demandasParaVistoriar().length : 0);
 const lista=abaVist==='fiscalizadas'? [] : abaVist==='retornos'? retornosAgendados(VIST).filter(v=>!q || [protocoloTexto(v), v.assunto, v.bairro, v.endereco].join(' ').toLowerCase().includes(q)) : ordenadas(VIST.filter(v=>v.status===abaVist && (!q || [protocoloTexto(v), v.assunto, v.bairro, v.endereco, v.autuado].join(' ').toLowerCase().includes(q))));
 const itens=dems.map(d=>({sel:'d:'+idDemanda(d), d:d})).concat(lista.map(v=>({sel:'v:'+v.id, v:v})));
 if(LARGO() && itens.length && !itens.some(x=>x.sel===selVist)) selVist=itens[0].sel;
 ITENS_VIST=itens;
 return topo('Vistorias')+'<main class="pag com-nav"><div class="duas-col lista-det"><div class="col-a"><label class="busca">'+ic('busca')+'<input id="vBusca" type="search" placeholder="Buscar protocolo, assunto ou bairro" value="'+esc(buscaVist)+'"></label>'+
  '<div class="abas" role="tablist">'+abas.map(([k,r])=>'<button role="tab" aria-selected="'+(k===abaVist)+'" data-aba="'+k+'">'+r+' <span class="cont">'+contar(k)+'</span></button>').join('')+'</div>'+
  (['a_vistoriar','fiscalizadas'].includes(abaVist)? linhaPlanilha() : '')+(abaVist==='fiscalizadas'? '<p class="ajuda">Demandas ainda abertas na planilha que já têm vistoria: o que falta é o documento.</p>' : '')+
  '<div id="vLista">'+((lista.length||dems.length)? dems.map(cartaoDemanda).join('')+lista.map(abaVist==='retornos'? cartaoRetorno : cartao).join('') : '<div class="vazio"><p>Nada aqui'+(q?' com essa busca':'')+'.</p></div>')+'</div>'+
  '</div><aside class="col-b so-largo">'+(LARGO()? painelVistoria(itens) : '')+'</aside></div></main><button class="fab" data-ir="#nova" aria-label="Nova vistoria">'+ic('mais')+'<span class="rot">Nova vistoria</span></button>'+navInferior('#vistorias');
};
TELAS.vistorias.ligar = function(){
 $$('[data-aba]').forEach(b=>b.onclick=()=>{ abaVist=b.dataset.aba; selVist=''; mostrar(); });
 ligarSelecao('#vLista', id=>{ selVist=id; mostrar(true); });
 if(LARGO()) desenharMapaVistorias(ITENS_VIST);
 const i=$('#vBusca'); if(i) i.oninput=()=>{ buscaVist=i.value; const pos=i.selectionStart; mostrar(); const n=$('#vBusca'); n.focus(); n.setSelectionRange(pos,pos); };
};

/* Nova vistoria e edição dos dados do protocolo usam o mesmo formulário */
function formDados(v, nova){
 return '<section class="bloco"><h2>Documento que vai sair desta vistoria</h2><div class="seg" role="radiogroup">'+
  Object.keys(TIPOS_DOC).map(k=>'<button role="radio" aria-checked="'+(v.tipoDocumento===k)+'" data-tipo="'+k+'">'+esc(TIPOS_DOC[k].curto)+'</button>').join('')+'</div></section>'+
  '<section class="bloco"><h2>Protocolo</h2><div class="linha2"><label class="campo"><span>Tipo</span><select id="fExpTipo">'+EXPEDIENTES.map(x=>'<option'+(x===v.expedienteTipo?' selected':'')+'>'+x+'</option>').join('')+'</select></label>'+
  '<label class="campo"><span>Número</span><input id="fExpNum" inputmode="numeric" placeholder="1.399/2026" value="'+esc(v.expedienteNum)+'"></label></div>'+
  '<label class="campo"><span>Assunto</span><input id="fAssunto" placeholder="Ex.: descarte irregular de resíduos" value="'+esc(v.assunto)+'"></label></section>'+
  '<section class="bloco"><h2>Onde</h2><label class="campo"><span>Endereço</span><input id="fEndereco" placeholder="Rua e número, ou referência" value="'+esc(v.endereco)+'"></label>'+
  '<label class="campo"><span>Bairro</span><input id="fBairro" value="'+esc(v.bairro)+'"></label>'+
  '<label class="campo"><span>Autuado ou responsável <em>(se souber)</em></span><input id="fAutuado" value="'+esc(v.autuado)+'"></label></section>';
}
function lerFormDados(v){
 v.tipoDocumento=($('[data-tipo][aria-checked="true"]')||{dataset:{tipo:v.tipoDocumento}}).dataset.tipo;
 v.expedienteTipo=$('#fExpTipo').value; v.expedienteNum=$('#fExpNum').value.trim(); v.assunto=$('#fAssunto').value.trim();
 v.endereco=$('#fEndereco').value.trim(); v.bairro=$('#fBairro').value.trim(); v.autuado=$('#fAutuado').value.trim();
 if(v.tipoDocumento==='termo_ruido') v.ruido.usar=true;
}
function ligarSeg(){ $$('[data-tipo]').forEach(b=>b.onclick=()=>{ $$('[data-tipo]').forEach(x=>x.setAttribute('aria-checked', x===b)); }); }

let rascunhoNova=null;
TELAS.nova = function(){ rascunhoNova=rascunhoNova||novaVistoria(); return topo('Nova vistoria', {voltar:true, direita:'<span></span>'})+'<main class="pag">'+formDados(rascunhoNova, true)+
 '<div class="rodape-fixo duplo"><button class="bt sec" id="nDepois">Salvar para depois</button><button class="bt pri" id="nAgora">'+ic('camera')+'Iniciar agora</button></div></main>'; };
TELAS.nova.ligar = function(){
 ligarSeg();
 const salvar=async agora=>{ const v=rascunhoNova; lerFormDados(v); if(agora) iniciarVistoria(v); await gravarVistoria(v); rascunhoNova=null;
  history.replaceState(null, '', agora? '#v/'+v.id : '#inicio'); mostrar(); aviso(agora? 'Vistoria iniciada às '+v.horaVistoria+'.' : 'Vistoria guardada em “Para vistoriar”.'); };
 $('#nDepois').onclick=()=>salvar(false); $('#nAgora').onclick=()=>salvar(true);
};
TELAS.editar = function(id){ const v=acharVistoria(id); if(!v) return naoAchou(); return topo('Dados da vistoria', {voltar:true, direita:'<span></span>'})+'<main class="pag">'+formDados(v)+
 '<div class="rodape-fixo"><button class="bt pri largo" id="eOk">Salvar</button></div></main>'; };
const assinaturaDados=v=>JSON.stringify([v.tipoDocumento, v.expedienteTipo, v.expedienteNum, v.assunto, v.endereco, v.bairro, v.autuado]);
/* Vistoria concluída com dados mudados (inclusive o tipo de documento): volta para a fila de envio, para a pasta ficar igual ao aparelho */
TELAS.editar.ligar = function(id){ ligarSeg(); $('#eOk').onclick=async()=>{
 const v=acharVistoria(id), antes=assinaturaDados(v); lerFormDados(v);
 if(v.status==='concluida' && assinaturaDados(v)!==antes){
  if(v.enviadaEm && !confirm(v.enviadaPor==='nuvem'? 'Esta vistoria já foi enviada pela internet. Salvar as mudanças e enviar de novo? A versão nova substitui a anterior na sua pasta VISTORIAS.' : MODO_WEB? 'Esta vistoria já foi exportada. Salvar as mudanças e exportar de novo? No app Arquivos, escolha “Substituir”.' : 'Esta vistoria já está na pasta da FUNAT. Salvar e enviar de novo, por cima do arquivo de lá?\n\nSe ela já foi aberta e alterada no computador, o app recusa e avisa.')){
   [v.tipoDocumento, v.expedienteTipo, v.expedienteNum, v.assunto, v.endereco, v.bairro, v.autuado]=JSON.parse(antes); return; }
  v.precisaEnviar=true; v.erroEnvio='';
 }
 await gravarVistoria(v); history.back(); if(v.precisaEnviar && podeEnviar()) enviarPendentes({silencioso:true}); }; };

/* ---------- a vistoria ---------- */
function blocoLocal(v){
 if(!v.local) return '<p class="ajuda">A posição ainda não foi registrada. Fique no ponto principal da vistoria e toque abaixo.</p>'+
  '<button class="bt claro largo" id="vGps">'+ic('alvo')+'Usar minha posição GPS atual</button>';
 const p=v.local, ruim=p.precisao!==null && p.precisao>30;
 return '<div class="utm"><span class="fuso">UTM 22 S · SIRGAS 2000</span><b>E '+esc(GEO.fmtUTM(p.e))+' m</b><b>N '+esc(GEO.fmtUTM(p.n))+' m</b><small>Registrada '+esc(quandoRelativo(p.em))+(p.precisao!==null? ' · <span class="'+(ruim?'ruim':'boa')+'">precisão ±'+p.precisao+' m</span>' : '')+'</small></div>'+
  (ruim? '<p class="nota-alerta">'+ic('alerta')+'Precisão baixa. Se puder, vá para céu aberto e atualize.</p>' : '')+
  '<div class="c-ac"><button class="bt claro" id="vGps">'+ic('alvo')+'Atualizar posição</button><button class="bt txt" data-mapa="'+v.id+'">'+ic('mapa')+'Ver no mapa</button></div>';
}
function miniFoto(v, f, i){
 const al=alertasFoto(v, f), semLeg=!String(f.legenda||'').trim();
 const selo= al.length? '<span class="selo mau">'+ic('alerta')+(al[0].tipo==='data'?'Data':'Longe')+'</span>' : f.exif && f.exif.e!==undefined? '<span class="selo bom">'+ic('ok')+'GPS</span>' : '<span class="selo">sem GPS</span>';
 return '<a class="mini" href="#foto/'+v.id+'/'+i+'"><img data-foto="'+f.id+'" alt="Foto '+(i+1)+'"><span class="hora">'+esc((f.exif&&f.exif.hora||'').slice(0,5)||'#'+(i+1))+'</span>'+selo+(semLeg? '<span class="sem-leg">sem legenda</span>' : '')+'</a>';
}
function blocoRuido(v){
 const R=v.ruido;
 return '<details class="bloco"'+(R.usar||v.tipoDocumento==='termo_ruido'?' open':'')+' id="vRuido"><summary><span class="t-ic">'+ic('onda')+'</span><span><b>Medição de ruído</b><small>Anote o que o decibelímetro mostrou (NBR 10.151)</small></span></summary>'+
  '<label class="campo"><span>Condições do tempo</span><input data-r="meteorologia" value="'+esc(R.meteorologia)+'" placeholder="Ex.: tempo bom, sem vento"></label>'+
  R.medicoes.map((m,i)=>'<div class="medicao"><div class="m-cab"><b>Medição '+(i+1)+'</b><button class="bt txt perigo" data-rm="'+i+'">Remover</button></div>'+
   '<label class="campo"><span>Ponto de medição</span><input data-m="'+i+'" data-k="local" value="'+esc(m.local)+'" placeholder="Ex.: calçada em frente ao nº 120"></label>'+
   '<div class="linha2"><label class="campo"><span>Início</span><input type="time" data-m="'+i+'" data-k="horaIni" value="'+esc(m.horaIni)+'"></label><label class="campo"><span>Fim</span><input type="time" data-m="'+i+'" data-k="horaFim" value="'+esc(m.horaFim)+'"></label></div>'+
   '<div class="linha3"><label class="campo"><span>LAeq dB(A)</span><input inputmode="decimal" data-m="'+i+'" data-k="leq" value="'+esc(m.leq)+'"></label><label class="campo"><span>Máx.</span><input inputmode="decimal" data-m="'+i+'" data-k="maximo" value="'+esc(m.maximo)+'"></label><label class="campo"><span>Mín.</span><input inputmode="decimal" data-m="'+i+'" data-k="minimo" value="'+esc(m.minimo)+'"></label></div>'+
   '<label class="campo"><span>Observação</span><input data-m="'+i+'" data-k="observacao" value="'+esc(m.observacao)+'"></label></div>').join('')+
  '<button class="bt claro largo" id="vMedir">'+ic('mais')+'Adicionar medição</button></details>';
}
TELAS.v = function(id){
 const v=acharVistoria(id); if(!v) return naoAchou(); const fim=v.status==='concluida';
 return topo(fim? 'Vistoria concluída' : 'Vistoria em andamento', {voltar:true})+faixaTeste()+'<main class="pag com-rodape">'+
  '<div class="duas-col vist"><div class="col-a">'+faixaRetorno(v)+'<section class="bloco"><div class="c-l1">'+tagTipo(v.tipoDocumento)+tagVisita(v)+'<span class="pilula">'+(fim?'Concluída':'Salvo no aparelho')+'</span></div>'+
  '<h2 class="prot">'+esc(protocoloTexto(v))+'</h2>'+(v.assunto?'<p>'+esc(v.assunto)+'</p>':'')+([v.endereco,v.bairro].filter(Boolean).length? '<p class="loc">'+ic('pino')+esc([v.endereco,v.bairro].filter(Boolean).join(' · '))+'</p>' : '')+
  (v.demanda? '<p class="da-planilha">'+ic('lista')+'<span>Da planilha: '+esc(v.demanda.protocolo)+' · repassada em '+esc(v.demanda.repasse||v.demanda.entrada||'?')+(v.demanda.diligencias? ' · '+esc(v.demanda.diligencias) : '')+'</span></p>' : '')+
  '<button class="bt txt" data-ir="#editar/'+v.id+'">'+ic('lapis')+'Editar dados</button>'+
  '<div class="quando">'+ic('relogio')+'<label class="campo"><span>Data da vistoria</span><input type="date" id="vData" value="'+esc(v.dataVistoria)+'"></label><label class="campo"><span>Hora</span><input type="time" id="vHora" value="'+esc(v.horaVistoria)+'"></label></div></section>'+
  '<section class="bloco"><h2>'+ic('pino')+'Local da vistoria</h2>'+blocoLocal(v)+'</section></div><div class="col-b">'+
  '<section class="bloco"><div class="h-cont"><h2>Fotos da vistoria</h2><span class="cont grande">'+v.fotos.length+'</span></div>'+
  '<button class="bt pri largo alto" id="vFoto">'+ic('camera')+'Tirar foto com a câmera</button><button class="bt claro largo" id="vGaleria">'+ic('galeria')+'Escolher da galeria</button>'+
  (v.fotos.length? '<div class="minis">'+v.fotos.map((f,i)=>miniFoto(v,f,i)).join('')+'</div><p class="ajuda">Toque numa foto para escrever a legenda, girar ou excluir.</p>' : '')+'</section>'+
  '<section class="bloco"><div class="h-cont"><h2>Anotações de campo</h2><small>voz ou texto</small></div>'+
  '<textarea id="vNotas" rows="6" placeholder="O que foi constatado, quem atendeu, providências…">'+esc(v.anotacoes)+'</textarea>'+
  '<p class="ajuda">'+ic('mic')+'Para ditar, toque no microfone do teclado. No computador, as anotações aparecem no quadro “Vistoria feita no celular”, para você inserir no documento.</p></section>'+blocoRuido(v)+(fim? blocoDocumentoRetorno(v) : '')+
  '<button class="bt txt perigo apagar-v" id="vApagar">'+ic('lixo')+'Excluir esta vistoria do aparelho</button></div></div>'+
  '<div class="rodape-fixo duplo">'+(fim? '<button class="bt sec" id="vReabrir">Reabrir</button><button class="bt pri" data-ir="#envios">'+ic('enviar')+'Envio</button>'
   : '<button class="bt sec" id="vSalvar">Salvar rascunho</button><button class="bt pri" id="vConcluir">'+ic('ok')+'Concluir vistoria</button>')+'</div></main>';
};
TELAS.v.ligar = function(id){
 const v=acharVistoria(id); if(!v) return; preencherImagens(v);
 if(v.status==='a_vistoriar'){ iniciarVistoria(v); gravarDepois(v); }
 $('#vData').onchange=e=>{ v.dataVistoria=e.target.value; gravarDepois(v); };
 $('#vHora').onchange=e=>{ v.horaVistoria=e.target.value; gravarDepois(v); };
 $('#vNotas').oninput=e=>{ v.anotacoes=e.target.value; gravarDepois(v); };
 $('#vGps').onclick=()=>registrarPosicao(v);
 $('#vFoto').onclick=()=>novaFotoCamera(v);
 $('#vGaleria').onclick=()=>fotosDaGaleria(v);
 const rd=$('#vRuido'); rd.ontoggle=()=>{ v.ruido.usar=rd.open; gravarDepois(v); };
 rd.querySelector('[data-r]').oninput=e=>{ v.ruido.meteorologia=e.target.value; gravarDepois(v); };
 $$('[data-m]').forEach(inp=>inp.oninput=()=>{ v.ruido.medicoes[+inp.dataset.m][inp.dataset.k]=inp.value; gravarDepois(v); });
 $$('[data-rm]').forEach(b=>b.onclick=async()=>{ if(!confirm('Remover a medição '+(+b.dataset.rm+1)+'?')) return; v.ruido.medicoes.splice(+b.dataset.rm,1); await gravarVistoria(v); mostrar(true); });
 $('#vMedir').onclick=async()=>{ const m=medicaoCampo(); m.horaIni=horaCurta(); v.ruido.medicoes.push(m); v.ruido.usar=true; await gravarVistoria(v); mostrar(true); };
 $('#vApagar').onclick=()=>apagarVistoria(v); ligarDocumentoRetorno();
 if($('#vSalvar')) $('#vSalvar').onclick=async()=>{ await gravarAgora(); await gravarVistoria(v); aviso('Rascunho salvo neste aparelho.'); };
 if($('#vConcluir')) $('#vConcluir').onclick=()=>concluir(v);
 if($('#vReabrir')) $('#vReabrir').onclick=async()=>{
  if(v.enviadaEm && !confirm((v.enviadaPor==='nuvem'? 'Esta vistoria já foi enviada pela internet.' : 'Esta vistoria já foi enviada para a pasta ('+v.arquivoRemoto+').')+'\n\nAo concluir de novo, o app grava por cima desse arquivo. Se ela já foi aberta e alterada no computador, essas alterações se perdem.\n\nReabrir mesmo assim?')) return;
  v.status='em_andamento'; v.concluidaEm=''; v.precisaEnviar=false; await gravarVistoria(v); mostrar(true); };
};

async function registrarPosicao(v){
 ocupado('Buscando o sinal do GPS…', {gps:true});
 try{ const p=await Aparelho.posicao(); v.local=posicaoDe(p.lat, p.lon, p.precisao); await gravarVistoria(v); ocupado(false); mostrar(true); animarLocal();
  aviso('Posição registrada'+(v.local.precisao!==null? ' (±'+v.local.precisao+' m)' : '')+'.'); }
 catch(e){ ocupado(false); alert(e.message||String(e)); }
}

/* Recebe o arquivo original: lê data e GPS gravados nele, reduz e guarda */
async function guardarFoto(v, blob, origem, gpsAparelho, quando){
 let lido=null; try{ lido=dadosDaFoto(lerExif(await blob.arrayBuffer())); }catch(e){}
 const red=await reduzirFoto(blob, 1600);
 const f={id:novoIdCampo(), arquivo:'', w:red.w, h:red.h, legenda:'', origem:origem, versao:0,
          exif:exifDaFoto(lido, origem==='camera'? gpsAparelho : null, origem==='camera'? quando : null), gpsAparelho:gpsAparelho||null};
 f.arquivo=f.id+'.jpg';
 await Arquivos.gravarBase64(caminhoFoto(v,f), soBase64(red.data));
 v.fotos.push(f); return f;
}
async function posicaoRapida(){ try{ const p=await Promise.race([Aparelho.posicao(), new Promise((_,r)=>setTimeout(()=>r(new Error('demorou')), 15000))]); return posicaoDe(p.lat, p.lon, p.precisao); }catch(e){ return null; } }
/* Com pouca memória, o Android fecha o app enquanto a câmera está aberta. Ao reabrir, a foto chega pelo evento
   "appRestoredResult": ela vai para a vistoria que estava aberta (guardada antes de abrir a câmera). */
function lembrarCameraAberta(v){ try{ localStorage.setItem('funat-camera-vistoria', JSON.stringify({id:v.id, em:Date.now()})); }catch(e){} }
function esquecerCameraAberta(){ try{ localStorage.removeItem('funat-camera-vistoria'); }catch(e){} }
let FOTO_RESTAURADA=null;
if(NATIVO && P.App) P.App.addListener('appRestoredResult', r=>{ if(r && r.pluginId==='Camera' && r.success && r.data){ FOTO_RESTAURADA=r.data; recuperarFotoDaCamera(); } });
async function recuperarFotoDaCamera(){
 if(!FOTO_RESTAURADA || !VIST.length) return;          // as vistorias ainda não foram lidas: iniciar() chama de novo
 let m=null; try{ m=JSON.parse(localStorage.getItem('funat-camera-vistoria')||'null'); }catch(e){}
 const d=FOTO_RESTAURADA, v=m && acharVistoria(m.id); FOTO_RESTAURADA=null; esquecerCameraAberta();
 const origem=d.webPath || (d.path && CAP.convertFileSrc(d.path)); if(!v || !origem) return;
 try{ const blob=await blobDe(origem); await guardarFoto(v, blob, 'camera', null, new Date()); await gravarVistoria(v); location.hash='#v/'+v.id; mostrar(true);
  aviso('O Android fechou o app enquanto a câmera estava aberta. A foto foi recuperada e guardada na vistoria '+protocoloTexto(v)+'.', 8000); }
 catch(e){ aviso('A foto tirada antes de o app fechar não pôde ser recuperada: '+(e.message||e), 8000); }
}
async function novaFotoCamera(v){
 await gravarAgora();                            // o Android pode fechar o app enquanto a câmera está aberta: o que foi digitado não espera os 500 ms
 lembrarCameraAberta(v);
 const gpsP=posicaoRapida();                     // o GPS começa a procurar enquanto a câmera está aberta
 let blob; try{ blob=await Aparelho.tirarFoto(); }catch(e){ esquecerCameraAberta(); alert('Não foi possível abrir a câmera: '+(e.message||e)); return; }
 esquecerCameraAberta();
 if(!blob) return;
 const quando=new Date(); ocupado('Guardando a foto…');
 try{
  const gps=await gpsP; const f=await guardarFoto(v, blob, 'camera', gps, quando);
  let msg='Foto '+v.fotos.length+' guardada.';
  if(!v.local && f.exif && f.exif.e!==undefined){ v.local=posicaoDe(f.exif.lat, f.exif.lon, gps? gps.precisao : null); msg+=' Local da vistoria registrado pela posição da foto.'; }
  await gravarVistoria(v); ocupado(false); mostrar(true); animarFotosNovas(1); aviso(msg, 4000);
 }catch(e){ ocupado(false); alert('A foto não pôde ser guardada: '+(e.message||e)); }
}
async function fotosDaGaleria(v){
 let blobs; try{ blobs=await Aparelho.daGaleria(); }catch(e){ alert('Não foi possível abrir a galeria: '+(e.message||e)); return; }
 if(!blobs.length) return;
 ocupado('Guardando '+blobs.length+' foto'+(blobs.length>1?'s':'')+'…'); let falhas=0, antes=v.fotos.length;
 for(const b of blobs){ try{ await guardarFoto(v, b, 'galeria', null, null); }catch(e){ falhas++; } }
 await gravarVistoria(v); ocupado(false); mostrar(true); animarFotosNovas(v.fotos.length-antes);
 const novas=v.fotos.slice(antes), outroDia=novas.filter(f=>alertasFoto(v,f).some(a=>a.tipo==='data')).length, semDados=novas.filter(f=>!f.exif).length;
 aviso((v.fotos.length-antes)+' foto(s) incluída(s).'+(falhas? ' '+falhas+' não puderam ser lidas.' : '')+(outroDia? ' '+outroDia+' de outro dia: confira.' : '')+(semDados? ' '+semDados+' sem data/GPS no arquivo.' : ''), 5000);
}
async function apagarVistoria(v){
 if(!confirm('Excluir a vistoria '+protocoloTexto(v)+' e as '+v.fotos.length+' fotos dela deste aparelho?'+(MODO_WEB? '\n\nNa versão para iPhone as fotos ficam só no app: se ainda não exportou, elas se perdem.' : '\n\nAs fotos que a câmera guardou na galeria continuam lá.'))) return;
 await Arquivos.apagar('vistorias/'+v.id+'.json'); await Arquivos.apagarPasta('fotos/'+v.id); VIST=VIST.filter(x=>x!==v);
 history.replaceState(null, '', '#inicio'); mostrar(); aviso('Vistoria excluída.');
}
async function concluir(v){
 await gravarAgora(); const p=pendenciasConcluir(v);
 if(p.bloqueia.length){ alert('Para concluir, falta: '+p.bloqueia.join(' e ')+'.'); return; }
 if(p.avisa.length && !confirm('Antes de concluir, confira:\n\n• '+p.avisa.join('\n• ')+'\n\nConcluir mesmo assim?')) return;
 v.status='concluida'; v.concluidaEm=new Date().toISOString(); v.precisaEnviar=true; v.erroEnvio=''; await gravarVistoria(v);
 history.replaceState(null, '', '#pronta/'+v.id); mostrar();
 if(podeEnviar()) enviarPendentes({silencioso:true});
}

/* ---------- vistoria concluída ---------- */
function situacaoEnvio(v){
 if(v.precisaEnviar && envioRodando && (MODO_WEB||temNuvem())) return {cls:'andando', txt:'Enviando…'};
 if(v.enviadaPor==='nuvem' && !v.precisaEnviar) return v.recebidaEm? {cls:'ok', txt:'Enviada pela internet e gravada na sua pasta VISTORIAS '+quandoRelativo(v.recebidaEm)+'.'} : {cls:'ok', txt:'Enviada pela internet '+quandoRelativo(v.enviadaEm)+'. Chega à sua pasta VISTORIAS quando o Painel do Auxiliar for aberto no computador.'};
 if(v.precisaEnviar && temNuvem() && (MODO_WEB || !cfg.pasta)) return {cls:'fila', txt: v.erroEnvio? 'Na fila: '+v.erroEnvio : 'Na fila: vai pela internet assim que houver sinal.'};
 if(MODO_WEB) return v.precisaEnviar? {cls:'fila', txt:'Falta exportar e salvar na pasta VISTORIAS (app Arquivos).'} : {cls:'ok', txt:'Exportada '+quandoRelativo(v.exportadaEm)+'. Confira se o arquivo está na sua pasta VISTORIAS.'};
 if(v.precisaEnviar && envioRodando) return {cls:'andando', txt:'Enviando para a pasta…'};
 if(v.precisaEnviar) return {cls:'fila', txt: v.erroEnvio? 'Na fila: '+v.erroEnvio : cfg.pasta? (temNuvem()? 'Na fila: vai no Wi-Fi da FUNAT ou, fora dela, pela internet.' : 'Na fila: vai quando o celular estiver no Wi-Fi da FUNAT.') : 'Na fila: configure a pasta da FUNAT em Meus dados.'};
 if(v.enviadaEm) return {cls:'ok', txt:'Enviada '+quandoRelativo(v.enviadaEm)+' para '+ultimaParte(v.arquivoRemoto.replace(/\\[^\\]*$/,''))+' › '+ultimaParte(v.arquivoRemoto)};
 return {cls:'', txt:'Não está na fila.'};
}
TELAS.pronta = function(id){ const v=acharVistoria(id); if(!v) return naoAchou(); const st=situacaoEnvio(v);
 return topo('Vistoria concluída', {direita:'<span></span>'})+'<main class="pag centro"><div class="grande-ok">'+ic('ok')+'</div><h2>Vistoria concluída</h2>'+
  '<p>'+esc(protocoloTexto(v))+' · '+v.fotos.length+' foto'+(v.fotos.length===1?'':'s')+' · '+esc(dataBrCampo(v.dataVistoria))+'</p>'+
  '<div class="bloco esq envio-'+st.cls+'"><h3>'+ic(st.cls==='ok'?'ok':'enviar')+(st.cls==='ok'? (v.enviadaPor==='nuvem'? 'Enviada pela internet' : 'Na pasta da FUNAT') : 'Envio')+'</h3><p class="ajuda">'+esc(st.txt)+'</p>'+
  (st.cls==='ok'? '<p class="ajuda">No computador, ela aparece no Painel do Auxiliar como documento em elaboração, pronto para continuar na ferramenta.</p>' : '')+'</div>'+
  (MODO_WEB && !temNuvem()? '<button class="bt pri largo alto" data-exportar="'+v.id+'">'+ic('enviar')+(v.precisaEnviar? 'Exportar e salvar na pasta' : 'Exportar de novo')+'</button>' : '')+
  (v.precisaEnviar && podeEnviar()? '<button class="bt pri largo alto" id="pEnviar">'+ic('enviar')+'Tentar enviar agora</button>' : '')+
  (!cfg.pasta && !MODO_WEB && !temNuvem()? '<button class="bt pri largo alto" data-ir="#pasta">'+ic('enviar')+'Configurar a pasta</button>' : '')+
  blocoDocumentoRetorno(v, 'esq')+
  '<button class="bt sec largo" data-ir="#inicio">Voltar ao início</button></main>'; };
TELAS.pronta.ligar = function(){ ligarDocumentoRetorno(); if($('#pEnviar')) $('#pEnviar').onclick=()=>enviarPendentes({}); $$('[data-exportar]').forEach(b=>b.onclick=()=>exportar(acharVistoria(b.dataset.exportar))); };

/* ---------- envios ---------- */
function chipEnvio(){
 if(bloqueadoParaEnviar()) return '<a class="chip-sinc conflito" href="#atualizar">'+ic('alerta')+'Atualize o app</a>';
 const n=pendentesEnvio(VIST).length+correcoesNaFila().length, nc=correcoesComConflito().length;
 if(nc) return '<a class="chip-sinc conflito" href="#envios">'+ic('alerta')+nc+' para decidir</a>';
 if(MODO_WEB && !temNuvem()) return n? '<a class="chip-sinc fila" href="#envios">'+ic('enviar')+n+' para exportar</a>' : '<a class="chip-sinc" href="#envios">'+ic('aparelho')+'Neste iPhone</a>';
 if(!cfg.pasta && !temNuvem()) return '<a class="chip-sinc" href="#pasta">'+ic('aparelho')+'Só neste aparelho</a>';
 if(envioRodando) return '<a class="chip-sinc andando" href="#envios">'+ic('enviar')+'Enviando…</a>';
 if(n) return '<a class="chip-sinc fila" href="#envios">'+ic('enviar')+n+' na fila</a>';
 return '<a class="chip-sinc ok" href="#envios">'+ic('ok')+'Tudo enviado'+(cfg.ultimoEnvio? ' · '+horaCurta(new Date(cfg.ultimoEnvio)) : '')+'</a>';
}
function secaoCorrecoes(){
 const L=Object.values(RASCS); if(!L.length) return '';
 const dado=id=>docsDe(cfg.pasta).find(x=>x.id===id)||{protocolo:'Documento', tipo:'relatorio_simplificado'};
 return '<h2 class="secao">Correções de documentos <span class="cont">'+L.length+'</span></h2>'+L.map(r=>{ const d=dado(r.id);
  const st=r.conflito? {c:'conflito', t:r.conflito.tipo==='versoes'? 'Outra versão na pasta: escolha qual vale' : (r.conflito.tipo==='aprovado'? 'O documento foi aprovado enquanto você corrigia' : 'O documento não está mais na pasta')}
   : r.pendente? {c:'fila', t:'Na fila: vai no Wi-Fi da FUNAT'} : {c:'', t:'Rascunho no celular (ainda não encaminhado)'};
  return '<a class="cartao correcao g-'+(st.c||'elaboracao')+'" href="#'+(r.conflito? 'conflito' : 'corrigir')+'/'+encodeURIComponent(r.id)+'"><div class="c-l1">'+tagTipo(d.tipo)+'<b>'+esc(d.protocolo||'')+'</b></div><p class="st envio-'+st.c+'">'+ic(r.conflito?'alerta':r.pendente?'relogio':'lapis')+esc(st.t)+'</p></a>'; }).join('');
}
TELAS.envios = function(){
 const c=ordenadas(VIST.filter(v=>v.status==='concluida')), fila=pendentesEnvio(VIST);
 return topo('Envios')+'<main class="pag com-nav">'+
  (temNuvem() && (MODO_WEB || !cfg.pasta)? '<div class="bloco info">'+ic('enviar')+'<div><b>Envio pela internet</b><p class="ajuda">As vistorias concluídas vão sozinhas, assim que houver sinal, e chegam à sua pasta VISTORIAS quando o Painel do Auxiliar é aberto no computador.'+(cfg.ultimoEnvio? ' Último envio: '+esc(quandoRelativo(new Date(cfg.ultimoEnvio).toISOString()))+'.' : '')+'</p>'+
    '<button class="bt pri largo" id="eEnviar"'+(fila.length&&!envioRodando?'':' disabled')+'>'+ic('enviar')+(envioRodando? 'Enviando…' : fila.length? 'Enviar '+fila.length+' agora' : 'Nada na fila')+'</button></div></div>'
   : MODO_WEB? '<div class="bloco info">'+ic('pasta')+'<div><b>Salvar na pasta da FUNAT</b><p class="ajuda"><span>No Wi-Fi da FUNAT, toque em <b>Salvar '+(fila.length>1? 'as '+fila.length : '')+' na pasta</b> e escolha <b>Salvar em Arquivos</b> › sua pasta › <b>VISTORIAS</b>. Todas vão de uma vez; o iPhone lembra a última pasta usada.</span></p>'+
    (fila.length? '<button class="bt pri largo alto" id="eLoteWeb">'+ic('enviar')+(fila.length>1? 'Salvar as '+fila.length+' na pasta' : 'Salvar na pasta')+'</button>' : '<p class="ajuda">'+ic('ok')+'<span>Nada falta salvar.</span></p>')+
    '<button class="bt claro largo" data-ir="#arquivos-ajuda">'+ic('lista')+'Como ligar o app Arquivos à pasta</button></div></div>'
   : cfg.pasta? '<div class="bloco info">'+ic('enviar')+'<div><b>'+esc(cfg.pasta.nome)+' › VISTORIAS</b><p class="ajuda">As vistorias concluídas vão para essa pasta quando o celular está no Wi-Fi da FUNAT'+(temNuvem()? '; fora dela, vão pela internet' : '')+'. '+(cfg.ultimoEnvio? 'Último envio: '+esc(quandoRelativo(new Date(cfg.ultimoEnvio).toISOString()))+'.' : '')+'</p>'+
    '<button class="bt pri largo" id="eEnviar"'+(fila.length&&!envioRodando?'':' disabled')+'>'+ic('enviar')+(envioRodando? 'Enviando…' : fila.length? 'Enviar '+fila.length+' agora' : 'Nada na fila')+'</button></div></div>'
   : '<div class="bloco info">'+ic('aparelho')+'<div><b>Pasta da FUNAT não configurada</b><p class="ajuda">Configure o acesso para que as vistorias concluídas cheguem ao computador sozinhas.</p><button class="bt pri largo" data-ir="#pasta">Configurar agora</button></div></div>')+
  secaoCorrecoes()+
  '<h2 class="secao">Concluídas <span class="cont">'+c.length+'</span></h2>'+(c.length? c.map(v=>{ const st=situacaoEnvio(v); return '<article class="cartao st-concluida"><div class="c-l1">'+tagTipo(v.tipoDocumento)+'<b>'+esc(protocoloTexto(v))+'</b></div>'+
   (v.assunto?'<h3>'+esc(v.assunto)+'</h3>':'')+'<p class="st envio-'+st.cls+'">'+ic(st.cls==='ok'?'ok':st.cls==='fila'?'relogio':'enviar')+esc(st.txt)+'</p>'+
   '<div class="c-ac">'+(MODO_WEB && !temNuvem()? '<button class="bt '+(v.precisaEnviar?'pri':'sec')+'" data-exportar="'+v.id+'">'+ic('enviar')+(v.precisaEnviar?'Exportar e salvar':'Exportar de novo')+'</button><button class="bt txt" data-ir="#v/'+v.id+'">Abrir</button>' : '<button class="bt txt" data-ir="#v/'+v.id+'">Abrir</button><button class="bt txt" data-exportar="'+v.id+'">'+ic('arquivo')+'Exportar arquivo</button>')+'</div></article>'; }).join('')
   : '<div class="vazio"><p>Nenhuma vistoria concluída ainda.</p></div>')+'</main>'+navInferior('#envios');
};
TELAS.envios.ligar = function(){
 $$('[data-exportar]').forEach(b=>b.onclick=()=>exportar(acharVistoria(b.dataset.exportar)));
 if($('#eEnviar')) $('#eEnviar').onclick=()=>enviarPendentes({});
 if($('#eLoteWeb')) $('#eLoteWeb').onclick=()=>exportarLoteWeb(pendentesEnvio(VIST));
};

/* O caso .json da ferramenta do computador, com as fotos */
async function montarDocumento(v){
 const fotos=[]; for(const f of v.fotos){ const b64=await Arquivos.lerBase64(caminhoFoto(v,f)); fotos.push({data:'data:image/jpeg;base64,'+b64, w:f.w, h:f.h}); }
 return JSON.stringify(paraDocumento(v, fotos, cfg.nome||''), null, 1);
}
async function exportar(v){
 if(!v) return; if(MODO_WEB) return exportarWeb(v);
 await gravarAgora(); ocupado('Preparando o arquivo…');
 try{
  const txt=await montarDocumento(v); ocupado(false);
  await Aparelho.compartilhar(nomeArquivoVistoria(v), txt, protocoloTexto(v));
  v.exportadaEm=new Date().toISOString(); await gravarVistoria(v); mostrar(true);
 }catch(e){ ocupado(false); if(!/cancel/i.test(String(e.message||e))) alert('Não foi possível exportar: '+(e.message||e)); }
}


/* Versão web: o arquivo é montado e só então aparece o botão "Salvar em Arquivos" – o Safari exige que o
   Compartilhar nasça de um toque, e montar o .json com as fotos leva alguns segundos. */
/* Versão web (iPhone): uma vistoria ou TODAS as que faltam, de uma vez, no Compartilhar › Salvar em Arquivos › VISTORIAS.
   Em dois toques: primeiro prepara os arquivos (leva tempo, com as fotos); o Compartilhar abre no segundo toque,
   porque o Safari só abre o Compartilhar logo depois de um toque do usuário. */
async function exportarWeb(v){ return exportarLoteWeb([v]); }
async function exportarLoteWeb(lista){
 lista=(lista||[]).filter(Boolean); if(!lista.length) return;
 await gravarAgora(); ocupado(lista.length>1? 'Preparando '+lista.length+' arquivos…' : 'Preparando o arquivo…'); const arqs=[];
 try{ for(const v of lista) arqs.push(new File([await montarDocumento(v)], nomeArquivoVistoria(v), {type:'application/json'})); }
 catch(e){ ocupado(false); alert('Não foi possível preparar o arquivo: '+(e.message||e)); return; }
 ocupado(false);
 const arq=arqs[0], varios=arqs.length>1;
 const podeCompartilhar=!!(navigator.canShare && navigator.canShare({files:arqs}));
 const url=URL.createObjectURL(arq), mb=(arqs.reduce((t,a)=>t+a.size,0)/1048576).toFixed(1).replace('.',',');
 const fundo=document.createElement('div'); fundo.className='folha-fundo';
 fundo.innerHTML='<div class="folha" role="dialog" aria-label="Salvar na pasta da FUNAT"><h2>Salvar na pasta da FUNAT</h2>'+
  (varios? '<p class="arq">'+ic('arquivo')+arqs.length+' vistorias · '+mb+' MB</p><ul class="lista-arq">'+arqs.map(a=>'<li>'+esc(a.name)+'</li>').join('')+'</ul>' : '<p class="arq">'+ic('arquivo')+esc(arq.name)+' · '+mb+' MB</p>')+
  '<ol class="passos"><li>Toque em <b>Salvar em Arquivos</b>.</li><li>Na lista, abra o servidor da FUNAT (<b>192.168.31.34</b>) › funat › FISCALIZAÇÃO › FISCALIZAÇÃO 2026 › <b>sua pasta</b> › <b>VISTORIAS</b>.</li><li>Toque em <b>Salvar</b>.</li></ol>'+
  (podeCompartilhar? '<button class="bt pri largo alto" id="fsComp">'+ic('enviar')+'Salvar em Arquivos…</button>' : '')+
  (varios? '<button class="bt '+(podeCompartilhar?'sec':'pri')+' largo" id="fsBaixarTodos">'+ic('arquivo')+'Baixar os '+arqs.length+' arquivos</button>'
   : '<a class="bt '+(podeCompartilhar?'sec':'pri')+' largo" id="fsBaixar" href="'+url+'" download="'+esc(arq.name)+'">'+ic('arquivo')+'Baixar o arquivo</a>')+
  '<button class="bt txt largo" id="fsJa">'+ic('ok')+'Já salvei na pasta</button><button class="bt txt largo" id="fsFechar">Fechar</button>'+
  '<p class="ajuda">Ainda não ligou o app Arquivos à pasta? <a href="#arquivos-ajuda" id="fsAjuda">Veja como</a>.</p></div>';
 document.body.appendChild(fundo);
 const fechar=()=>{ fundo.remove(); setTimeout(()=>URL.revokeObjectURL(url), 60000); };
 const feito=async()=>{ const em=new Date().toISOString(); for(const v of lista){ v.precisaEnviar=false; v.exportadaEm=em; await gravarVistoria(v); } fechar(); mostrar(true);
  aviso(varios? lista.length+' vistorias marcadas como salvas na pasta. Confira no computador.' : 'Marcada como salva na pasta. Confira no computador.', 4500); };
 const c=fundo.querySelector('#fsComp');
 if(c) c.onclick=()=>{ navigator.share({files:arqs, title:varios? arqs.length+' vistorias' : arq.name}).then(feito).catch(e=>{ if(e && e.name!=='AbortError') alert('Não foi possível abrir o Compartilhar: '+(e.message||e)+(varios? '\n\nSalve uma de cada vez, pelo botão de cada vistoria.' : '\n\nUse "Baixar o arquivo".')); }); };
 const bt=fundo.querySelector('#fsBaixarTodos');
 if(bt) bt.onclick=()=>arqs.forEach((a,i)=>setTimeout(()=>{ const l=document.createElement('a'); l.href=URL.createObjectURL(a); l.download=a.name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(()=>URL.revokeObjectURL(l.href), 60000); }, i*400));
 fundo.querySelector('#fsJa').onclick=feito;
 fundo.querySelector('#fsFechar').onclick=fechar;
 fundo.querySelector('#fsAjuda').onclick=()=>fechar();
}

/* Versão web: o site novo já foi baixado (service worker); recarregar põe a versão nova na tela. Nada se perde:
   as vistorias ficam no aparelho (IndexedDB). */
/* ======================= ATUALIZAÇÃO DA VERSÃO WEB (iPhone) =======================
   Três caminhos para a mesma coisa (o app instalado trocar de versão sem remover o ícone):
   1) o service worker confere sw.js ao voltar ao app (index.html) e, quando assume, chama novaVersaoAssumiu();
   2) conferirVersaoWeb() lê versao.json SEM cache ao abrir, ao voltar e a cada 15 minutos: se a impressão do app no ar for outra,
      pede a atualização ao service worker. Funciona mesmo que o item 1 trave;
   3) forcarAtualizacaoWeb(): apaga só o armazenamento do PROGRAMA (cache e service worker) e recarrega do servidor.
      Vistorias, fotos, chave e configurações ficam (IndexedDB e localStorage não são tocados).
   Recarregar sozinho só acontece com o app numa tela de lista e sem nada sendo digitado, enviado ou gravado. */
const BUILD_WEB = (typeof CONFIG_APP!=='undefined' && CONFIG_APP.build) || '';
const atuWeb = {remota:null, conferidaEm:0, pendente:false, assumiu:false, verificando:false, erro:''};
const TELAS_SEGURAS = ['inicio','vistorias','envios','documentos','itinerario'];
function seguroRecarregar(){
 const a=document.activeElement, campo=a && /INPUT|TEXTAREA|SELECT/.test(a.tagName||'');
 return TELAS_SEGURAS.includes(rotaAtual().nome) && !vistoriaPendente && !envioRodando && !campo && !$('.folha-fundo') && !$('#ocupado') && !$('.tela-cheia');
}
function lembrarAtualizacao(){ try{ localStorage.setItem('funat-atualizado-para', (atuWeb.remota&&atuWeb.remota.versao)||''); }catch(e){} }
function avisarSeAtualizou(){ try{ const v=localStorage.getItem('funat-atualizado-para'); if(v===null) return; localStorage.removeItem('funat-atualizado-para'); aviso('App atualizado'+(v? ' para a versão '+v : '')+'. Suas vistorias continuam aqui.', 5000); }catch(e){} }
/* O service worker novo assumiu (a primeira instalação não conta) */
function novaVersaoAssumiu(tinhaControlador){
 if(!tinhaControlador) return; atuWeb.assumiu=true; atuWeb.pendente=true;
 if(seguroRecarregar()){ lembrarAtualizacao(); location.reload(); } else avisoNovaVersaoWeb();
}
async function conferirVersaoWeb(op){
 op=op||{}; if(!MODO_WEB || !BUILD_WEB || atuWeb.verificando) return null;
 if(!op.forcar && Date.now()-atuWeb.conferidaEm<20e3) return atuWeb.pendente;
 atuWeb.verificando=true; atuWeb.erro='';
 try{
  const r=await fetch('versao.json?t='+Date.now(), {cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status);
  const j=await r.json(); atuWeb.remota=j; atuWeb.conferidaEm=Date.now();
  atuWeb.pendente=!!(j.build && j.build!==BUILD_WEB);
  if(atuWeb.pendente){
   try{ const reg=window.__swReg || await navigator.serviceWorker.getRegistration(); if(reg) reg.update().catch(()=>{}); }catch(e){}
   if(op.avisarJa) avisoNovaVersaoWeb();
   else setTimeout(()=>{ if(atuWeb.pendente && !atuWeb.assumiu) avisoNovaVersaoWeb(); }, 12e3);    /* o service worker não assumiu a tempo: oferece a atualização completa */
  }
  return atuWeb.pendente;
 }catch(e){ atuWeb.erro=(navigator.onLine===false? 'Sem internet agora.' : 'Não foi possível conferir ('+(e.message||e)+').'); return null; }
 finally{ atuWeb.verificando=false; }
}
function avisoNovaVersaoWeb(){
 if(document.getElementById('faixaNovaVersao')) return;
 const d=document.createElement('div'); d.id='faixaNovaVersao'; d.className='faixa-nova-versao'; d.setAttribute('role','status');
 d.innerHTML='<span>'+ic('baixar')+'<span><b>Nova versão do app'+(atuWeb.remota&&atuWeb.remota.versao? ' ('+esc(atuWeb.remota.versao)+')' : '')+'</b> pronta. Suas vistorias continuam no aparelho.</span></span><button class="bt pri" id="fnvOk">Atualizar agora</button>';
 document.body.appendChild(d);
 d.querySelector('#fnvOk').onclick=async()=>{ await gravarAgora(); lembrarAtualizacao(); if(atuWeb.assumiu) location.reload(); else forcarAtualizacaoWeb(); };
}
/* Apaga o cache do programa e o service worker, renova o cache do navegador com os arquivos do servidor e recarrega. */
async function forcarAtualizacaoWeb(){
 ocupado('Atualizando o app…');
 try{
  await gravarAgora();
  let lista=[]; try{ lista=((await (await fetch('versao.json?t='+Date.now(), {cache:'no-store'})).json()).arquivos)||[]; }catch(e){}
  const ks=await caches.keys(); await Promise.all(ks.filter(k=>/^funat-campo-/.test(k)).map(k=>caches.delete(k)));
  const rs=await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r=>r.unregister()));
  await Promise.all(['./'].concat(lista).map(u=>fetch(u, {cache:'reload'}).catch(()=>{})));
  lembrarAtualizacao();
 }catch(e){ console.error(e); }
 location.replace(location.pathname+'?v='+Date.now());
}
function blocoAtualizacaoWeb(){
 if(!MODO_WEB) return '';
 const q=atuWeb.conferidaEm? 'Conferido '+quandoRelativo(new Date(atuWeb.conferidaEm).toISOString()) : 'Ainda não conferido nesta abertura';
 return '<section class="bloco atu-web"><h2>'+ic('baixar')+'Atualização do app</h2><p class="ajuda"><span>Versão em uso: <b>'+esc(VERSAO_APP)+'</b>. O app confere sozinho ao abrir, ao voltar para ele e a cada 15 minutos. '+esc(q)+'.</span></p>'+
  '<button class="bt claro largo" id="cfVerWeb">'+ic('girar')+'Verificar atualização agora</button>'+
  '<details class="mais-op"><summary>O app não muda, mesmo com versão nova?</summary><p class="ajuda"><span>“Forçar a atualização” apaga só o programa guardado no iPhone e baixa de novo. <b>As vistorias, as fotos, a chave e os seus dados ficam.</b> Use se a atualização normal não funcionar; é o que evita remover e reinstalar o ícone.</span></p><button class="bt claro largo" id="cfForcarWeb">'+ic('baixar')+'Forçar a atualização</button></details></section>';
}
function ligarAtualizacaoWeb(){
 const b=$('#cfVerWeb'); if(!b) return;
 b.onclick=async()=>{ b.disabled=true; const n=await conferirVersaoWeb({forcar:true, avisarJa:true}); b.disabled=false;
  if(n===null) aviso(atuWeb.erro||'Não foi possível conferir agora.', 5000); else if(!n) aviso('Você já está na versão mais nova ('+VERSAO_APP+').', 4500); };
 $('#cfForcarWeb').onclick=()=>{ if(confirm('Forçar a atualização?\n\nO app baixa tudo de novo e recarrega. As vistorias, as fotos e a chave continuam no iPhone.')) forcarAtualizacaoWeb(); };
}
function iniciarAtualizacaoWeb(){
 if(!MODO_WEB) return; avisarSeAtualizou();
 setTimeout(()=>conferirVersaoWeb(), 2500);
 document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) conferirVersaoWeb(); });
 setInterval(()=>{ if(!document.hidden) conferirVersaoWeb({forcar:true}); }, 15*60e3);
}
/* Passo a passo: ligar o app Arquivos do iPhone à pasta da FUNAT (uma vez por aparelho) */
TELAS['arquivos-ajuda'] = function(){
 return topo('Pasta no iPhone', {voltar:true, direita:'<span></span>'})+'<main class="pag">'+
  '<section class="bloco"><h2>Ligar o app Arquivos à pasta da FUNAT</h2><p class="ajuda">Faça uma vez só, com o iPhone no <b>Wi-Fi da FUNAT</b>.</p>'+
  '<ol class="passos"><li>Abra o app <b>Arquivos</b> (ícone azul de pasta, já vem no iPhone).</li>'+
  '<li>Toque nos <b>três pontinhos (…)</b> no alto da tela e em <b>Conectar ao Servidor</b>.</li>'+
  '<li>Em Servidor, escreva <b>smb://192.168.31.34</b> e toque em <b>Conectar</b>.</li>'+
  '<li>Escolha <b>Usuário Registrado</b> e digite o <b>seu usuário e senha da rede</b> (os mesmos do computador). Ative “Lembrar senha” se quiser.</li>'+
  '<li>Abra <b>funat › FISCALIZAÇÃO › FISCALIZAÇÃO 2026 › sua pasta</b>. Se ainda não existir a subpasta <b>VISTORIAS</b>, crie: toque nos três pontinhos › <b>Nova Pasta</b> › escreva <b>VISTORIAS</b>.</li></ol>'+
  '<p class="ajuda">Pronto: o servidor aparece em “Compartilhado” no app Arquivos e na hora de <b>Salvar em Arquivos</b>.</p></section>'+
  '<section class="bloco"><h2>No dia a dia</h2><ol class="passos"><li>Conclua a vistoria no app.</li><li>Toque em <b>Exportar e salvar na pasta</b> › <b>Salvar em Arquivos…</b></li><li>Escolha o servidor › sua pasta › <b>VISTORIAS</b> › <b>Salvar</b>.</li><li>No computador, a vistoria aparece no Painel do Auxiliar como “vistoria do celular”.</li></ol>'+
  '<p class="ajuda">'+ic('alerta')+'As fotos tiradas por este app ficam só nele até você exportar. Exporte no mesmo dia.</p></section></main>';
};

/* ===== Envio para a pasta da FUNAT =====
   Uma de cada vez; para na primeira falha de rede (não adianta insistir fora do Wi-Fi da FUNAT).
   silencioso: tentativa automática (ao abrir o app, ao voltar para ele, ao concluir) – sem alertas. */
let envioRodando=false;
async function enviarPendentes(op){
 op=op||{}; if(envioRodando || !podeEnviar()) return;
 if(bloqueadoParaEnviar()){ if(!op.silencioso) aviso(MSG_ATUALIZAR, 6000); return; }
 if(!MODO_WEB && cfg.pasta) await ponteParaPasta();
 const fila=pendentesEnvio(VIST);
 if(!fila.length){ if(cfg.pasta && !MODO_WEB) await enviarCorrecoesNaFila(op); return; }
 /* iPhone (ou Android sem a pasta): tudo pela internet. Vistoria que já foi pela internet continua indo por ela:
    o Painel do Auxiliar grava por cima da mesma cópia em VISTORIAS (mesmo id), sem criar uma segunda. */
 if(MODO_WEB || !cfg.pasta) return enviarPelaNuvem(fila, op);
 const filaNuvem=temNuvem()? fila.filter(v=>v.enviadaPor==='nuvem') : [], filaSmb=fila.filter(v=>filaNuvem.indexOf(v)<0);
 if(!filaSmb.length) return enviarPelaNuvem(filaNuvem, op);
 envioRodando=true; atualizarSemPerderFoco(); let ok=0, erro=null;
 const destino=caminhoSmb(cfg.pasta.caminho, 'VISTORIAS');
 try{
 for(const v of filaSmb){
  try{
   await gravarAgora();
   /* Envio que se reconhece: o nome escolhido fica guardado ANTES de ir para a pasta. Se o app morrer ou a rede cair
      depois da gravação e antes da resposta, a próxima tentativa usa o mesmo nome, e o módulo nativo só grava por cima
      se o arquivo de lá for deste mesmo caso (mesmo id). Antes, virava "nome (2).json": duas fichas do mesmo caso. */
   const jaEnviado=!!v.arquivoRemoto;
   let nome=jaEnviado? ultimaParte(v.arquivoRemoto) : (v.envioNome||'');
   if(!nome){ const base=nomeArquivoVistoria(v); for(let n=1;n<50;n++){ nome=nomeComSufixo(base,n); if(!await Pasta.existe(caminhoSmb(destino, nome))) break; } }
   if(!jaEnviado && v.envioNome!==nome){ v.envioNome=nome; await gravarVistoria(v); }
   const txt=await montarDocumento(v), local=await arquivoParaEnvio(nome, txt);
   let r; try{ r=await Pasta.enviar({origem:local, destinoPasta:destino, nome:nome, id:'campo-'+v.id, jaEnviado:jaEnviado, modificado:v.remotoMod? String(v.remotoMod) : ''}); }
   finally{ await apagarArquivoDeEnvio(nome); }
   v.precisaEnviar=false; v.enviadaEm=new Date().toISOString(); v.arquivoRemoto=r.caminho; v.remotoMod=r.modificado||0; v.envioNome=''; v.erroEnvio=''; await gravarVistoria(v); ok++;
   cfg.ultimoEnvio=Date.now(); gravarCfg();
  }catch(e){
   erro=e; const rede=e.code==='SEM_REDE';
   if(e.code==='EXISTE'){ v.envioNome=''; }   // o nome foi ocupado por OUTRO caso: a próxima tentativa escolhe outro
   /* senha recusada ou cofre ilegível (aparelho restaurado de backup) não é "falta de Wi-Fi": a mensagem aparece no cartão */
   v.erroEnvio=rede? '' : (e.message||String(e)); await gravarVistoria(v);
   if(rede || ['SEM_CONFIG','SENHA','DESTINO','NAO_ACHOU'].includes(e.code)) break;
  }
 }
 }finally{ envioRodando=false; atualizarSemPerderFoco(); }
 /* fora do Wi-Fi da FUNAT (sem a pasta), o que sobrou vai pela internet, se houver armazenamento */
 if(erro && erro.code==='SEM_REDE' && temNuvem()){ if(ok && !op.silencioso) aviso(ok+' enviada(s) para a pasta.', 3000); return enviarPelaNuvem(pendentesEnvio(VIST), op); }
 if(filaNuvem.length && !erro) await enviarPelaNuvem(filaNuvem, op);
 if(!op.silencioso){
  if(erro) alert((ok? ok+' enviada(s). ' : '')+'Não foi possível enviar: '+(erro.message||erro));
  else aviso(ok+' vistoria'+(ok>1?'s':'')+' enviada'+(ok>1?'s':'')+' para '+cfg.pasta.nome+' › VISTORIAS.', 4500);
 } else if(ok) aviso(ok+' vistoria'+(ok>1?'s':'')+' enviada'+(ok>1?'s':'')+' para a pasta da FUNAT.', 4500);
 if(!erro) await enviarCorrecoesNaFila(op);
}
/* Envio pela internet: a vistoria vai para a caixa de entrada do armazenamento (Google Drive) e o Painel do Auxiliar,
   no computador, a grava na pasta VISTORIAS. Uma de cada vez; para na primeira falha de rede. */
async function enviarPelaNuvem(fila, op){
 op=op||{}; fila=(fila||[]).filter(Boolean); if(envioRodando || !fila.length || !temNuvem()) return;
 const chave=await Planilha.chave();
 if(!chave){ if(!op.silencioso) alert('Falta a chave em Meus dados › Demandas da planilha: é ela que identifica você no envio pela internet.'); return; }
 envioRodando=true; atualizarSemPerderFoco(); let ok=0, erro=null;
 try{
  for(const v of fila){
   try{
    await gravarAgora();
    const nome=nomeArquivoVistoria(v), txt=await montarDocumento(v);
    const r=await Nuvem.enviar(urlArmazenamento(), chave, {id:'campo-'+v.id, nome:nome, conteudo:txt, origem:MODO_WEB? 'web' : 'android'});
    const agora=new Date().toISOString();
    v.precisaEnviar=false; v.enviadaEm=agora; v.enviadaPor='nuvem'; v.nuvemEm=r.recebidoEm||agora; v.nuvemArquivo=r.arquivo||''; v.recebidaEm=''; v.erroEnvio=''; if(MODO_WEB) v.exportadaEm=''; await gravarVistoria(v); ok++;
    cfg.ultimoEnvio=Date.now(); gravarCfg();
   }catch(e){
    erro=e; v.erroEnvio=e.code==='SEM_REDE'? '' : (e.message||String(e)); await gravarVistoria(v);
    if(['SEM_REDE','CHAVE','SEM_CONFIG','OCUPADO','RESPOSTA'].includes(e.code)) break;
   }
  }
 }finally{ envioRodando=false; atualizarSemPerderFoco(); }
 if(!op.silencioso){
  if(erro) alert((ok? ok+' enviada(s). ' : '')+(erro.code==='SEM_REDE'? 'Sem internet agora: as outras vão quando houver sinal.' : 'Não foi possível enviar: '+(erro.message||erro)));
  else aviso(ok+' vistoria'+(ok>1?'s':'')+' enviada'+(ok>1?'s':'')+' pela internet. Chega'+(ok>1?'m':'')+' à sua pasta quando o Painel do Auxiliar for aberto.', 5000);
 } else if(ok) aviso(ok+' vistoria'+(ok>1?'s':'')+' enviada'+(ok>1?'s':'')+' pela internet.', 4500);
}
/* Android de volta ao Wi-Fi da FUNAT: a vistoria que foi pela internet e que o computador ainda não recebeu vai para a
   pasta pelo caminho de sempre, sem depender do Painel do Auxiliar. Primeiro sai da caixa do Drive (para o painel não
   gravar depois uma versão por cima), depois volta para a fila da pasta, com o mesmo nome de arquivo que o painel usaria:
   se o painel tiver acabado de gravar, o envio grava por cima do mesmo caso (mesmo id), sem criar "(2)". */
async function ponteParaPasta(){
 if(MODO_WEB || !cfg.pasta || !temNuvem()) return 0;
 const esperando=VIST.filter(v=>v.enviadaPor==='nuvem' && !v.recebidaEm && !v.precisaEnviar); if(!esperando.length) return 0;
 try{ await Pasta.existe(caminhoSmb(cfg.pasta.caminho, 'VISTORIAS')); }catch(e){ return 0; }   // a pasta não responde: fora da FUNAT
 const chave=await Planilha.chave(); if(!chave) return 0;
 let sit; try{ sit=(await Nuvem.situacao(urlArmazenamento(), chave, esperando.map(v=>'campo-'+v.id))).situacao||{}; }catch(e){ return 0; }
 let n=0;
 for(const v of esperando){
  const x=sit['campo-'+v.id]||{};
  if(x.estado==='recebida'){ v.recebidaEm=x.em||new Date().toISOString(); await gravarVistoria(v); continue; }
  if(x.estado==='na_caixa'){
   if(!v.nuvemArquivo) continue;                                         // sem o arquivo da caixa: fica para o painel
   try{ await Nuvem.pedir(urlArmazenamento(), {acao:'confirmar', chave:chave, arquivo:v.nuvemArquivo, id:'campo-'+v.id, destino:'gravada pelo celular no Wi-Fi da FUNAT'}); }catch(e){ continue; }
  }
  v.enviadaPor=''; v.nuvemArquivo=''; v.precisaEnviar=true; v.envioNome=v.envioNome||nomeArquivoVistoria(v); await gravarVistoria(v); n++;
 }
 return n;
}
/* Pergunta ao armazenamento se as vistorias enviadas pela internet já foram gravadas na pasta pelo computador */
async function conferirRecebidas(){
 if(!temNuvem() || envioRodando) return;
 const esperando=VIST.filter(v=>v.enviadaPor==='nuvem' && !v.recebidaEm && !v.precisaEnviar); if(!esperando.length) return;
 const chave=await Planilha.chave(); if(!chave) return;
 let r; try{ r=await Nuvem.situacao(urlArmazenamento(), chave, esperando.map(v=>'campo-'+v.id)); }catch(e){ return; }
 let mudou=0;
 for(const v of esperando){ const x=(r.situacao||{})['campo-'+v.id]; if(x && x.estado==='recebida'){ v.recebidaEm=x.em||new Date().toISOString(); await gravarVistoria(v); mudou++; } }
 if(mudou && ['envios','inicio','vistorias','pronta','v'].includes(rotaAtual().nome)) atualizarSemPerderFoco();
}
/* Correções feitas sem rede: vão quando a pasta responde. Conflito não vai: espera a escolha do auxiliar. */
async function enviarCorrecoesNaFila(op){
 const fila=correcoesNaFila(); if(!fila.length || envioRodando) return;
 envioRodando=true; atualizarSemPerderFoco(); let ok=0, conflitos=0;
 for(const r of fila){ const s=await sincronizarCorrecao(r.id, {}); if(s.ok) ok++; else if(s.conflito) conflitos++; else if(s.fila) break; }
 envioRodando=false; atualizarSemPerderFoco();
 if(ok) aviso(ok+' correção(ões) encaminhada(s) para revisão.', 4500);
 if(conflitos) aviso(conflitos+' correção(ões) encontraram outra versão na pasta: escolha qual vale em Envios.', 6000);
 if(ok) atualizarDocumentos(cfg.pasta, {silencioso:true});
}
/* Redesenha a tela só se o usuário não estiver digitando (o envio roda por trás) */
function atualizarSemPerderFoco(){ const a=document.activeElement; if(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return; if(['inicio','envios','pronta','documentos','doc','vistorias','planilha','conflito','planejar','itinerario','parada'].includes(rotaAtual().nome)) mostrar(true); }

/* ---------- acesso à pasta ---------- */
let confPasta=null;
TELAS.pasta = function(){
 const c=confPasta||{host:'192.168.31.34', compartilhamento:'funat', usuario:'', dominio:'', temSenha:false};
 return topo('Pasta da FUNAT', {voltar:true, direita:'<span></span>'})+'<main class="pag com-rodape">'+
  '<section class="bloco"><h2>Acesso</h2><p class="ajuda">O mesmo usuário e senha que você usa para abrir a pasta da rede no computador. A senha fica guardada cifrada no cofre do Android e não aparece mais.</p>'+
  '<label class="campo"><span>Usuário</span><input id="pUsuario" autocomplete="username" autocapitalize="none" value="'+esc(c.usuario)+'"></label>'+
  '<label class="campo"><span>Senha</span><input id="pSenha" type="password" autocomplete="current-password" placeholder="'+(c.temSenha?'(guardada – digite só para trocar)':'')+'"></label>'+
  '<details class="mais-op"><summary>Servidor e domínio</summary><div class="linha2"><label class="campo"><span>Servidor</span><input id="pHost" inputmode="decimal" value="'+esc(c.host)+'"></label>'+
  '<label class="campo"><span>Compartilhamento</span><input id="pComp" autocapitalize="none" value="'+esc(c.compartilhamento)+'"></label></div>'+
  '<label class="campo"><span>Domínio <em>(se a rede pedir; em branco na maioria dos casos)</em></span><input id="pDom" autocapitalize="characters" value="'+esc(c.dominio)+'"></label></details>'+
  '<button class="bt pri largo" id="pTestar">'+ic('ok')+'Testar e guardar</button></section>'+
  '<section class="bloco"><h2>Sua pasta</h2><p class="ajuda">'+(cfg.pasta? 'As vistorias vão para <b>'+esc(cfg.pasta.nome)+'</b> › VISTORIAS.' : 'Escolha a pasta de documentos para revisão. As vistorias vão para a subpasta VISTORIAS dentro dela.')+'</p>'+
  '<p class="ajuda">'+ic('ok')+'O app só grava na subpasta VISTORIAS. Nada mais na rede é alterado.</p>'+
  '<button class="bt claro largo" data-ir="#escolher/'+encodeURIComponent(PASTA_BASE)+'"'+(c.temSenha?'':' disabled')+'>'+ic('lista')+(cfg.pasta?'Trocar a pasta':'Escolher a pasta')+'</button></section>'+
  (c.temSenha? '<button class="bt txt perigo apagar-v" id="pApagar">'+ic('lixo')+'Esquecer usuário e senha deste aparelho</button>' : '')+'</main>';
};
TELAS.pasta.ligar = async function(){
 if(!confPasta){ try{ confPasta=await Pasta.configuracao(); mostrar(true); }catch(e){} return; }
 $('#pTestar').onclick=async()=>{
  const o={usuario:$('#pUsuario').value.trim(), senha:$('#pSenha').value, host:$('#pHost').value.trim(), compartilhamento:$('#pComp').value.trim(), dominio:$('#pDom').value.trim()};
  if(!o.usuario){ aviso('Escreva o usuário.'); return; } if(!o.senha && !confPasta.temSenha){ aviso('Escreva a senha.'); return; }
  ocupado('Conectando ao servidor '+o.host+'…');
  try{ await Pasta.salvar(o); const r=await Pasta.testar(PASTA_BASE); confPasta=await Pasta.configuracao(); ocupado(false); mostrar(true);
   alert(r.existe? 'Conectado. A pasta '+PASTA_BASE.replace(/\\/g,' › ')+' foi encontrada.\n\nAgora escolha a sua pasta.' : 'Conectado, mas a pasta '+PASTA_BASE.replace(/\\/g,' › ')+' não foi encontrada nesse compartilhamento.'); }
  catch(e){ ocupado(false); confPasta=await Pasta.configuracao().catch(()=>confPasta); mostrar(true); alert('Não conectou: '+(e.message||e)); }
 };
 if($('#pApagar')) $('#pApagar').onclick=async()=>{ if(!confirm('Apagar o usuário e a senha guardados neste aparelho? As vistorias não são apagadas.')) return; await Pasta.apagar(); confPasta=await Pasta.configuracao(); delete cfg.pasta; gravarCfg(); mostrar(true); };
};

/* Pode ser escolhida: pasta dentro de FISCALIZAÇÃO 2026 (ou de outro ano), ou de TESTE; nunca as subpastas de estado */
function pastaEscolhivel(cam){ const p=String(cam||'').split('\\'); const n=(p[p.length-1]||'').toUpperCase();
 // pasta de auxiliar (dentro de uma pasta anual) ou pasta de teste logo abaixo de FISCALIZAÇÃO
 return /^FISCALIZA/i.test(p[0]) && cam!==PASTA_BASE && (p.length>=3 || (p.length===2 && /TESTE/.test(n))) && !['VISTORIAS','DEVOLVIDOS','APROVADOS','MODELOS'].includes(n); }
/* "Documentos para revisão - FELIS" é de Felisberto: compara o fim do nome da pasta com os nomes de quem usa o app */
function semAcento(t){ return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(); }
function pastaEhMinha(nomePasta){
 if(/TESTE/i.test(nomePasta)) return true;
 const fim=semAcento(nomePasta).split('-').pop().split(/\s+/).filter(x=>x.length>=3), meus=semAcento(cfg.nome).split(/\s+/).filter(x=>x.length>=3);
 return fim.some(t=>meus.some(n=>n.startsWith(t)||t.startsWith(n)));
}
/* Navegar pelas pastas do servidor (só pastas; nada é aberto nem alterado) */
TELAS.escolher = function(cam, modo){
 cam=cam||PASTA_BASE; const nome=ultimaParte(cam), consulta=modo==='consulta', podeUsar=consulta? (cam.split('\\').length>=3) : pastaEscolhivel(cam);
 const acima=cam.split('\\').slice(0,-1).join('\\');
 return topo(consulta? 'Ver outra pasta' : 'Escolher a pasta', {voltar:true, direita:'<span></span>'})+'<main class="pag com-rodape"><p class="trilha-pasta">'+cam.split('\\').map(esc).join(' › ')+'</p>'+
  (acima? '<button class="item-pasta" data-ir="#escolher/'+encodeURIComponent(acima)+(consulta?'/consulta':'')+'">'+ic('voltar')+'<span>Pasta de cima</span></button>' : '')+
  '<div id="ePastas"><div class="vazio"><div class="giro"></div><p>Lendo a pasta…</p></div></div>'+
  '<div class="rodape-fixo"><button class="bt pri largo" id="eUsar"'+(podeUsar?'':' disabled')+'>'+(podeUsar? (consulta? 'Ver “'+esc(nome)+'”' : 'Usar “'+esc(nome)+'”') : (consulta? 'Entre numa pasta' : 'Entre na sua pasta de documentos'))+'</button></div></main>';
};
TELAS.escolher.ligar = async function(cam, modo){
 cam=cam||PASTA_BASE; const consulta=modo==='consulta';
 if(consulta) $('#eUsar').onclick=()=>{ cfg.pastaConsulta={caminho:cam, nome:ultimaParte(cam)}; if(cfg.pasta && cfg.pasta.caminho===cam) delete cfg.pastaConsulta; gravarCfg(); docsErro=''; location.hash='#documentos'; };
 else $('#eUsar').onclick=async()=>{ const nome=ultimaParte(cam);
  if(!pastaEhMinha(nome) && !confirm('A pasta “'+nome+'” não parece ser de '+primeiroNome(cfg.nome)+'.\n\nAs suas vistorias vão para dentro dela (subpasta VISTORIAS). Tem certeza?')) return;
  cfg.pasta={caminho:cam, nome:nome}; gravarCfg(); aviso('Pasta escolhida: '+nome+'.'); location.hash='#pasta'; };
 try{
  const itens=(await Pasta.listar(cam)).filter(i=>i.pasta && !/^\./.test(i.nome)).sort((a,b)=>a.nome.localeCompare(b.nome,'pt'));
  if(rotaAtual().nome!=='escolher') return;
  $('#ePastas').innerHTML=itens.length? itens.map(i=>'<button class="item-pasta'+(pastaEhMinha(i.nome)?' minha':'')+'" data-ir="#escolher/'+encodeURIComponent(caminhoSmb(cam,i.nome))+(consulta?'/consulta':'')+'">'+ic('pasta')+'<span>'+esc(i.nome)+'</span>'+(pastaEhMinha(i.nome)?'<em>'+(/TESTE/i.test(i.nome)?'teste':'sua')+'</em>':'')+'</button>').join('') : '<div class="vazio"><p>Nenhuma subpasta aqui.</p></div>';
 }catch(e){ $('#ePastas').innerHTML='<div class="nota-alerta forte">'+ic('alerta')+'<span>'+esc(e.message||e)+'</span></div>'; }
};

/* ---------- detalhe da foto ---------- */
TELAS.foto = function(id, n){
 const v=acharVistoria(id); n=+n; if(!v || !v.fotos[n]) return naoAchou(); const f=v.fotos[n], x=f.exif, al=alertasFoto(v,f), d=x? distanciaM(x, v.local) : null;
 const tamLeg=String(f.legenda||'').length;
 return topo('Detalhe da foto', {voltar:true, direita:'<span></span>'})+'<main class="pag com-rodape sem-margem"><div class="foto-grande"><img data-foto="'+f.id+'" alt="Foto '+(n+1)+'" id="fImg"><span class="contador">'+ic('camera')+'FOTO '+(n+1)+' DE '+v.fotos.length+'</span>'+
  (n>0? '<a class="seta esq" href="#foto/'+id+'/'+(n-1)+'" aria-label="Foto anterior">'+ic('voltar')+'</a>' : '')+(n<v.fotos.length-1? '<a class="seta dir" href="#foto/'+id+'/'+(n+1)+'" aria-label="Próxima foto">'+ic('voltar')+'</a>' : '')+'</div>'+
  '<div class="pad">'+al.map(a=>'<div class="nota-alerta forte">'+ic('alerta')+'<span>'+esc(a.texto)+(a.tipo==='data'?' Confira se a foto é desta vistoria.':'')+'</span></div>').join('')+
  '<section class="bloco dados-foto"><div class="df">'+ic('relogio')+'<div><small>Data e horário do registro</small><b>'+(x&&x.data? esc(dataBrCampo(x.data)+(x.hora?' às '+x.hora.slice(0,5).replace(':','h'):'')) : 'O arquivo não traz a data')+'</b>'+(x&&x.origemData?'<small>pelo relógio do aparelho</small>':'')+'</div></div>'+
  '<div class="df">'+ic('alvo')+'<div><small>Posição</small><b>'+(x&&x.e!==undefined? esc(utmTexto(x)) : 'O arquivo não traz a posição')+'</b>'+(x&&x.origemLocal?'<small>pelo GPS do aparelho na hora da foto</small>':'')+'</div></div>'+
  (d!==null? '<div class="df '+(d>300?'mau':'bom')+'">'+ic(d>300?'alerta':'ok')+'<div><b>a '+esc(distanciaTexto(d))+' do local da vistoria</b></div></div>' : '')+'</section>'+
  '<section class="bloco"><div class="h-cont"><h2>Legenda <span class="obrig">*</span></h2><small id="fCont">'+tamLeg+' / 200</small></div>'+
  '<textarea id="fLeg" rows="3" maxlength="200" placeholder="O que esta foto mostra">'+esc(f.legenda)+'</textarea><p class="ajuda">Obrigatória para compor o documento.</p>'+
  '<div class="sugestoes">'+SUGESTOES_LEGENDA.map(s=>'<button class="chip" data-sug="'+esc(s)+'">'+ic('mais')+esc(s)+'</button>').join('')+'</div></section>'+
  '<div class="c-ac"><button class="bt claro" id="fGirar">'+ic('girar')+'Girar</button><button class="bt perigo-claro" id="fExcluir">'+ic('lixo')+'Excluir foto</button></div></div>'+
  '<div class="rodape-fixo"><button class="bt pri largo" id="fOk">Salvar legenda e continuar</button></div></main>';
};
TELAS.foto.ligar = function(id, n){
 const v=acharVistoria(id); n=+n; if(!v || !v.fotos[n]) return; const f=v.fotos[n]; preencherImagens(v);
 const leg=$('#fLeg'); leg.oninput=()=>{ f.legenda=leg.value; $('#fCont').textContent=leg.value.length+' / 200'; gravarDepois(v); };
 $$('[data-sug]').forEach(b=>b.onclick=()=>{ leg.value=(leg.value.trim()? leg.value.trim()+' – ' : '')+b.dataset.sug; leg.dispatchEvent(new Event('input')); leg.focus(); });
 $('#fImg').onclick=()=>{ const o=document.createElement('div'); o.className='tela-cheia'; o.innerHTML='<img src="'+$('#fImg').src+'" alt=""><button class="bt-ic" aria-label="Fechar">'+ic('fechar')+'</button>'; o.onclick=()=>o.remove(); document.body.appendChild(o); };
 $('#fGirar').onclick=async()=>{ ocupado('Girando…'); try{ const atual='data:image/jpeg;base64,'+await Arquivos.lerBase64(caminhoFoto(v,f)); const g=await girarDataUrl(atual);
  await Arquivos.gravarBase64(caminhoFoto(v,f), soBase64(g.data)); f.w=g.w; f.h=g.h; f.versao=(f.versao||0)+1; await gravarVistoria(v); }catch(e){ alert('Não foi possível girar: '+(e.message||e)); } ocupado(false); mostrar(true); };
 $('#fExcluir').onclick=async()=>{ if(!confirm('Excluir a foto '+(n+1)+' desta vistoria?')) return; await Arquivos.apagar(caminhoFoto(v,f)); v.fotos.splice(n,1); await gravarVistoria(v);
  history.replaceState(null, '', v.fotos.length? '#foto/'+id+'/'+Math.min(n, v.fotos.length-1) : '#v/'+id); mostrar(); aviso('Foto excluída.'); };
 $('#fOk').onclick=async()=>{ await gravarAgora(); const prox=v.fotos.findIndex((g,i)=>i>n && !String(g.legenda||'').trim());
  if(prox>=0){ history.replaceState(null, '', '#foto/'+id+'/'+prox); mostrar(); } else history.back(); };
};

/* ======================= DOCUMENTOS DA PASTA (só leitura) =======================
   Lê os .json da pasta do auxiliar (raiz, DEVOLVIDOS, APROVADOS, VISTORIAS…) e mostra o andamento de cada
   documento, como o Painel do Auxiliar. Guarda um resumo no aparelho: só relê o arquivo que mudou. */
let CACHE_DOCS = null, docsLendo = false, docsErro = '';
async function cacheDocs(){ if(!CACHE_DOCS){ try{ CACHE_DOCS=JSON.parse(await Arquivos.lerTexto('docs-cache.json')); }catch(e){ CACHE_DOCS={}; } } return CACHE_DOCS; }
function pastaDocs(){ return cfg.pastaConsulta || cfg.pasta || null; }
function docsDe(p){ const c=CACHE_DOCS && p && CACHE_DOCS[p.caminho]; return c? unirDocumentos(Object.values(c.arquivos).map(a=>a.resumo)) : []; }
function lidoEmDe(p){ const c=CACHE_DOCS && p && CACHE_DOCS[p.caminho]; return c? c.lidoEm : 0; }
async function atualizarDocumentos(p, op){
 op=op||{}; if(!p || docsLendo) return; docsLendo=true; docsErro=''; atualizarSemPerderFoco();
 try{
  const cache=await cacheDocs(); const c=cache[p.caminho]||(cache[p.caminho]={lidoEm:0, arquivos:{}});
  /* TESES\: banco de teses publicado pelo revisor – não é documento */
  /* EXCLUIDOS\: documentos excluídos nos painéis do computador (lixeira) – não aparecem no app */
  const lista=(await Pasta.listarJson(p.caminho, 2)).filter(a=>!/(^|[\\/])EXCLU[IÍ]\u0301?DOS[\\/]/i.test(a.caminho) && !/(^|[\\/])(BANCO DE )?TESES[\\/]/i.test(a.caminho)), vistos=new Set(), mudou=[];
  const propria=!cfg.pastaConsulta && cfg.pasta && p.caminho===cfg.pasta.caminho;
  lista.forEach(a=>{ vistos.add(a.caminho); const v=c.arquivos[a.caminho];
   if(!v || v.modificado!==a.modificado || v.tamanho!==a.tamanho || (propria && v.resumo && v.resumo.status==='devolvido' && !v.offline)) mudou.push(a); });
  Object.keys(c.arquivos).forEach(k=>{ if(!vistos.has(k)) delete c.arquivos[k]; });
  for(let i=0;i<mudou.length;i+=8){
   const lote=mudou.slice(i,i+8), lidos=await Pasta.lerVarios(p.caminho, lote.map(a=>a.caminho));
   lidos.forEach((r,j)=>{ const a=lote[j]; let res=null; if(!r.erro){ try{ res=resumoDocumento(JSON.parse(r.texto), a.caminho.replace(/\\/g,'/'), a.modificado); }catch(e){} }
    c.arquivos[a.caminho]={modificado:a.modificado, tamanho:a.tamanho, resumo:res};
    /* devolvido da própria pasta: guarda a cópia (sem fotos) para corrigir sem rede */
    if(propria && res && res.status==='devolvido'){ c.arquivos[a.caminho].offline=true; guardarCopia(res.id, a.caminho, a.modificado, a.tamanho, r.texto).catch(()=>{}); }
    else if(propria && res && !RASCS[res.id]) Arquivos.apagar(caminhoCopia(res.id)).catch(()=>{}); });
  }
  c.lidoEm=Date.now(); await Arquivos.gravarTexto('docs-cache.json', JSON.stringify(cache));
  if(!op.silencioso && mudou.length) aviso(mudou.length+' arquivo'+(mudou.length>1?'s':'')+' lido'+(mudou.length>1?'s':'')+' da pasta.');
 }catch(e){ docsErro=e.message||String(e); if(!op.silencioso) aviso('Não foi possível ler a pasta: '+docsErro, 5000); }
 docsLendo=false; atualizarSemPerderFoco();
}
/* A trilha do documento, igual à do computador: elab. → revisão → devolvido → aprov. → 1Doc */
function trilhaDoc(d){
 const st=d.status, n=d.devolucoes||0, postado=!!d.postado;
 const passos=[st==='em_elaboracao'?'e':'f', st==='aguardando_revisao'?'a':((st==='devolvido'||st==='aprovado')?'f':''), st==='devolvido'?'d':(n?'dp':(st==='aprovado'?'s':'')), st==='aprovado'?'f':'', postado?'f':'']
  .map(c=> postado && (c==='f'||c==='dp')? 'c' : c);
 const marca=i=>(i===2&&n)? String(n) : ((i===3&&st==='aprovado')||(i===4&&postado))? '✓' : '';
 let h='<div class="trilha" role="img" aria-label="Andamento: '+esc(ESTADOS_DOC[st])+(n?', devolvido '+n+' vez(es)':'')+(postado?', no 1Doc':'')+'">';
 passos.forEach((c,i)=>{ if(i) h+='<i class="'+(c&&c!=='e'?(postado?'c':'f'):'')+'"></i>'; h+='<span class="p '+c+'">'+marca(i)+'</span>'; });
 return h+'</div><div class="trilha-leg" aria-hidden="true"><span>elab.</span><span>revisão</span><span>devolvido</span><span>aprov.</span><span>1Doc</span></div>';
}
function dataCurta(iso){ if(!iso) return ''; const d=new Date(iso); return isNaN(d)? '' : doisDig(d.getDate())+'/'+doisDig(d.getMonth()+1); }
function situacaoDoc(d){
 const g=grupoDocumento(d);
 if(g==='postado') return 'No 1Doc'+(d.postado.data? ' desde '+dataCurta(d.postado.data) : '');
 if(g==='devolvido'){ const u=ultimoAtoDoc(d,'devolvido'); return (d.notasAbertas? d.notasAbertas+' apontamento'+(d.notasAbertas>1?'s':'')+' em aberto' : 'Apontamentos resolvidos: reenviar')+(u? ' · devolvido '+quandoRelativo(u.data)+(u.autor?' por '+primeiroNome(u.autor):'') : ''); }
 if(g==='aprovado'){ const u=ultimoAtoDoc(d,'aprovado'); return 'Aprovado'+(u? ' '+quandoRelativo(u.data) : '')+' · falta postar no 1Doc'; }
 if(g==='revisor'){ const u=ultimoAtoDoc(d,'encaminhado'), du=u? diasUteisDesde(u.data) : null; return 'Com o revisor'+(du!==null? (du? ' há '+du+' dia'+(du>1?'s':'')+' úte'+(du>1?'is':'l') : ' desde hoje') : ''); }
 if(g==='celular') return 'Vistoria do celular · escreva o documento no computador';
 return 'Em elaboração'+(d.modificado? ' · arquivo de '+dataCurta(new Date(d.modificado).toISOString()) : '');
}
function cartaoDoc(d){
 const g=grupoDocumento(d), du=g==='revisor'? diasUteisDesde((ultimoAtoDoc(d,'encaminhado')||{}).data) : null;
 return '<a class="cartao doc g-'+g+'" href="#doc/'+encodeURIComponent(d.id)+'"><div class="c-l1">'+tagTipo(d.tipo)+'<b>'+esc(d.protocolo||'(sem protocolo)')+'</b>'+(du>=5? '<span class="idade">'+du+' dias úteis</span>' : '')+'</div>'+
  (d.titulo? '<h3>'+esc(d.titulo)+'</h3>' : '')+trilhaDoc(d)+'<p class="sit">'+esc(situacaoDoc(d))+'</p>'+
  (g==='devolvido' && d.notaAberta? '<div class="cita">'+ic('alerta')+'<span><b>'+esc(d.notaAberta.rotulo)+':</b> “'+esc(d.notaAberta.texto)+'”</span></div>' : '')+'</a>';
}
const GRUPOS_DOC=[['devolvido','Precisam de correção'],['aprovado','Aprovados: falta postar no 1Doc'],['revisor','Com o revisor'],['celular','Vistorias do celular'],['elaboracao','Em elaboração'],['postado','No 1Doc']];
let filtroDocs='';
TELAS.documentos = function(){
 const p=pastaDocs();
 if(!p) return topo('Documentos')+'<main class="pag com-nav"><div class="bloco info">'+ic('pasta')+'<div><b>Pasta da FUNAT não configurada</b><p class="ajuda">Configure o acesso para ver o andamento dos seus documentos.</p><button class="bt pri largo" data-ir="#pasta">Configurar agora</button></div></div></main>'+navInferior('#documentos');
 const docs=docsDe(p), lido=lidoEmDe(p), q=filtroDocs.trim().toLowerCase();
 const filtrados=docs.filter(d=>!q || [d.protocolo,d.titulo,d.elaborador].join(' ').toLowerCase().includes(q));
 const porGrupo=g=>filtrados.filter(d=>grupoDocumento(d)===g).sort((a,b)=>(b.modificado||0)-(a.modificado||0));
  const ordem=GRUPOS_DOC.map(([g])=>porGrupo(g)).reduce((a,l)=>a.concat(l),[]);
  if(LARGO() && ordem.length && !ordem.some(d=>d.id===selDoc)) selDoc=ordem[0].id;
  const escolhido=LARGO()? ordem.find(d=>d.id===selDoc) : null;
  return topo('Documentos')+'<main class="pag com-nav"><div class="duas-col lista-det docs"><div class="col-a">'+
  '<div class="pasta-atual">'+ic('pasta')+'<div><b>'+esc(p.nome)+'</b><small>'+(cfg.pastaConsulta? 'Só consulta · ' : '')+(docsLendo? 'Lendo a pasta…' : lido? 'Lida '+esc(quandoRelativo(new Date(lido).toISOString())) : 'Ainda não lida')+'</small></div>'+
  '<button class="bt-ic" id="dAtualizar" aria-label="Ler a pasta de novo"'+(docsLendo?' disabled':'')+'>'+(docsLendo? '<div class="giro"></div>' : ic('girar'))+'</button></div>'+
  '<div class="c-ac troca">'+(cfg.pastaConsulta? '<button class="bt txt" id="dMinha">'+ic('voltar')+'Voltar para a minha pasta</button>' : '')+'<button class="bt txt" data-ir="#escolher/'+encodeURIComponent(PASTA_BASE)+'/consulta">'+ic('busca')+'Ver outra pasta</button></div>'+
  (docsErro? '<p class="nota-alerta">'+ic('alerta')+'<span>'+esc(docsErro)+(lido?' Mostrando o que foi lido antes.':'')+'</span></p>' : '')+
  (docs.length>6? '<label class="busca">'+ic('busca')+'<input id="dBusca" type="search" placeholder="Buscar protocolo ou nome" value="'+esc(filtroDocs)+'"></label>' : '')+
  (docs.length? GRUPOS_DOC.map(([g,r])=>{ const l=porGrupo(g); if(!l.length) return ''; const lim=g==='postado'? 8 : 999;
    return '<h2 class="secao g-'+g+'">'+r+' <span class="cont">'+l.length+'</span></h2>'+l.slice(0,lim).map(cartaoDoc).join('')+(l.length>lim? '<p class="ajuda">e mais '+(l.length-lim)+' no 1Doc.</p>' : ''); }).join('')
   : '<div class="vazio">'+ic('arquivo')+'<p>'+(lido? 'Nenhum documento das ferramentas nesta pasta.' : docsLendo? 'Lendo…' : 'Toque em ↻ para ler a pasta (no Wi-Fi da FUNAT).')+'</p></div>')+
  '</div><aside class="col-b so-largo doc-lado">'+(escolhido? corpoDoc(escolhido) : '')+'</aside></div></main>'+navInferior('#documentos');
};
TELAS.documentos.ligar = function(){
 const p=pastaDocs(); if(!p) return;
 /* tablet deitado: tocar no documento mostra à direita (com o histórico), sem sair da lista */
 if(LARGO()) $$('#app .col-a a.cartao.doc').forEach(a=>a.onclick=e=>{ e.preventDefault(); selDoc=decodeURIComponent(a.getAttribute('href').replace(/^#doc\//,'')); mostrar(true); });
 if(LARGO()) $$('#app .col-a a.cartao.doc').forEach(a=>a.classList.toggle('sel', decodeURIComponent(a.getAttribute('href').replace(/^#doc\//,''))===selDoc));
 cacheDocs().then(()=>{ if(rotaAtual().nome==='documentos' && !$('.cartao.doc') && docsDe(p).length) mostrar(true); });
 if($('#dAtualizar')) $('#dAtualizar').onclick=()=>atualizarDocumentos(p, {});
 if($('#dMinha')) $('#dMinha').onclick=()=>{ delete cfg.pastaConsulta; gravarCfg(); docsErro=''; mostrar(); if(Date.now()-lidoEmDe(pastaDocs())>5*60e3) atualizarDocumentos(pastaDocs(), {silencioso:true}); };
 const b=$('#dBusca'); if(b) b.oninput=()=>{ filtroDocs=b.value; const pos=b.selectionStart; mostrar(true); const n=$('#dBusca'); n.focus(); n.setSelectionRange(pos,pos); };
 if(!docsLendo && Date.now()-lidoEmDe(p)>5*60e3) atualizarDocumentos(p, {silencioso:true});
};
TELAS.doc = function(id){
 const d=docsDe(pastaDocs()).find(x=>x.id===id); if(!d) return topo('Documento', {voltar:true})+'<main class="pag"><div class="vazio"><p>Documento não encontrado na última leitura da pasta.</p></div></main>';
 return topo('Documento', {voltar:true, direita:'<span></span>'})+'<main class="pag">'+corpoDoc(d)+'</main>';
};
/* o documento: situação, trilha, apontamentos, correção e histórico (tela própria no celular; lado direito no tablet) */
function corpoDoc(d){
 const notas=d.notas.slice().sort((a,b)=>a.resolvida-b.resolvida);
 return '<section class="bloco"><div class="c-l1">'+tagTipo(d.tipo)+'<span class="pilula">'+esc(ESTADOS_DOC[d.status])+(d.postado?' · no 1Doc':'')+'</span></div><h2 class="prot">'+esc(d.protocolo||'(sem protocolo)')+'</h2>'+(d.titulo?'<p>'+esc(d.titulo)+'</p>':'')+
  trilhaDoc(d)+'<p class="sit">'+esc(situacaoDoc(d))+'</p>'+
  '<dl class="dados-doc"><dt>Elaborado por</dt><dd>'+esc(d.elaborador||'–')+'</dd><dt>Vistoria</dt><dd>'+esc(d.datas.map(dataBrCampo).join(', ')||'–')+'</dd><dt>Fotos</dt><dd>'+d.fotos+'</dd><dt>Arquivo</dt><dd class="cam">'+esc(d.caminho)+'</dd></dl></section>'+
  (notas.length? '<section class="bloco"><h2>Apontamentos do revisor <span class="cont">'+d.notasAbertas+' em aberto</span></h2>'+notas.map(n=>'<div class="nota '+(n.resolvida?'ok':'aberta')+'"><div class="n-cab"><b>'+esc(n.rotulo)+'</b><span class="pilula">'+(n.resolvida?'resolvido':'em aberto')+'</span></div><p>'+esc(n.texto)+'</p>'+(n.resposta?'<p class="resp"><b>Resposta:</b> '+esc(n.resposta)+'</p>':'')+'<small>'+esc([n.autor, n.data? dataCurta(n.data) : ''].filter(Boolean).join(' · '))+'</small></div>').join('')+
   '</section>' : '')+
  ((d.status==='devolvido' || RASCS[d.id]) && !cfg.pastaConsulta? (RASCS[d.id] && RASCS[d.id].conflito? '<button class="bt pri largo alto" data-ir="#conflito/'+encodeURIComponent(d.id)+'">'+ic('alerta')+'Escolher a versão</button>'
    : '<button class="bt pri largo alto" data-ir="#corrigir/'+encodeURIComponent(d.id)+'">'+ic('lapis')+(RASCS[d.id]? (RASCS[d.id].pendente? 'Correção na fila – abrir' : 'Continuar a correção') : 'Corrigir no celular')+'</button>')+
   '<p class="ajuda">Funciona sem rede: o que você corrigir vai para a pasta quando o celular voltar ao Wi-Fi da FUNAT. Ou corrija no computador (Painel do Auxiliar › Corrigir).</p>' : '')+
  (d.historico.length? '<section class="bloco"><h2>Histórico</h2><ol class="hist">'+d.historico.slice().reverse().map(h=>'<li><b>'+esc(h.acao)+'</b><small>'+esc([h.autor, h.data? new Date(h.data).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}) : ''].filter(Boolean).join(' · '))+'</small></li>').join('')+'</ol></section>' : '')+
  '';
}

/* ======================= DEMANDAS DA PLANILHA (fase 1: só leitura) =======================
   A lista vem do script da planilha (aplicativo da web) e fica guardada no aparelho para usar no campo,
   sem internet. Uma demanda some de "Para vistoriar" quando ganha vistoria no app ou "Fiscalizado" na planilha. */
let DEMANDAS = null, demLendo = false, demErro = '';
function urlPlanilha(){ return cfg.urlPlanilha || (typeof CONFIG_APP!=='undefined' && CONFIG_APP.urlPlanilha) || ''; }
/* Armazenamento pela internet (script "FUNAT – armazenamento"): no iPhone é o envio; no Android, quando o celular não está no Wi-Fi da FUNAT */
function urlArmazenamento(){ return cfg.urlArmazenamento || (typeof CONFIG_APP!=='undefined' && CONFIG_APP.urlArmazenamento) || ''; }
function temNuvem(){ return !!urlArmazenamento(); }
function podeEnviar(){ return (!!cfg.pasta && !MODO_WEB) || temNuvem(); }
async function carregarDemandas(){ if(!DEMANDAS){ try{ DEMANDAS=JSON.parse(await Arquivos.lerTexto('demandas.json')); }catch(e){ DEMANDAS={lidoEm:0, fiscal:'', itens:[]}; } } return DEMANDAS; }
async function atualizarDemandas(op){
 op=op||{}; if(demLendo || !cfg.planilhaAtiva) return; demLendo=true; demErro=''; atualizarSemPerderFoco();
 try{
  const r=await Planilha.buscar(urlPlanilha(), await Planilha.chave());
  DEMANDAS={lidoEm:Date.now(), fiscal:r.fiscal, itens:r.demandas||[], equipe:r.equipe||null, base:r.base||null, versaoScript:r.versaoScript||''};   /* equipe e base: script V49 */
  await Arquivos.gravarTexto('demandas.json', JSON.stringify(DEMANDAS));
  if(!op.silencioso) aviso('Planilha lida: '+DEMANDAS.itens.length+' demanda'+(DEMANDAS.itens.length===1?'':'s')+' em aberto.');
 }catch(e){ demErro=e.message||String(e); if(!op.silencioso) aviso(demErro, 5000); }
 demLendo=false; atualizarSemPerderFoco();
}
/* Uma demanda pode ter várias visitas (retorno ao local): vistoriaDe devolve a mais recente */
function vistoriasDe(d){ const id=idDemanda(d); return VIST.filter(v=>v.demanda && v.demanda.id===id).sort(ordemVisitas); }
function vistoriaDe(d){ return vistoriasDe(d)[0]||null; }
function documentoDe(d){ if(!cfg.pasta) return null; const k=chaveProtocolo(d.protocolo); return docsDe(cfg.pasta).find(x=>mesmoProtocolo(k, x.protocolo))||null; }
/* Para vistoriar = abertas, sem "Fiscalizado" na planilha e sem vistoria no app; mais antigas primeiro */
/* A planilha (script V47+) já diz a situação de cada demanda, pelas mesmas regras dos e-mails semanais */
function naoIniciada(d){ return d.situacao? d.situacao==='nao_iniciada' : !fiscalizadaEm(d); }
function demandasParaVistoriar(){ return ((DEMANDAS&&DEMANDAS.itens)||[]).filter(d=>naoIniciada(d) && !vistoriaDe(d)).sort((a,b)=>dataBrParaIso(a.repasse||a.entrada).localeCompare(dataBrParaIso(b.repasse||b.entrada))); }
function demandasFiscalizadas(){ return ((DEMANDAS&&DEMANDAS.itens)||[]).filter(d=>!naoIniciada(d) || (vistoriaDe(d)||{}).status==='concluida'); }
function cartaoDemanda(d){
 const du=diasUteisDesde(dataBrParaIso(d.repasse||d.entrada)), f=fiscalizadaEm(d), doc=documentoDe(d), v=vistoriaDe(d), id=encodeURIComponent(idDemanda(d));
 const e=separarEndereco(d.endereco);
 return '<article class="cartao demanda'+(du>=15?' velha':'')+(selVist==='d:'+idDemanda(d)?' sel':'')+'" data-sel="d:'+esc(idDemanda(d))+'"><div class="c-l1"><span class="tag t-planilha">PLANILHA</span><b>'+esc(d.protocolo)+'</b>'+(du!==null? '<span class="idade'+(du>=15?' muito':'')+'">'+(du? 'há '+du+' dia'+(du>1?'s':'')+' úte'+(du>1?'is':'l') : 'hoje')+'</span>' : '')+'</div>'+
  (d.assunto? '<h3>'+esc(d.assunto)+'</h3>' : '')+(d.endereco? '<p class="loc">'+ic('pino')+esc([e.bairro,e.endereco].filter(Boolean).join(' · '))+'</p>' : '')+
  '<p class="st">'+esc(!naoIniciada(d) && d.situacaoTexto? d.situacaoTexto+(f? ' · fiscalizado em '+dataBrCampo(f) : '') : f? 'Fiscalizado em '+dataBrCampo(f)+' (planilha)' : v? ((ehRetorno(v)? numeroVisita(v)+'ª visita ' : 'Vistoria ')+(v.status==='concluida'? 'concluída no app' : 'em andamento no app')) : 'Ainda não vistoriada · repassada em '+(d.repasse||d.entrada||'?'))+'</p>'+
  (d.observacoes? '<p class="obs">'+ic('lapis')+esc(d.observacoes)+'</p>' : '')+(d.diligencias && !/^\s*fiscaliz\w*\s*\d/i.test(d.diligencias)? '<p class="obs">'+ic('lista')+esc(d.diligencias)+'</p>' : '')+
  (doc? '<a class="doc-ligado" href="#doc/'+encodeURIComponent(doc.id)+'">'+ic('arquivo')+'<span>Documento: '+esc(situacaoDoc(doc))+'</span></a>' : '')+
  '<div class="c-ac">'+(v? '<button class="bt '+(v.status==='concluida'? 'sec' : 'pri')+'" data-ir="#v/'+v.id+'">'+ic('lapis')+(ehRetorno(v)? 'Abrir visita' : 'Abrir vistoria')+'</button>' : naoIniciada(d)? '<button class="bt pri" data-demanda="'+id+'">'+ic('camera')+'Iniciar vistoria</button>' : '')+
  ((v? v.status==='concluida' : !naoIniciada(d))? '<button class="bt '+(v? 'claro' : 'pri')+'" data-retorno="'+id+'">'+ic('girar')+'Voltar ao local</button>' : '')+
  (d.endereco? '<button class="bt txt" data-mapa-end="'+esc(d.endereco)+'">'+ic('mapa')+'Mapa</button>' : '')+'</div></article>';
}
function tipoSugerido(d){ const a=semAcento(d.assunto); return /RUIDO|SOM |SONOR|BARULHO/.test(a)? 'termo_ruido' : 'relatorio_simplificado'; }
async function iniciarDaDemanda(id){
 const d=((DEMANDAS&&DEMANDAS.itens)||[]).find(x=>idDemanda(x)===id);
 if(!d){ aviso('Esta demanda não está mais na sua lista da planilha (redistribuída ou encerrada). Toque em "Ler agora" em Meus dados para conferir.', 7000); return false; }
 const ja=vistoriaDe(d); if(ja && ja.status!=='concluida'){ location.hash='#v/'+ja.id; return true; }
 if(ja) return !!(await voltarAoLocal({d:d}));      /* já vistoriada: iniciar de novo é um retorno ao local */
 const v=vistoriaDaDemanda(d, tipoSugerido(d)); iniciarVistoria(v); await gravarVistoria(v);
 location.hash='#v/'+v.id; aviso('Vistoria iniciada às '+v.horaVistoria+'. Confira o tipo de documento em “Editar dados”.', 4500);
}
/* ======================= TABLET: listas com detalhe ao lado =======================
   Só no tablet deitado (1000 px ou mais). No celular e no tablet em pé, tudo continua como antes. */
const LARGO=()=>!!(window.matchMedia && matchMedia('(min-width:1000px)').matches);
try{ matchMedia('(min-width:1000px)').addEventListener('change', ()=>mostrar(true)); }catch(e){}
let selVist='', selDoc='', ITENS_VIST=[], mapaLado=null;
/* tocar no cartão (fora dos botões) escolhe o item */
function ligarSelecao(seletor, fn){
 if(!LARGO()) return;
 $$(seletor+' [data-sel]').forEach(c=>c.onclick=e=>{ if(e.target.closest('button,a,input,select,textarea,label')) return; fn(c.dataset.sel); });
}
function pontoDoItem(x){
 if(x.v) return x.v.local && x.v.local.lat!==undefined? {lat:x.v.local.lat, lng:x.v.local.lon} : null;
 return typeof pontoDe==='function'? pontoDe(x.d) : null;
}
function painelVistoria(itens){
 const x=itens.find(i=>i.sel===selVist);
 if(!x) return '<div class="vazio"><p>Nada para mostrar nesta aba.</p></div>';
 const v=x.v, d=x.d;
 return '<div id="mapaLado" class="it-mapa lado" role="img" aria-label="Mapa"></div>'+
  '<div class="lado-detalhe">'+(d? cartaoDemanda(d) : (abaVist==='retornos'? cartaoRetorno(v) : cartao(v)))+
  (v && v.anotacoes? '<section class="bloco"><h2>Anotações de campo</h2><p class="cita-ant">'+esc(String(v.anotacoes).slice(0,600))+'</p></section>' : '')+
  (d && (d.diligencias||d.observacoes)? '<section class="bloco"><h2>Na planilha</h2>'+(d.diligencias? '<p><b>Diligências:</b> '+esc(d.diligencias)+'</p>' : '')+(d.observacoes? '<p><b>Observações:</b> '+esc(d.observacoes)+'</p>' : '')+'</section>' : '')+'</div>';
}
/* mapa do lado direito: os itens da aba numerados, o escolhido em destaque */
function desenharMapaVistorias(itens){
 const el=document.getElementById('mapaLado'); if(!el || typeof L==='undefined' || !el.offsetWidth) return;
 if(mapaLado){ try{ mapaLado.remove(); }catch(e){} mapaLado=null; }
 const m=L.map(el, {zoomControl:true, attributionControl:true}); mapaLado=m;
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:18, attribution:'© OpenStreetMap'}).addTo(m);
 const b=typeof baseFunat==='function'? baseFunat() : null, pts=[];
 if(b && b.lat!==undefined){ L.marker([b.lat, b.lng], {icon:L.divIcon({className:'it-pino base', html:'F', iconSize:[30,30]}), title:'FUNAT'}).addTo(m); pts.push([b.lat, b.lng]); }
 itens.forEach((x,i)=>{ const p=pontoDoItem(x); if(!p) return; const sel=x.sel===selVist;
  const mk=L.marker([p.lat, p.lng], {icon:L.divIcon({className:'it-pino'+(sel?' st-agora':''), html:String(i+1), iconSize:[28,28]}), title:x.d? x.d.protocolo : protocoloTexto(x.v)}).addTo(m);
  mk.on('click', ()=>{ selVist=x.sel; mostrar(true); }); pts.push([p.lat, p.lng]); });
 const s=itens.find(x=>x.sel===selVist), ps=s && pontoDoItem(s);
 if(ps) m.setView([ps.lat, ps.lng], 15); else if(pts.length>1) m.fitBounds(L.latLngBounds(pts).pad(0.15)); else if(pts.length) m.setView(pts[0], 14); else m.setView([-28.48,-49.01], 13);
}

/* ======================= USO SEM INTERNET (sobretudo no iPhone) ======================= */
const SEM_REDE={persistente:null, usadoMB:null, cotaMB:null, guardado:null};
async function conferirUsoOffline(){
 try{ if(navigator.storage && navigator.storage.persist) SEM_REDE.persistente=(await navigator.storage.persisted()) || (await navigator.storage.persist()); }catch(e){}
 try{ if(navigator.storage && navigator.storage.estimate){ const e=await navigator.storage.estimate(); SEM_REDE.usadoMB=Math.round((e.usage||0)/1048576); SEM_REDE.cotaMB=e.quota? Math.round(e.quota/1048576) : null; } }catch(e){}
 try{ if(MODO_WEB && 'caches' in window){ const ks=await caches.keys(); SEM_REDE.guardado=!!(navigator.serviceWorker && navigator.serviceWorker.controller) && ks.some(k=>/^funat-campo-/.test(k)); } }catch(e){}
}
const ESPACO_ALERTA_MB=800;
function faixaSemInternet(){
 const off=navigator.onLine===false, cheio=SEM_REDE.usadoMB!==null && SEM_REDE.usadoMB>ESPACO_ALERTA_MB;
 if(!off && !cheio) return '';
 return (off? '<div class="faixa semrede">'+ic('aparelho')+'<span><b>Sem internet.</b> Pode trabalhar normalmente: vistorias, fotos e anotações ficam salvas neste '+(MODO_WEB? 'iPhone' : 'aparelho')+'. '+(MODO_WEB? 'Exporte quando estiver no Wi-Fi da FUNAT.' : 'Vão para a pasta quando voltar ao Wi-Fi da FUNAT.')+'</span></div>' : '')+
  (cheio? '<div class="faixa cheio">'+ic('alerta')+'<span>As fotos guardadas já ocupam <b>'+SEM_REDE.usadoMB+' MB</b>. '+(MODO_WEB? 'Exporte as vistorias concluídas e exclua as já entregues' : 'Envie as vistorias concluídas')+' para liberar espaço.</span></div>' : '');
}
function blocoSemInternet(){
 const sim=x=>x===true? '<b class="boa">sim</b>' : x===false? '<b class="ruim">não</b>' : '—';
 return '<section class="bloco"><h2>'+ic('aparelho')+'Uso sem internet</h2><dl class="dados-doc">'+
  (MODO_WEB? '<dt>App guardado no aparelho</dt><dd>'+sim(SEM_REDE.guardado)+(SEM_REDE.guardado===false? ' · abra uma vez com internet' : '')+'</dd>' : '')+
  '<dt>Dados protegidos contra limpeza</dt><dd>'+sim(SEM_REDE.persistente)+'</dd>'+
  '<dt>Espaço usado</dt><dd>'+(SEM_REDE.usadoMB!==null? SEM_REDE.usadoMB+' MB'+(SEM_REDE.cotaMB? ' de ~'+(SEM_REDE.cotaMB>2048? Math.round(SEM_REDE.cotaMB/1024)+' GB' : SEM_REDE.cotaMB+' MB') : '') : '—')+'</dd></dl>'+
  (MODO_WEB? '<p class="ajuda"><span>Use sempre pelo <b>ícone na Tela de Início</b> (não pela aba do Safari), abra o app <b>uma vez por dia com internet</b> e não limpe os dados do Safari: assim ele funciona sem sinal, com fotos e GPS.</span></p>' : '')+'</section>';
}
window.addEventListener('online', ()=>{ if(['inicio','vistorias'].includes(rotaAtual().nome)) mostrar(true); });
window.addEventListener('offline', ()=>{ if(['inicio','vistorias'].includes(rotaAtual().nome)) mostrar(true); });

/* ======================= RETORNO AO LOCAL ======================= */
/* Folha de baixo para cima com opções (data-f); devolve o valor escolhido ou null. O botão voltar do Android também fecha. */
let fecharFolha=null;
function folha(html){
 return new Promise(res=>{
  const f=document.createElement('div'); f.className='folha-fundo'; f.innerHTML='<div class="folha" role="dialog" aria-modal="true">'+html+'</div>';
  const tecla=e=>{ if(e.key==='Escape') fim(null); };
  const fim=valor=>{ if(!f.parentNode) return; f.remove(); fecharFolha=null; document.removeEventListener('keydown', tecla); res(valor); };
  fecharFolha=fim; document.addEventListener('keydown', tecla);
  f.addEventListener('click', e=>{ if(e.target===f) return fim(null); const b=e.target.closest('[data-f]'); if(b) fim(b.dataset.f); });
  document.body.appendChild(f);
 });
}
function escolherMotivoRetorno(n, antes){
 return folha('<h2>'+ic('girar')+'Voltar ao local · '+n+'ª visita</h2><p class="ajuda">'+esc(antes)+' Por que você vai voltar?</p>'+
  '<div class="opcoes">'+MOTIVOS_RETORNO.map(m=>'<button class="bt claro largo" data-f="'+m.id+'">'+esc(m.rotulo)+'</button>').join('')+'</div>'+
  '<button class="bt txt largo" data-f="">Cancelar</button>');
}
/* Visitas ligadas à vistoria v: as da mesma demanda da planilha e as encadeadas por retornoDe */
function visitasLigadas(v){
 return VIST.filter(x=>x===v || (v.demanda && x.demanda && x.demanda.id===v.demanda.id) || x.retornoDe===v.id || x.id===v.retornoDe).sort(ordemVisitas);
}
/* Começa uma nova visita (retorno). Já existindo uma visita aberta, abre essa em vez de criar outra: evita duplicata por toque duplo. */
async function voltarAoLocal(o){
 await gravarAgora();
 let d=o.d||null, lista;
 if(d) lista=vistoriasDe(d);
 else { lista=visitasLigadas(o.v); if(o.v.demanda) d=((DEMANDAS&&DEMANDAS.itens)||[]).find(x=>idDemanda(x)===o.v.demanda.id)||null; }
 const ultima=lista[0]||null;
 if(ultima && ultima.status!=='concluida'){ aviso((ehRetorno(ultima)? 'Esta demanda já tem uma '+numeroVisita(ultima)+'ª visita aberta.' : 'Esta vistoria ainda está aberta.')+' Abrindo ela.', 4000); location.hash='#v/'+ultima.id; return ultima; }
 const n=d? proximaVisita(lista, d) : (ultima? numeroVisita(ultima)+1 : 2), fisc=d? fiscalizadaEm(d) : '';
 const antes=ultima? 'A '+numeroVisita(ultima)+'ª visita foi concluída em '+dataBrCampo(ultima.dataVistoria)+'.' : fisc? 'A planilha registra fiscalização em '+dataBrCampo(fisc)+'.' : 'A planilha já marca esta demanda como fiscalizada.';
 const motivo=await escolherMotivoRetorno(n, antes); if(!motivo) return null;
 const v=ultima? novaVisitaDe(ultima, motivo, n) : novaVisitaDaDemanda(d, motivo, n, fisc);
 iniciarVistoria(v); await gravarVistoria(v);
 location.hash='#v/'+v.id; aviso(n+'ª visita iniciada às '+v.horaVistoria+'. Confira o tipo de documento quando terminar.', 4500); return v;
}
/* Retornos combinados (opcional): aparecem no Início a partir de 7 dias antes da data, e em Vistorias › Retornos */
function cartaoRetorno(v){
 const dias=diasAte(v.voltarEm), local=[v.bairro, v.endereco].filter(Boolean).join(' · ');
 return '<article class="cartao retorno'+(dias<0? ' velha' : '')+(selVist==='v:'+v.id?' sel':'')+'" data-sel="v:'+v.id+'"><div class="c-l1">'+tagTipo(v.tipoDocumento)+'<span class="tag t-visita">RETORNO</span><b>'+esc(protocoloTexto(v))+'</b><span class="idade'+(dias<0? ' muito' : '')+'">'+esc(textoPrazoRetorno(dias))+'</span></div>'+
  (v.assunto? '<h3>'+esc(v.assunto)+'</h3>' : '')+(local? '<p class="loc">'+ic('pino')+esc(local)+'</p>' : '')+
  '<p class="st">Voltar em '+esc(dataBrCampo(v.voltarEm))+' · '+numeroVisita(v)+'ª visita em '+esc(dataBrCampo(v.dataVistoria))+'</p>'+
  '<div class="c-ac"><button class="bt pri" data-retorno-v="'+v.id+'">'+ic('girar')+'Voltar ao local</button><button class="bt txt" data-ir="#v/'+v.id+'">Abrir</button>'+
  (v.local? '<button class="bt txt" data-mapa="'+v.id+'">'+ic('mapa')+'Mapa</button>' : '')+'<button class="bt txt" data-limpar-retorno="'+v.id+'">Dispensar</button></div></article>';
}
function blocoRetornos(){
 const L=retornosAgendados(VIST).filter(v=>diasAte(v.voltarEm)<=7); if(!L.length) return '';
 return '<h2 class="secao">Retornos combinados <span class="cont">'+L.length+'</span></h2>'+L.slice(0,4).map(cartaoRetorno).join('')+
  (L.length>4? '<button class="resumo-docs" data-aba-ir="retornos">'+ic('lista')+'<span>e mais '+(L.length-4)+' retorno'+(L.length-4>1?'s':'')+'</span>'+ic('voltar','seta-dir')+'</button>' : '');
}
/* Faixa no alto da vistoria de uma visita de retorno */
function faixaRetorno(v){
 if(!ehRetorno(v)) return '';
 const a=v.anterior||{}, ant=a.id? acharVistoria(a.id) : null, dist=(v.local && a.local)? distanciaM(v.local, a.local) : null;
 return '<section class="bloco retorno-faixa"><div class="c-l1"><span class="tag t-visita">'+numeroVisita(v)+'ª VISITA</span><b>Retorno ao local</b></div>'+
  '<p><b>Motivo:</b> '+esc(rotuloMotivo(v.motivoRetorno)||'—')+'</p>'+
  '<p class="ajuda">'+(a.data? 'Visita anterior em '+esc(dataBrCampo(a.data))+(a.hora? ', às '+esc(a.hora) : '')+(typeof a.fotos==='number'? ' · '+a.fotos+' foto'+(a.fotos===1?'':'s') : '') : 'A visita anterior está só na planilha.')+'</p>'+
  (a.local? '<p class="ajuda">'+ic('pino')+'Ponto da visita anterior: '+esc(utmTexto(a.local))+(dist!==null? ' · você está a '+esc(distanciaTexto(dist))+' dele' : '')+'</p>' : '')+
  (a.anotacoes? '<details class="mais-op"><summary>Anotações da visita anterior</summary><p class="cita-ant">'+esc(a.anotacoes)+'</p></details>' : '')+
  (ant? '<button class="bt claro largo" data-ir="#v/'+ant.id+'">'+ic('galeria')+'Ver a visita anterior (fotos e anotações)</button>' : '')+'</section>';
}
/* Troca o tipo de documento depois da vistoria (e, se já foi enviada, manda de novo por cima) */
async function trocarTipoDocumento(v){
 const jaFoi= v.status==='concluida' && (v.enviadaEm || v.exportadaEm);
 const avisoEnvio= !jaFoi? '' : (MODO_WEB? '<p class="nota-alerta">'+ic('alerta')+'O arquivo já foi exportado. Exporte de novo e, no app Arquivos, escolha “Substituir”.</p>' :
    '<p class="nota-alerta">'+ic('alerta')+'Esta vistoria já está na pasta da FUNAT. O app grava de novo por cima, com o tipo novo. Se ela já foi aberta e alterada no computador, o app recusa e avisa.</p>');
 const novo=await folha('<h2>'+ic('arquivo')+'Documento desta vistoria</h2><p class="ajuda"><span>Hoje: <b>'+esc(TIPOS_DOC[v.tipoDocumento].rotulo)+'</b>. Escolha o documento que vai ser escrito no computador.</span></p>'+avisoEnvio+
  '<div class="opcoes">'+Object.keys(TIPOS_DOC).map(k=>'<button class="bt '+(k===v.tipoDocumento? 'pri' : 'claro')+' largo" data-f="'+k+'">'+esc(TIPOS_DOC[k].rotulo)+(k===v.tipoDocumento? ' (atual)' : '')+'</button>').join('')+'</div>'+
  '<button class="bt txt largo" data-f="">Cancelar</button>');
 if(!novo || !mudarTipoDocumento(v, novo)) return false;
 await gravarVistoria(v); mostrar(true); aviso('Documento: '+TIPOS_DOC[novo].rotulo+'.'+(jaFoi? (MODO_WEB? ' Exporte de novo para a pasta.' : cfg.pasta? ' Vai de novo para a pasta.' : '') : ''), 4500);
 if(v.precisaEnviar && podeEnviar()) enviarPendentes({silencioso:true});
 return true;
}
/* Documento e retorno, na vistoria concluída e na tela de "concluída" */
function blocoDocumentoRetorno(v, extra){
 return '<section class="bloco'+(extra? ' '+extra : '')+'"><h2>'+ic('arquivo')+'Documento e retorno</h2>'+
  '<p class="ajuda"><span>Documento que sai desta vistoria: <b>'+esc(TIPOS_DOC[v.tipoDocumento].rotulo)+'</b>.</span></p>'+
  '<button class="bt claro largo" data-trocar-tipo="'+v.id+'">'+ic('lapis')+'Trocar o tipo de documento</button>'+
  '<button class="bt claro largo" data-retorno-v="'+v.id+'">'+ic('girar')+'Voltar ao local (nova visita)</button>'+
  '<label class="campo"><span>Voltar ao local em <em>(opcional)</em></span><input type="date" data-voltar-em="'+v.id+'" value="'+esc(v.voltarEm||'')+'"></label>'+
  '<p class="ajuda">Se combinou um prazo (por exemplo, o fim da notificação), o app lembra no Início. Não é obrigatório.</p></section>';
}
function ligarDocumentoRetorno(){
 $$('[data-trocar-tipo]').forEach(b=>b.onclick=()=>trocarTipoDocumento(acharVistoria(b.dataset.trocarTipo)));
 $$('[data-voltar-em]').forEach(i=>i.onchange=async()=>{ const v=acharVistoria(i.dataset.voltarEm); v.voltarEm=i.value||''; await gravarVistoria(v); aviso(v.voltarEm? 'Retorno combinado para '+dataBrCampo(v.voltarEm)+'.' : 'Retorno dispensado.'); });
}

function linhaPlanilha(){ if(!cfg.planilhaAtiva) return ''; const l=DEMANDAS&&DEMANDAS.lidoEm;
 return '<p class="lida-em">'+(demLendo? '<span class="giro"></span>Lendo a planilha…' : (l? 'Planilha lida '+esc(quandoRelativo(new Date(l).toISOString())) : 'Planilha ainda não lida'))+(demErro? ' · <span class="ruim">'+esc(demErro)+'</span>' : '')+
  (!demLendo? ' <button class="bt txt mini-bt" data-ler-planilha>'+ic('girar')+'Ler agora</button>' : '')+'</p>'; }

/* ---------- configurar ---------- */
TELAS.planilha = function(){
 return topo('Demandas da planilha', {voltar:true, direita:'<span></span>'})+'<main class="pag com-rodape">'+
  '<section class="bloco"><h2>Chave deste aparelho</h2><p class="ajuda">Peça ao Julio a chave do seu nome. Ela permite ao app ler, na Planilha Fiscalização, só as demandas abertas distribuídas para você. A chave fica cifrada no cofre do Android.</p>'+
  '<label class="campo"><span>Chave</span><input id="plChave" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX" maxlength="19" class="chave"></label>'+
  '<details class="mais-op"'+(urlPlanilha()?'':' open')+'><summary>Endereço do script</summary><label class="campo"><span>URL do aplicativo da web</span><input id="plUrl" autocapitalize="none" spellcheck="false" value="'+esc(urlPlanilha())+'" placeholder="https://script.google.com/macros/s/…/exec"></label></details>'+
  '<details class="mais-op"><summary>Envio pela internet (armazenamento)</summary><p class="ajuda">Com este endereço, '+(MODO_WEB? 'as vistorias vão pela internet' : 'fora do Wi-Fi da FUNAT as vistorias vão pela internet')+' e o Painel do Auxiliar as grava na sua pasta. Usa a mesma chave.</p><label class="campo"><span>URL do armazenamento</span><input id="plArmaz" autocapitalize="none" spellcheck="false" value="'+esc(urlArmazenamento())+'" placeholder="https://script.google.com/macros/s/…/exec"></label></details>'+
  '<button class="bt pri largo" id="plTestar">'+ic('ok')+'Testar e guardar</button></section>'+
  (cfg.planilhaAtiva? '<section class="bloco"><h2>Situação</h2><p class="ajuda">'+(DEMANDAS&&DEMANDAS.fiscal? 'Chave de <b>'+esc(DEMANDAS.fiscal)+'</b> · ' : '')+((DEMANDAS&&DEMANDAS.itens.length)||0)+' demandas em aberto na última leitura.</p>'+linhaPlanilha()+
   '<button class="bt txt perigo apagar-v" id="plDesligar">'+ic('lixo')+'Desligar as demandas da planilha neste aparelho</button></section>' : '')+
  '<p class="ajuda">'+ic('alerta')+'O celular só lê a planilha: nada é escrito nela. O envio pela internet vai para o armazenamento da FUNAT, não para a planilha.</p></main>';
};
TELAS.planilha.ligar = function(){
 const k=$('#plChave'); Planilha.chave().then(c=>{ if(c && !k.value) k.placeholder='(guardada – digite só para trocar)'; });
 k.oninput=()=>{ const p=k.selectionStart, a=k.value; const lim=a.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,16); k.value=lim.replace(/(.{4})(?=.)/g,'$1-'); if(a.length===p) k.setSelectionRange(k.value.length,k.value.length); };
 $('#plTestar').onclick=async()=>{
  const url=$('#plUrl').value.trim(), chave=k.value.trim()||await Planilha.chave();
  if(!/^https:\/\/script\.google(usercontent)?\.com\//.test(url) && url!=='simulado'){ alert('O endereço precisa ser o do script publicado (começa com https://script.google.com/macros/s/…).'); return; }
  if(!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(chave)){ alert('A chave tem 16 letras e números, no formato XXXX-XXXX-XXXX-XXXX.'); return; }
  const armaz=$('#plArmaz')? $('#plArmaz').value.trim() : urlArmazenamento();
  if(armaz && !/^https:\/\/script\.google(usercontent)?\.com\//.test(armaz) && !/^http:\/\/localhost[:/]/.test(armaz)){ alert('O endereço do armazenamento precisa ser o do script publicado (https://script.google.com/macros/s/…).'); return; }
  cfg.urlArmazenamento=(typeof CONFIG_APP!=='undefined' && (CONFIG_APP.urlArmazenamento||'')===armaz)? '' : armaz; gravarCfg();
  ocupado('Consultando a planilha…');
  try{ const r=await Planilha.buscar(url, chave); await Planilha.guardarChave(chave); cfg.urlPlanilha=(typeof CONFIG_APP!=='undefined' && CONFIG_APP.urlPlanilha===url)? '' : url; cfg.planilhaAtiva=true; gravarCfg();
   DEMANDAS={lidoEm:Date.now(), fiscal:r.fiscal, itens:r.demandas||[], equipe:r.equipe||null, base:r.base||null, versaoScript:r.versaoScript||''}; await Arquivos.gravarTexto('demandas.json', JSON.stringify(DEMANDAS)); ocupado(false);
   const meu=semAcento(primeiroNome(cfg.nome));
   alert('Chave de '+r.fiscal+': '+DEMANDAS.itens.length+' demanda'+(DEMANDAS.itens.length===1?'':'s')+' em aberto.'+(meu && r.fiscal.indexOf(meu)!==0? '\n\nAtenção: o nome deste aparelho é '+cfg.nome+'. Confira se a chave é a certa.' : ''));
   location.hash='#inicio'; }
  catch(e){ ocupado(false); alert('Não foi possível: '+(e.message||e)); }
 };
 if($('#plDesligar')) $('#plDesligar').onclick=async()=>{ if(!confirm('Desligar? A chave é apagada deste aparelho e a lista de demandas some. As vistorias continuam.')) return;
  await Planilha.guardarChave(''); cfg.planilhaAtiva=false; gravarCfg(); DEMANDAS={lidoEm:0, fiscal:'', itens:[]}; await Arquivos.gravarTexto('demandas.json', JSON.stringify(DEMANDAS)); mostrar(true); };
};

/* ======================= CORRIGIR NO CELULAR, COM OU SEM REDE =======================
   1) No Wi-Fi da FUNAT, a leitura da pasta guarda no celular uma cópia (sem as fotos) de cada documento DEVOLVIDO.
   2) O auxiliar corrige em cima dessa cópia, em qualquer lugar. O rascunho guarda só o que mudou e o valor de
      partida de cada campo (rasc.base) – é ele que permite saber, na volta, se mais alguém mexeu.
   3) "Encaminhar" põe a correção na fila. Na rede, o app lê o arquivo ATUAL da pasta (inteiro, com fotos):
      - ninguém mexeu → aplica e encaminha;
      - mexeram em outros campos → junta tudo e encaminha;
      - mexeram nos MESMOS campos, ou o documento já foi reencaminhado pelo computador → o auxiliar escolhe,
        campo a campo, entre a versão da pasta (computador) e a do celular. */
let CORR = null;     // {id, doc (cópia sem fotos), rasc, resumo, copia}
let RASCS = {};      // rascunhos de correção por id (espelho de correcoes/*.json)
const idArquivo = id=>String(id).replace(/[^\w-]/g,'_');
const caminhoRasc = id=>'correcoes/'+idArquivo(id)+'.json';
const caminhoCopia = id=>'offline/'+idArquivo(id)+'.json';
async function carregarRascunhos(){
 RASCS={};
 for(const n of (await Arquivos.listar('correcoes')).filter(n=>/\.json$/.test(n))){
  try{ const g=JSON.parse(await Arquivos.lerTexto('correcoes/'+n)); if(g && g.id) RASCS[g.id]=completarRascunho(g.rasc ? Object.assign(g.rasc, {id:g.id}) : g); }catch(e){}
 }
}
async function gravarRascunho(id, rasc){ rasc.id=id; RASCS[id]=rasc; await Arquivos.gravarTexto(caminhoRasc(id), JSON.stringify(rasc)); }
async function apagarRascunho(id){ delete RASCS[id]; await Arquivos.apagar(caminhoRasc(id)); }
function correcoesNaFila(){ return Object.values(RASCS).filter(r=>r.pendente && !r.conflito); }
function correcoesComConflito(){ return Object.values(RASCS).filter(r=>r.conflito); }
async function lerCopia(id){ try{ return JSON.parse(await Arquivos.lerTexto(caminhoCopia(id))); }catch(e){ return null; } }
/* Cópia sem fotos de um devolvido (chamada pela leitura da pasta) */
async function guardarCopia(id, caminho, modificado, tamanho, texto){ await Arquivos.gravarTexto(caminhoCopia(id), JSON.stringify({id:id, caminho:caminho, modificado:modificado, tamanho:tamanho, texto:texto, lidoEm:new Date().toISOString()})); }

async function carregarCorrecao(id){
 let copia=await lerCopia(id);
 if(!copia){                                          // ainda não baixado: tenta agora (precisa da rede)
  const d=docsDe(cfg.pasta).find(x=>x.id===id); if(!d) throw new Error('Documento não encontrado na última leitura da pasta.');
  const rel=d.caminho.replace(/\//g,'\\'), lidos=await Pasta.lerVarios(cfg.pasta.caminho, [rel]).catch(e=>{ throw new Error('Este documento ainda não foi guardado no celular, e não há conexão com a pasta agora. Abra a aba Documentos uma vez no Wi-Fi da FUNAT para baixá-lo.'); });
  if(!lidos[0] || lidos[0].erro) throw new Error('Não foi possível ler o documento: '+((lidos[0]||{}).erro||''));
  await guardarCopia(id, rel, d.modificado, null, lidos[0].texto); copia=await lerCopia(id);
 }
 const doc=JSON.parse(copia.texto); if(String(doc.id)!==String(id)) throw new Error('A cópia guardada é de outro documento.');
 const rasc=completarRascunho(RASCS[id] ? JSON.parse(JSON.stringify(RASCS[id])) : rascunhoVazio());
 if(!rasc.arquivo) rasc.arquivo={caminho:copia.caminho, modificado:copia.modificado, lidoEm:copia.lidoEm,
  notasVistas:(((doc.revisao||{}).notas)||[]).map(n=>n.id), histN:(((doc.revisao||{}).historico)||[]).length};   // para notar apontamento novo e reencaminhamento sem depender do relógio do celular
 CORR={id:id, doc:doc, rasc:rasc, copia:copia, resumo:docsDe(cfg.pasta).find(x=>x.id===id) || resumoDocumento(doc, copia.caminho.replace(/\\/g,'/'), copia.modificado)};
}
let tRasc=null;
function guardarRascunhoCorr(){ clearTimeout(tRasc); const c=CORR; tRasc=setTimeout(()=>{ if(c) gravarRascunho(c.id, c.rasc).catch(()=>{}); }, 400); }
function valorCorr(cam){ return Object.prototype.hasOwnProperty.call(CORR.rasc.campos, cam)? CORR.rasc.campos[cam] : String(caminhoValor(CORR.doc, cam)===undefined? '' : caminhoValor(CORR.doc, cam)); }
function notaCorr(n){ const r=CORR.rasc.notas[n.id]||{}; return {resposta:r.resposta!==undefined? r.resposta : (n.resposta||''), resolvida:r.resolvida!==undefined? r.resolvida : !!n.resolvida}; }
function rotuloCampo(tipo, cam){ const blocos=CAMPOS_EDICAO[tipo]||{}; for(const k in blocos){ const f=blocos[k].find(x=>x.c===cam); if(f) return f.r; }
 const m=/^(\w+)\.fotos\.(\d+)\.legenda$/.exec(cam); if(m) return 'Legenda da foto '+(+m[2]+1); const mi=/^infracoes\.(\d+)\.(\w+)$/.exec(cam); if(mi) return 'Infração '+(+mi[1]+1)+' – '+mi[2]; return cam; }
function blocoCorrecao(campo, notas){
 const campos=camposDoBloco(CORR.doc, campo);
 return '<section class="bloco corr'+(notas.every(n=>notaCorr(n).resolvida)?' feita':'')+'">'+
  notas.map(n=>{ const st=notaCorr(n);
   return '<div class="nota-corr"><div class="n-cab"><b>'+esc(n.rotulo||n.campo||'Apontamento geral')+'</b><span class="pilula">'+(st.resolvida?'resolvido':'em aberto')+'</span></div>'+
    '<p class="pedido">“'+esc(n.texto||'')+'”</p><small>'+esc([n.autor, n.data? dataCurta(n.data) : ''].filter(Boolean).join(' · '))+'</small></div>'; }).join('')+
  (campos.length? '<div class="campos-corr"><h3>'+ic('lapis')+'Corrija aqui</h3>'+campos.map(f=>{
    if(f.t==='opcoes') return '<p class="ajuda">'+esc(f.r)+': escolha de lista – corrija no computador.</p>';
    const v=valorCorr(f.c), alt=Object.prototype.hasOwnProperty.call(CORR.rasc.campos, f.c) && CORR.rasc.campos[f.c]!==String(caminhoValor(CORR.doc, f.c)||'');
    return '<label class="campo'+(alt?' alterado':'')+'"><span>'+esc(f.r)+(alt?' <em>(alterado)</em>':'')+'</span>'+(f.t==='texto'? '<textarea data-cc="'+esc(f.c)+'" rows="'+Math.min(14, Math.max(4, v.split('\n').length+1))+'">'+esc(v)+'</textarea>' : '<input data-cc="'+esc(f.c)+'" value="'+esc(v)+'">')+'</label>'; }).join('')+'</div>'
   : '<p class="ajuda">'+ic('aparelho')+'Este apontamento não aponta para um campo de texto (ex.: valoração, anexos). Responda abaixo ou corrija no computador.</p>')+
  notas.map(n=>{ const st=notaCorr(n);
   return '<label class="campo"><span>Sua resposta ao revisor'+(notas.length>1? ' – '+esc(n.rotulo||'') : '')+' <em>(opcional)</em></span><textarea data-nr="'+esc(n.id)+'" rows="2" placeholder="Ex.: coordenadas incluídas">'+esc(st.resposta)+'</textarea></label>'+
    '<label class="opcao-grande"><input type="checkbox" data-nok="'+esc(n.id)+'"'+(st.resolvida?' checked':'')+'><span>Corrigido / resolvido'+(notas.length>1? ' – '+esc(n.rotulo||'') : '')+'</span></label>'; }).join('')+'</section>';
}
TELAS.corrigir = function(id){
 if(!CORR || CORR.id!==id) return topo('Corrigir', {voltar:true, direita:'<span></span>'})+'<main class="pag"><div class="vazio"><div class="giro"></div><p>Abrindo o documento…</p></div></main>';
 const o=CORR.doc, R=o.revisao||{}, notas=(R.notas||[]), eds=(R.edicoes||[]), d=CORR.resumo, r=CORR.rasc;
 if(r.conflito) return topo('Corrigir documento', {voltar:true, direita:'<span></span>'})+'<main class="pag"><div class="nota-alerta forte">'+ic('alerta')+'<span>Esta correção encontrou uma versão diferente na pasta. Escolha o que vale antes de continuar.</span></div><button class="bt pri largo alto" data-ir="#conflito/'+encodeURIComponent(id)+'">Resolver agora</button></main>';
 const grupos=[]; notas.forEach(n=>{ let g=grupos.find(x=>x.campo===(n.campo||'')); if(!g){ g={campo:n.campo||'', notas:[]}; grupos.push(g); } g.notas.push(n); });
 grupos.sort((a,b)=>a.notas.every(n=>notaCorr(n).resolvida)-b.notas.every(n=>notaCorr(n).resolvida));
 const abertas=notas.filter(n=>!notaCorr(n).resolvida).length;
 return topo('Corrigir documento', {voltar:true, direita:'<span></span>'})+'<main class="pag com-rodape">'+
  (r.pendente? '<div class="nota-alerta">'+ic('relogio')+'<span><b>Na fila para encaminhar.</b> Vai quando o celular estiver no Wi-Fi da FUNAT. Ainda dá para mudar.</span></div>' : '')+
  '<section class="bloco"><div class="c-l1">'+tagTipo(d.tipo)+'<span class="pilula">Devolvido</span></div><h2 class="prot">'+esc(d.protocolo||'(sem protocolo)')+'</h2>'+(d.titulo?'<p>'+esc(d.titulo)+'</p>':'')+trilhaDoc(d)+
  '<p class="sit">'+(abertas? abertas+' apontamento'+(abertas>1?'s':'')+' em aberto' : 'Todos os apontamentos marcados como resolvidos')+'</p>'+
  '<p class="ajuda">'+ic('aparelho')+'Cópia guardada no celular em '+esc(dataCurta(CORR.copia.lidoEm))+' às '+esc(horaCurta(new Date(CORR.copia.lidoEm)))+'. Funciona sem rede.</p></section>'+
  (eds.length? '<section class="bloco"><h2>'+ic('lapis')+'O revisor já corrigiu no texto</h2>'+eds.map(e=>'<div class="ed-rev"><b>'+esc(e.rotulo||e.caminho)+'</b><p class="antes">'+esc(String(e.antesTexto||e.antes||'').slice(0,300))+'</p><p class="depois">'+esc(String(e.depoisTexto||e.depois||'').slice(0,300))+'</p><small>'+esc([e.autor, e.data? dataCurta(e.data) : ''].filter(Boolean).join(' · '))+'</small></div>').join('')+'<p class="ajuda">Já está no documento. Se discordar, altere o campo e explique na resposta.</p></section>' : '')+
  grupos.map(g=>blocoCorrecao(g.campo, g.notas)).join('')+
  (!notas.length? '<div class="vazio"><p>Este documento não tem apontamentos. Pode encaminhar de novo, se for o caso.</p></div>' : '')+
  '<p class="ajuda">'+ic('aparelho')+'As correções ficam no celular até chegarem à pasta. Fotos e anexos do documento não mudam.</p>'+
  (Object.keys(r.campos).length || Object.keys(r.notas).length? '<button class="bt txt perigo apagar-v" id="cDescartar">'+ic('lixo')+'Descartar as correções feitas no celular</button>' : '')+
  '<div class="rodape-fixo duplo"><button class="bt sec" id="cSair">Continuar depois</button><button class="bt pri" id="cEncaminhar">'+ic('enviar')+(r.pendente? 'Enviar agora' : 'Encaminhar')+'</button></div></main>';
};
TELAS.corrigir.ligar = async function(id){
 if(!CORR || CORR.id!==id){
  try{ await carregarCorrecao(id); if(rotaAtual().nome==='corrigir') mostrar(true); }
  catch(e){ alert('Não foi possível abrir o documento: '+(e.message||e)); history.back(); }
  return;
 }
 $$('[data-cc]').forEach(el=>el.oninput=()=>{ marcarBaseCampo(CORR.rasc, CORR.doc, el.dataset.cc); CORR.rasc.campos[el.dataset.cc]=el.value.replace(/\r\n/g,'\n'); guardarRascunhoCorr(); });
 $$('[data-nr]').forEach(el=>el.oninput=()=>{ marcarBaseNota(CORR.rasc, CORR.doc, el.dataset.nr); (CORR.rasc.notas[el.dataset.nr]=CORR.rasc.notas[el.dataset.nr]||{}).resposta=el.value; guardarRascunhoCorr(); });
 $$('[data-nok]').forEach(el=>el.onchange=()=>{ marcarBaseNota(CORR.rasc, CORR.doc, el.dataset.nok); (CORR.rasc.notas[el.dataset.nok]=CORR.rasc.notas[el.dataset.nok]||{}).resolvida=el.checked; guardarRascunhoCorr(); mostrar(true); });
 if($('#cSair')) $('#cSair').onclick=()=>{ guardarRascunhoCorr(); aviso('Correções guardadas no celular.'); history.back(); };
 if($('#cDescartar')) $('#cDescartar').onclick=async()=>{ if(!confirm('Descartar todas as correções feitas no celular para este documento? O arquivo na pasta não muda.')) return; await apagarRascunho(id); CORR=null; history.back(); };
 if($('#cEncaminhar')) $('#cEncaminhar').onclick=()=>encaminharCorrecao();
};
async function encaminharCorrecao(){
 const c=conferirReencaminhar(CORR.doc, CORR.rasc);
 if(c.bloqueia.length){ alert('Não é possível encaminhar: '+c.bloqueia.join('; ')+'.'); return; }
 if(!CORR.rasc.pendente && !confirm((c.avisa.length? 'Atenção:\n• '+c.avisa.join('\n• ')+'\n\n' : '')+'Encaminhar '+(CORR.resumo.protocolo||'o documento')+' para revisão?\n\nSe o celular estiver fora do Wi-Fi da FUNAT, a correção fica na fila e vai sozinha quando ele voltar.')) return;
 clearTimeout(tRasc); CORR.rasc.pendente=true; CORR.rasc.pedidoEm=new Date().toISOString(); const id=CORR.id; await gravarRascunho(id, CORR.rasc);
 ocupado('Encaminhando…'); const r=await sincronizarCorrecao(id, {interativo:true}); ocupado(false);
 if(r.ok){ CORR=null; alert('Encaminhado para revisão.'+(r.juntou? '\n\nO arquivo tinha mudado na pasta em outros campos; as duas versões foram juntadas.' : '')+(r.renomeado? '\n\nJá havia um arquivo de outro documento com o mesmo nome; o seu foi gravado como "'+ultimaParte(r.caminho)+'".' : ''));
  history.replaceState(null, '', '#documentos'); mostrar(); atualizarDocumentos(cfg.pasta, {silencioso:true}); }
 else if(r.conflito){ CORR=null; history.replaceState(null, '', '#conflito/'+encodeURIComponent(id)); mostrar(); }
 else if(r.fila){ CORR=null; aviso('Sem conexão com a pasta agora. A correção ficou na fila e vai sozinha no Wi-Fi da FUNAT.', 5000); history.replaceState(null, '', '#documentos'); mostrar(); }
 else alert('Não foi encaminhado: '+r.erro+'\n\nAs correções continuam guardadas no celular.');
}

/* Tenta levar uma correção para a pasta. Devolve {ok}, {fila} (sem rede), {conflito} ou {erro}. */
async function sincronizarCorrecao(id, op){
 op=op||{}; const rasc=RASCS[id]; if(!rasc || !cfg.pasta) return {erro:'sem rascunho'};
 if(bloqueadoParaEnviar()){ if(op.interativo) aviso(MSG_ATUALIZAR, 6000); return {fila:true}; }
 const base=cfg.pasta.caminho, rede=e=>['SEM_REDE','SEM_CONFIG','SENHA','LOCAL'].includes(e.code);
 try{
  let caminho=rasc.arquivo && rasc.arquivo.caminho, r;
  try{ r=await Pasta.lerCompleto(base, caminho); }
  catch(e){
   if(rede(e)) return {fila:true};
   if(e.code!=='NAO_ACHOU') throw e;
   await atualizarDocumentos(cfg.pasta, {silencioso:true});                 // mudou de lugar? (ex.: reencaminhado pelo computador)
   const d=docsDe(cfg.pasta).find(x=>x.id===id);
   if(!d){ rasc.conflito={tipo:'sumiu', em:new Date().toISOString()}; await gravarRascunho(id, rasc); return {conflito:true}; }
   caminho=d.caminho.replace(/\//g,'\\'); r=await Pasta.lerCompleto(base, caminho);
  }
  const pasta=JSON.parse(r.texto); if(String(pasta.id)!==String(id)) return {erro:'o arquivo na pasta é de outro documento'};
  const m=mesclarCorrecoes(pasta, rasc);
  const mesmoArquivo=rasc.arquivo && rasc.arquivo.modificado===r.modificado;
  /* escolhas feitas na tela de conflito valem só para a versão da pasta que o auxiliar viu */
  if(rasc.escolhas && !(rasc.escolhasPara && rasc.escolhasPara.modificado===r.modificado)){ delete rasc.escolhas; delete rasc.escolhasPara; }
  if(m.status==='aprovado' || ((m.conflitos.length || m.reencaminhadoEm || m.novosApontamentos.length || m.apontamentosSumidos.length) && !rasc.escolhas)){
   rasc.conflito={tipo:m.status==='aprovado'? 'aprovado' : 'versoes', caminho:caminho, modificado:r.modificado, mescla:m, em:new Date().toISOString()};
   await gravarRascunho(id, rasc); return {conflito:true};
  }
  const aplicar=rasc.escolhas? aplicarEscolhas(m, rasc.escolhas) : m.aplicar;
  aplicarCorrecoes(pasta, aplicar); encaminharDoc(pasta);
  const nome=ultimaParte(caminho), local=await arquivoParaEnvio(nome, JSON.stringify(pasta, null, 1));
  const res=await Pasta.encaminhar({base:base, origem:caminho, nome:nome, arquivoLocal:local, id:String(id), modificado:r.modificado, tamanho:r.tamanho});
  await apagarArquivoDeEnvio(nome); await apagarRascunho(id); await Arquivos.apagar(caminhoCopia(id));
  cfg.ultimoEnvio=Date.now(); gravarCfg();
  return {ok:true, juntou:!mesmoArquivo, caminho:res.caminho, renomeado:res.renomeado};
 }catch(e){
  if(rede(e)) return {fila:true};
  if(e.code==='MUDOU' && !op.repetiu) return sincronizarCorrecao(id, Object.assign({}, op, {repetiu:true}));
  return {erro:e.message||String(e)};
 }
}

/* ---------- escolher a versão (conflito) ---------- */
TELAS.conflito = function(id){
 const r=RASCS[id]; if(!r || !r.conflito) return topo('Versões', {voltar:true})+'<main class="pag"><div class="vazio"><p>Não há conflito pendente para este documento.</p></div></main>';
 const C=r.conflito, d=docsDe(cfg.pasta).find(x=>x.id===id)||{tipo:'relatorio_simplificado', protocolo:''};
 const cab=topo('Escolher a versão', {voltar:true, direita:'<span></span>'})+'<main class="pag com-rodape"><section class="bloco"><div class="c-l1">'+tagTipo(d.tipo)+'</div><h2 class="prot">'+esc(d.protocolo||'')+'</h2>';
 if(C.tipo==='sumiu') return cab+'<p>O documento não está mais na sua pasta (foi movido ou apagado no computador). As correções do celular não têm para onde ir.</p></section><div class="rodape-fixo"><button class="bt perigo-claro largo" id="kDescartar">'+ic('lixo')+'Descartar as correções do celular</button></div></main>';
 if(C.tipo==='aprovado') return cab+'<p>Enquanto você corrigia no celular, o documento foi <b>aprovado</b>. As correções do celular não podem mais ser enviadas; se ainda forem necessárias, fale com o revisor.</p></section><div class="rodape-fixo"><button class="bt perigo-claro largo" id="kDescartar">'+ic('lixo')+'Descartar as correções do celular</button></div></main>';
 const m=C.mescla, autos=Object.keys(m.aplicar.campos).length+Object.keys(m.aplicar.notas).length;
 const valor=(c,v)=>c.tipo==='resolvida'? (v? 'Corrigido / resolvido' : 'Em aberto') : (v===null? '(campo não existe mais)' : (String(v).trim()? esc(v) : '<i>(vazio)</i>'));
 const rot=c=>c.tipo==='campo'? rotuloCampo(d.tipo, c.chave) : (c.tipo==='resposta'? 'Resposta ao apontamento “'+c.rotulo+'”' : 'Situação do apontamento “'+c.rotulo+'”');
 /* campo apagado no computador: a correção do celular não tem onde entrar (não se oferece "No celular") */
 m.conflitos.forEach(c=>{ if(c.tipo==='campo' && c.pasta===null){ r.escolhas=r.escolhas||{}; r.escolhas[c.tipo+'|'+c.chave]='pasta'; } });
 const novos=m.novosApontamentos||[], sumidos=m.apontamentosSumidos||[];
 const avisoNotas=(novos.length? '<p class="nota-alerta">'+ic('alerta')+'<span>O revisor fez <b>'+novos.length+' apontamento'+(novos.length>1?'s':'')+' novo'+(novos.length>1?'s':'')+'</b> depois que você copiou o documento: '+novos.map(n=>'“'+esc(n.rotulo)+(n.texto? ': '+esc(String(n.texto).slice(0,120)) : '')+'”').join('; ')+'. Se encaminhar agora, ele'+(novos.length>1?'s vão':' vai')+' sem resposta. Para responder, descarte o que fez no celular e corrija de novo a partir da versão atual (abra a aba Documentos no Wi-Fi).</span></p>' : '')
  +(sumidos.length? '<p class="ajuda">'+ic('info')+sumidos.length+' apontamento(s) que você respondeu no celular foram apagados pelo revisor: a sua resposta a ele(s) não vai.</p>' : '');
 return cab+avisoNotas+(m.reencaminhadoEm? '<p class="nota-alerta">'+ic('alerta')+'<span>O documento <b>já foi reencaminhado</b> '+esc(m.reencaminhadoPor? 'por '+m.reencaminhadoPor+' ' : '')+'em '+esc(dataCurta(m.reencaminhadoEm))+' às '+esc(horaCurta(new Date(m.reencaminhadoEm)))+'. Se continuar, ele é reencaminhado de novo com as suas escolhas.</span></p>' : '')+
  '<p>Enquanto você corrigia no celular, o mesmo documento foi alterado na pasta (no computador). '+(m.conflitos.length? 'Escolha, em cada item, qual versão vale.' : 'Não há campos em choque.')+'</p>'+
  (autos? '<p class="ajuda">'+ic('ok')+autos+' correção(ões) do celular em campos que ninguém mais mexeu entram sem perguntar.</p>' : '')+'</section>'+
  m.conflitos.map((c,i)=>{ const k=c.tipo+'|'+c.chave, esc0=(r.escolhas||{})[k];
   if(c.tipo==='campo' && c.pasta===null) return '<section class="bloco escolha"><h3>'+esc(rot(c))+'</h3><p class="ajuda">Este campo não existe mais na pasta (foi apagado no computador). A correção do celular não tem onde entrar; se ainda for preciso, refaça no computador.</p><p class="txt">'+valor(c, c.celular)+'</p></section>';
   return '<section class="bloco escolha"><h3>'+esc(rot(c))+'</h3>'+
    '<label class="versao"><input type="radio" name="k'+i+'" value="pasta" data-k="'+esc(k)+'"'+(esc0==='pasta'?' checked':'')+'><span><b>'+ic('arquivo')+'Na pasta (computador)</b><span class="txt">'+valor(c, c.pasta)+'</span></span></label>'+
    '<label class="versao"><input type="radio" name="k'+i+'" value="celular" data-k="'+esc(k)+'"'+(esc0==='celular'?' checked':'')+'><span><b>'+ic('aparelho')+'No celular</b><span class="txt">'+valor(c, c.celular)+'</span></span></label></section>'; }).join('')+
  '<button class="bt txt perigo apagar-v" id="kDescartar">'+ic('lixo')+'Descartar tudo o que fiz no celular</button>'+
  '<div class="rodape-fixo"><button class="bt pri largo" id="kEnviar">'+ic('enviar')+'Encaminhar com estas escolhas</button></div></main>';
};
TELAS.conflito.ligar = function(id){
 const r=RASCS[id]; if(!r) return;
 $$('[data-k]').forEach(el=>el.onchange=()=>{ r.escolhas=r.escolhas||{}; r.escolhas[el.dataset.k]=el.value; });
 if($('#kDescartar')) $('#kDescartar').onclick=async()=>{ if(!confirm('Descartar as correções feitas no celular para este documento? Fica valendo o que está na pasta.')) return; await apagarRascunho(id); await Arquivos.apagar(caminhoCopia(id)); aviso('Correções do celular descartadas.'); history.replaceState(null,'','#documentos'); mostrar(); };
 if($('#kEnviar')) $('#kEnviar').onclick=async()=>{
  const C=r.conflito, faltam=C.mescla.conflitos.filter(c=>!(r.escolhas||{})[c.tipo+'|'+c.chave]).length;
  if(faltam){ alert('Escolha a versão em '+faltam+' item(ns).'); return; }
  r.escolhas=r.escolhas||{}; r.escolhasPara={modificado:C.modificado}; r.conflito=null; r.pendente=true; await gravarRascunho(id, r);
  ocupado('Encaminhando…'); const s=await sincronizarCorrecao(id, {interativo:true}); ocupado(false);
  if(s.ok){ alert('Encaminhado para revisão com as suas escolhas.'); history.replaceState(null,'','#documentos'); mostrar(); atualizarDocumentos(cfg.pasta, {silencioso:true}); }
  else if(s.conflito){ alert('O arquivo mudou de novo na pasta enquanto você escolhia. Confira mais uma vez.'); mostrar(); }
  else if(s.fila){ aviso('Sem conexão agora. As escolhas ficaram guardadas e a correção vai no Wi-Fi da FUNAT.', 5000); history.replaceState(null,'','#envios'); mostrar(); }
  else alert('Não foi encaminhado: '+s.erro);
 };
};

/* ---------- câmera rápida (aba) ---------- */
TELAS.camera = function(){
 const e=ordenadas(VIST.filter(v=>v.status==='em_andamento'));
 return topo('Câmera')+'<main class="pag com-nav"><p class="ajuda">Escolha a vistoria em que a foto vai entrar.</p>'+
  (e.length? e.map(v=>'<button class="cartao escolha" data-cam="'+v.id+'"><div class="c-l1">'+tagTipo(v.tipoDocumento)+'<b>'+esc(protocoloTexto(v))+'</b></div>'+(v.assunto?'<h3>'+esc(v.assunto)+'</h3>':'')+'<p class="st">'+v.fotos.length+' foto(s) · '+esc(quandoRelativo(v.editadaEm))+'</p></button>').join('')
   : '<div class="vazio"><p>Nenhuma vistoria em andamento.</p></div>')+'<button class="bt pri largo" data-ir="#nova">'+ic('mais')+'Nova vistoria</button></main>'+navInferior('#camera');
};
TELAS.camera.ligar = function(){ $$('[data-cam]').forEach(b=>b.onclick=async()=>{ const v=acharVistoria(b.dataset.cam); location.hash='#v/'+v.id; await novaFotoCamera(v); }); };

function naoAchou(){ return topo('Não encontrada', {voltar:true})+'<main class="pag"><div class="vazio"><p>Esta vistoria não existe mais neste aparelho.</p><button class="bt pri" data-ir="#inicio">Ir para o início</button></div></main>'; }

/* ======================= atualização do app pela pasta da FUNAT (0.8.0) =======================
   Na pasta de atualização ficam o .apk e o versao.json (copiado por último). O app confere quando alcança a pasta
   (ao abrir e ao voltar para ele; no máximo a cada 30 minutos) e avisa. Quem instala é o auxiliar: o Android sempre
   pede a confirmação. Abaixo da versão mínima, o app continua vistoriando, mas não envia nada para a pasta. */
const PASTA_ATUALIZACAO=(typeof CONFIG_APP!=='undefined' && CONFIG_APP.pastaAtualizacao) || 'FISCALIZAÇÃO\\APP DE CAMPO';
const MSG_ATUALIZAR='Este app está desatualizado: atualize para enviar. Você pode continuar vistoriando normalmente.';
function atualizacaoDisponivel(){ const a=cfg.atualizacao; return a && a.codigo>CODIGO_APP? a : null; }
/* A trava do "minimo" só vale depois que ESTE aparelho baixou e conferiu (tamanho, SHA-256, assinatura) aquela versão:
   um versao.json errado (ou de má-fé) na pasta não pode parar o envio de todos os fiscais. */
function bloqueadoParaEnviar(){ const a=atualizacaoDisponivel(); return !!(a && a.minimo>CODIGO_APP && cfg.apkConferido===a.codigo); }
let conferindoVersao=false;
async function conferirAtualizacao(op){
 op=op||{}; if(MODO_WEB || !cfg.pasta || conferindoVersao) return;
 if(!op.forcar && Date.now()-(cfg.versaoConferidaEm||0)<30*60e3) return;
 conferindoVersao=true;
 try{
  const r=await Pasta.lerVersao(PASTA_ATUALIZACAO); let v={valida:false};
  if(r.existe){ try{ v=avaliarVersao(JSON.parse(r.texto), CODIGO_APP); }catch(e){} }
  cfg.versaoConferidaEm=Date.now();
  cfg.atualizacao=v.valida? {versao:v.versao, codigo:v.codigo, arquivo:v.arquivo, tamanho:v.tamanho, sha256:v.sha256, minimo:v.minimo, novidades:v.novidades} : null;
  gravarCfg();
  if(op.forcar) aviso(atualizacaoDisponivel()? 'Nova versão '+cfg.atualizacao.versao+' disponível.' : r.existe && !v.valida? 'O arquivo versao.json da pasta não está no formato esperado.' : r.existe? 'O app já está na versão mais nova.' : 'Nenhuma versão publicada em '+PASTA_ATUALIZACAO+'.', 4500);
  atualizarSemPerderFoco();
 }catch(e){ if(op.forcar) aviso('Não foi possível conferir: '+(e.message||e), 6000); }
 finally{ conferindoVersao=false; }
}
function faixaAtualizacao(){
 const a=atualizacaoDisponivel(); if(!a) return '';
 const b=bloqueadoParaEnviar();
 return '<a class="alerta-envio atualizacao'+(b? ' conflito' : '')+'" href="#atualizar">'+ic(b? 'alerta' : 'baixar')+'<span><b>'+(b? 'Atualize o app para enviar as vistorias.' : 'Nova versão '+esc(a.versao)+' disponível')+'</b> '+
  (b? 'Você pode continuar vistoriando.' : esc(a.novidades.length? 'Novidades: '+a.novidades.join('; ')+'.' : 'Toque para atualizar.'))+'</span><em class="at-bt">Atualizar</em></a>';
}
let ATU={fase:'', lidos:0, total:0, erro:'', permissao:null};
const mbTxt=x=>(x/1048576).toFixed(1).replace('.',',');
TELAS.atualizar = function(){
 const a=atualizacaoDisponivel();
 if(!a) return topo('Atualizar o app', {voltar:true, direita:'<span></span>'})+'<main class="pag centro"><div class="grande-ok">'+ic('ok')+'</div><h2>O app está atualizado</h2><p class="ajuda">Versão instalada: '+esc(VERSAO_APP)+'. O app confere a pasta da FUNAT sozinho, sempre que alcança a rede.</p><button class="bt claro largo" id="atConferir">'+ic('baixar')+'Conferir agora</button></main>';
 let corpo;
 if(ATU.permissao===false) corpo='<h2>Permitir as atualizações</h2><p class="ajuda">Uma vez só: o Android precisa deixar este app instalar a versão nova.</p><ol class="passos"><li>Toque em <b>Abrir configurações</b>.</li><li>Ative <b>Permitir desta fonte</b>.</li><li>Volte para o app (botão Voltar do celular).</li></ol>'+
  '<button class="bt pri largo alto" id="atPermissao">Abrir configurações</button><button class="bt txt largo" id="atDeNovo">Já ativei</button>';
 else if(ATU.fase==='baixando') corpo='<div class="at-prog"><p><b>Baixando da pasta da FUNAT…</b></p><div class="at-barra"><i style="width:'+(ATU.total? Math.round(ATU.lidos*100/ATU.total) : 0)+'%"></i></div><p class="ajuda" id="atNum">'+mbTxt(ATU.lidos)+' de '+mbTxt(ATU.total)+' MB</p><p class="ajuda">Não feche o app e fique no Wi-Fi da FUNAT.</p></div>';
 else if(ATU.fase==='pronto') corpo='<div class="grande-ok">'+ic('ok')+'</div><p><b>Arquivo conferido.</b></p><p class="ajuda"><span>O Android vai pedir para confirmar: toque em <b>Instalar</b> (ou <b>Atualizar</b>). Depois, abra o app de novo.</span></p><button class="bt pri largo alto" id="atInstalar">Instalar a versão '+esc(a.versao)+'</button>';
 else corpo=(ATU.erro? '<p class="nota-alerta">'+ic('alerta')+'<span>'+esc(ATU.erro)+'</span></p>' : '')+'<button class="bt pri largo alto" id="atBaixar">'+ic('baixar')+'Atualizar agora</button><p class="ajuda">No Wi-Fi da FUNAT. Suas vistorias, fotos e rascunhos continuam no aparelho.</p>';
 return topo('Atualizar o app', {voltar:true, direita:'<span></span>'})+'<main class="pag"><section class="bloco"><h2>Versão '+esc(a.versao)+'</h2><p class="ajuda">Instalada: '+esc(VERSAO_APP)+' · download de '+mbTxt(a.tamanho)+' MB</p>'+
  (a.novidades.length? '<ul class="passos">'+a.novidades.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul>' : '')+(bloqueadoParaEnviar()? '<p class="nota-alerta">'+ic('alerta')+'<span>'+esc(MSG_ATUALIZAR)+'</span></p>' : '')+'</section>'+
  '<section class="bloco at-corpo">'+corpo+'</section></main>';
};
TELAS.atualizar.ligar = function(){
 const b=$('#atBaixar'); if(b) b.onclick=baixarEInstalar;
 const i=$('#atInstalar'); if(i) i.onclick=instalarBaixada;
 const p=$('#atPermissao'); if(p) p.onclick=()=>Pasta.abrirPermissaoInstalar().catch(e=>aviso(e.message||String(e)));
 const d=$('#atDeNovo'); if(d) d.onclick=async()=>{ ATU.permissao=await Pasta.podeInstalar(); if(ATU.permissao) baixarEInstalar(); else { aviso('Ainda não está permitido. Ative "Permitir desta fonte" e volte.'); } };
 const c=$('#atConferir'); if(c) c.onclick=async()=>{ await conferirAtualizacao({forcar:true}); mostrar(true); };
};
async function baixarEInstalar(){
 const a=atualizacaoDisponivel(); if(!a || ATU.fase==='baixando') return;
 await gravarAgora();
 try{ ATU.permissao=await Pasta.podeInstalar(); }catch(e){ ATU.permissao=true; }
 if(!ATU.permissao){ mostrar(true); return; }
 ATU={fase:'baixando', lidos:0, total:a.tamanho, erro:'', permissao:true}; mostrar(true);
 try{
  await Pasta.baixarAtualizacao({pasta:PASTA_ATUALIZACAO, arquivo:a.arquivo, tamanho:a.tamanho, sha256:a.sha256}, (l, t)=>{
   ATU.lidos=l; ATU.total=t||a.tamanho; const bar=$('.at-barra i'), n=$('#atNum');
   if(bar) bar.style.width=Math.round(ATU.lidos*100/ATU.total)+'%'; if(n) n.textContent=mbTxt(ATU.lidos)+' de '+mbTxt(ATU.total)+' MB'; });
  cfg.apkConferido=a.codigo; gravarCfg();          // só agora a trava do "minimo" passa a valer (ver bloqueadoParaEnviar)
  ATU.fase='pronto'; mostrar(true); instalarBaixada();
 }catch(e){
  ATU={fase:'', lidos:0, total:0, permissao:true, erro:['SEM_REDE','SEM_CONFIG','SENHA'].includes(e.code)? 'Não alcancei a pasta da FUNAT. Conecte-se ao Wi-Fi da FUNAT e tente de novo.' : (e.message||String(e))};
  mostrar(true);
 }
}
async function instalarBaixada(){ try{ await Pasta.instalarAtualizacao(); }catch(e){ ATU={fase:'', lidos:0, total:0, permissao:true, erro:e.message||String(e)}; mostrar(true); } }

/* ======================= roteador ======================= */
function rotaAtual(){ const h=(location.hash||'#inicio').slice(1).split('/'); return {nome:h[0]||'inicio', args:h.slice(1).map(decodeURIComponent)}; }
let rotaAnterior='';
/* aba da barra lateral (tablet) para as telas internas, que no celular não têm a barra de baixo */
const ABA_DA_TELA={v:'#vistorias', foto:'#vistorias', editar:'#vistorias', nova:'#vistorias', pronta:'#vistorias', doc:'#documentos', corrigir:'#documentos', conflito:'#envios',
 planejar:'#itinerario', parada:'#itinerario', resumo:'#itinerario', pasta:'', config:'', planilha:'', escolher:'', atualizar:'', 'arquivos-ajuda':''};
function railNasTelasInternas(){ if($('#app .nav-inf')) return; const r=rotaAtual().nome; const a=ABA_DA_TELA[r]; $('#app').insertAdjacentHTML('beforeend', navInferior(a===undefined? '' : a).replace('class="nav-inf"','class="nav-inf so-tablet"')); }
function mostrar(manterRolagem){
 if(!cfg.nome && rotaAtual().nome!=='config'){ history.replaceState(null, '', '#config'); }
 const r=rotaAtual(), tela=TELAS[r.nome]||TELAS.inicio, y=window.scrollY, chave=location.hash;
 const mov=movimentoDe(chave), chipAntes=($('.chip-sinc')||{}).className||'';
 document.getElementById('app').innerHTML=tela.apply(null, r.args);
 if(tela.ligar) tela.ligar.apply(null, r.args);
 railNasTelasInternas();
 window.scrollTo(0, manterRolagem && chave===rotaAnterior? y : 0); rotaAnterior=chave;
 animarTela(mov, chipAntes);
}

/* ---------- animações (o CSS está no fim de app.css) ----------
   Mais fundo desliza da direita, voltar desliza da esquerda, trocar de aba só esmaece.
   Redesenhar a mesma tela (mostrar(true) depois de gravar ou enviar) não anima nada. */
const ABAS=['inicio','vistorias','camera','itinerario','documentos','envios'];
let pilhaTelas=[];
function movimentoDe(chave){
 if(chave===rotaAnterior) return '';
 if(!rotaAnterior){ pilhaTelas=[chave]; return 'aba'; }
 const nome=h=>(h||'#inicio').slice(1).split('/')[0]||'inicio';
 if(ABAS.includes(nome(chave)) && ABAS.includes(nome(rotaAnterior))){ pilhaTelas=[chave]; return 'aba'; }
 if(pilhaTelas.length>1 && pilhaTelas[pilhaTelas.length-2]===chave){ pilhaTelas.pop(); return 'volta'; }
 if(ABAS.includes(nome(chave))){ pilhaTelas=[chave]; return 'volta'; }
 pilhaTelas.push(chave); if(pilhaTelas.length>30) pilhaTelas.shift(); return 'entra';
}
function animarTela(mov, chipAntes){
 const chip=$('.chip-sinc');
 if(chip && /andando/.test(chipAntes) && !chip.classList.contains('andando')) chip.classList.add(chip.classList.contains('ok')? 'chegou' : 'treme');
 if(!mov) return;
 document.body.classList.remove('fab-recolhido'); ultimoY=0;
 const m=$('#app main'); if(m) m.classList.add('anim-'+mov);
 if(mov==='aba'){ const n=$('.nav-inf'); if(n) n.classList.add('troca'); }
 $$('#app main .cartao').slice(0,6).forEach((c,i)=>{ c.style.animationDelay=(i*30)+'ms'; c.classList.add('surge'); });
}
function animarFotosNovas(n){ const minis=$$('.minis .mini'); minis.slice(-Math.min(n,6)).forEach(el=>el.classList.add('chega')); const c=$('.h-cont .cont'); if(c && n) c.classList.add('pula'); }
function animarLocal(){ const b=$('#vGps'); const s=b && b.closest('.bloco'); if(s) s.classList.add('achou'); }
let ultimoY=0;
window.addEventListener('scroll', ()=>{ const y=window.scrollY, f=$('.fab'); if(!f) return;
 if(y>ultimoY+6 && y>120) document.body.classList.add('fab-recolhido'); else if(y<ultimoY-6) document.body.classList.remove('fab-recolhido');
 ultimoY=y; }, {passive:true});
document.addEventListener('click', e=>{
 const ai=e.target.closest('[data-aba-ir]'); if(ai){ abaVist=ai.dataset.abaIr; location.hash='#vistorias'; mostrar(); return; }
 const ir=e.target.closest('[data-ir]'); if(ir){ e.preventDefault(); location.hash=ir.dataset.ir; return; }
 if(e.target.closest('[data-voltar]')){ e.preventDefault(); voltar(); return; }
 const ini=e.target.closest('[data-iniciar]'); if(ini){ const v=acharVistoria(ini.dataset.iniciar); iniciarVistoria(v); gravarVistoria(v).then(()=>{ location.hash='#v/'+v.id; }); return; }
 const dm=e.target.closest('[data-demanda]'); if(dm){ iniciarDaDemanda(decodeURIComponent(dm.dataset.demanda)); return; }
 const rd=e.target.closest('[data-retorno]'); if(rd){ const dd=((DEMANDAS&&DEMANDAS.itens)||[]).find(x=>idDemanda(x)===decodeURIComponent(rd.dataset.retorno)); if(dd) voltarAoLocal({d:dd}); else aviso('Esta demanda não está mais na sua lista da planilha.', 5000); return; }
 const rv=e.target.closest('[data-retorno-v]'); if(rv){ const vv=acharVistoria(rv.dataset.retornoV); if(vv) voltarAoLocal({v:vv}); return; }
 const lr=e.target.closest('[data-limpar-retorno]'); if(lr){ const vv=acharVistoria(lr.dataset.limparRetorno); if(vv && confirm('Dispensar o retorno combinado para '+(vv.voltarEm? dataBrCampo(vv.voltarEm) : 'esta vistoria')+'?')){ vv.voltarEm=''; gravarVistoria(vv).then(()=>mostrar(true)); } return; }
 if(e.target.closest('[data-ler-planilha]')){ atualizarDemandas({}); return; }
 const me=e.target.closest('[data-mapa-end]'); if(me){ Aparelho.abrirEndereco(me.dataset.mapaEnd+', Tubarão - SC'); return; }
 const mp=e.target.closest('[data-mapa]'); if(mp){ const v=acharVistoria(mp.dataset.mapa); if(v&&v.local) Aparelho.abrirMapa(v.local.lat, v.local.lon, protocoloTexto(v)); }
});
function voltar(){
 if(fecharFolha){ fecharFolha(null); return; }
 const t=$('.tela-cheia'); if(t){ t.remove(); return; }
 const r=rotaAtual().nome;
 if(r==='inicio' || (r==='config' && !cfg.nome)){ gravarAgora().then(()=>Aparelho.sair()); return; }
 if(['vistorias','envios','camera','pronta','documentos','itinerario'].includes(r)){ location.hash='#inicio'; return; }
 if(history.length>1) history.back(); else location.hash='#inicio';
}
window.addEventListener('hashchange', async()=>{ await gravarAgora(); if(CORR && rotaAtual().nome!=='corrigir'){ clearTimeout(tRasc); const c=CORR; CORR=null; gravarRascunho(c.id, c.rasc).catch(()=>{}); } if(rotaAtual().nome!=='pasta') confPasta=null; mostrar(); });
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) gravarAgora(); });
Aparelho.aoVoltar(()=>voltar());
aoVoltarParaOApp(async()=>{
 if(rotaAtual().nome==='atualizar' && ATU.permissao===false){ ATU.permissao=await Pasta.podeInstalar().catch(()=>false); if(ATU.permissao) baixarEInstalar(); }
 await enviarPendentes({silencioso:true}); conferirRecebidas(); conferirAtualizacao(); if(cfg.planilhaAtiva && DEMANDAS && Date.now()-(DEMANDAS.lidoEm||0)>5*60e3) atualizarDemandas({silencioso:true}); const p=pastaDocs(); if(p && Date.now()-lidoEmDe(p)>5*60e3) atualizarDocumentos(p, {silencioso:true}); });

(async function iniciar(){
 if(document.readyState==='loading') await new Promise(r=>document.addEventListener('DOMContentLoaded', r, {once:true}));   /* itinerario.js vem depois deste arquivo */
 try{ await carregarVistorias(); }catch(e){ console.error(e); }
 recuperarFotoDaCamera();
 try{ if(typeof carregarItinerario==='function') await carregarItinerario(); }catch(e){ console.error(e); }
 try{ await carregarRascunhos(); }catch(e){ console.error(e); }
 mostrar(); iniciarAtualizacaoWeb(); conferirUsoOffline().then(()=>{ if(['inicio','config'].includes(rotaAtual().nome)) mostrar(true); });
 if(!MODO_WEB && !atualizacaoDisponivel()) Pasta.apagarAtualizacao().catch(()=>{});   /* sobra de uma atualização já instalada */
 await enviarPendentes({silencioso:true}); conferirRecebidas(); conferirAtualizacao();
 await cacheDocs(); await carregarDemandas(); if(['inicio','vistorias','planejar','itinerario','parada','resumo'].includes(rotaAtual().nome)) mostrar(true);
 if(cfg.planilhaAtiva && Date.now()-(DEMANDAS.lidoEm||0)>5*60e3) atualizarDemandas({silencioso:true});
 if(cfg.pasta && Date.now()-lidoEmDe(cfg.pasta)>5*60e3) atualizarDocumentos(cfg.pasta, {silencioso:true});
})();

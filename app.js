/* ===== App de campo — telas =====
   Rotas pelo endereço (#inicio, #vistorias, #nova, #v/<id>, #foto/<id>/<n>, #envios, #pronta/<id>, #config).
   Cada vistoria fica em vistorias/<id>.json e as fotos em fotos/<id>/<foto>.jpg, na memória interna do app. */

const VERSAO_APP = '0.7.1 (piloto 5)';
const CODIGO_APP = 12;              // sobe a cada APK: o Android só instala por cima versão com código maior
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
 voltar:'<path d="M15 18l-6-6 6-6"/>', fechar:'<path d="M6 6l12 12M18 6L6 18"/>',
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
async function carregarVistorias(){
 const nomes=(await Arquivos.listar('vistorias')).filter(n=>/\.json$/.test(n)); const out=[];
 for(const n of nomes){ try{ const v=JSON.parse(await Arquivos.lerTexto('vistorias/'+n)); if(v && v.id) out.push(v); }catch(e){ console.warn('vistoria ilegível', n, e); } }
 VIST=out;
}
async function gravarVistoria(v){ v.editadaEm=new Date().toISOString(); await Arquivos.gravarTexto('vistorias/'+v.id+'.json', JSON.stringify(v)); if(!VIST.includes(v)) VIST.push(v); }
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
 return '<nav class="nav-inf">'+it('#inicio','casa','Início')+it('#vistorias','lista','Vistorias')+it('#camera','camera','Câmera')+(MODO_WEB? '' : it('#documentos','arquivo','Documentos'))+it('#envios','enviar','Envios')+'</nav>'; }
function faixaTeste(){ return '<div class="faixa">'+ic('aparelho')+'<span>'+(MODO_WEB? 'Salvo neste iPhone. Ao concluir, toque em “Exportar e salvar na pasta” e guarde o arquivo na sua pasta VISTORIAS.' : cfg.pasta? 'Salvo neste aparelho. Ao concluir, vai para a pasta “'+esc(cfg.pasta.nome)+'” quando estiver no Wi-Fi da FUNAT.' : 'Salvo neste aparelho. Configure a pasta da FUNAT em Meus dados para enviar.')+'</span></div>'; }
function tagTipo(t){ const d=TIPOS_DOC[t]||TIPOS_DOC.relatorio; return '<span class="tag t-'+t+'">'+esc(d.curto.toUpperCase())+'</span>'; }

/* ---------- cartões de vistoria ---------- */
function rotuloStatus(v){
 if(v.status==='a_vistoriar') return 'Ainda não vistoriada · criada '+quandoRelativo(v.criadaEm);
 if(v.status==='em_andamento') return 'Em andamento · '+v.fotos.length+' foto'+(v.fotos.length===1?'':'s')+' · editada '+quandoRelativo(v.editadaEm);
 return v.precisaEnviar? 'Concluída · na fila para a pasta da FUNAT' : v.enviadaEm? 'Concluída · enviada para a pasta '+quandoRelativo(v.enviadaEm) : v.exportadaEm? 'Concluída · arquivo exportado '+quandoRelativo(v.exportadaEm) : 'Concluída';
}
function cartao(v){
 const local=[v.bairro, v.endereco].filter(Boolean).join(' · ');
 const acao= v.status==='a_vistoriar'? '<button class="bt pri" data-iniciar="'+v.id+'">'+ic('camera')+'Iniciar vistoria</button>'
          : v.status==='em_andamento'? '<button class="bt pri" data-ir="#v/'+v.id+'">'+ic('lapis')+'Continuar</button>'
          : '<button class="bt sec" data-ir="#v/'+v.id+'">Abrir</button>';
 const mapa= v.local? '<button class="bt txt" data-mapa="'+v.id+'">'+ic('mapa')+'Ver no mapa</button>' : '';
 return '<article class="cartao st-'+v.status+'"><div class="c-l1">'+tagTipo(v.tipoDocumento)+'<b>'+esc(protocoloTexto(v))+'</b></div>'+
  (v.assunto? '<h3>'+esc(v.assunto)+'</h3>' : '')+(local? '<p class="loc">'+ic('pino')+esc(local)+'</p>' : '')+
  '<p class="st">'+esc(rotuloStatus(v))+'</p><div class="c-ac">'+acao+mapa+'</div></article>'; }
function ordenadas(lista){ return lista.slice().sort((a,b)=>String(b.editadaEm).localeCompare(String(a.editadaEm))); }

/* ======================= TELAS ======================= */
const TELAS = {};

TELAS.config = function(){
 const nomes=['Dilmar Orige Estevão','Felisberto Oliveira da Silva','Marcelo Cardoso'];
 return topo(cfg.nome? 'Meus dados' : 'Bem-vindo', {voltar:!!cfg.nome, direita:'<span></span>'})+
  '<main class="pag"><section class="bloco"><h2>Quem usa este aparelho?</h2><p class="ajuda">O nome sai como elaborador nos documentos gerados a partir das vistorias.</p>'+
  '<label class="campo"><span>Seu nome completo</span><input id="cfNome" list="cfNomes" autocomplete="name" value="'+esc(cfg.nome||'')+'"></label>'+
  '<datalist id="cfNomes">'+nomes.map(n=>'<option value="'+esc(n)+'">').join('')+'</datalist></section>'+
  (cfg.nome && MODO_WEB? '<section class="bloco"><h2>Pasta da FUNAT</h2><p class="ajuda">Nesta versão para iPhone, a vistoria vai para a pasta pelo app <b>Arquivos</b>: ao concluir, toque em “Exportar e salvar na pasta”.</p><button class="bt claro largo" data-ir="#arquivos-ajuda">'+ic('pasta')+'Como ligar o app Arquivos à pasta da FUNAT</button></section>' : '')+
  (cfg.nome && !MODO_WEB? '<section class="bloco"><h2>Pasta da FUNAT</h2><p class="ajuda">'+(cfg.pasta? 'Envia para: <b>'+esc(cfg.pasta.nome)+'</b> › VISTORIAS' : 'Ainda não configurada.')+'</p><button class="bt claro largo" data-ir="#pasta">'+ic('enviar')+(cfg.pasta?'Alterar acesso ou pasta':'Configurar acesso à pasta')+'</button></section>' : '')+
  (cfg.nome? '<section class="bloco"><h2>Demandas da planilha</h2><p class="ajuda">'+(cfg.planilhaAtiva? 'Ligado'+(DEMANDAS&&DEMANDAS.fiscal?': demandas de <b>'+esc(DEMANDAS.fiscal)+'</b>':'')+'.' : 'Desligado. Com a chave do seu nome, as demandas que o Pedro distribui para você aparecem em “Para vistoriar”.')+'</p><button class="bt claro largo" data-ir="#planilha">'+ic('lista')+(cfg.planilhaAtiva?'Chave e situação':'Ligar com a minha chave')+'</button></section>' : '')+
  '<section class="bloco"><h2>Sobre esta versão</h2><p class="ajuda">FUNAT Fiscalização '+esc(VERSAO_APP)+(MODO_WEB? '. Versão para iPhone: fotos, posições e anotações ficam neste iPhone até você exportar. Ao concluir, toque em “Exportar e salvar na pasta” e guarde o arquivo na sua pasta VISTORIAS pelo app Arquivos.' : '. Fotos, posições e anotações ficam neste aparelho. Ao concluir uma vistoria, o app a envia para a subpasta VISTORIAS da sua pasta, quando o celular está no Wi-Fi da FUNAT. Ele não grava em nenhum outro lugar da rede.')+'</p></section>'+
  '<div class="rodape-fixo"><button class="bt pri largo" id="cfOk">'+(cfg.nome? 'Salvar' : 'Começar')+'</button></div></main>';
};
TELAS.config.ligar = function(){ $('#cfOk').onclick=()=>{ const n=$('#cfNome').value.trim(); if(n.length<3){ aviso('Escreva o seu nome completo.'); $('#cfNome').focus(); return; } cfg.nome=n; gravarCfg(); location.hash='#inicio'; }; };

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
  chipEnvio()+'</div>'+
  (c.length? '<a class="alerta-envio" href="#envios">'+ic('enviar')+'<span><b>'+c.length+' vistoria'+(c.length>1?'s':'')+' concluída'+(c.length>1?'s':'')+'</b> na fila para a pasta da FUNAT</span></a>' : '')+
  (correcoesComConflito().length? '<a class="alerta-envio conflito" href="#envios">'+ic('alerta')+'<span><b>'+correcoesComConflito().length+' correção(ões)</b> encontraram outra versão na pasta: escolha qual vale</span></a>' : '')+
  blocoAtencao()+
  (e.length? '<h2 class="secao">Em andamento <span class="cont">'+e.length+'</span></h2>'+e.map(cartao).join('') : '')+
  '<h2 class="secao">Para vistoriar <span class="cont">'+(a.length+dp.length)+'</span></h2>'+linhaPlanilha()+((a.length||dp.length)? dp.slice(0,limDem).map(cartaoDemanda).join('')+(dp.length>limDem? '<a class="resumo-docs" href="#vistorias">'+ic('lista')+'<span>e mais '+(dp.length-limDem)+' demanda'+(dp.length-limDem>1?'s':'')+' da planilha</span>'+ic('voltar','seta-dir')+'</a>' : '')+a.map(cartao).join('') :
   '<div class="vazio">'+ic('lista')+'<p>Nenhuma vistoria agendada.</p><p class="ajuda">'+(cfg.planilhaAtiva? 'Nenhuma demanda aberta sem vistoria na última leitura da planilha.' : 'Ligue as demandas da planilha em Meus dados, ou toque em “Nova vistoria”.')+'</p></div>')+
  '</main><button class="fab" data-ir="#nova" aria-label="Nova vistoria">'+ic('mais')+'<span class="rot">Nova vistoria</span></button>'+navInferior('#inicio');
};

let abaVist='a_vistoriar', buscaVist='';
TELAS.vistorias = function(){
 const q=buscaVist.trim().toLowerCase();
 const abas=[['a_vistoriar','Para vistoriar'],['em_andamento','Em andamento'],['concluida','Concluídas']].concat(cfg.planilhaAtiva? [['fiscalizadas','Já fiscalizadas']] : []);
 const casa=d=>!q || [d.protocolo,d.assunto,d.endereco,d.diligencias].join(' ').toLowerCase().includes(q);
 const dems=abaVist==='a_vistoriar'? demandasParaVistoriar().filter(casa) : abaVist==='fiscalizadas'? demandasFiscalizadas().filter(casa) : [];
 const contar=k=>k==='fiscalizadas'? demandasFiscalizadas().length : VIST.filter(v=>v.status===k).length+(k==='a_vistoriar'? demandasParaVistoriar().length : 0);
 const lista=abaVist==='fiscalizadas'? [] : ordenadas(VIST.filter(v=>v.status===abaVist && (!q || [protocoloTexto(v), v.assunto, v.bairro, v.endereco, v.autuado].join(' ').toLowerCase().includes(q))));
 return topo('Vistorias')+'<main class="pag com-nav"><label class="busca">'+ic('busca')+'<input id="vBusca" type="search" placeholder="Buscar protocolo, assunto ou bairro" value="'+esc(buscaVist)+'"></label>'+
  '<div class="abas" role="tablist">'+abas.map(([k,r])=>'<button role="tab" aria-selected="'+(k===abaVist)+'" data-aba="'+k+'">'+r+' <span class="cont">'+contar(k)+'</span></button>').join('')+'</div>'+
  (['a_vistoriar','fiscalizadas'].includes(abaVist)? linhaPlanilha() : '')+(abaVist==='fiscalizadas'? '<p class="ajuda">Demandas ainda abertas na planilha que já têm vistoria: o que falta é o documento.</p>' : '')+
  '<div id="vLista">'+((lista.length||dems.length)? dems.map(cartaoDemanda).join('')+lista.map(cartao).join('') : '<div class="vazio"><p>Nada aqui'+(q?' com essa busca':'')+'.</p></div>')+'</div>'+
  '</main><button class="fab" data-ir="#nova" aria-label="Nova vistoria">'+ic('mais')+'<span class="rot">Nova vistoria</span></button>'+navInferior('#vistorias');
};
TELAS.vistorias.ligar = function(){
 $$('[data-aba]').forEach(b=>b.onclick=()=>{ abaVist=b.dataset.aba; mostrar(); });
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
TELAS.editar.ligar = function(id){ ligarSeg(); $('#eOk').onclick=async()=>{ const v=acharVistoria(id); lerFormDados(v); await gravarVistoria(v); history.back(); }; };

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
  '<section class="bloco"><div class="c-l1">'+tagTipo(v.tipoDocumento)+'<span class="pilula">'+(fim?'Concluída':'Salvo no aparelho')+'</span></div>'+
  '<h2 class="prot">'+esc(protocoloTexto(v))+'</h2>'+(v.assunto?'<p>'+esc(v.assunto)+'</p>':'')+([v.endereco,v.bairro].filter(Boolean).length? '<p class="loc">'+ic('pino')+esc([v.endereco,v.bairro].filter(Boolean).join(' · '))+'</p>' : '')+
  (v.demanda? '<p class="da-planilha">'+ic('lista')+'<span>Da planilha: '+esc(v.demanda.protocolo)+' · repassada em '+esc(v.demanda.repasse||v.demanda.entrada||'?')+(v.demanda.diligencias? ' · '+esc(v.demanda.diligencias) : '')+'</span></p>' : '')+
  '<button class="bt txt" data-ir="#editar/'+v.id+'">'+ic('lapis')+'Editar dados</button>'+
  '<div class="quando">'+ic('relogio')+'<label class="campo"><span>Data da vistoria</span><input type="date" id="vData" value="'+esc(v.dataVistoria)+'"></label><label class="campo"><span>Hora</span><input type="time" id="vHora" value="'+esc(v.horaVistoria)+'"></label></div></section>'+
  '<section class="bloco"><h2>'+ic('pino')+'Local da vistoria</h2>'+blocoLocal(v)+'</section>'+
  '<section class="bloco"><div class="h-cont"><h2>Fotos da vistoria</h2><span class="cont grande">'+v.fotos.length+'</span></div>'+
  '<button class="bt pri largo alto" id="vFoto">'+ic('camera')+'Tirar foto com a câmera</button><button class="bt claro largo" id="vGaleria">'+ic('galeria')+'Escolher da galeria</button>'+
  (v.fotos.length? '<div class="minis">'+v.fotos.map((f,i)=>miniFoto(v,f,i)).join('')+'</div><p class="ajuda">Toque numa foto para escrever a legenda, girar ou excluir.</p>' : '')+'</section>'+
  '<section class="bloco"><div class="h-cont"><h2>Anotações de campo</h2><small>voz ou texto</small></div>'+
  '<textarea id="vNotas" rows="6" placeholder="O que foi constatado, quem atendeu, providências…">'+esc(v.anotacoes)+'</textarea>'+
  '<p class="ajuda">'+ic('mic')+'Para ditar, toque no microfone do teclado. No computador, as anotações aparecem no quadro “Vistoria feita no celular”, para você inserir no documento.</p></section>'+blocoRuido(v)+
  '<button class="bt txt perigo apagar-v" id="vApagar">'+ic('lixo')+'Excluir esta vistoria do aparelho</button>'+
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
 $('#vApagar').onclick=()=>apagarVistoria(v);
 if($('#vSalvar')) $('#vSalvar').onclick=async()=>{ await gravarAgora(); await gravarVistoria(v); aviso('Rascunho salvo neste aparelho.'); };
 if($('#vConcluir')) $('#vConcluir').onclick=()=>concluir(v);
 if($('#vReabrir')) $('#vReabrir').onclick=async()=>{
  if(v.enviadaEm && !confirm('Esta vistoria já foi enviada para a pasta ('+v.arquivoRemoto+').\n\nAo concluir de novo, o app grava por cima desse arquivo. Se ela já foi aberta e alterada no computador, essas alterações se perdem.\n\nReabrir mesmo assim?')) return;
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
async function novaFotoCamera(v){
 const gpsP=posicaoRapida();                     // o GPS começa a procurar enquanto a câmera está aberta
 let blob; try{ blob=await Aparelho.tirarFoto(); }catch(e){ alert('Não foi possível abrir a câmera: '+(e.message||e)); return; }
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
 if(cfg.pasta) enviarPendentes({silencioso:true});
}

/* ---------- vistoria concluída ---------- */
function situacaoEnvio(v){
 if(MODO_WEB) return v.precisaEnviar? {cls:'fila', txt:'Falta exportar e salvar na pasta VISTORIAS (app Arquivos).'} : {cls:'ok', txt:'Exportada '+quandoRelativo(v.exportadaEm)+'. Confira se o arquivo está na sua pasta VISTORIAS.'};
 if(v.precisaEnviar && envioRodando) return {cls:'andando', txt:'Enviando para a pasta…'};
 if(v.precisaEnviar) return {cls:'fila', txt: v.erroEnvio? 'Na fila: '+v.erroEnvio : cfg.pasta? 'Na fila: vai quando o celular estiver no Wi-Fi da FUNAT.' : 'Na fila: configure a pasta da FUNAT em Meus dados.'};
 if(v.enviadaEm) return {cls:'ok', txt:'Enviada '+quandoRelativo(v.enviadaEm)+' para '+ultimaParte(v.arquivoRemoto.replace(/\\[^\\]*$/,''))+' › '+ultimaParte(v.arquivoRemoto)};
 return {cls:'', txt:'Não está na fila.'};
}
TELAS.pronta = function(id){ const v=acharVistoria(id); if(!v) return naoAchou(); const st=situacaoEnvio(v);
 return topo('Vistoria concluída', {direita:'<span></span>'})+'<main class="pag centro"><div class="grande-ok">'+ic('ok')+'</div><h2>Vistoria concluída</h2>'+
  '<p>'+esc(protocoloTexto(v))+' · '+v.fotos.length+' foto'+(v.fotos.length===1?'':'s')+' · '+esc(dataBrCampo(v.dataVistoria))+'</p>'+
  '<div class="bloco esq envio-'+st.cls+'"><h3>'+ic(st.cls==='ok'?'ok':'enviar')+(st.cls==='ok'?'Na pasta da FUNAT':'Envio para a pasta')+'</h3><p class="ajuda">'+esc(st.txt)+'</p>'+
  (st.cls==='ok'? '<p class="ajuda">No computador, ela aparece no Painel do Auxiliar como documento em elaboração, pronto para continuar na ferramenta.</p>' : '')+'</div>'+
  (MODO_WEB? '<button class="bt pri largo alto" data-exportar="'+v.id+'">'+ic('enviar')+(v.precisaEnviar? 'Exportar e salvar na pasta' : 'Exportar de novo')+'</button>' : '')+
  (v.precisaEnviar && cfg.pasta? '<button class="bt pri largo alto" id="pEnviar">'+ic('enviar')+'Tentar enviar agora</button>' : '')+
  (!cfg.pasta && !MODO_WEB? '<button class="bt pri largo alto" data-ir="#pasta">'+ic('enviar')+'Configurar a pasta</button>' : '')+
  '<button class="bt sec largo" data-ir="#inicio">Voltar ao início</button></main>'; };
TELAS.pronta.ligar = function(){ if($('#pEnviar')) $('#pEnviar').onclick=()=>enviarPendentes({}); $$('[data-exportar]').forEach(b=>b.onclick=()=>exportar(acharVistoria(b.dataset.exportar))); };

/* ---------- envios ---------- */
function chipEnvio(){
 const n=pendentesEnvio(VIST).length+correcoesNaFila().length, nc=correcoesComConflito().length;
 if(nc) return '<a class="chip-sinc conflito" href="#envios">'+ic('alerta')+nc+' para decidir</a>';
 if(MODO_WEB) return n? '<a class="chip-sinc fila" href="#envios">'+ic('enviar')+n+' para exportar</a>' : '<a class="chip-sinc" href="#envios">'+ic('aparelho')+'Neste iPhone</a>';
 if(!cfg.pasta) return '<a class="chip-sinc" href="#pasta">'+ic('aparelho')+'Só neste aparelho</a>';
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
  (MODO_WEB? '<div class="bloco info">'+ic('pasta')+'<div><b>Salvar na pasta da FUNAT</b><p class="ajuda">Em cada vistoria concluída, toque em “Exportar e salvar” e escolha <b>Salvar em Arquivos</b> › sua pasta › <b>VISTORIAS</b>. É preciso estar no Wi-Fi da FUNAT.</p><button class="bt claro largo" data-ir="#arquivos-ajuda">'+ic('lista')+'Como ligar o app Arquivos à pasta</button></div></div>'
   : cfg.pasta? '<div class="bloco info">'+ic('enviar')+'<div><b>'+esc(cfg.pasta.nome)+' › VISTORIAS</b><p class="ajuda">As vistorias concluídas vão para essa pasta quando o celular está no Wi-Fi da FUNAT. '+(cfg.ultimoEnvio? 'Último envio: '+esc(quandoRelativo(new Date(cfg.ultimoEnvio).toISOString()))+'.' : '')+'</p>'+
    '<button class="bt pri largo" id="eEnviar"'+(fila.length&&!envioRodando?'':' disabled')+'>'+ic('enviar')+(envioRodando? 'Enviando…' : fila.length? 'Enviar '+fila.length+' agora' : 'Nada na fila')+'</button></div></div>'
   : '<div class="bloco info">'+ic('aparelho')+'<div><b>Pasta da FUNAT não configurada</b><p class="ajuda">Configure o acesso para que as vistorias concluídas cheguem ao computador sozinhas.</p><button class="bt pri largo" data-ir="#pasta">Configurar agora</button></div></div>')+
  secaoCorrecoes()+
  '<h2 class="secao">Concluídas <span class="cont">'+c.length+'</span></h2>'+(c.length? c.map(v=>{ const st=situacaoEnvio(v); return '<article class="cartao st-concluida"><div class="c-l1">'+tagTipo(v.tipoDocumento)+'<b>'+esc(protocoloTexto(v))+'</b></div>'+
   (v.assunto?'<h3>'+esc(v.assunto)+'</h3>':'')+'<p class="st envio-'+st.cls+'">'+ic(st.cls==='ok'?'ok':st.cls==='fila'?'relogio':'enviar')+esc(st.txt)+'</p>'+
   '<div class="c-ac">'+(MODO_WEB? '<button class="bt '+(v.precisaEnviar?'pri':'sec')+'" data-exportar="'+v.id+'">'+ic('enviar')+(v.precisaEnviar?'Exportar e salvar':'Exportar de novo')+'</button><button class="bt txt" data-ir="#v/'+v.id+'">Abrir</button>' : '<button class="bt txt" data-ir="#v/'+v.id+'">Abrir</button><button class="bt txt" data-exportar="'+v.id+'">'+ic('arquivo')+'Exportar arquivo</button>')+'</div></article>'; }).join('')
   : '<div class="vazio"><p>Nenhuma vistoria concluída ainda.</p></div>')+'</main>'+navInferior('#envios');
};
TELAS.envios.ligar = function(){
 $$('[data-exportar]').forEach(b=>b.onclick=()=>exportar(acharVistoria(b.dataset.exportar)));
 if($('#eEnviar')) $('#eEnviar').onclick=()=>enviarPendentes({});
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
async function exportarWeb(v){
 await gravarAgora(); ocupado('Preparando o arquivo…'); let arq;
 try{ arq=new File([await montarDocumento(v)], nomeArquivoVistoria(v), {type:'application/json'}); }
 catch(e){ ocupado(false); alert('Não foi possível preparar o arquivo: '+(e.message||e)); return; }
 ocupado(false);
 const podeCompartilhar=!!(navigator.canShare && navigator.canShare({files:[arq]}));
 const url=URL.createObjectURL(arq), mb=(arq.size/1048576).toFixed(1).replace('.',',');
 const fundo=document.createElement('div'); fundo.className='folha-fundo';
 fundo.innerHTML='<div class="folha" role="dialog" aria-label="Salvar na pasta da FUNAT"><h2>Salvar na pasta da FUNAT</h2>'+
  '<p class="arq">'+ic('arquivo')+esc(arq.name)+' · '+mb+' MB</p>'+
  '<ol class="passos"><li>Toque em <b>Salvar em Arquivos</b>.</li><li>Na lista, abra o servidor da FUNAT (<b>192.168.31.34</b>) › funat › FISCALIZAÇÃO › FISCALIZAÇÃO 2026 › <b>sua pasta</b> › <b>VISTORIAS</b>.</li><li>Toque em <b>Salvar</b>.</li></ol>'+
  (podeCompartilhar? '<button class="bt pri largo alto" id="fsComp">'+ic('enviar')+'Salvar em Arquivos…</button>' : '')+
  '<a class="bt '+(podeCompartilhar?'sec':'pri')+' largo" id="fsBaixar" href="'+url+'" download="'+esc(arq.name)+'">'+ic('arquivo')+'Baixar o arquivo</a>'+
  '<button class="bt txt largo" id="fsJa">'+ic('ok')+'Já salvei na pasta</button><button class="bt txt largo" id="fsFechar">Fechar</button>'+
  '<p class="ajuda">Ainda não ligou o app Arquivos à pasta? <a href="#arquivos-ajuda" id="fsAjuda">Veja como</a>.</p></div>';
 document.body.appendChild(fundo);
 const fechar=()=>{ fundo.remove(); setTimeout(()=>URL.revokeObjectURL(url), 60000); };
 const feito=async()=>{ v.precisaEnviar=false; v.exportadaEm=new Date().toISOString(); await gravarVistoria(v); fechar(); mostrar(true); aviso('Marcada como salva na pasta. Confira no computador.', 4000); };
 const c=fundo.querySelector('#fsComp');
 if(c) c.onclick=()=>{ navigator.share({files:[arq], title:arq.name}).then(feito).catch(e=>{ if(e && e.name!=='AbortError') alert('Não foi possível abrir o Compartilhar: '+(e.message||e)+'\n\nUse "Baixar o arquivo".'); }); };
 fundo.querySelector('#fsJa').onclick=feito;
 fundo.querySelector('#fsFechar').onclick=fechar;
 fundo.querySelector('#fsAjuda').onclick=()=>fechar();
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
 op=op||{}; if(envioRodando || !cfg.pasta) return; const fila=pendentesEnvio(VIST);
 if(!fila.length){ await enviarCorrecoesNaFila(op); return; }
 envioRodando=true; atualizarSemPerderFoco(); let ok=0, erro=null;
 const destino=caminhoSmb(cfg.pasta.caminho, 'VISTORIAS');
 for(const v of fila){
  try{
   await gravarAgora();
   let nome=v.arquivoRemoto? ultimaParte(v.arquivoRemoto) : '';
   if(!nome){ const base=nomeArquivoVistoria(v); for(let n=1;n<50;n++){ nome=nomeComSufixo(base,n); if(!await Pasta.existe(caminhoSmb(destino, nome))) break; } }
   const txt=await montarDocumento(v), local=await arquivoParaEnvio(nome, txt);
   const r=await Pasta.enviar({origem:local, destinoPasta:destino, nome:nome});
   await apagarArquivoDeEnvio(nome);
   v.precisaEnviar=false; v.enviadaEm=new Date().toISOString(); v.arquivoRemoto=r.caminho; v.erroEnvio=''; await gravarVistoria(v); ok++;
   cfg.ultimoEnvio=Date.now(); gravarCfg();
  }catch(e){
   erro=e; const rede=['SEM_REDE','SEM_CONFIG','SENHA'].includes(e.code);
   v.erroEnvio=rede? '' : (e.message||String(e)); await gravarVistoria(v);
   if(rede || e.code==='DESTINO' || e.code==='NAO_ACHOU') break;
  }
 }
 envioRodando=false; atualizarSemPerderFoco();
 if(!op.silencioso){
  if(erro) alert((ok? ok+' enviada(s). ' : '')+'Não foi possível enviar: '+(erro.message||erro));
  else aviso(ok+' vistoria'+(ok>1?'s':'')+' enviada'+(ok>1?'s':'')+' para '+cfg.pasta.nome+' › VISTORIAS.', 4500);
 } else if(ok) aviso(ok+' vistoria'+(ok>1?'s':'')+' enviada'+(ok>1?'s':'')+' para a pasta da FUNAT.', 4500);
 if(!erro) await enviarCorrecoesNaFila(op);
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
function atualizarSemPerderFoco(){ const a=document.activeElement; if(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return; if(['inicio','envios','pronta','documentos','doc','vistorias','planilha','conflito'].includes(rotaAtual().nome)) mostrar(true); }

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
  const lista=await Pasta.listarJson(p.caminho, 2), vistos=new Set(), mudou=[];
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
 return topo('Documentos')+'<main class="pag com-nav">'+
  '<div class="pasta-atual">'+ic('pasta')+'<div><b>'+esc(p.nome)+'</b><small>'+(cfg.pastaConsulta? 'Só consulta · ' : '')+(docsLendo? 'Lendo a pasta…' : lido? 'Lida '+esc(quandoRelativo(new Date(lido).toISOString())) : 'Ainda não lida')+'</small></div>'+
  '<button class="bt-ic" id="dAtualizar" aria-label="Ler a pasta de novo"'+(docsLendo?' disabled':'')+'>'+(docsLendo? '<div class="giro"></div>' : ic('girar'))+'</button></div>'+
  '<div class="c-ac troca">'+(cfg.pastaConsulta? '<button class="bt txt" id="dMinha">'+ic('voltar')+'Voltar para a minha pasta</button>' : '')+'<button class="bt txt" data-ir="#escolher/'+encodeURIComponent(PASTA_BASE)+'/consulta">'+ic('busca')+'Ver outra pasta</button></div>'+
  (docsErro? '<p class="nota-alerta">'+ic('alerta')+'<span>'+esc(docsErro)+(lido?' Mostrando o que foi lido antes.':'')+'</span></p>' : '')+
  (docs.length>6? '<label class="busca">'+ic('busca')+'<input id="dBusca" type="search" placeholder="Buscar protocolo ou nome" value="'+esc(filtroDocs)+'"></label>' : '')+
  (docs.length? GRUPOS_DOC.map(([g,r])=>{ const l=porGrupo(g); if(!l.length) return ''; const lim=g==='postado'? 8 : 999;
    return '<h2 class="secao g-'+g+'">'+r+' <span class="cont">'+l.length+'</span></h2>'+l.slice(0,lim).map(cartaoDoc).join('')+(l.length>lim? '<p class="ajuda">e mais '+(l.length-lim)+' no 1Doc.</p>' : ''); }).join('')
   : '<div class="vazio">'+ic('arquivo')+'<p>'+(lido? 'Nenhum documento das ferramentas nesta pasta.' : docsLendo? 'Lendo…' : 'Toque em ↻ para ler a pasta (no Wi-Fi da FUNAT).')+'</p></div>')+
  '</main>'+navInferior('#documentos');
};
TELAS.documentos.ligar = function(){
 const p=pastaDocs(); if(!p) return;
 cacheDocs().then(()=>{ if(rotaAtual().nome==='documentos' && !$('.cartao.doc') && docsDe(p).length) mostrar(true); });
 if($('#dAtualizar')) $('#dAtualizar').onclick=()=>atualizarDocumentos(p, {});
 if($('#dMinha')) $('#dMinha').onclick=()=>{ delete cfg.pastaConsulta; gravarCfg(); docsErro=''; mostrar(); if(Date.now()-lidoEmDe(pastaDocs())>5*60e3) atualizarDocumentos(pastaDocs(), {silencioso:true}); };
 const b=$('#dBusca'); if(b) b.oninput=()=>{ filtroDocs=b.value; const pos=b.selectionStart; mostrar(true); const n=$('#dBusca'); n.focus(); n.setSelectionRange(pos,pos); };
 if(!docsLendo && Date.now()-lidoEmDe(p)>5*60e3) atualizarDocumentos(p, {silencioso:true});
};
TELAS.doc = function(id){
 const d=docsDe(pastaDocs()).find(x=>x.id===id); if(!d) return topo('Documento', {voltar:true})+'<main class="pag"><div class="vazio"><p>Documento não encontrado na última leitura da pasta.</p></div></main>';
 const notas=d.notas.slice().sort((a,b)=>a.resolvida-b.resolvida);
 return topo('Documento', {voltar:true, direita:'<span></span>'})+'<main class="pag">'+
  '<section class="bloco"><div class="c-l1">'+tagTipo(d.tipo)+'<span class="pilula">'+esc(ESTADOS_DOC[d.status])+(d.postado?' · no 1Doc':'')+'</span></div><h2 class="prot">'+esc(d.protocolo||'(sem protocolo)')+'</h2>'+(d.titulo?'<p>'+esc(d.titulo)+'</p>':'')+
  trilhaDoc(d)+'<p class="sit">'+esc(situacaoDoc(d))+'</p>'+
  '<dl class="dados-doc"><dt>Elaborado por</dt><dd>'+esc(d.elaborador||'–')+'</dd><dt>Vistoria</dt><dd>'+esc(d.datas.map(dataBrCampo).join(', ')||'–')+'</dd><dt>Fotos</dt><dd>'+d.fotos+'</dd><dt>Arquivo</dt><dd class="cam">'+esc(d.caminho)+'</dd></dl></section>'+
  (notas.length? '<section class="bloco"><h2>Apontamentos do revisor <span class="cont">'+d.notasAbertas+' em aberto</span></h2>'+notas.map(n=>'<div class="nota '+(n.resolvida?'ok':'aberta')+'"><div class="n-cab"><b>'+esc(n.rotulo)+'</b><span class="pilula">'+(n.resolvida?'resolvido':'em aberto')+'</span></div><p>'+esc(n.texto)+'</p>'+(n.resposta?'<p class="resp"><b>Resposta:</b> '+esc(n.resposta)+'</p>':'')+'<small>'+esc([n.autor, n.data? dataCurta(n.data) : ''].filter(Boolean).join(' · '))+'</small></div>').join('')+
   '</section>' : '')+
  ((d.status==='devolvido' || RASCS[d.id]) && !cfg.pastaConsulta? (RASCS[d.id] && RASCS[d.id].conflito? '<button class="bt pri largo alto" data-ir="#conflito/'+encodeURIComponent(d.id)+'">'+ic('alerta')+'Escolher a versão</button>'
    : '<button class="bt pri largo alto" data-ir="#corrigir/'+encodeURIComponent(d.id)+'">'+ic('lapis')+(RASCS[d.id]? (RASCS[d.id].pendente? 'Correção na fila – abrir' : 'Continuar a correção') : 'Corrigir no celular')+'</button>')+
   '<p class="ajuda">Funciona sem rede: o que você corrigir vai para a pasta quando o celular voltar ao Wi-Fi da FUNAT. Ou corrija no computador (Painel do Auxiliar › Corrigir).</p>' : '')+
  (d.historico.length? '<section class="bloco"><h2>Histórico</h2><ol class="hist">'+d.historico.slice().reverse().map(h=>'<li><b>'+esc(h.acao)+'</b><small>'+esc([h.autor, h.data? new Date(h.data).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}) : ''].filter(Boolean).join(' · '))+'</small></li>').join('')+'</ol></section>' : '')+
  '</main>';
};

/* ======================= DEMANDAS DA PLANILHA (fase 1: só leitura) =======================
   A lista vem do script da planilha (aplicativo da web) e fica guardada no aparelho para usar no campo,
   sem internet. Uma demanda some de "Para vistoriar" quando ganha vistoria no app ou "Fiscalizado" na planilha. */
let DEMANDAS = null, demLendo = false, demErro = '';
function urlPlanilha(){ return cfg.urlPlanilha || (typeof CONFIG_APP!=='undefined' && CONFIG_APP.urlPlanilha) || ''; }
async function carregarDemandas(){ if(!DEMANDAS){ try{ DEMANDAS=JSON.parse(await Arquivos.lerTexto('demandas.json')); }catch(e){ DEMANDAS={lidoEm:0, fiscal:'', itens:[]}; } } return DEMANDAS; }
async function atualizarDemandas(op){
 op=op||{}; if(demLendo || !cfg.planilhaAtiva) return; demLendo=true; demErro=''; atualizarSemPerderFoco();
 try{
  const r=await Planilha.buscar(urlPlanilha(), await Planilha.chave());
  DEMANDAS={lidoEm:Date.now(), fiscal:r.fiscal, itens:r.demandas||[]};
  await Arquivos.gravarTexto('demandas.json', JSON.stringify(DEMANDAS));
  if(!op.silencioso) aviso('Planilha lida: '+DEMANDAS.itens.length+' demanda'+(DEMANDAS.itens.length===1?'':'s')+' em aberto.');
 }catch(e){ demErro=e.message||String(e); if(!op.silencioso) aviso(demErro, 5000); }
 demLendo=false; atualizarSemPerderFoco();
}
function vistoriaDe(d){ const id=idDemanda(d); return VIST.find(v=>v.demanda && v.demanda.id===id)||null; }
function documentoDe(d){ if(!cfg.pasta) return null; const k=chaveProtocolo(d.protocolo); return docsDe(cfg.pasta).find(x=>mesmoProtocolo(k, x.protocolo))||null; }
/* Para vistoriar = abertas, sem "Fiscalizado" na planilha e sem vistoria no app; mais antigas primeiro */
/* A planilha (script V47+) já diz a situação de cada demanda, pelas mesmas regras dos e-mails semanais */
function naoIniciada(d){ return d.situacao? d.situacao==='nao_iniciada' : !fiscalizadaEm(d); }
function demandasParaVistoriar(){ return ((DEMANDAS&&DEMANDAS.itens)||[]).filter(d=>naoIniciada(d) && !vistoriaDe(d)).sort((a,b)=>dataBrParaIso(a.repasse||a.entrada).localeCompare(dataBrParaIso(b.repasse||b.entrada))); }
function demandasFiscalizadas(){ return ((DEMANDAS&&DEMANDAS.itens)||[]).filter(d=>!naoIniciada(d) || (vistoriaDe(d)||{}).status==='concluida'); }
function cartaoDemanda(d){
 const du=diasUteisDesde(dataBrParaIso(d.repasse||d.entrada)), f=fiscalizadaEm(d), doc=documentoDe(d), v=vistoriaDe(d), id=encodeURIComponent(idDemanda(d));
 const e=separarEndereco(d.endereco);
 return '<article class="cartao demanda'+(du>=15?' velha':'')+'"><div class="c-l1"><span class="tag t-planilha">PLANILHA</span><b>'+esc(d.protocolo)+'</b>'+(du!==null? '<span class="idade'+(du>=15?' muito':'')+'">'+(du? 'há '+du+' dia'+(du>1?'s':'')+' úte'+(du>1?'is':'l') : 'hoje')+'</span>' : '')+'</div>'+
  (d.assunto? '<h3>'+esc(d.assunto)+'</h3>' : '')+(d.endereco? '<p class="loc">'+ic('pino')+esc([e.bairro,e.endereco].filter(Boolean).join(' · '))+'</p>' : '')+
  '<p class="st">'+esc(!naoIniciada(d) && d.situacaoTexto? d.situacaoTexto+(f? ' · fiscalizado em '+dataBrCampo(f) : '') : f? 'Fiscalizado em '+dataBrCampo(f)+' (planilha)' : v? (v.status==='concluida'? 'Vistoria concluída no app' : 'Vistoria em andamento no app') : 'Ainda não vistoriada · repassada em '+(d.repasse||d.entrada||'?'))+'</p>'+
  (d.observacoes? '<p class="obs">'+ic('lapis')+esc(d.observacoes)+'</p>' : '')+(d.diligencias && !/^\s*fiscaliz\w*\s*\d/i.test(d.diligencias)? '<p class="obs">'+ic('lista')+esc(d.diligencias)+'</p>' : '')+
  (doc? '<a class="doc-ligado" href="#doc/'+encodeURIComponent(doc.id)+'">'+ic('arquivo')+'<span>Documento: '+esc(situacaoDoc(doc))+'</span></a>' : '')+
  '<div class="c-ac">'+(v? '<button class="bt pri" data-ir="#v/'+v.id+'">'+ic('lapis')+'Abrir vistoria</button>' : naoIniciada(d)? '<button class="bt pri" data-demanda="'+id+'">'+ic('camera')+'Iniciar vistoria</button>' : '')+
  (d.endereco? '<button class="bt txt" data-mapa-end="'+esc(d.endereco)+'">'+ic('mapa')+'Mapa</button>' : '')+'</div></article>';
}
function tipoSugerido(d){ const a=semAcento(d.assunto); return /RUIDO|SOM |SONOR|BARULHO/.test(a)? 'termo_ruido' : 'relatorio_simplificado'; }
async function iniciarDaDemanda(id){
 const d=((DEMANDAS&&DEMANDAS.itens)||[]).find(x=>idDemanda(x)===id); if(!d) return;
 const ja=vistoriaDe(d); if(ja){ location.hash='#v/'+ja.id; return; }
 const v=vistoriaDaDemanda(d, tipoSugerido(d)); iniciarVistoria(v); await gravarVistoria(v);
 location.hash='#v/'+v.id; aviso('Vistoria iniciada às '+v.horaVistoria+'. Confira o tipo de documento em “Editar dados”.', 4500);
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
  '<button class="bt pri largo" id="plTestar">'+ic('ok')+'Testar e guardar</button></section>'+
  (cfg.planilhaAtiva? '<section class="bloco"><h2>Situação</h2><p class="ajuda">'+(DEMANDAS&&DEMANDAS.fiscal? 'Chave de <b>'+esc(DEMANDAS.fiscal)+'</b> · ' : '')+((DEMANDAS&&DEMANDAS.itens.length)||0)+' demandas em aberto na última leitura.</p>'+linhaPlanilha()+
   '<button class="bt txt perigo apagar-v" id="plDesligar">'+ic('lixo')+'Desligar as demandas da planilha neste aparelho</button></section>' : '')+
  '<p class="ajuda">'+ic('alerta')+'O celular só lê. Nada é escrito na planilha nesta versão.</p></main>';
};
TELAS.planilha.ligar = function(){
 const k=$('#plChave'); Planilha.chave().then(c=>{ if(c && !k.value) k.placeholder='(guardada – digite só para trocar)'; });
 k.oninput=()=>{ const p=k.selectionStart, a=k.value; const lim=a.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,16); k.value=lim.replace(/(.{4})(?=.)/g,'$1-'); if(a.length===p) k.setSelectionRange(k.value.length,k.value.length); };
 $('#plTestar').onclick=async()=>{
  const url=$('#plUrl').value.trim(), chave=k.value.trim()||await Planilha.chave();
  if(!/^https:\/\/script\.google(usercontent)?\.com\//.test(url) && url!=='simulado'){ alert('O endereço precisa ser o do script publicado (começa com https://script.google.com/macros/s/…).'); return; }
  if(!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(chave)){ alert('A chave tem 16 letras e números, no formato XXXX-XXXX-XXXX-XXXX.'); return; }
  ocupado('Consultando a planilha…');
  try{ const r=await Planilha.buscar(url, chave); await Planilha.guardarChave(chave); cfg.urlPlanilha=(typeof CONFIG_APP!=='undefined' && CONFIG_APP.urlPlanilha===url)? '' : url; cfg.planilhaAtiva=true; gravarCfg();
   DEMANDAS={lidoEm:Date.now(), fiscal:r.fiscal, itens:r.demandas||[]}; await Arquivos.gravarTexto('demandas.json', JSON.stringify(DEMANDAS)); ocupado(false);
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
 if(!rasc.arquivo) rasc.arquivo={caminho:copia.caminho, modificado:copia.modificado, lidoEm:copia.lidoEm};
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
  if(m.status==='aprovado' || ((m.conflitos.length || m.reencaminhadoEm) && !rasc.escolhas)){
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
 return cab+(m.reencaminhadoEm? '<p class="nota-alerta">'+ic('alerta')+'<span>O documento <b>já foi reencaminhado</b> '+esc(m.reencaminhadoPor? 'por '+m.reencaminhadoPor+' ' : '')+'em '+esc(dataCurta(m.reencaminhadoEm))+' às '+esc(horaCurta(new Date(m.reencaminhadoEm)))+'. Se continuar, ele é reencaminhado de novo com as suas escolhas.</span></p>' : '')+
  '<p>Enquanto você corrigia no celular, o mesmo documento foi alterado na pasta (no computador). '+(m.conflitos.length? 'Escolha, em cada item, qual versão vale.' : 'Não há campos em choque.')+'</p>'+
  (autos? '<p class="ajuda">'+ic('ok')+autos+' correção(ões) do celular em campos que ninguém mais mexeu entram sem perguntar.</p>' : '')+'</section>'+
  m.conflitos.map((c,i)=>{ const k=c.tipo+'|'+c.chave, esc0=(r.escolhas||{})[k];
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

/* ======================= roteador ======================= */
function rotaAtual(){ const h=(location.hash||'#inicio').slice(1).split('/'); return {nome:h[0]||'inicio', args:h.slice(1).map(decodeURIComponent)}; }
let rotaAnterior='';
function mostrar(manterRolagem){
 if(!cfg.nome && rotaAtual().nome!=='config'){ history.replaceState(null, '', '#config'); }
 const r=rotaAtual(), tela=TELAS[r.nome]||TELAS.inicio, y=window.scrollY, chave=location.hash;
 const mov=movimentoDe(chave), chipAntes=($('.chip-sinc')||{}).className||'';
 document.getElementById('app').innerHTML=tela.apply(null, r.args);
 if(tela.ligar) tela.ligar.apply(null, r.args);
 window.scrollTo(0, manterRolagem && chave===rotaAnterior? y : 0); rotaAnterior=chave;
 animarTela(mov, chipAntes);
}

/* ---------- animações (o CSS está no fim de app.css) ----------
   Mais fundo desliza da direita, voltar desliza da esquerda, trocar de aba só esmaece.
   Redesenhar a mesma tela (mostrar(true) depois de gravar ou enviar) não anima nada. */
const ABAS=['inicio','vistorias','camera','documentos','envios'];
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
 const ir=e.target.closest('[data-ir]'); if(ir){ e.preventDefault(); location.hash=ir.dataset.ir; return; }
 if(e.target.closest('[data-voltar]')){ e.preventDefault(); voltar(); return; }
 const ini=e.target.closest('[data-iniciar]'); if(ini){ const v=acharVistoria(ini.dataset.iniciar); iniciarVistoria(v); gravarVistoria(v).then(()=>{ location.hash='#v/'+v.id; }); return; }
 const dm=e.target.closest('[data-demanda]'); if(dm){ iniciarDaDemanda(decodeURIComponent(dm.dataset.demanda)); return; }
 if(e.target.closest('[data-ler-planilha]')){ atualizarDemandas({}); return; }
 const me=e.target.closest('[data-mapa-end]'); if(me){ Aparelho.abrirEndereco(me.dataset.mapaEnd+', Tubarão - SC'); return; }
 const mp=e.target.closest('[data-mapa]'); if(mp){ const v=acharVistoria(mp.dataset.mapa); if(v&&v.local) Aparelho.abrirMapa(v.local.lat, v.local.lon, protocoloTexto(v)); }
});
function voltar(){
 const t=$('.tela-cheia'); if(t){ t.remove(); return; }
 const r=rotaAtual().nome;
 if(r==='inicio' || (r==='config' && !cfg.nome)){ gravarAgora().then(()=>Aparelho.sair()); return; }
 if(['vistorias','envios','camera','pronta','documentos'].includes(r)){ location.hash='#inicio'; return; }
 if(history.length>1) history.back(); else location.hash='#inicio';
}
window.addEventListener('hashchange', async()=>{ await gravarAgora(); if(CORR && rotaAtual().nome!=='corrigir'){ clearTimeout(tRasc); const c=CORR; CORR=null; gravarRascunho(c.id, c.rasc).catch(()=>{}); } if(rotaAtual().nome!=='pasta') confPasta=null; mostrar(); });
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) gravarAgora(); });
Aparelho.aoVoltar(()=>voltar());
aoVoltarParaOApp(async()=>{ await enviarPendentes({silencioso:true}); if(cfg.planilhaAtiva && DEMANDAS && Date.now()-(DEMANDAS.lidoEm||0)>5*60e3) atualizarDemandas({silencioso:true}); const p=pastaDocs(); if(p && Date.now()-lidoEmDe(p)>5*60e3) atualizarDocumentos(p, {silencioso:true}); });

(async function iniciar(){
 try{ await carregarVistorias(); }catch(e){ console.error(e); }
 try{ await carregarRascunhos(); }catch(e){ console.error(e); }
 mostrar();
 await enviarPendentes({silencioso:true});
 await cacheDocs(); await carregarDemandas(); if(['inicio','vistorias'].includes(rotaAtual().nome)) mostrar(true);
 if(cfg.planilhaAtiva && Date.now()-(DEMANDAS.lidoEm||0)>5*60e3) atualizarDemandas({silencioso:true});
 if(cfg.pasta && Date.now()-lidoEmDe(cfg.pasta)>5*60e3) atualizarDocumentos(cfg.pasta, {silencioso:true});
})();

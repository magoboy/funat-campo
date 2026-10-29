/* ===== Itinerário do dia (0.9.0) =====
   Planejar o dia com a dupla, otimizar a rota (rota.js + OSRM, no modelo do RotaFácil), seguir parada a parada
   e fechar o dia. Regra (Julio, 13/10/2026): cada auxiliar só vistoria as SUAS demandas; as do colega aparecem
   só para montar a rota da dupla, sem "Iniciar vistoria".
   Tudo fica no aparelho (itinerario.json): em campo não há internet. O OSRM e o mapa de fundo só no planejamento. */

let ITIN=null, ITIN_DUPLA=null;
const MIN_VISTORIA=30;
const BASE_FUNAT_PADRAO={lat:-28.4847, lng:-49.0206};   /* Av. Marechal Deodoro, Oficinas (aproximada); o script V49 manda a do número 1311 */
const MOTIVOS_NAO=['Ninguém no local','Endereço não encontrado','Acesso impedido','Chuva ou falta de tempo','Outro motivo'];
let PLAN={aba:'dupla', tipo:'novas', bairro:'', sel:null};

function hojeIso(d){ d=d||new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
const horaDe=iso=>{ const d=new Date(iso); return isNaN(d)? '' : String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); };   /* hora local (o ISO é UTC) */
function agoraMin(){ const d=new Date(); return d.getHours()*60+d.getMinutes(); }
async function carregarItinerario(){
 try{ ITIN=JSON.parse(await Arquivos.lerTexto('itinerario.json')); }catch(e){ ITIN=null; }
 try{ ITIN_DUPLA=JSON.parse(await Arquivos.lerTexto('itinerario-dupla.json')); }catch(e){ ITIN_DUPLA=null; }
}
async function gravarItinerario(){ ITIN.editadoEm=new Date().toISOString(); await Arquivos.gravarTexto('itinerario.json', JSON.stringify(ITIN)); }
function itinerarioDeHoje(){ return ITIN && ITIN.dia===hojeIso() && !ITIN.canceladoEm? ITIN : null; }
/* ---------- refazer, cancelar e desfazer (Julio, 13/10: "por qualquer motivo") ---------- */
async function cancelarItinerario(){
 const it=itinerarioDeHoje(); if(!it) return;
 const resolvidas=it.paradas.filter(p=>p.status!=='pendente').length;
 if(!confirm('Cancelar o itinerário de hoje?\n\nA rota e a ordem das paradas são apagadas deste aparelho.'+(resolvidas? ' As vistorias já feitas continuam no aparelho e na fila de envio.' : '')+'\n\nDepois, dá para planejar de novo.')) return;
 it.canceladoEm=new Date().toISOString(); await gravarItinerario(); PLAN.sel=null;
 enviarRota(it, {silencioso:true});           /* o colega vê "cancelado" na próxima busca (se a pasta responder agora) */
 aviso('Itinerário de hoje cancelado.'+(resolvidas? ' As vistorias continuam no aparelho.' : ''), 4500);
 location.hash='#itinerario'; mostrar();
}
/* parada marcada por engano volta a pendente (a minha concluída no app não volta: a vistoria existe) */
function podeDesfazer(p){ if(p.status==='pendente') return false; if(p.doColega) return true;
 const d=demandaPorId(p.id), v=d && vistoriaDe(d); return !(v && v.status==='concluida' && v.id!==p.apos); }
async function desfazerParada(it, i){ const p=it.paradas[i]; if(!p || !podeDesfazer(p)) return; p.status='pendente'; p.motivo=''; p.em=''; await gravarItinerario(); aviso('Parada '+(i+1)+' voltou para pendente.'); mostrar(true); }
function baseFunat(){
 if(cfg.baseFunat) return Object.assign({nome:'FUNAT', fonte:'gps'}, cfg.baseFunat);
 const b=DEMANDAS && DEMANDAS.base && DEMANDAS.base.posicao;
 return b && b.lat!==undefined? {nome:'FUNAT', lat:b.lat, lng:b.lng, fonte:'planilha'} : Object.assign({nome:'FUNAT', fonte:'aproximada'}, BASE_FUNAT_PADRAO);
}
const meuFiscal=()=>String((DEMANDAS && DEMANDAS.fiscal)||'').toUpperCase();
const nomeFiscal=f=>{ const p=String(f||'').trim().split(/\s+/)[0]||''; return p.charAt(0).toUpperCase()+p.slice(1).toLowerCase(); };

/* ---------- as demandas que dá para pôr no itinerário ---------- */
/* Para visitar: não iniciada ou com diligência em andamento (volta ao local); as minhas já concluídas no app saem */
/* Retorno ao local: visita de retorno aberta, ou retorno combinado (voltarEm) para daqui a no máximo 7 dias, entra mesmo com a demanda já fiscalizada */
function retornoDoPlano(d){ const v=vistoriaDe(d); if(!v) return false;
 if(v.status!=='concluida') return ehRetorno(v);
 return !!v.voltarEm && retornosAgendados([v]).length>0 && diasAte(v.voltarEm)<=7; }
function paraVisitar(d, minha){
 if(minha && retornoDoPlano(d)) return true;
 const s=d.situacao||'nao_iniciada'; if(s!=='nao_iniciada' && s!=='em_andamento') return false; if(minha){ const v=vistoriaDe(d); if(v && v.status==='concluida') return false; } return true; }
function demandasDoPlano(){
 const minhas=((DEMANDAS && DEMANDAS.itens)||[]).filter(d=>paraVisitar(d, true)).map(d=>Object.assign({}, d, {doColega:false}));
 const equipe=((DEMANDAS && DEMANDAS.equipe)||[]).filter(d=>paraVisitar(d, false)).map(d=>Object.assign({}, d, {doColega:true}));
 return {minhas:minhas, equipe:equipe};
}
/* ---------- retorno ao local ----------
   Retorno = demanda que já foi fiscalizada (planilha ou app) ou notificada. Minhas: as da planilha já fiscalizadas, as notificadas
   (script V52), as que concluí no app e as que só restam na minha vistoria do app (saíram da planilha). Dos colegas: as já
   fiscalizadas ou notificadas. Uma demanda com diligência em andamento está aqui e em "Para vistoriar". */
function paraRetorno(d, minha){
 if(minha){ if(retornoDoPlano(d)) return true; const v=vistoriaDe(d); if(v && v.status==='concluida') return true; }
 return jaFiscalizadaNaPlanilha(d);
}
const ehRetornoDemanda=d=>jaFiscalizadaNaPlanilha(d) || (!d.doColega && (((vistoriaDe(d)||{}).status==='concluida') || retornoDoPlano(d)));
/* a data que ordena os retornos: a mais antiga primeiro (a notificação, a visita ou a fiscalização que está esperando o retorno) */
function dataDoRetorno(d){ const n=d.notificacao? dataBrParaIso(d.notificacao) : '', v=!d.doColega && vistoriaDe(d);
 return n || (v && v.dataVistoria) || fiscalizadaEm(d) || dataBrParaIso(d.repasse||d.entrada) || '9999'; }
function demandasDeRetorno(){
 const vistos=new Set(), minhas=[], equipe=[], D=DEMANDAS||{};
 (D.itens||[]).concat(retornosProprios()).forEach(d=>{ vistos.add(idDemanda(d)); if(paraRetorno(d, true)) minhas.push(Object.assign({}, d, {doColega:false})); });
 (D.equipe||[]).concat((D.retornos||[]).filter(d=>d.doColega)).forEach(d=>{ const id=idDemanda(d); if(vistos.has(id)) return; vistos.add(id); if(paraRetorno(d, false)) equipe.push(Object.assign({}, d, {doColega:true})); });
 VIST.filter(v=>v.status==='concluida' && v.demanda).forEach(v=>{ const id=v.demanda.id; if(vistos.has(id)) return; vistos.add(id); const d=demandaDaVistoria(v); if(d) minhas.push(d); });
 const ordem=(a,b)=>dataDoRetorno(a).localeCompare(dataDoRetorno(b));
 return {minhas:minhas.sort(ordem), equipe:equipe.sort(ordem)};
}
/* tudo o que pode virar parada (para vistoriar + retornos), sem repetir */
function todasDoPlano(){
 const a=demandasDoPlano(), r=demandasDeRetorno(), vistos=new Set(), out=[];
 [a.minhas, a.equipe, r.minhas, r.equipe].forEach(L=>L.forEach(d=>{ const id=idDemanda(d); if(vistos.has(id)) return; vistos.add(id); out.push(d); }));
 return out;
}
/* o script da planilha ainda é anterior ao V52: as notificadas não vêm */
function scriptSemRetornos(){ return !!(DEMANDAS && DEMANDAS.lidoEm && !DEMANDAS.retornos); }
function infoRetorno(d){
 const v=!d.doColega && vistoriaDe(d), p=[];
 if(d.notificacao) p.push('notificada em '+d.notificacao);
 if(v && v.status==='concluida') p.push(numeroVisita(v)+'ª visita em '+dataBrCampo(v.dataVistoria)); else { const f=fiscalizadaEm(d); if(f) p.push('fiscalizada em '+dataBrCampo(f)); }
 if(d.situacaoTexto && ['pendente_relatorio','em_analise','retorno_analise','area_tecnica','outros_orgaos'].indexOf(d.situacao)>=0) p.push(d.situacaoTexto.toLowerCase());
 return p.join(' · ');
}
/* os colegas vêm das demandas da equipe (script V49); sem elas, a lista da equipe, para a dupla poder ser escolhida assim mesmo */
const EQUIPE_PADRAO=['DILMAR','FELISBERTO','MARCELO'];
function colegas(){ const s=new Set(), eu=meuFiscal();
 ((DEMANDAS && DEMANDAS.equipe)||[]).forEach(d=>{ const f=String(d.fiscal||'').toUpperCase().split(/\s*(?:,|\/|\sE\s)\s*/)[0].trim(); if(f) s.add(f); });
 EQUIPE_PADRAO.forEach(f=>s.add(f)); const p=parceiroHoje(); if(p) s.add(p);
 return [...s].filter(f=>!eu || eu.indexOf(f)<0).sort(); }
/* a planilha respondeu sem a equipe e sem as posições: o endereço publicado ainda roda o script antigo */
function scriptSemItinerario(){ return !!(DEMANDAS && DEMANDAS.lidoEm && !DEMANDAS.equipe && !DEMANDAS.base); }
function parceiroHoje(){ return cfg.duplaHoje && cfg.duplaHoje.dia===hojeIso()? cfg.duplaHoje.parceiro : ''; }
const doParceiro=(d, p)=>!!p && String(d.fiscal||'').toUpperCase().indexOf(p)>=0;
/* bairro: "Humaitá - Rua…" (antigo) ou "Rua…, nº 10, Humaitá" (novo) */
/* "Humaitá - Rua…" (bairro antes) ou "Rua X, 100 - Centro" (bairro depois): o lado que parece logradouro não é o bairro */
const pareceLogradouro=s=>/\d/.test(s) || /^(rua|r\.|av|avenida|estrada|rodovia|rod\.|travessa|serv|marginal)\b/i.test(semAcento(s));
function bairroDe(end){ const e=String(end||'').trim(), i=e.indexOf(' - ');
 if(i>0){ const antes=e.slice(0,i).trim(), depois=e.slice(i+3).trim(); if(!pareceLogradouro(antes)) return antes; if(depois && !pareceLogradouro(depois) && depois.split(/\s+/).length<=4) return depois; return ''; }
 const p=e.split(',').map(x=>x.trim()).filter(Boolean), u=p[p.length-1]||''; return p.length>1 && !/\d/.test(u) && !/^(pr[óo]x|ao lado|final)/i.test(u)? u : ''; }
/* posição: a que o auxiliar colou (link) > a da vistoria feita no app > a do endereço (script V49) */
function pontoDe(d){
 const id=idDemanda(d), m=cfg.posicoes && cfg.posicoes[id];
 if(m) return {lat:m.lat, lng:m.lng, fonte:'link'};
 const v=!d.doColega && vistoriaDe(d); if(v && v.local && v.local.lat!==undefined) return {lat:v.local.lat, lng:v.local.lon, fonte:'vistoria'};
 const p=d.posicao; return p && p.lat!==undefined? {lat:p.lat, lng:p.lng, fonte:'endereco', precisao:p.precisao} : null;
}

/* ---------- o cartão do Início ---------- */
function cartaoItinerario(){
 const it=itinerarioDeHoje();
 if(!it) return '<section class="it-cartao"><div class="it-cab">'+ic('rota')+'<b>Itinerário de hoje</b></div><p class="ajuda"><span>Nenhum itinerário para hoje.'+(cfg.planilhaAtiva? '' : ' Ligue as demandas da planilha em Meus dados.')+'</span></p>'+(cfg.planilhaAtiva? '<button class="bt pri largo" data-ir="#planejar">'+ic('rota')+'Planejar o dia</button>' : '')+'</section>';
 sincronizarStatus(it);
 const feitas=it.paradas.filter(p=>p.status!=='pendente' && p.status!=='agora').length, tot=it.paradas.length;
 return '<section class="it-cartao"><div class="it-cab">'+ic('rota')+'<b>Itinerário de hoje</b><span class="pilula">'+(feitas>=tot? 'Concluído' : it.comecadoEm? 'Em rota' : 'Planejado')+'</span></div>'+
  '<p class="it-l">'+(it.dupla && it.dupla.parceiro? 'Dupla: '+esc(nomeFiscal(it.dupla.eu))+' e '+esc(nomeFiscal(it.dupla.parceiro)) : 'Sem dupla')+'</p>'+
  '<p class="it-l">'+tot+' parada'+(tot===1?'':'s')+' · '+esc(kmTxt(it.total.dist))+' · '+esc(duracaoTxt(it.total.dur+tot*MIN_VISTORIA*60))+'</p>'+
  '<div class="it-prog"><span>Progresso</span><b>'+feitas+' de '+tot+' resolvidas</b></div><div class="at-barra"><i style="width:'+(tot? Math.round(feitas*100/tot) : 0)+'%"></i></div>'+
  '<button class="bt pri largo" data-ir="'+(feitas>=tot? '#resumo' : it.comecadoEm? '#parada' : '#itinerario')+'">'+ic('rota')+(feitas>=tot? 'Resumo do dia' : it.comecadoEm? 'Próxima parada' : 'Ver o itinerário')+'</button></section>';
}

/* ======================= Planejar o dia ======================= */
TELAS.planejar = function(){
 if(!cfg.planilhaAtiva) return topo('Planejar o dia', {voltar:true})+'<main class="pag centro"><p>Para planejar, ligue as demandas da planilha em Meus dados.</p><button class="bt pri largo" data-ir="#planilha">Ligar a planilha</button></main>';
 const {minhas, equipe}=demandasDoPlano(), R=demandasDeRetorno(), parc=parceiroHoje(), cols=colegas(), tipoRet=PLAN.tipo==='retornos';
 const abas=(m,e)=>({minhas:m, dupla:m.concat(e.filter(d=>doParceiro(d, parc))), equipe:m.concat(e)});
 const novas=abas(minhas, equipe), voltas=abas(R.minhas, R.equipe), daDupla=novas.dupla, aba=['minhas','dupla','equipe'].indexOf(PLAN.aba)>=0? PLAN.aba : 'dupla';
 const lista=(tipoRet? voltas : novas)[aba];
 if(!PLAN.sel && DEMANDAS && DEMANDAS.lidoEm){ const it=itinerarioDeHoje(); PLAN.sel=new Set(it? it.paradas.map(p=>p.id) : daDupla.filter(d=>d.situacao!=='em_andamento' && (!d.doColega || pontoDe(d))).map(idDemanda)); }
 const bairros={}; lista.forEach(d=>{ const b=bairroDe(d.endereco); if(b) bairros[b]=(bairros[b]||0)+1; });
 const vis=PLAN.bairro? lista.filter(d=>bairroDe(d.endereco)===PLAN.bairro) : lista;
 const base=baseFunat(), sel=PLAN.sel? todasDoPlano().filter(d=>PLAN.sel.has(idDemanda(d))) : [];
 const est=estimativa(sel, base);
 return topo('Planejar o dia', {voltar:true, direita:'<span class="pilula">'+esc(hojeExtenso().split(',')[0])+', '+new Date().getDate()+'/'+(new Date().getMonth()+1)+'</span>'})+'<main class="pag com-rodape"><div class="duas-col plano"><div class="col-a">'+
  '<section class="bloco it-dupla"><h2>Dupla de hoje</h2><div class="it-chips"><span class="it-pessoa eu">'+esc(primeiroNome(cfg.nome)||nomeFiscal(meuFiscal()))+' (eu)</span>'+
   '<label class="it-pessoa"><select id="plParceiro"><option value="">Sem dupla</option>'+cols.map(f=>'<option value="'+esc(f)+'"'+(f===parc?' selected':'')+'>'+esc(nomeFiscal(f))+'</option>').join('')+'</select></label></div>'+
   '<p class="ajuda"><span>'+ic('aparelho')+'No mesmo veículo. Cada fiscal vistoria só as suas demandas: as do colega entram para montar a rota.</span></p></section>'+
  (scriptSemItinerario()? '<p class="nota-alerta">'+ic('alerta')+'<span><b>A planilha respondeu sem as demandas da equipe e sem as posições.</b> O endereço do script ainda roda a versão antiga (V48). No Apps Script: Implantar › Gerenciar implantações › ✏️ › Versão: Nova versão › Implantar. Depois, toque em "Ler agora" em Meus dados › Demandas da planilha.</span></p>' : '')+
  '<div class="it-seg tipo" role="group" aria-label="O que escolher">'+[['novas','Para vistoriar',novas[aba].length],['retornos','Retornos',voltas[aba].length]].map(([v,r,n])=>'<button class="'+((tipoRet? 'retornos' : 'novas')===v?'at':'')+'" data-tipo-plan="'+v+'">'+r+' <b>'+n+'</b></button>').join('')+'</div>'+
  (tipoRet? '<p class="ajuda"><span>'+ic('girar')+'Demandas que já foram fiscalizadas ou notificadas. Na parada, o app abre o retorno ao local e pergunta o motivo.</span></p>' : '')+
  (tipoRet && scriptSemRetornos()? '<p class="nota-alerta">'+ic('alerta')+'<span><b>As demandas notificadas ainda não chegam ao app.</b> O script da planilha é anterior ao V52. As fiscalizadas e as vistorias deste aparelho aparecem assim mesmo.</span></p>' : '')+
  '<div class="it-seg">'+[['minhas','Minhas',(tipoRet? voltas : novas).minhas.length],['dupla','Da dupla',(tipoRet? voltas : novas).dupla.length],['equipe','Equipe',(tipoRet? voltas : novas).equipe.length]].map(([v,r,n])=>'<button class="'+(aba===v?'at':'')+'" data-aba-plan="'+v+'">'+r+' <b>'+n+'</b></button>').join('')+'</div>'+
  '<div class="chips-rolam"><button class="chip'+(PLAN.bairro?'':' at')+'" data-bairro="">Todos '+lista.length+'</button>'+Object.entries(bairros).sort((a,b)=>b[1]-a[1]).map(([b,n])=>'<button class="chip'+(PLAN.bairro===b?' at':'')+'" data-bairro="'+esc(b)+'">'+esc(b)+' '+n+'</button>').join('')+'</div>'+
  (itinerarioDeHoje()? '<p class="faixa-in">'+ic('rota')+'<span>Já existe um itinerário hoje, com '+itinerarioDeHoje().paradas.length+' paradas. Otimizar de novo substitui a rota; as paradas já resolvidas continuam marcadas.</span></p>' : '')+
  '<p class="it-sel"><span>'+sel.length+' selecionada'+(sel.length===1?'':'s')+(sel.length? ' · <button class="bt txt mini-bt" id="plLimpar">limpar</button>' : '')+'</span><button class="bt txt mini-bt" id="plTodas">'+(PLAN.sel && vis.length && vis.every(d=>PLAN.sel.has(idDemanda(d)))? 'Desmarcar estas' : 'Marcar estas')+'</button></p>'+
  (vis.length? vis.map(d=>cartaoPlano(d, base)).join('') : '<div class="vazio"><p>'+(tipoRet? 'Nenhum retorno nesta lista.' : 'Nenhuma demanda para vistoriar nesta lista.')+'</p><p class="ajuda">'+(DEMANDAS && DEMANDAS.equipe? '' : 'Leia a planilha de novo no Wi-Fi da FUNAT para trazer as demandas da equipe.')+'</p></div>')+
  '</div><aside class="col-b so-largo"><div id="mapaPlano" class="it-mapa lado alto" role="img" aria-label="Mapa das demandas escolhidas"></div>'+
   '<section class="bloco it-resumo-lado"><h2>Resumo do roteiro</h2><p class="it-grande"><b>'+sel.length+' parada'+(sel.length===1?'':'s')+'</b>'+(sel.length? ' · ~'+esc(kmTxt(est.dist))+' · ~'+esc(duracaoTxt(est.dur+sel.length*MIN_VISTORIA*60))+' com as vistorias' : '')+'</p>'+
   '<p class="ajuda"><span>Estimativa em linha reta. “Otimizar a rota” calcula pelas ruas e define a ordem.</span></p>'+
   (sel.length? '<p class="ajuda"><span>'+[...new Set(sel.map(d=>d.doColega? nomeFiscal(d.fiscal) : (primeiroNome(cfg.nome)||'eu')))].map(n=>esc(n)+': '+sel.filter(d=>(d.doColega? nomeFiscal(d.fiscal) : (primeiroNome(cfg.nome)||'eu'))===n).length).join(' · ')+'</span></p>' : '')+'</section></aside></div>'+
  '<div class="rodape-fixo it-rodape"><p><b>'+sel.length+' selecionada'+(sel.length===1?'':'s')+'</b>'+(sel.length? ' · ~'+esc(kmTxt(est.dist))+' · ~'+esc(duracaoTxt(est.dur+sel.length*MIN_VISTORIA*60)) : '')+'<small>'+[...new Set(sel.map(d=>d.doColega? nomeFiscal(d.fiscal) : 'eu'))].map(x=>x).join(' · ')+(sel.some(d=>!pontoDe(d))? ' · '+sel.filter(d=>!pontoDe(d)).length+' sem posição' : '')+'</small></p>'+
  '<button class="bt pri largo alto" id="plOtimizar"'+(sel.length?'':' disabled')+'>'+ic('rota')+'Otimizar a rota</button></div></main>';
};
function cartaoPlano(d, base){
 const id=idDemanda(d), p=pontoDe(d), du=diasUteisDesde(dataBrParaIso(d.repasse||d.entrada)), marcado=!!PLAN.sel && PLAN.sel.has(id);
 return '<label class="cartao it-plano'+(marcado?'':' desmarcado')+'"><input type="checkbox" data-sel="'+esc(id)+'"'+(marcado?' checked':'')+'><div>'+
  '<div class="c-l1"><b>'+esc(d.protocolo)+'</b>'+(du!==null? '<span class="idade'+(du>=15?' muito':'')+'">'+(du? 'há '+du+' d.u.' : 'hoje')+'</span>' : '')+(ehRetornoDemanda(d)? '<span class="pilula">retorno</span>' : '')+'</div>'+
  (d.assunto? '<h3>'+esc(d.assunto)+'</h3>' : '')+(ehRetornoDemanda(d) && infoRetorno(d)? '<p class="st">'+esc(infoRetorno(d))+'</p>' : '')+(d.endereco? '<p class="loc">'+ic('pino')+esc(d.endereco)+'</p>' : '')+
  '<p class="it-pe">'+(p? '<span class="it-dist">'+ic('rota')+'a '+esc(kmTxt(distanciaGeo(base, p)*1.3))+' da FUNAT'+(p.precisao==='rua'||p.precisao==='aproximada'? ' (aprox.)' : p.fonte==='link'? ' (link)' : '')+'</span>'
   : '<span class="it-sempos">'+ic('alerta')+'posição desconhecida</span><button class="bt txt mini-bt" data-link="'+esc(id)+'">Colar link do Google Maps</button>')+
  '<span class="it-dono'+(d.doColega?' colega':'')+'">'+(d.doColega? esc(nomeFiscal(d.fiscal)) : 'Minha demanda')+'</span></p></div></label>';
}
function estimativa(lista, base){
 const pts=[base].concat(lista.map(pontoDe).filter(Boolean)); if(pts.length<2) return {dist:0, dur:0};
 const m=matrizLinhaReta(pts), o=resolverOrdem(m.dist), tr=trechosDaOrdem(m, o);
 return {dist:tr.reduce((a,t)=>a+t.dist,0), dur:tr.reduce((a,t)=>a+t.dur,0)};
}
/* mapa das demandas escolhidas (antes de otimizar: sem rota, só os pontos) */
function desenharMapaPlano(){
 const el=document.getElementById('mapaPlano'); if(!el || typeof L==='undefined' || !el.offsetWidth) return;
 if(mapaRota){ try{ mapaRota.remove(); }catch(e){} mapaRota=null; }
 const m=L.map(el, {zoomControl:true}); mapaRota=m;
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:18, attribution:'© OpenStreetMap'}).addTo(m);
 const base=baseFunat(), pts=[[base.lat, base.lng]];
 L.marker([base.lat, base.lng], {icon:L.divIcon({className:'it-pino base', html:'F', iconSize:[30,30]}), title:'FUNAT'}).addTo(m);
 let n=0;
 todasDoPlano().filter(d=>PLAN.sel && PLAN.sel.has(idDemanda(d))).forEach(d=>{ const p=pontoDe(d); if(!p) return; n++;
  L.marker([p.lat, p.lng], {icon:L.divIcon({className:'it-pino'+(d.doColega?' colega':''), html:String(n), iconSize:[28,28]}), title:d.protocolo}).addTo(m); pts.push([p.lat, p.lng]); });
 if(pts.length>1) m.fitBounds(L.latLngBounds(pts).pad(0.15)); else m.setView(pts[0], 13);
}
TELAS.planejar.ligar = function(){
 if(typeof LARGO==='function' && LARGO()) desenharMapaPlano();
 const pp=$('#plParceiro'); if(pp) pp.onchange=e=>{ const p=e.target.value; PLAN.sel=PLAN.sel||new Set(); cfg.duplaHoje={dia:hojeIso(), parceiro:p}; gravarCfg();
  const {equipe}=demandasDoPlano(); equipe.forEach(d=>{ const id=idDemanda(d); if(doParceiro(d,p) && pontoDe(d) && d.situacao!=='em_andamento') PLAN.sel.add(id); else if(!doParceiro(d,p)) PLAN.sel.delete(id); });
  demandasDeRetorno().equipe.forEach(d=>{ if(!doParceiro(d,p)) PLAN.sel.delete(idDemanda(d)); }); mostrar(true); };
 $$('[data-aba-plan]').forEach(b=>b.onclick=()=>{ PLAN.aba=b.dataset.abaPlan; PLAN.bairro=''; mostrar(true); });
 $$('[data-tipo-plan]').forEach(b=>b.onclick=()=>{ PLAN.tipo=b.dataset.tipoPlan; PLAN.bairro=''; mostrar(true); });
 $$('[data-bairro]').forEach(b=>b.onclick=()=>{ PLAN.bairro=b.dataset.bairro; mostrar(true); });
 $$('[data-sel]').forEach(c=>c.onchange=()=>{ PLAN.sel=PLAN.sel||new Set(); if(c.checked) PLAN.sel.add(c.dataset.sel); else PLAN.sel.delete(c.dataset.sel); mostrar(true); });
 $$('[data-link]').forEach(b=>b.onclick=e=>{ e.preventDefault(); colarLink(b.dataset.link); });
 const tt=$('#plTodas'); if(tt) tt.onclick=()=>{ PLAN.sel=PLAN.sel||new Set(); const ids=$$('[data-sel]').map(c=>c.dataset.sel), todas=ids.every(i=>PLAN.sel.has(i)); ids.forEach(i=>todas? PLAN.sel.delete(i) : PLAN.sel.add(i)); mostrar(true); };
 const lp=$('#plLimpar'); if(lp) lp.onclick=()=>{ PLAN.sel=new Set(); mostrar(true); };
 const ot=$('#plOtimizar'); if(ot) ot.onclick=otimizarRota;
};
/* corrigir a posição colando o link do Google Maps (ideia do RotaFácil) */
function colarLink(id){
 const t=prompt('Cole o link do Google Maps (ou as coordenadas, ex.: -28.4847, -49.0206):'); if(t===null) return;
 const c=extrairCoordenadas(t);
 if(!c){ alert(/goo\.gl|app\.goo/.test(t)? 'Link curto: abra-o no navegador, espere o mapa carregar e copie o endereço completo da barra.' : 'Não achei coordenadas nesse texto.'); return; }
 if(distanciaGeo(c, baseFunat())>60000 && !confirm('Esse ponto fica a mais de 60 km da FUNAT. Usar mesmo assim?')) return;
 cfg.posicoes=cfg.posicoes||{}; cfg.posicoes[id]={lat:c.lat, lng:c.lng, origem:'link', em:new Date().toISOString()}; gravarCfg();
 PLAN.sel && PLAN.sel.add(id); aviso('Posição guardada neste aparelho.'); mostrar(true);
}

/* ---------- otimizar: OSRM (ruas) com internet; linha reta sem ---------- */
async function otimizarRota(op){
 try{ await montarRota(op); }
 catch(e){ ocupado(false); console.error(e); alert('Não foi possível montar a rota.\n\n'+((e&&e.message)||e)+'\n\nTente de novo; se persistir, avise o Julio com uma foto desta mensagem.'); }
}
async function montarRota(op){
 op=(op && op.manter!==undefined)? op : {}; const base=baseFunat();
 const todas=todasDoPlano(), velho=itinerarioDeHoje();
 let sel=op.manter && velho? velho.paradas.map(p=>todas.find(d=>idDemanda(d)===p.id) || p.demanda).filter(Boolean) : todas.filter(d=>PLAN.sel && PLAN.sel.has(idDemanda(d)));
 if(!sel.length){ aviso('Escolha ao menos uma demanda.'); return; }
 const comPonto=sel.filter(d=>pontoDe(d)), semPonto=sel.filter(d=>!pontoDe(d));
 const pts=[base].concat(comPonto.map(pontoDe));
 ocupado('Calculando a melhor rota…');
 let mat, tracado=null;
 try{ mat=pts.length>1? await Rotas.matriz(pts) : {dist:[[0]], dur:[[0]], fonte:'ruas'}; }catch(e){ mat=matrizLinhaReta(pts); }
 const fixoId=velho && velho.paradas.find(p=>p.fixada) && velho.paradas.find(p=>p.fixada).id;
 const iFixo=fixoId? comPonto.findIndex(d=>idDemanda(d)===fixoId)+1 : 0;
 const ordem=resolverOrdem(mat.dist, {primeiro:iFixo>0? iFixo : 0});
 if(mat.fonte==='ruas' && ordem.length){ try{ tracado=await Rotas.tracado([base].concat(ordem.map(k=>pts[k]), [base])); }catch(e){} }
 ocupado(false);
 const antigo=id=>velho && velho.paradas.find(p=>p.id===id);
 const parada=(d, idx)=>{ const a=antigo(idDemanda(d)); return {id:idDemanda(d), idx:idx, linha:d.linha, protocolo:d.protocolo, assunto:d.assunto||'', endereco:d.endereco||'', fiscal:d.fiscal||meuFiscal(), doColega:!!d.doColega,
  ponto:pontoDe(d), fixada:!!(a && a.fixada), retorno:(a && a.retorno!==undefined)? a.retorno : ehRetornoDemanda(d), status:a? a.status : 'pendente', motivo:a? a.motivo : '', em:a? a.em : '', demanda:d,
  apos:a? a.apos : (d.doColega? '' : idConcluidaMaisRecente(vistoriasDe(d)))}; };
 ITIN={dia:hojeIso(), criadoEm:(velho && velho.criadoEm)||new Date().toISOString(), comecadoEm:velho && velho.comecadoEm || '', inicio:velho && velho.comecadoEm? velho.inicio : Math.ceil(Math.max(agoraMin(), 7*60+30)/5)*5,
  dupla:{eu:meuFiscal(), parceiro:parceiroHoje()}, base:base, fonte:mat.fonte, mat:{dist:mat.dist.map(l=>l.map(Math.round)), dur:mat.dur.map(l=>l.map(Math.round))}, tracado:tracado,
  paradas:ordem.map(k=>parada(comPonto[k-1], k)).concat(semPonto.map(d=>parada(d, null)))};
 recalcularTrechos(ITIN); await gravarItinerario(); PLAN.sel=null;
 aviso(mat.fonte==='ruas'? 'Rota calculada pelas ruas.' : 'Sem internet: rota calculada em linha reta. Recalcule no Wi-Fi da FUNAT para usar as ruas.', 4500);
 location.hash='#itinerario';
}
/* trechos e totais pela ordem atual (depois de mudar a ordem à mão, também) */
function recalcularTrechos(it){
 const m=it.mat, comp=it.paradas.filter(p=>p.idx); let ant=0; it.total={dist:0, dur:0};
 it.paradas.forEach(p=>{ if(!p.idx){ p.trecho=null; return; } p.trecho={dist:m.dist[ant][p.idx], dur:m.dur[ant][p.idx]}; it.total.dist+=p.trecho.dist; it.total.dur+=p.trecho.dur; ant=p.idx; });
 it.volta=comp.length? {dist:m.dist[ant][0], dur:m.dur[ant][0]} : {dist:0, dur:0}; it.total.dist+=it.volta.dist; it.total.dur+=it.volta.dur;
 let t=it.inicio; it.paradas.forEach(p=>{ if(p.trecho) t+=p.trecho.dur/60; p.chegada=Math.round(t); p.saida=Math.round(t+MIN_VISTORIA); t+=MIN_VISTORIA; });
 it.retorno=Math.round(t+it.volta.dur/60);
}
/* a minha parada fica "feita" quando a vistoria dela é concluída no app */
function sincronizarStatus(it){
 let mudou=false;
 it.paradas.forEach(p=>{ if(p.doColega) return; const d=demandaPorId(p.id), v=d && vistoriaDe(d);
  if(v && v.status==='concluida' && v.id!==p.apos && p.status!=='feita'){ p.status='feita'; p.em=v.concluidaEm||new Date().toISOString(); mudou=true; } });
 if(mudou) gravarItinerario().catch(()=>{});
}

/* ======================= Itinerário de hoje ======================= */
let mapaRota=null;
TELAS.itinerario = function(){
 const it=itinerarioDeHoje();
 if(!it) return topo('Itinerário de hoje')+'<main class="pag com-nav"><div class="vazio">'+ic('rota')+'<p>Nenhum itinerário para hoje.</p><p class="ajuda"><span>De manhã, no Wi-Fi da FUNAT, escolha as demandas da dupla e o app calcula a rota mais curta, saindo e voltando à FUNAT.</span></p>'+
  (cfg.planilhaAtiva? '<button class="bt pri" data-ir="#planejar">'+ic('rota')+'Planejar o dia</button>' : '<button class="bt claro" data-ir="#planilha">Ligar as demandas da planilha</button>')+
  (ITIN_DUPLA && ITIN_DUPLA.dia===hojeIso()? '<button class="bt txt" data-ir="#dupla">Ver o itinerário da dupla</button>' : '')+'</div></main>'+navInferior('#itinerario');
 sincronizarStatus(it);
 const urls=urlsGoogleMaps(it.base, it.paradas.filter(p=>p.ponto).map(p=>p.ponto), 8), n=it.paradas.length;
 return topo('Itinerário de hoje', {direita:chipEnvio()})+'<main class="pag com-nav com-rodape">'+
  '<section class="bloco it-resumo"><div class="it-cab">'+ic('rota')+'<div><b>Rota mais curta encontrada</b><span class="pilula '+(it.fonte==='ruas'? 'ok' : '')+'">'+(it.fonte==='ruas'? 'Pelas ruas' : 'Linha reta (sem internet)')+'</span></div></div>'+
   '<p>'+esc(kmTxt(it.total.dist))+' · '+esc(duracaoTxt(it.total.dur+n*MIN_VISTORIA*60))+' com as vistorias · volta prevista às '+horaMin(it.retorno)+'</p>'+
   '<div id="mapaRota" class="it-mapa" role="img" aria-label="Mapa da rota"></div>'+
   urls.map((u,i)=>'<button class="bt txt" data-url="'+esc(u)+'">'+ic('mapa')+'Abrir a rota no Google Maps'+(urls.length>1? ' (trecho '+(i+1)+' de '+urls.length+')' : '')+'</button>').join('')+'</section>'+
  '<h2 class="secao">Paradas <span class="cont">'+n+'</span></h2><ol class="it-crono">'+
   '<li class="it-ponta">'+ic('casa')+'<div><b>Saída: FUNAT · '+horaMin(it.inicio)+'</b><small>Av. Marechal Deodoro, 1311, Oficinas'+(it.base.fonte==='aproximada'? ' (posição aproximada)' : '')+'</small></div></li>'+
   it.paradas.map((p,i)=>'<li class="it-par st-'+p.status+(p.doColega?' colega':'')+'">'+(p.trecho? '<p class="it-trecho">'+ic('rota')+esc(kmTxt(p.trecho.dist))+' · '+esc(duracaoTxt(p.trecho.dur))+'</p>' : '<p class="it-trecho">'+ic('alerta')+'sem posição: fica no fim</p>')+
    '<div class="it-num">'+(p.status==='feita'? ic('ok') : i+1)+'</div><div class="cartao it-parada"><div class="c-l1"><span class="tag t-planilha">'+esc(p.protocolo)+'</span>'+(p.retorno? '<span class="pilula">retorno</span>' : '')+(p.fixada? '<span class="pilula erro">fixada primeiro</span>' : '')+rotStatusParada(p)+'</div>'+
    '<h3>'+esc(p.assunto)+'</h3><p class="loc">'+ic('pino')+esc(p.endereco||'sem endereço')+'</p>'+
    '<p class="it-pe"><span class="it-dono'+(p.doColega?' colega':'')+'">Fiscal: '+esc(nomeFiscal(p.fiscal))+'</span><span class="it-prev">Prev. '+horaMin(p.chegada)+'–'+horaMin(p.saida)+'</span></p>'+
    '<div class="it-acoes"><button class="bt txt mini-bt" data-sobe="'+i+'"'+(i?'':' disabled')+' aria-label="Subir">↑</button><button class="bt txt mini-bt" data-desce="'+i+'"'+(i<n-1?'':' disabled')+' aria-label="Descer">↓</button>'+
     (podeDesfazer(p)? '<button class="bt txt mini-bt" data-desfazer="'+i+'">Desfazer</button>' : '')+
     (p.ponto? '<button class="bt txt mini-bt" data-fixar="'+i+'">'+(p.fixada? 'Soltar' : 'Fixar primeiro')+'</button>' : '<button class="bt txt mini-bt" data-link="'+esc(p.id)+'">Colar link do Google Maps</button>')+'</div></div></li>').join('')+
   '<li class="it-ponta">'+ic('ok')+'<div><b>Retorno: FUNAT · previsto '+horaMin(it.retorno)+'</b>'+(it.volta.dist? '<small>'+esc(kmTxt(it.volta.dist))+' · '+esc(duracaoTxt(it.volta.dur))+'</small>' : '')+'</div></li></ol>'+
  '<div class="it-extra"><button class="bt claro largo" id="itCompartilhar">'+ic('enviar')+(MODO_WEB? 'Enviar para a dupla (Compartilhar)' : 'Enviar para a dupla (pasta da FUNAT)')+'</button><button class="bt txt largo" data-ir="#planejar">'+ic('lapis')+'Refazer: escolher as paradas de novo</button>'+
   (it.comecadoEm && !it.paradas.some(p=>p.status!=='pendente')? '<button class="bt txt largo" id="itDesComecar">'+ic('voltar')+'Desfazer "Começar o dia"</button>' : '')+
   (ITIN_DUPLA && ITIN_DUPLA.dia===hojeIso()? '<button class="bt txt largo" data-ir="#dupla">Ver o itinerário da dupla</button>' : '<button class="bt txt largo" id="itBuscarDupla">Buscar o itinerário da dupla</button>')+'</div>'+
  '<button class="bt txt perigo largo it-cancelar" id="itCancelar">'+ic('lixo')+'Cancelar o itinerário de hoje</button>'+
  '<div class="rodape-fixo duplo acima-nav"><button class="bt sec" id="itRecalcular">'+ic('girar')+'Recalcular</button><button class="bt pri" id="itComecar">'+ic('rota')+(it.comecadoEm? 'Próxima parada' : 'Começar o dia')+'</button></div></main>'+navInferior('#itinerario');
};
function rotStatusParada(p){ return {feita:'<span class="pilula ok">feita</span>', nao_foi:'<span class="pilula erro">não foi possível</span>', adiada:'<span class="pilula">para depois</span>', agora:'<span class="pilula azul">agora</span>'}[p.status]||''; }
TELAS.itinerario.ligar = function(){
 const it=itinerarioDeHoje(); if(!it) return;
 desenharMapa(it);
 $$('[data-url]').forEach(b=>b.onclick=()=>Aparelho.abrirUrl(b.dataset.url));
 const mover=async(i, j)=>{ const p=it.paradas.splice(i,1)[0]; it.paradas.splice(j,0,p); if(p.fixada && j>0) p.fixada=false; it.tracado=null; recalcularTrechos(it); await gravarItinerario(); mostrar(true); };
 $$('[data-sobe]').forEach(b=>b.onclick=()=>mover(+b.dataset.sobe, +b.dataset.sobe-1));
 $$('[data-desce]').forEach(b=>b.onclick=()=>mover(+b.dataset.desce, +b.dataset.desce+1));
 $$('[data-fixar]').forEach(b=>b.onclick=async()=>{ const i=+b.dataset.fixar, p=it.paradas[i], liga=!p.fixada; it.paradas.forEach(x=>x.fixada=false); p.fixada=liga; await gravarItinerario(); if(liga) await otimizarRota({manter:true}); else mostrar(true); });
 $$('[data-link]').forEach(b=>b.onclick=()=>{ colarLink(b.dataset.link); otimizarRota({manter:true}); });
 $('#itRecalcular').onclick=()=>otimizarRota({manter:true});
 $('#itComecar').onclick=async()=>{ if(!it.comecadoEm){ it.comecadoEm=new Date().toISOString(); it.inicio=Math.round(agoraMin()/5)*5; recalcularTrechos(it); await gravarItinerario(); compartilharComDupla({silencioso:true}); } location.hash='#parada'; };
 $('#itCompartilhar').onclick=()=>compartilharComDupla({});
 $('#itCancelar').onclick=cancelarItinerario;
 $$('[data-desfazer]').forEach(b=>b.onclick=()=>desfazerParada(it, +b.dataset.desfazer));
 const dc=$('#itDesComecar'); if(dc) dc.onclick=async()=>{ it.comecadoEm=''; it.paradas.forEach(p=>{ if(p.status==='agora') p.status='pendente'; }); await gravarItinerario(); aviso('O dia voltou para o planejamento.'); mostrar(true); };
 const bd=$('#itBuscarDupla'); if(bd) bd.onclick=buscarItinerarioDupla;
};
/* mapa (Leaflet, como no RotaFácil): fundo do OpenStreetMap quando há internet; sem internet, só a rota e os pontos */
function desenharMapa(it, idEl){
 const el=document.getElementById(idEl||'mapaRota'); if(!el || typeof L==='undefined') return;
 if(mapaRota){ try{ mapaRota.remove(); }catch(e){} mapaRota=null; }
 const m=L.map(el, {zoomControl:true, attributionControl:true}); mapaRota=m;
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:18, attribution:'© OpenStreetMap'}).addTo(m);
 const ok=it.paradas.filter(p=>p.ponto), pts=[[it.base.lat, it.base.lng]].concat(ok.map(p=>[p.ponto.lat, p.ponto.lng]), [[it.base.lat, it.base.lng]]);
 L.polyline(it.tracado && it.tracado.length? it.tracado : pts, {color:'#006495', weight:4, opacity:.85, dashArray:it.tracado? null : '6 6'}).addTo(m);
 L.marker([it.base.lat, it.base.lng], {icon:L.divIcon({className:'it-pino base', html:'F', iconSize:[30,30]}), title:'FUNAT'}).addTo(m);
 it.paradas.forEach((p,i)=>{ if(!p.ponto) return; L.marker([p.ponto.lat, p.ponto.lng], {icon:L.divIcon({className:'it-pino st-'+p.status+(p.doColega?' colega':''), html:String(i+1), iconSize:[28,28]}), title:p.protocolo}).addTo(m); });
 m.fitBounds(L.latLngBounds(pts).pad(0.15));
}

/* ======================= Próxima parada ======================= */
function paradaAtual(it){ return it.paradas.find(p=>p.status==='agora') || it.paradas.find(p=>p.status==='pendente') || null; }
TELAS.parada = function(){
 const it=itinerarioDeHoje(); if(!it) return TELAS.itinerario();
 sincronizarStatus(it);
 const p=paradaAtual(it), n=it.paradas.length, feitas=it.paradas.filter(x=>x.status!=='pendente' && x.status!=='agora').length;
 if(!p) return topo('Próxima parada', {voltar:true})+'<main class="pag centro"><div class="grande-ok">'+ic('ok')+'</div><h2>Todas as paradas resolvidas</h2><p class="ajuda"><span>Volta à FUNAT prevista às '+horaMin(it.retorno)+'.</span></p><button class="bt pri largo" data-ir="#resumo">Resumo do dia</button><button class="bt txt largo" data-ir="#itinerario">Marcou algo por engano? Ver o itinerário</button></main>';
 const k=it.paradas.indexOf(p), resto=it.paradas.slice(k).filter(x=>x.status==='pendente'||x.status==='agora'), kmResto=resto.reduce((a,x)=>a+((x.trecho||{}).dist||0),0)+it.volta.dist;
 const d=!p.doColega && demandaPorId(p.id), v=d && vistoriaDe(d);
 return topo('Próxima parada', {voltar:true, direita:chipEnvio()})+'<main class="pag"><div class="duas-col parada"><div class="col-a">'+
  '<section class="bloco it-progresso"><div class="it-prog"><b>'+ic('pino')+'Parada '+(k+1)+' de '+n+'</b><span>faltam '+resto.length+' · ~'+esc(kmTxt(kmResto))+'</span></div><div class="at-barra"><i style="width:'+Math.round(feitas*100/n)+'%"></i></div></section>'+
  '<section class="bloco it-agora">'+(p.doColega? '<div class="it-resp">'+ic('pessoa')+'<div><b>Responsável: '+esc(nomeFiscal(p.fiscal))+'</b><small>Demanda da dupla</small></div></div>' : '')+
   '<p class="it-prot">'+esc(p.protocolo)+(p.retorno? ' <span class="pilula">retorno</span>' : '')+'</p><p class="rot-p">'+(p.retorno? 'Retorno ao local · assunto' : 'Motivo da vistoria')+'</p><h2>'+esc(p.assunto||'—')+'</h2>'+
   '<div class="it-end">'+ic('pino')+'<div><b>'+esc(p.endereco||'sem endereço')+'</b><small>Tubarão - SC</small></div></div>'+
   (p.trecho? '<p class="it-dist grande">'+ic('rota')+'a '+esc(kmTxt(p.trecho.dist))+' · '+esc(duracaoTxt(p.trecho.dur))+'</p>' : '')+
   (p.doColega? '<div class="it-trava">'+ic('alerta')+'<div><b>Vistoria do '+esc(nomeFiscal(p.fiscal))+'</b><small>Ele inicia no celular dele. Aqui a parada serve só para seguir a rota.</small></div></div>' : '')+
   '<div class="it-bts">'+(p.doColega? '<button class="bt pri alto" id="paNavegar">'+ic('mapa')+'Navegar até o local</button>' :
    '<button class="bt claro alto" id="paNavegar">'+ic('mapa')+'Navegar</button>'+(v && !(v.status==='concluida' && v.id===p.apos)? '<button class="bt pri alto" data-ir="#v/'+v.id+'">'+ic('lapis')+(ehRetorno(v)? 'Abrir visita' : 'Abrir vistoria')+'</button>' : '<button class="bt pri alto" id="paIniciar">'+ic(v||p.retorno? 'girar' : 'camera')+(v||p.retorno? 'Voltar ao local' : 'Iniciar vistoria')+'</button>'))+'</div>'+
   '<div class="it-bts sec">'+(p.doColega? '<button class="bt sec" id="paFeita">'+ic('ok')+'Feita pelo '+esc(nomeFiscal(p.fiscal))+'</button>' : '')+'<button class="bt sec" id="paNao">'+ic('fechar')+'Não foi possível</button><button class="bt sec" id="paDepois">Pular para depois</button></div></section>'+
  '<section class="bloco"><h2>Todas as paradas</h2><ol class="it-lista">'+it.paradas.map((x,i)=>'<li class="st-'+(x===p? 'agora' : x.status)+'"><span class="it-num">'+(x.status==='feita'? ic('ok') : x.status==='nao_foi'? ic('fechar') : i+1)+'</span><div><b>'+esc(x.protocolo)+' · '+esc(x.assunto)+'</b><small>'+esc(bairroDe(x.endereco)||x.endereco||'')+' ('+esc(nomeFiscal(x.fiscal))+')'+(x.status==='feita' && x.em? ' · concluída às '+esc(horaDe(x.em)) : x.status==='nao_foi'? ' · '+esc(x.motivo) : x===p? ' · agora' : '')+'</small></div>'+(x!==p && podeDesfazer(x)? '<button class="bt txt mini-bt" data-desfazer="'+i+'">Desfazer</button>' : '')+'</li>').join('')+'</ol>'+
   '<p class="it-prog"><span>'+ic('relogio')+'Retorno previsto</span><b>FUNAT às '+horaMin(it.retorno)+'</b></p></section>'+
  '<div class="it-extra"><button class="bt claro largo" data-ir="#itinerario">'+ic('rota')+'Ver ou mudar o itinerário</button><button class="bt txt perigo largo" id="paCancelar">'+ic('lixo')+'Cancelar o itinerário de hoje</button></div></div><aside class="col-b so-largo"><div id="mapaParada" class="it-mapa lado alto" role="img" aria-label="Mapa da rota"></div></aside></div></main>';
};
TELAS.parada.ligar = function(){
 const it=itinerarioDeHoje(); if(!it) return; const p=paradaAtual(it); if(!p) return;
 if(typeof LARGO==='function' && LARGO()) desenharMapa(it, 'mapaParada');
 const marcar=async(st, motivo)=>{ p.status=st; p.motivo=motivo||''; p.em=new Date().toISOString(); await gravarItinerario(); mostrar(); window.scrollTo(0,0); };
 $('#paNavegar').onclick=()=>p.ponto? Aparelho.abrirUrl('https://www.google.com/maps/dir/?api=1&destination='+p.ponto.lat.toFixed(6)+','+p.ponto.lng.toFixed(6)+'&travelmode=driving') : Aparelho.abrirEndereco((p.endereco||'')+', Tubarão - SC');
 const ini=$('#paIniciar'); if(ini) ini.onclick=async()=>{ const antes=p.status; p.status='agora'; await gravarItinerario();
  if(await iniciarDaDemanda(p.id)===false){ p.status=antes==='agora'? 'pendente' : (antes||'pendente'); await gravarItinerario(); mostrar(true); } };   // a demanda saiu da lista: a parada não fica presa em "agora" 
 const fe=$('#paFeita'); if(fe) fe.onclick=()=>marcar('feita');
 $('#paNao').onclick=()=>{ const r=prompt('Por que não foi possível?\n\n'+MOTIVOS_NAO.map((m,i)=>(i+1)+'. '+m).join('\n')+'\n\nDigite o número ou escreva o motivo:'); if(r===null) return;
  const m=MOTIVOS_NAO[+r.trim()-1]||r.trim()||'Sem motivo'; marcar('nao_foi', m); };
 $('#paCancelar').onclick=cancelarItinerario;
 $$('[data-desfazer]').forEach(b=>b.onclick=()=>desfazerParada(it, +b.dataset.desfazer));
 $('#paDepois').onclick=async()=>{ const i=it.paradas.indexOf(p); it.paradas.splice(i,1); it.paradas.push(p); p.status='pendente'; p.adiadaVezes=(p.adiadaVezes||0)+1; it.tracado=null; recalcularTrechos(it); await gravarItinerario(); mostrar(); };
};

/* ======================= a dupla: enviar e ver o itinerário ======================= */
/* vai para a SUA pasta VISTORIAS como .rota (as ferramentas do computador só leem .json, então não confundem) */
const nomeArquivoRota=(dia, fiscal)=>'ITINERARIO '+dia+' - '+String(fiscal||'SEM NOME').toUpperCase()+'.rota';
async function compartilharComDupla(op){ const it=itinerarioDeHoje(); if(it) return enviarRota(it, op); }
async function enviarRota(it, op){
 if(!it) return;
 /* versão web (iPhone): não alcança a pasta; o arquivo vai pelo Compartilhar ("Salvar em Arquivos" na sua pasta
    VISTORIAS, ou direto para o colega). Envio automático (silencioso) não existe na web: o Compartilhar pede um toque. */
 if(MODO_WEB){ if(!op.silencioso) compartilharRotaWeb(it); return; }
 if(!cfg.pasta) return;
 try{
  const txt=textoRota(it);
  const nome=nomeArquivoRota(it.dia, it.dupla.eu||meuFiscal()), local=await arquivoParaEnvio(nome, txt);
  await Pasta.enviar({origem:local, destinoPasta:cfg.pasta.caminho+'\\VISTORIAS', nome:nome}); await apagarArquivoDeEnvio(nome);
  if(!op.silencioso && !it.canceladoEm) aviso('Itinerário enviado para a sua pasta: '+(it.dupla.parceiro? nomeFiscal(it.dupla.parceiro)+' vê em "Itinerário da dupla".' : 'escolha a dupla para ela ver.'), 5000);
 }catch(e){ if(!op.silencioso) aviso(['SEM_REDE','SEM_CONFIG','SENHA'].includes(e.code)? 'Sem acesso à pasta agora: envie no Wi-Fi da FUNAT.' : 'Não deu para enviar: '+(e.message||e), 5000); }
}
function textoRota(it){ return JSON.stringify(Object.assign({}, it, {mat:undefined, autor:cfg.nome, enviadoEm:new Date().toISOString(), paradas:it.paradas.map(p=>Object.assign({}, p, {demanda:undefined}))})); }
function compartilharRotaWeb(it){
 /* sem nenhum "await" antes do navigator.share: o Safari só abre o Compartilhar dentro do toque do usuário */
 const nome=nomeArquivoRota(it.dia, it.dupla.eu||meuFiscal()), arq=new File([textoRota(it)], nome, {type:'application/json'});
 if(navigator.canShare && navigator.canShare({files:[arq]})){
  navigator.share({files:[arq], title:'Itinerário de '+dataBrCampo(it.dia)}).then(()=>aviso('Itinerário compartilhado. Se salvou na sua pasta VISTORIAS, quem tem o app Android vê em "Itinerário da dupla".', 6000))
   .catch(e=>{ if(e && e.name!=='AbortError') aviso('Não deu para compartilhar: '+(e.message||e), 5000); });
 } else { const a=document.createElement('a'); a.href=URL.createObjectURL(arq); a.download=nome; document.body.appendChild(a); a.click(); a.remove(); }
}
/* versão web: o itinerário do colega vem de um arquivo .rota – da pasta dele (app Arquivos ligado ao servidor) ou recebido por mensagem */
function abrirRotaDaDuplaWeb(){
 const inp=document.createElement('input'); inp.type='file';
 inp.onchange=()=>{ const f=inp.files && inp.files[0]; if(f) carregarRotaDaDupla(f); };
 inp.click();
}
async function carregarRotaDaDupla(f){
 try{ const o=JSON.parse(await f.text()); if(!o || !o.dia || !Array.isArray(o.paradas) || !o.dupla) throw new Error('não é um arquivo de itinerário');
  if(o.dia!==hojeIso() && !confirm('Este itinerário é de '+dataBrCampo(o.dia)+', não de hoje. Abrir mesmo assim?')) return false;
  ITIN_DUPLA=o; await Arquivos.gravarTexto('itinerario-dupla.json', JSON.stringify(o)); location.hash='#dupla'; mostrar(true); return true; }
 catch(e){ aviso('Não deu para abrir o arquivo: '+(e.message||e), 5000); return false; }
}
async function buscarItinerarioDupla(){
 if(MODO_WEB) return abrirRotaDaDuplaWeb();
 const parc=parceiroHoje() || (ITIN && ITIN.dupla && ITIN.dupla.parceiro);
 if(!parc){ aviso('Escolha a dupla de hoje em "Planejar o dia".'); return; }
 ocupado('Procurando o itinerário de '+nomeFiscal(parc)+'…');
 try{
  const pref=semAcento(parc).toUpperCase().slice(0,4), itens=await Pasta.listar(PASTA_BASE);
  const pasta=itens.find(x=>x.pasta && semAcento(x.nome).toUpperCase().indexOf(pref)>=0);
  if(!pasta) throw new Error('Não achei a pasta de '+nomeFiscal(parc)+' em '+PASTA_BASE+'.');
  const nome=nomeArquivoRota(hojeIso(), parc), lidos=await Pasta.lerVarios(PASTA_BASE+'\\'+pasta.nome, ['VISTORIAS\\'+nome]);
  if(lidos[0] && lidos[0].erro && /access.?denied|acesso negado|permiss|STATUS_ACCESS/i.test(lidos[0].erro)) throw new Error('Este celular não tem permissão para ler a pasta de '+nomeFiscal(parc)+' no servidor. Peça a quem administra a rede.');
  if(!lidos[0] || lidos[0].erro || !lidos[0].texto) throw new Error(nomeFiscal(parc)+' ainda não enviou o itinerário de hoje.');
  ITIN_DUPLA=JSON.parse(lidos[0].texto); await Arquivos.gravarTexto('itinerario-dupla.json', JSON.stringify(ITIN_DUPLA));
  ocupado(false); location.hash='#dupla';
 }catch(e){ ocupado(false); aviso(['SEM_REDE','SEM_CONFIG','SENHA'].includes(e.code)? 'Sem acesso à pasta agora: busque no Wi-Fi da FUNAT.' : (e.message||String(e)), 5500); }
}
TELAS.dupla = function(){
 const it=ITIN_DUPLA;
 if(!it || it.dia!==hojeIso()) return topo('Itinerário da dupla', {voltar:true})+'<main class="pag centro"><p>Nenhum itinerário da dupla para hoje neste aparelho.</p><button class="bt pri largo" id="duBuscar">'+(MODO_WEB? 'Abrir o arquivo do itinerário da dupla' : 'Buscar na pasta da FUNAT')+'</button>'+(MODO_WEB? '<p class="ajuda"><span>No app Arquivos (ligado ao servidor da FUNAT), abra a pasta VISTORIAS do colega; ou abra o arquivo que ele mandou por mensagem.</span></p>' : '')+'</main>';
 const feitas=it.paradas.filter(p=>p.status==='feita').length, nao=it.paradas.filter(p=>p.status==='nao_foi').length;
 if(it.canceladoEm) return topo('Itinerário da dupla', {voltar:true})+'<main class="pag centro"><p><b>'+esc(nomeFiscal(it.dupla.eu))+' cancelou o itinerário de hoje às '+esc(horaDe(it.canceladoEm))+'.</b></p><p class="ajuda"><span>Se for refeito, busque de novo depois que ele enviar.</span></p><button class="bt claro largo" id="duBuscar">'+ic('girar')+(MODO_WEB? 'Abrir outro arquivo' : 'Buscar de novo')+'</button></main>';
 return topo('Itinerário da dupla', {voltar:true})+'<main class="pag">'+
  '<p class="faixa-in">'+ic('pessoa')+'<span>Itinerário de '+esc(nomeFiscal(it.dupla.eu))+(it.dupla.parceiro? ' e '+esc(nomeFiscal(it.dupla.parceiro)) : '')+' · enviado às '+esc(horaDe(it.enviadoEm))+'</span></p>'+
  '<p class="nota-alerta">'+ic('alerta')+'<span>Só consulta: quem muda a ordem é quem criou o itinerário. O que for feito depois de enviado não aparece aqui (em campo não há rede).</span></p>'+
  '<section class="bloco"><h2>Resumo do percurso</h2><p>'+it.paradas.length+' paradas · '+esc(kmTxt(it.total.dist))+' · '+esc(duracaoTxt(it.total.dur+it.paradas.length*MIN_VISTORIA*60))+' com as vistorias</p><p class="ajuda"><span>'+feitas+' feitas'+(nao? ' · '+nao+' não realizada'+(nao>1?'s':'') : '')+'</span></p>'+
   '<div id="mapaDupla" class="it-mapa"></div></section>'+
  '<ol class="it-crono">'+it.paradas.map((p,i)=>'<li class="it-par st-'+p.status+'"><div class="it-num">'+(p.status==='feita'? ic('ok') : i+1)+'</div><div class="cartao it-parada"><div class="c-l1"><b>Parada '+(i+1)+'</b>'+rotStatusParada(p)+'</div><h3>'+esc(p.protocolo)+' · '+esc(p.assunto)+'</h3><p class="loc">'+ic('pino')+esc(p.endereco)+'</p>'+
   (p.motivo? '<p class="nota-alerta">'+ic('alerta')+'<span>Motivo: '+esc(p.motivo)+'</span></p>' : '')+'<p class="it-pe"><span class="it-dono">'+esc(nomeFiscal(p.fiscal))+'</span><span class="it-prev">Prev. '+horaMin(p.chegada)+'</span></p></div></li>').join('')+'</ol>'+
  '<button class="bt claro largo" id="duBuscar">'+ic('girar')+(MODO_WEB? 'Abrir outro arquivo' : 'Buscar de novo na pasta')+'</button></main>';
};
TELAS.dupla.ligar = function(){ const b=$('#duBuscar'); if(b) b.onclick=buscarItinerarioDupla; if(ITIN_DUPLA && ITIN_DUPLA.dia===hojeIso()) desenharMapa(ITIN_DUPLA, 'mapaDupla'); };

/* ======================= Resumo do dia ======================= */
TELAS.resumo = function(){
 const it=itinerarioDeHoje(); if(!it) return TELAS.itinerario();
 sincronizarStatus(it);
 const c=s=>it.paradas.filter(p=>p.status===s).length, n=it.paradas.length, fila=pendentesEnvio(VIST).length;
 return topo('Resumo do dia', {voltar:true})+'<main class="pag">'+
  '<p class="ajuda"><span>'+esc(hojeExtenso())+(it.comecadoEm? ' · saída às '+horaMin(it.inicio) : '')+'</span></p>'+
  '<div class="it-nums"><div class="ok"><b>'+c('feita')+'</b><span>vistorias feitas</span></div><div class="erro"><b>'+c('nao_foi')+'</b><span>não foi possível</span></div>'+
   '<div><b>'+(c('pendente')+c('agora'))+'</b><span>para outro dia</span></div><div class="escuro"><b>'+esc(kmTxt(it.total.dist))+'</b><span>de deslocamento previsto</span></div></div>'+
  '<section class="bloco"><h2>Paradas</h2><ol class="it-lista">'+it.paradas.map((p,i)=>'<li class="st-'+p.status+'"><span class="it-num">'+(i+1)+'</span><div><b>'+esc(p.protocolo)+' · '+esc(p.assunto)+'</b><small>'+esc(nomeFiscal(p.fiscal))+' · '+({feita:'feita'+(p.em? ' às '+horaDe(p.em) : ''), nao_foi:'não foi possível: '+p.motivo, agora:'em andamento', pendente:'fica para outro dia'}[p.status]||p.status)+'</small></div></li>').join('')+'</ol></section>'+
  (fila? '<button class="bt pri largo alto" data-ir="#envios">'+ic('enviar')+'Enviar '+fila+' vistoria'+(fila>1?'s':'')+' para a pasta</button><p class="ajuda centro-txt"><span>Vai quando o celular estiver no Wi-Fi da FUNAT.</span></p>' : '<p class="nota-ok">'+ic('ok')+'<span>Nenhuma vistoria esperando envio.</span></p>')+
  '<button class="bt claro largo" id="reAmanha">'+ic('rota')+'Planejar amanhã</button></main>';
};
TELAS.resumo.ligar = function(){ $('#reAmanha').onclick=()=>{ PLAN.sel=null; aviso('As demandas que ficaram já aparecem na lista para planejar.'); location.hash='#planejar'; }; };

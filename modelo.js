/* ===== App de campo — modelo da vistoria (sem tela, sem plugin: testável no Node) =====
   Uma vistoria é o que o auxiliar junta no local: protocolo, data e hora, posição, fotos com legenda,
   anotações e, quando for o caso, medições de ruído. Ela vira o .json da ferramenta do computador
   (Relatório, Relato simplificado, Ruídos ou Arquivamento) por paraDocumento(). */

const TIPOS_DOC = {      // o primeiro é o padrão: no campo, o mais comum é o Relato simplificado
 relatorio_simplificado:{rotulo:'Relato simplificado',       curto:'Relato',     sigla:'SIMP'},
 relatorio:             {rotulo:'Relatório de Fiscalização', curto:'Relatório',  sigla:'REL'},
 termo_ruido:           {rotulo:'Termo de Ruídos',           curto:'Ruídos',     sigla:'RUÍDO'},
 termo_arquivamento:    {rotulo:'Termo de Arquivamento',     curto:'Arquivamento', sigla:'ARQ'}
};
const EXPEDIENTES = ['Atendimento','Memorando','Ofício','Protocolo','Processo'];
const SUGESTOES_LEGENDA = ['Vista geral do local','Detalhe da irregularidade','Placa do estabelecimento','Ponto de lançamento','Acesso ao imóvel','Medição no local'];

function novoIdCampo(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function doisDig(n){ return String(n).padStart(2,'0'); }
function dataIso(d){ d=d||new Date(); return d.getFullYear()+'-'+doisDig(d.getMonth()+1)+'-'+doisDig(d.getDate()); }
function horaCurta(d){ d=d||new Date(); return doisDig(d.getHours())+':'+doisDig(d.getMinutes()); }
function dataBrCampo(iso){ const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso||''); return m? m[3]+'/'+m[2]+'/'+m[1] : ''; }

function novaVistoria(o){
 o=o||{}; const agora=new Date();
 return {
  formatoCampo:1, id:novoIdCampo(), criadaEm:agora.toISOString(), editadaEm:agora.toISOString(),
  status:'a_vistoriar',                       // a_vistoriar → em_andamento → concluida
  tipoDocumento:TIPOS_DOC[o.tipoDocumento]? o.tipoDocumento : 'relatorio_simplificado', demanda:null,   // demanda da planilha que originou a vistoria
  expedienteTipo:EXPEDIENTES.includes(o.expedienteTipo)? o.expedienteTipo : 'Atendimento',
  expedienteNum:String(o.expedienteNum||'').trim(),
  assunto:String(o.assunto||'').trim(), bairro:String(o.bairro||'').trim(), endereco:String(o.endereco||'').trim(),
  autuado:String(o.autuado||'').trim(),
  dataVistoria:'', horaVistoria:'',
  local:null,                                 // {lat, lon, e, n, precisao, em}
  fotos:[],                                   // {id, arquivo, w, h, legenda, exif, origem, gpsAparelho}
  anotacoes:'',
  ruido:{usar:o.tipoDocumento==='termo_ruido', meteorologia:'', medicoes:[]},
  concluidaEm:'', exportadaEm:'',
  precisaEnviar:false, enviadaEm:'', arquivoRemoto:'', erroEnvio:''   // envio para a pasta da FUNAT
 };
}
function medicaoCampo(){ return {local:'', horaIni:'', horaFim:'', leq:'', maximo:'', minimo:'', observacao:''}; }

/* Começa a vistoria: registra data e hora na primeira vez em que ela é aberta para trabalhar */
function iniciarVistoria(v, agora){
 if(v.status==='a_vistoriar') v.status='em_andamento';
 if(!v.dataVistoria){ agora=agora||new Date(); v.dataVistoria=dataIso(agora); v.horaVistoria=horaCurta(agora); }
 return v;
}

function protocoloTexto(v){ const n=String(v.expedienteNum||'').trim(); return n? v.expedienteTipo+' '+n : 'Sem protocolo'; }

/* Posição do GPS do aparelho → registro com UTM 22 S (SIRGAS 2000), como as ferramentas do computador usam */
function posicaoDe(lat, lon, precisao, quando){
 const u=GEO.paraUTM(lat, lon);
 return {lat:+(+lat).toFixed(6), lon:+(+lon).toFixed(6), e:+u.este.toFixed(2), n:+u.norte.toFixed(2),
         precisao:(precisao===undefined||precisao===null)? null : Math.round(precisao), em:quando||new Date().toISOString()};
}
function utmTexto(p){ if(!p) return ''; return 'UTM 22 S · E '+GEO.fmtUTM(p.e)+' m · N '+GEO.fmtUTM(p.n)+' m'; }
function distanciaM(a, b){ if(!a||!b||a.e===undefined||b.e===undefined) return null; return Math.hypot(a.e-b.e, a.n-b.n); }
function distanciaTexto(m){ if(m===null||m===undefined) return ''; return m<1000? Math.round(m)+' m' : (m/1000).toFixed(1).replace('.',',')+' km'; }

/* Dados de data e lugar que acompanham a foto, no formato que as ferramentas do computador conferem
   (app.js: foto de outro dia, foto a mais de 1 km). Vale o que veio gravado no arquivo; se o arquivo
   não trouxe, vale o relógio e o GPS do aparelho no momento da foto. */
function exifDaFoto(lido, gpsAparelho, quando){
 const ex=lido? Object.assign({}, lido) : {};
 if(!ex.data && quando){ ex.data=dataIso(quando); ex.hora=doisDig(quando.getHours())+':'+doisDig(quando.getMinutes())+':'+doisDig(quando.getSeconds()); ex.origemData='aparelho'; }
 if(ex.e===undefined && gpsAparelho){ ex.lat=gpsAparelho.lat; ex.lon=gpsAparelho.lon; ex.e=gpsAparelho.e; ex.n=gpsAparelho.n; ex.origemLocal='aparelho'; }
 return (ex.data || ex.e!==undefined)? ex : null;
}

/* Alertas de uma foto: tirada noutro dia, ou longe do local da vistoria */
function alertasFoto(v, f){
 const a=[]; const x=f && f.exif;
 if(x && x.data && v.dataVistoria && x.data!==v.dataVistoria) a.push({tipo:'data', texto:'Foto registrada em '+dataBrCampo(x.data)+', mas a vistoria é de '+dataBrCampo(v.dataVistoria)+'.'});
 const d=x? distanciaM(x, v.local) : null;
 if(d!==null && d>300) a.push({tipo:'local', texto:'Foto tirada a '+distanciaTexto(d)+' do local da vistoria.'});
 return a;
}

/* O que falta antes de concluir. bloqueia: impede; avisa: só lembra */
function pendenciasConcluir(v){
 const bloqueia=[], avisa=[];
 if(!v.dataVistoria) bloqueia.push('data da vistoria');
 if(!v.fotos.length) bloqueia.push('ao menos uma foto');
 if(!v.local) avisa.push('A posição do local não foi registrada (use "Usar minha posição GPS atual").');
 if(!String(v.expedienteNum||'').trim()) avisa.push('Sem número de protocolo.');
 const semLeg=v.fotos.map((f,i)=>String(f.legenda||'').trim()? 0 : i+1).filter(Boolean);
 if(semLeg.length) avisa.push('Foto(s) sem legenda: '+semLeg.join(', ')+'.');
 v.fotos.forEach((f,i)=>alertasFoto(v,f).forEach(al=>avisa.push('Foto '+(i+1)+': '+al.texto)));
 return {bloqueia:bloqueia, avisa:avisa};
}

function numeroOuNulo(t){ t=String(t===undefined||t===null?'':t).trim().replace(',','.'); if(!t) return null; const n=parseFloat(t); return isFinite(n)? n : null; }

/* ===== Vistoria → caso .json da ferramenta do computador =====
   As anotações de campo NÃO vão para o texto do documento: ficam em vistoriaCampo.anotacoes e a ferramenta do
   computador as mostra no quadro "Vistoria feita no celular", com o botão "Inserir na narrativa".
   fotosB64: [{data:'data:image/jpeg;base64,…', w, h}] na mesma ordem de v.fotos.
   Só preenche o que o campo sabe; o resto a ferramenta completa com os valores-padrão ao abrir (migrar). */
function paraDocumento(v, fotosB64, elaborador){
 const fotos=v.fotos.map((f,i)=>({data:(fotosB64[i]||{}).data||'', w:(fotosB64[i]||{}).w||f.w, h:(fotosB64[i]||{}).h||f.h, legenda:f.legenda||'', exif:f.exif||null}));
 const datas=[v.dataVistoria||''];
 const E=v.local? v.local.e.toFixed(2) : '', N=v.local? v.local.n.toFixed(2) : '';
 const s={versaoFormato:1, id:'campo-'+v.id, tipoDocumento:v.tipoDocumento, elaborador:elaborador||'', infrator:v.autuado||'',
          processo:'', data:v.dataVistoria||dataIso(), fiscal:'', memoriaCalculo:false,
          infracoes:[{}],                     // as ferramentas exigem a lista; {} vira uma infração em branco ao abrir
          revisao:{status:'em_elaboracao', notas:[], historico:[{acao:'vistoria feita no app de campo', autor:elaborador||'', papel:'elaborador', data:v.concluidaEm||new Date().toISOString()}], edicoes:[]},
          vistoriaCampo:{idCampo:v.id, protocolo:protocoloTexto(v), assunto:v.assunto, bairro:v.bairro, endereco:v.endereco,
                         hora:v.horaVistoria, local:v.local, anotacoes:v.anotacoes, concluidaEm:v.concluidaEm, demanda:v.demanda||null}};
 if(v.tipoDocumento==='relatorio'){
  s.rel={numero:'', datasVistoria:datas, dataVistoria:datas[0], endereco:[v.endereco, v.bairro].filter(Boolean).join(', '),
         local:[v.endereco, v.bairro].filter(Boolean).join(', '), coord:v.local? GEO.fmtUTM(v.local.e)+' E; '+GEO.fmtUTM(v.local.n)+' S' : '',
         descricao:'', fotos:fotos};
  if(v.expedienteNum) s.processo=protocoloTexto(v);
 } else if(v.tipoDocumento==='relatorio_simplificado'){
  s.simp={atividade:v.assunto||'', expedienteTipo:v.expedienteTipo, expedienteNum:v.expedienteNum, logradouro:v.endereco, numero:'', referencia:'',
          bairro:v.bairro, coordE:E, coordN:N, responsavel:v.autuado||'', doc:'', datasVistoria:datas, corpo:'', fotos:fotos};
 } else if(v.tipoDocumento==='termo_arquivamento'){
  s.arq={expedienteTipo:v.expedienteTipo==='Atendimento'? '1Doc' : v.expedienteTipo, expedienteNum:v.expedienteNum, datasVistoria:datas,
         coordE:E, coordN:N, corpo:'', fotos:fotos};
 } else if(v.tipoDocumento==='termo_ruido'){
  const R=v.ruido||{medicoes:[]};
  s.ruido={expedienteTipo:v.expedienteTipo, expedienteNum:v.expedienteNum, assunto:v.assunto||'Emissão de Ruídos', identificacao:v.autuado||'',
           logradouro:v.endereco, bairro:v.bairro, coordE:E, coordN:N, datasVistoria:datas, contexto:'', meteorologia:R.meteorologia||'',
           medicoes:(R.medicoes||[]).map(m=>({local:m.local||'', data:v.dataVistoria||'', horaIni:m.horaIni||'', horaFim:m.horaFim||'',
             coordE:E, coordN:N, distancia:'', minimo:numeroOuNulo(m.minimo), maximo:numeroOuNulo(m.maximo), media:null, leq:numeroOuNulo(m.leq),
             amostras:0, taxa:null, serie:null, grafico:null, arquivo:'', observacao:m.observacao||''})),
           fotos:fotos};
 }
 return s;
}

/* Fila de envio: concluídas que ainda não foram (ou que mudaram depois de ir) para a pasta */
function pendentesEnvio(lista){ return lista.filter(v=>v.status==='concluida' && v.precisaEnviar); }
/* Na pasta, um nome que já existe e é de outra vistoria vira "nome (2).json" */
function nomeComSufixo(nome, n){ return n<2? nome : nome.replace(/\.json$/i,'')+' ('+n+').json'; }
/* Caminho da pasta no servidor, sempre com "\\" e sem barra nas pontas */
function caminhoSmb(){ return Array.from(arguments).filter(Boolean).join('\\').replace(/\//g,'\\').replace(/\\{2,}/g,'\\').replace(/^\\|\\$/g,''); }
function ultimaParte(c){ const p=String(c||'').split('\\'); return p[p.length-1]||''; }

/* Nome do arquivo exportado: "Atend. 1399-2026 - vistoria 07-10-2026.json" */
function nomeArquivoVistoria(v){
 const abrev={Atendimento:'Atend.', Memorando:'Memo.', 'Ofício':'Of.', Protocolo:'Prot.', Processo:'Proc.'}[v.expedienteTipo]||v.expedienteTipo;
 const num=String(v.expedienteNum||'').replace(/[\/\\]/g,'-').replace(/[^\w\-.]+/g,'').replace(/\./g,'');
 const d=dataBrCampo(v.dataVistoria).replace(/\//g,'-');
 return (num? abrev+' '+num : 'Sem protocolo')+' - vistoria'+(d?' '+d:'')+'.json';
}

/* Saudação e datas por extenso para a tela inicial */
function saudacaoCampo(d){ const h=(d||new Date()).getHours(); return h<12? 'Bom dia' : h<18? 'Boa tarde' : 'Boa noite'; }
function hojeExtenso(d){ d=d||new Date(); const ds=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'], ms=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']; return ds[d.getDay()]+', '+d.getDate()+' de '+ms[d.getMonth()]; }
function quandoRelativo(iso, agora){
 if(!iso) return ''; agora=agora||new Date(); const d=new Date(iso); const dias=Math.round((new Date(dataIso(agora))-new Date(dataIso(d)))/864e5);
 if(dias<=0) return 'hoje às '+horaCurta(d); if(dias===1) return 'ontem'; return 'há '+dias+' dias';
}

/* ===== Documentos da pasta (lidos do servidor, só leitura) =====
   Mesmas regras das ferramentas do computador: estado em revisao.status, devoluções contadas no histórico,
   "no 1Doc" só para aprovado com revisao.postado1Doc e sem edição liberada. */
const ESTADOS_DOC = {em_elaboracao:'Em elaboração', aguardando_revisao:'Com o revisor', devolvido:'Devolvido', aprovado:'Aprovado'};
function expedienteDe(t, n, padrao){ n=String(n||'').trim(); return n? (t||padrao)+' '+n : ''; }
function resumoDocumento(o, caminho, modificado){
 if(!o || typeof o!=='object' || !Array.isArray(o.infracoes)) return null;           // não é caso das ferramentas
 const R=o.revisao||{}, H=Array.isArray(R.historico)? R.historico : [], N=Array.isArray(R.notas)? R.notas : [];
 const st=ESTADOS_DOC[R.status]? R.status : 'em_elaboracao';
 const B=o[{relatorio_simplificado:'simp', termo_arquivamento:'arq', termo_ruido:'ruido'}[o.tipoDocumento]||'rel']||{};   // pelo tipo: um termo pode ter sobra de "rel"
 let protocolo='', titulo='';
 if(o.tipoDocumento==='relatorio_simplificado'){ protocolo=expedienteDe(B.expedienteTipo, B.expedienteNum, 'Atendimento'); titulo=B.atividade||''; }
 else if(o.tipoDocumento==='termo_arquivamento'){ protocolo=expedienteDe(B.expedienteTipo, B.expedienteNum, '1Doc'); titulo=String(B.corpo||'').replace(/\s+/g,' ').slice(0,80); }
 else if(o.tipoDocumento==='termo_ruido'){ protocolo=expedienteDe(B.expedienteTipo, B.expedienteNum, 'Atendimento'); titulo=B.identificacao||B.assunto||''; }
 else { protocolo=o.processo || (o.rel&&o.rel.numero? 'Relatório nº '+o.rel.numero : ''); titulo=o.infrator||''; }
 const aberta=N.find(n=>!n.resolvida);
 const postado=(st==='aprovado' && R.postado1Doc && !R.edicaoLiberada)? R.postado1Doc : null;
 const ult=H.length? H[H.length-1] : null;
 const pasta=String(caminho||'').split(/[\\/]/).slice(0,-1).join('/');
 return {id:String(o.id||caminho), tipo:TIPOS_DOC[o.tipoDocumento]? o.tipoDocumento : 'relatorio', protocolo:protocolo, titulo:String(titulo||'').trim(),
  status:st, devolucoes:H.filter(x=>String(x.acao||'').indexOf('devolvido')===0).length, postado:postado,
  notasAbertas:N.filter(n=>!n.resolvida).length, notas:N.map(n=>({rotulo:n.rotulo||n.campo||'Geral', texto:String(n.texto||'').slice(0,600), autor:n.autor||'', data:n.data||'', resolvida:!!n.resolvida, resposta:String(n.resposta||'').slice(0,400)})),
  notaAberta:aberta? {rotulo:aberta.rotulo||'Apontamento', texto:String(aberta.texto||'').replace(/\s+/g,' ').slice(0,240), autor:aberta.autor||''} : null,
  historico:H.slice(-30).map(h=>({acao:String(h.acao||''), autor:h.autor||'', papel:h.papel||'', data:h.data||''})),
  ultimo:ult? {acao:String(ult.acao||''), autor:ult.autor||'', data:ult.data||''} : null,
  elaborador:o.elaborador||'', datas:(B.datasVistoria||[]).filter(Boolean), fotos:(B.fotos||[]).length,
  doCelular:!!o.vistoriaCampo && /(^|\/)VISTORIAS$/i.test(pasta), caminho:String(caminho||''), pasta:pasta, modificado:modificado||0};
}
/* Um caso pode estar em duas subpastas (cópia antiga): vale o arquivo mais novo */
function unirDocumentos(lista){ const m=new Map(); lista.filter(Boolean).forEach(d=>{ const a=m.get(d.id); if(!a || (d.modificado||0)>(a.modificado||0)) m.set(d.id, d); }); return [...m.values()]; }
/* Grupos da tela Documentos, na ordem de urgência */
function grupoDocumento(d){ if(d.postado) return 'postado'; if(d.status==='devolvido') return 'devolvido'; if(d.status==='aprovado') return 'aprovado'; if(d.status==='aguardando_revisao') return 'revisor'; return d.doCelular? 'celular' : 'elaboracao'; }
/* Data do último ato de um tipo ("encaminhado", "devolvido", "aprovado") */
function ultimoAtoDoc(d, acao){ for(let i=d.historico.length-1;i>=0;i--) if(d.historico[i].acao.indexOf(acao)>=0) return d.historico[i]; return null; }
/* Dias úteis (seg–sex) desde a data; feriados não entram nesta conta simples */
function diasUteisDesde(iso, agora){ if(!iso) return null; let d=new Date(iso), n=0; agora=agora||new Date(); d.setHours(0,0,0,0); const fim=new Date(agora); fim.setHours(0,0,0,0);
 while(d<fim){ d.setDate(d.getDate()+1); const w=d.getDay(); if(w!==0 && w!==6) n++; } return n; }

/* ===== Demandas da planilha (fase 1: só leitura) ===== */
/* "Atendimento 1.234/2026", "mem 17755/2024", "Protocolo 14.215/2025", "524/2025" → {tipo, num, chave} */
function parseProtocolo(texto){
 const t=String(texto||'').trim(), b=semAcentoModelo(t).toLowerCase();
 let tipo='Atendimento', suposto=false;
 if(/^\s*mem/.test(b)) tipo='Memorando'; else if(/^\s*prot/.test(b)) tipo='Protocolo'; else if(/^\s*of/.test(b)) tipo='Ofício'; else if(/^\s*proc/.test(b)) tipo='Processo';
 else if(!/^\s*at/.test(b)) suposto=true;
 const m=/(\d[\d.]*)\s*\/\s*(\d{4}|\d{2})(?!\d)/.exec(t), so=/(\d[\d.]*)/.exec(t);
 const num=m? m[1]+'/'+(m[2].length===2? '20'+m[2] : m[2]) : (so? so[1] : '');   // "2989/25" → 2989/2025
 return {tipo:tipo, num:num, suposto:suposto, chave:chaveProtocolo(num)};
}
function semAcentoModelo(t){ return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,''); }
/* Número sem pontos e sem zeros à esquerda, com o ano quando houver: "01.234/2026" → "1234/2026" */
function chaveProtocolo(texto){ const m=/(\d[\d.]*)\s*(?:\/\s*(\d{4}|\d{2})(?!\d))?/.exec(String(texto||'').replace(/\b1\s*doc\b/ig,' ')); /* o 1 de "1Doc" não é o número */ if(!m) return ''; const n=m[1].replace(/\./g,'').replace(/^0+(?=\d)/,''); return m[2]? n+'/'+(m[2].length===2? '20'+m[2] : m[2]) : n; }
/* O documento da pasta é desta demanda? Mesmo número e ano; documento sem ano casa só pelo número */
function mesmoProtocolo(chaveDemanda, textoDoc){
 const d=chaveProtocolo(textoDoc); if(!d || !chaveDemanda) return false;
 return d===chaveDemanda || (d.indexOf('/')<0 && chaveDemanda.split('/')[0]===d);
}
function dataBrParaIso(t){ const m=/(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(t||'')); return m? m[3]+'-'+doisDig(m[2])+'-'+doisDig(m[1]) : ''; }
function idDemanda(d){ return chaveProtocolo(d.protocolo)+'|'+(d.entrada||''); }
/* "Fiscalizado 01/07/2025 - Fiscalizado 19/09/2025" → a data mais recente */
function fiscalizadaEm(d){ const re=/fiscaliz\w*\s*(?:em\s*)?(\d{1,2}\/\d{1,2}\/\d{4})/gi; let m, ult=''; while((m=re.exec(String(d.diligencias||'')))) { const iso=dataBrParaIso(m[1]); if(iso>ult) ult=iso; } return ult; }
/* Endereço da planilha: "Centro - Rua Carlos João Gonçalves, 159" → bairro + endereço */
function separarEndereco(t){ t=String(t||'').trim(); const i=t.indexOf(' - '); return i>0? {bairro:t.slice(0,i).trim(), endereco:t.slice(i+3).trim()} : {bairro:t, endereco:''}; }
function vistoriaDaDemanda(d, tipoDocumento){
 const p=parseProtocolo(d.protocolo), e=separarEndereco(d.endereco);
 const v=novaVistoria({tipoDocumento:tipoDocumento||'relatorio', expedienteTipo:p.tipo, expedienteNum:p.num, assunto:d.assunto, bairro:e.bairro, endereco:e.endereco});
 v.demanda={id:idDemanda(d), linha:d.linha, protocolo:d.protocolo, entrada:d.entrada, repasse:d.repasse, diligencias:d.diligencias||''};
 return v;
}

/* ===== Correções do auxiliar no celular (documento devolvido) =====
   O rascunho guarda só o que o auxiliar mudou: {campos:{"simp.corpo":"…"}, notas:{id:{resposta, resolvida}}}.
   Na hora de encaminhar, ele é aplicado sobre o arquivo lido da pasta, pelas mesmas travas das ferramentas
   (caminhoDefinir: só campos que já existem, nunca anexos nem propriedades estranhas). */
/* base: o valor de cada campo/apontamento quando o auxiliar começou a mexer (para saber, na volta, se mais
   alguém mexeu); arquivo: data e tamanho do arquivo da pasta usado como ponto de partida */
function rascunhoVazio(){ return {campos:{}, notas:{}, base:{campos:{}, notas:{}}, arquivo:null, pendente:false, conflito:null}; }
function completarRascunho(r){ r=r||{}; r.campos=r.campos||{}; r.notas=r.notas||{}; r.base=r.base||{}; r.base.campos=r.base.campos||{}; r.base.notas=r.base.notas||{}; if(r.pendente===undefined) r.pendente=false; if(r.conflito===undefined) r.conflito=null; return r; }
/* Guarda o valor de partida na primeira vez que o campo ou o apontamento é mexido */
function marcarBaseCampo(rasc, doc, cam){ if(!Object.prototype.hasOwnProperty.call(rasc.base.campos, cam)){ const v=caminhoValor(doc, cam); rasc.base.campos[cam]=v===undefined? null : String(v); } }
function marcarBaseNota(rasc, doc, id){ if(!rasc.base.notas[id]){ const n=(((doc.revisao||{}).notas)||[]).find(x=>x.id===id)||{}; rasc.base.notas[id]={resposta:String(n.resposta||''), resolvida:!!n.resolvida}; } }

/* ===== Na volta para a rede: juntar as correções do celular com a versão que está na pasta =====
   Para cada campo mexido no celular, compara três valores: o de partida (base), o do celular e o da pasta agora.
   - pasta igual à base: ninguém mais mexeu → vale o do celular;
   - pasta igual ao celular: os dois fizeram a mesma coisa → nada a fazer;
   - pasta diferente dos dois: mexeram no computador também → CONFLITO, o auxiliar escolhe.
   Devolve {aplicar (rascunho só com o que entra sem conflito), conflitos[], status, reencaminhadoEm}. */
function mesclarCorrecoes(pasta, rasc){
 rasc=completarRascunho(rasc);
 const aplicar={campos:{}, notas:{}}, conflitos=[];
 const N=(((pasta.revisao||{}).notas)||[]);
 Object.keys(rasc.campos).forEach(cam=>{
  const cel=String(rasc.campos[cam]), v=caminhoValor(pasta, cam), atual=v===undefined? null : String(v);
  const temBase=Object.prototype.hasOwnProperty.call(rasc.base.campos, cam), base=temBase? rasc.base.campos[cam] : null;
  if(atual===null) { conflitos.push({tipo:'campo', chave:cam, base:base, celular:cel, pasta:null}); return; }
  if(atual===cel) return;
  if(temBase && atual===base) { aplicar.campos[cam]=cel; return; }     // sem valor de partida (rascunho antigo): na dúvida, pergunta
  conflitos.push({tipo:'campo', chave:cam, base:base, celular:cel, pasta:atual});
 });
 Object.keys(rasc.notas).forEach(id=>{
  const r=rasc.notas[id], n=N.find(x=>x.id===id); if(!n) return;            // apontamento apagado pelo revisor: não há o que aplicar
  const b=rasc.base.notas[id]||{resposta:String(n.resposta||''), resolvida:!!n.resolvida}, saida={};
  if(r.resposta!==undefined){ const cel=String(r.resposta), atual=String(n.resposta||'');
   if(atual!==cel){ if(atual===b.resposta) saida.resposta=cel; else conflitos.push({tipo:'resposta', chave:id, rotulo:n.rotulo||n.campo||'Apontamento', base:b.resposta, celular:cel, pasta:atual}); } }
  if(r.resolvida!==undefined && !!r.resolvida!==!!n.resolvida){
   if(!!n.resolvida===!!b.resolvida) saida.resolvida=!!r.resolvida;
   else conflitos.push({tipo:'resolvida', chave:id, rotulo:n.rotulo||n.campo||'Apontamento', base:b.resolvida, celular:!!r.resolvida, pasta:!!n.resolvida});
  }
  if(Object.keys(saida).length) aplicar.notas[id]=saida;
 });
 const H=(((pasta.revisao||{}).historico)||[]), ult=[...H].reverse().find(h=>String(h.acao||'').indexOf('encaminhado')===0);
 const desde=rasc.arquivo && rasc.arquivo.lidoEm || '';
 return {aplicar:aplicar, conflitos:conflitos, status:((pasta.revisao||{}).status)||'em_elaboracao',
         reencaminhadoEm:(ult && ult.data && ult.data>desde)? ult.data : '', reencaminhadoPor:(ult && ult.data && ult.data>desde)? (ult.autor||'')+(ult.origem? ' ('+ult.origem+')' : '') : ''};
}
/* Depois que o auxiliar escolheu em cada conflito: escolhas = {"campo|simp.corpo":"celular"|"pasta", "resposta|n1":…} */
function aplicarEscolhas(mescla, escolhas){
 const out={campos:Object.assign({}, mescla.aplicar.campos), notas:JSON.parse(JSON.stringify(mescla.aplicar.notas))};
 mescla.conflitos.forEach(c=>{ if((escolhas||{})[c.tipo+'|'+c.chave]!=='celular') return;
  if(c.tipo==='campo' && c.pasta!==null) out.campos[c.chave]=c.celular;
  else if(c.tipo==='resposta') (out.notas[c.chave]=out.notas[c.chave]||{}).resposta=c.celular;
  else if(c.tipo==='resolvida') (out.notas[c.chave]=out.notas[c.chave]||{}).resolvida=c.celular; });
 return out;
}
function aplicarCorrecoes(o, rasc){
 const falhas=[]; let mudou=0;
 Object.keys((rasc&&rasc.campos)||{}).forEach(cam=>{ const novo=String(rasc.campos[cam]); const antes=caminhoValor(o, cam);
  if(antes===undefined || String(antes)===novo) return; if(caminhoDefinir(o, cam, novo)) mudou++; else falhas.push(cam); });
 const N=((o.revisao||{}).notas)||[];
 Object.keys((rasc&&rasc.notas)||{}).forEach(id=>{ const n=N.find(x=>x.id===id), r=rasc.notas[id]; if(!n) return;
  if(r.resposta!==undefined && String(r.resposta)!==String(n.resposta||'')){ n.resposta=String(r.resposta); mudou++; }
  if(r.resolvida!==undefined && !!r.resolvida!==!!n.resolvida){ n.resolvida=!!r.resolvida; n.resolvidaEm=r.resolvida? new Date().toISOString() : null; mudou++; } });
 return {mudou:mudou, falhas:falhas};
}
/* O que as ferramentas do computador fazem ao encaminhar (app.js › encaminharRevisao), mais a origem */
function encaminharDoc(o){
 if(!o.revisao || typeof o.revisao!=='object') o.revisao={status:'em_elaboracao', notas:[], historico:[], edicoes:[]};
 const R=o.revisao; if(!Array.isArray(R.historico)) R.historico=[];
 const statusAnterior=R.status||'em_elaboracao';
 R.status='aguardando_revisao'; delete R.edicaoLiberada; delete R.postado1Doc;
 R.historico.push({acao:'encaminhado para revisão', autor:o.elaborador||'', papel:'elaborador', statusAnterior:statusAnterior, data:new Date().toISOString(), origem:'app de campo'});
 o.encaminhadoEm=new Date().toISOString(); o.versaoFormato=1;
 R.hashConteudo=hashConteudo(o);
 return o;
}
/* Antes de encaminhar: o que impede e o que só lembra (como o quadro de conferência do computador) */
function conferirReencaminhar(o, rasc){
 const bloqueia=[], avisa=[];
 if(!String(o.elaborador||'').trim()) bloqueia.push('o documento não tem "Elaborado por" (preencha no computador)');
 if(((o.revisao||{}).status)==='aprovado') bloqueia.push('o documento já está aprovado');
 const N=((o.revisao||{}).notas)||[];
 const abertas=N.filter(n=>{ const r=(rasc&&rasc.notas||{})[n.id]; return !(r && r.resolvida!==undefined? r.resolvida : n.resolvida); });
 if(abertas.length) avisa.push(abertas.length+' apontamento'+(abertas.length>1?'s':'')+' sem marcar como resolvido: '+abertas.map(n=>n.rotulo||n.campo||'geral').join(', ')+'.');
 return {bloqueia:bloqueia, avisa:avisa};
}

if(typeof module!=='undefined') module.exports={mesclarCorrecoes, aplicarEscolhas, completarRascunho, parseProtocolo, chaveProtocolo, mesmoProtocolo, idDemanda, fiscalizadaEm, separarEndereco, vistoriaDaDemanda, resumoDocumento, unirDocumentos, grupoDocumento, diasUteisDesde, pendentesEnvio, nomeComSufixo, caminhoSmb, ultimaParte, novaVistoria, iniciarVistoria, posicaoDe, exifDaFoto, alertasFoto, pendenciasConcluir, paraDocumento, nomeArquivoVistoria, protocoloTexto};

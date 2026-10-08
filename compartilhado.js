/* Copiado de src/app.js e src-painel/edicao-revisor.js por src-app/build.py — não editar aqui */
function hashConteudo(s){
 const o={elaborador:s.elaborador, infrator:s.infrator, processo:s.processo, fiscal:s.fiscal, data:s.data, rel:s.rel, emb:s.emb, simp:s.simp, arq:s.arq, ruido:s.ruido, anexos:(s.anexos||[]).map(a=>a.nome+'|'+a.tamanho+'|'+a.descricao), infracoes:s.infracoes, memoriaCalculo:s.memoriaCalculo};
 const t=JSON.stringify(o); let h=5381; for(let i=0;i<t.length;i++) h=((h<<5)+h+t.charCodeAt(i))|0; return (h>>>0).toString(36)+'-'+t.length;
}
function caminhoValor(o, cam){
 const p=String(cam||'').split('.'); let x=o;
 for(const k of p){ if(x===null || typeof x!=='object') return undefined; x=x[k]; }
 return x;
}
/* Só os blocos do documento, só chaves próprias, nunca 'length' nem propriedade herdada: o caminho pode
   chegar de um .json da pasta de rede, e "caminho":"anexos" apagaria os PDFs do caso inteiro. */
const PROFUNDIDADE_PASTA = 4;      // níveis de subpasta que os dois painéis varrem (a mesma regra nos dois)
const CAMINHO_RAIZES = ['rel','emb','simp','arq','ruido','infracoes'];
/* Três campos de topo que a tela de revisão oferece para correção direta (CAMPOS_EDICAO): sem eles aqui,
   corrigir o nome do autuado, o expediente ou os fiscais era descartado em silêncio. 'anexos' segue de fora. */
const CAMINHO_TOPO = ['infrator','processo','fiscal'];
/* criarUltima: só o Painel do Revisor usa, com caminhos da sua lista fixa de campos (camposDoBloco) — nunca com caminho lido do arquivo */
function caminhoDefinir(o, cam, v, criarUltima){
 const p=String(cam||'').split('.');
 if(p.length===1){ if(CAMINHO_TOPO.indexOf(p[0])<0) return false; }
 else if(CAMINHO_RAIZES.indexOf(p[0])<0) return false;
 if(p.some(k=>k==='__proto__'||k==='constructor'||k==='prototype'||k==='length')) return false;
 const propria=(x,k)=>x!==null && typeof x==='object' && Object.prototype.hasOwnProperty.call(x,k);
 let x=o;
 for(let i=0;i<p.length-1;i++){ if(!propria(x,p[i])) return false; x=x[p[i]]; }
 const ult=p[p.length-1];
 if(!propria(x,ult) && !(criarUltima && x!==null && typeof x==='object' && !Array.isArray(x) && typeof v==='string')) return false;
 x[ult]=v; return true;
}
const CAMPOS_EDICAO = {
 relatorio: {
  identificacao:[{c:'rel.numero', r:'Relatório nº', t:'linha'}, {c:'processo', r:'Processo', t:'linha'}, {c:'fiscal', r:'Fiscais responsáveis', t:'linha'}],
  infrator:[{c:'infrator', r:'Nome / razão social', t:'linha'}, {c:'rel.doc', r:'CPF/CNPJ', t:'linha'}, {c:'rel.endereco', r:'Endereço', t:'linha'}, {c:'rel.telefone', r:'Telefone', t:'linha'}, {c:'rel.email', r:'E-mail', t:'linha'}],
  descricao:[{c:'rel.local', r:'Localização', t:'linha'}, {c:'rel.coord', r:'Coordenadas', t:'linha'}, {c:'rel.descricao', r:'Descrição da infração e autoria', t:'texto'}],
  outras:[{c:'rel.outras', r:'Outras informações', t:'texto'}],
  conclusao:[{c:'rel.conclusao', r:'Conclusão', t:'texto'}],
  embargo:[{c:'emb.numero', r:'Nº do relatório de embargo', t:'linha'}, {c:'emb.numeroAuto', r:'Auto de embargo', t:'linha'}, {c:'emb.area', r:'Área', t:'linha'}, {c:'emb.fundamentacao', r:'Fundamentação do embargo', t:'texto'}]
 },
 relatorio_simplificado: {
  identificacao:[{c:'simp.expedienteNum', r:'Nº do expediente', t:'linha'}, {c:'simp.atividade', r:'Atividade / ocorrência', t:'linha'}, {c:'fiscal', r:'Responsáveis pela vistoria', t:'linha'}],
  localizacao:[{c:'simp.logradouro', r:'Logradouro', t:'linha'}, {c:'simp.numero', r:'Número', t:'linha'}, {c:'simp.referencia', r:'Ponto de referência', t:'linha'}, {c:'simp.bairro', r:'Bairro', t:'linha'}, {c:'simp.coordE', r:'Coordenada E', t:'linha'}, {c:'simp.coordN', r:'Coordenada N', t:'linha'}],
  responsavel:[{c:'simp.responsavel', r:'Nome do responsável', t:'linha'}, {c:'simp.doc', r:'CPF/CNPJ', t:'linha'}],
  narrativa:[{c:'simp.corpo', r:'Narrativa da vistoria', t:'texto'}],
  desfecho:[{c:'simp.desfecho', r:'Desfecho', t:'texto'}]
 },
 termo_ruido: {
  identificacao:[{c:'ruido.numero', r:'Nº do termo', t:'linha'}, {c:'ruido.expedienteNum', r:'Nº do expediente', t:'linha'}, {c:'ruido.origem', r:'Órgão de origem', t:'linha'}, {c:'ruido.assunto', r:'Assunto', t:'linha'}, {c:'fiscal', r:'Fiscais responsáveis', t:'linha'}],
  objeto:[{c:'ruido.identificacao', r:'Identificação do objeto', t:'linha'}, {c:'ruido.logradouro', r:'Logradouro', t:'linha'}, {c:'ruido.numeroEnd', r:'Número', t:'linha'}, {c:'ruido.bairro', r:'Bairro', t:'linha'}, {c:'ruido.coordE', r:'Coordenada E', t:'linha'}, {c:'ruido.coordN', r:'Coordenada N', t:'linha'}, {c:'ruido.objeto', r:'Fonte verificada', t:'linha'}, {c:'ruido.contexto', r:'Contexto e diligências', t:'texto'}],
  limites:[{c:'ruido.zona', r:'Zona de uso (Tabela I)', t:'opcoes'}, {c:'ruido.zonaNome', r:'Nome da zona no Plano Diretor', t:'linha'}, {c:'ruido.area', r:'Tipo de área (NBR 10151)', t:'opcoes'}, {c:'ruido.meteorologia', r:'Condições meteorológicas', t:'linha'}, {c:'ruido.condicoesExtra', r:'Acréscimo às condições', t:'texto'}],
  conclusao:[{c:'ruido.conclusaoExtra', r:'Acréscimo à conclusão', t:'texto'}]
 },
 termo_arquivamento: {
  identificacao:[{c:'arq.expedienteNum', r:'1Doc n.º', t:'linha'}, {c:'arq.dataTermo', r:'Data do termo (AAAA-MM-DD)', t:'linha'}, {c:'arq.coordE', r:'Coordenada E', t:'linha'}, {c:'arq.coordN', r:'Coordenada N', t:'linha'}],
  narrativa:[{c:'arq.corpo', r:'Descrição do fato', t:'texto'}],
  desfecho:[{c:'arq.desfecho', r:'Alternativa marcada', t:'opcoes'}]
 }
};
/* opções fechadas (o revisor escolhe, não digita) */
function opcoesDoCampo(cam){
 if(cam==='arq.desfecho' && typeof DESFECHOS_ARQ!=='undefined') return [{v:'', r:'— nenhuma —'}].concat(DESFECHOS_ARQ.map(d=>({v:d.id, r:d.texto})));
 if(cam==='ruido.zona' && typeof ZONAS_LC11!=='undefined') return [{v:'', r:'— nenhuma —'}].concat(ZONAS_LC11.map(z=>({v:z.id, r:z.nome})));
 if(cam==='ruido.area' && typeof AREAS_NBR!=='undefined') return [{v:'', r:'— nenhuma —'}].concat(AREAS_NBR.map(a=>({v:a, r:a})));
 return [];
}
/* Blocos que dependem do conteúdo (uma infração, uma foto) entram aqui */
function camposDoBloco(o, id){
 const fixos=(CAMPOS_EDICAO[o.tipoDocumento]||{})[id];
 if(fixos) return fixos.filter(f=>caminhoValor(o, f.c)!==undefined);
 const mi=/^inf(\d+)-enq$/.exec(id);
 if(mi){ const i=+mi[1]; if(!(o.infracoes||[])[i]) return [];
  return [{c:'infracoes.'+i+'.dispositivo', r:'Dispositivo', t:'linha'}, {c:'infracoes.'+i+'.dano', r:'Dano / infração identificado(a)', t:'texto'}, {c:'infracoes.'+i+'.tituloRel', r:'Título no relatório', t:'linha'}];
 }
 if(id==='fotos'){
  const bloco=['rel','simp','arq','ruido'].find(k=>o[k] && Array.isArray(o[k].fotos) && o[k].fotos.length);
  if(!bloco) return [];
  return o[bloco].fotos.map((f,i)=>({c:bloco+'.fotos.'+i+'.legenda', r:'Legenda da foto '+(i+1), t:'linha'}));
 }
 return [];
}
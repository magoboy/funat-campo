/* ===== Rota do itinerário (0.9.0) =====
   Ideias do RotaFácil (github.com/kfn-d0/RotaFacil, de kfn-d0): coordenadas tiradas de links do Google Maps,
   rota otimizada pelo OSRM e exportação para o Google Maps. Aqui reescrito para o app de campo:
   - a matriz de distâncias vem do OSRM (pelas ruas) quando há internet, ou da linha reta × 1,3 sem internet;
   - a ordem é calculada no próprio aparelho: exata até 12 paradas (Held-Karp), vizinho mais próximo + 2-opt acima;
   - dá para fixar a primeira parada.
   Só funções puras (sem tela, sem rede): testadas em testes-app.js. */

/* ---------- link do Google Maps → coordenada ---------- */
function extrairCoordenadas(texto){
 const t=String(texto||'').trim(); if(!t) return null;
 const num='(-?\\d{1,3}(?:\\.\\d+)?)';
 const padroes=[
  new RegExp('!3d'+num+'!4d'+num),                                   // o alfinete do lugar (mais exato que o centro da tela)
  new RegExp('[?&](?:q|query|ll|destination|daddr|center)='+num+'\\s*(?:,|%2C)\\s*'+num, 'i'),
  new RegExp('/place/'+num+','+num),
  new RegExp('@'+num+','+num),                                       // centro da tela
  new RegExp('^geo:'+num+','+num, 'i'),
  new RegExp('/dir/[^?]*?'+num+','+num),
  new RegExp('^'+num+'\\s*[,;\\s]\\s*'+num+'$')                       // "-28.48, -49.01" digitado
 ];
 for(const re of padroes){ const m=re.exec(t); if(m){ const lat=parseFloat(m[1]), lng=parseFloat(m[2]);
  if(isFinite(lat) && isFinite(lng) && Math.abs(lat)<=90 && Math.abs(lng)<=180 && !(lat===0 && lng===0)) return {lat:lat, lng:lng}; } }
 return null;
}

/* ---------- distâncias ---------- */
function distanciaGeo(a, b){
 const R=6371008.8, r=Math.PI/180, dLat=(b.lat-a.lat)*r, dLng=(b.lng-a.lng)*r;
 const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLng/2)**2;
 return 2*R*Math.asin(Math.min(1, Math.sqrt(h)));
}
/* Sem internet: linha reta × 1,3 (média das ruas na cidade) e 25 km/h */
const FATOR_RUA=1.3, VELOCIDADE_MS=25/3.6;
function matrizLinhaReta(pts){
 const n=pts.length, dist=[], dur=[];
 for(let i=0;i<n;i++){ dist.push([]); dur.push([]); for(let j=0;j<n;j++){ const d=i===j? 0 : distanciaGeo(pts[i], pts[j])*FATOR_RUA; dist[i].push(d); dur[i].push(d/VELOCIDADE_MS); } }
 return {dist:dist, dur:dur, fonte:'linha_reta'};
}

/* ---------- a melhor ordem (o "caixeiro-viajante") ----------
   Nó 0 é a FUNAT (sai e volta); 1..n são as paradas. custo[i][j] pode ser assimétrico (ruas de mão única).
   op.primeiro: parada (1..n) que tem de ser a primeira. Devolve a ordem das paradas (sem a FUNAT). */
function custoDaOrdem(custo, ordem){ let c=0, ant=0; for(const k of ordem){ c+=custo[ant][k]; ant=k; } return c+custo[ant][0]; }
function resolverOrdem(custo, op){
 op=op||{}; const n=custo.length-1; if(n<=0) return [];
 const fixo=op.primeiro>=1 && op.primeiro<=n? op.primeiro : 0;
 if(n===1) return [1];
 if(n<=12) return heldKarp(custo, n, fixo);
 return doisOpt(custo, vizinhoMaisProximo(custo, n, fixo), fixo);
}
function heldKarp(custo, n, fixo){
 const M=1<<n, INF=1e18, dp=new Float64Array(M*n).fill(INF), pai=new Int16Array(M*n).fill(-1);
 for(let j=0;j<n;j++) if(!fixo || j===fixo-1) dp[(1<<j)*n+j]=custo[0][j+1];
 for(let mask=1; mask<M; mask++){
  if(fixo && !(mask&(1<<(fixo-1)))) continue;
  for(let j=0;j<n;j++){ const v=dp[mask*n+j]; if(v>=INF || !(mask&(1<<j))) continue;
   for(let k=0;k<n;k++){ if(mask&(1<<k)) continue; const nm=mask|(1<<k), c=v+custo[j+1][k+1]; if(c<dp[nm*n+k]){ dp[nm*n+k]=c; pai[nm*n+k]=j; } } }
 }
 let melhor=INF, fim=-1; const tudo=M-1;
 for(let j=0;j<n;j++){ const c=dp[tudo*n+j]+custo[j+1][0]; if(c<melhor){ melhor=c; fim=j; } }
 const ordem=[]; let mask=tudo, j=fim;
 while(j>=0){ ordem.push(j+1); const p=pai[mask*n+j]; mask&=~(1<<j); j=p; }
 return ordem.reverse();
}
function vizinhoMaisProximo(custo, n, fixo){
 const usado=new Array(n+1).fill(false), ordem=[]; let atual=0;
 if(fixo){ ordem.push(fixo); usado[fixo]=true; atual=fixo; }
 while(ordem.length<n){ let m=-1, mc=Infinity; for(let k=1;k<=n;k++) if(!usado[k] && custo[atual][k]<mc){ mc=custo[atual][k]; m=k; } usado[m]=true; ordem.push(m); atual=m; }
 return ordem;
}
function doisOpt(custo, ordem, fixo){
 let melhor=ordem.slice(), mc=custoDaOrdem(custo, melhor), mudou=true, voltas=0;
 const ini=fixo? 1 : 0;
 while(mudou && voltas++<50){ mudou=false;
  for(let i=ini;i<melhor.length-1;i++) for(let k=i+1;k<melhor.length;k++){
   const nova=melhor.slice(0,i).concat(melhor.slice(i,k+1).reverse(), melhor.slice(k+1)), c=custoDaOrdem(custo, nova);
   if(c<mc-1e-6){ melhor=nova; mc=c; mudou=true; } } }
 return melhor;
}

/* ---------- trechos, horários e o link para o Google Maps ---------- */
function trechosDaOrdem(mat, ordem){
 const out=[]; let ant=0;
 for(const k of ordem.concat([0])){ out.push({de:ant, para:k, dist:mat.dist[ant][k], dur:mat.dur[ant][k]}); ant=k; }
 return out;
}
/* inicio em minutos desde 0h; cada vistoria leva minVistoria; devolve {chegada, saida} de cada parada e a volta */
function horariosDaRota(trechos, inicio, minVistoria){
 let t=inicio; const paradas=[];
 trechos.forEach((tr,i)=>{ t+=tr.dur/60; if(i<trechos.length-1){ paradas.push({chegada:Math.round(t), saida:Math.round(t+minVistoria)}); t+=minVistoria; } });
 return {paradas:paradas, retorno:Math.round(t)};
}
const horaMin=m=>String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(Math.round(m%60)).padStart(2,'0');
/* O Google Maps aceita poucas paradas de uma vez: a rota vai em trechos de até porTrecho paradas */
function urlsGoogleMaps(base, pontos, porTrecho){
 porTrecho=porTrecho||8; const p=c=>c.lat.toFixed(6)+','+c.lng.toFixed(6), urls=[];
 const seq=[base].concat(pontos, [base]);
 for(let i=0; i<seq.length-1; i+=porTrecho+1){
  const fim=Math.min(i+porTrecho+1, seq.length-1), meio=seq.slice(i+1, fim);
  urls.push('https://www.google.com/maps/dir/?api=1&origin='+p(seq[i])+'&destination='+p(seq[fim])+(meio.length? '&waypoints='+meio.map(p).join('%7C') : '')+'&travelmode=driving');
 }
 return urls;
}
const kmTxt=m=>m>=1000? (m/1000).toFixed(m>=10000? 0 : 1).replace('.',',')+' km' : Math.round(m/50)*50+' m';
const duracaoTxt=s=>{ const m=Math.round(s/60); return m>=60? Math.floor(m/60)+'h'+(m%60? String(m%60).padStart(2,'0') : '') : m+' min'; };

if(typeof module!=='undefined') module.exports={extrairCoordenadas, distanciaGeo, matrizLinhaReta, resolverOrdem, custoDaOrdem, trechosDaOrdem, horariosDaRota, urlsGoogleMaps, horaMin, kmTxt, duracaoTxt};

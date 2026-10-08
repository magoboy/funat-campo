/* ===== Coordenadas: graus decimais / GMS → UTM (SIRGAS 2000, fuso 22 S) e área/perímetro da poligonal =====
   Fórmulas de projeção transversa de Mercator (série clássica, precisão de centímetros dentro do fuso). */
const GEO={
 a:6378137.0, f:1/298.257222101, k0:0.9996, fuso:22,
 /* "28°28'45,3\"S", "28 28 45.3 S", "-28.4792", "28,4792 S" → graus decimais (negativo para S/W) */
 paraDecimal:function(txt){
  if(txt===null||txt===undefined) return NaN; let t=String(txt).trim().toUpperCase().replace(/,/g,'.');
  if(!t) return NaN; const hemi=/[SWO]\s*$|^\s*[SWO]/.test(t)?-1:1; t=t.replace(/[NSEWO]/g,' ');
  const nums=t.match(/-?\d+(\.\d+)?/g); if(!nums) return NaN;
  const neg=nums[0].startsWith('-')?-1:1; const g=Math.abs(parseFloat(nums[0])), m=nums[1]?parseFloat(nums[1]):0, s=nums[2]?parseFloat(nums[2]):0;
  return neg*hemi*(g+m/60+s/3600);
 },
 /* lat/lon em graus decimais → {este, norte} no fuso 22 S (meridiano central −51°) */
 paraUTM:function(lat, lon, fuso){
  fuso=fuso||this.fuso; const a=this.a, f=this.f, k0=this.k0, e2=2*f-f*f, ep2=e2/(1-e2);
  const phi=lat*Math.PI/180, lam=lon*Math.PI/180, lam0=((fuso-1)*6-180+3)*Math.PI/180;
  const N=a/Math.sqrt(1-e2*Math.sin(phi)**2), T=Math.tan(phi)**2, C=ep2*Math.cos(phi)**2, A=Math.cos(phi)*(lam-lam0);
  const M=a*((1-e2/4-3*e2*e2/64-5*e2**3/256)*phi-(3*e2/8+3*e2*e2/32+45*e2**3/1024)*Math.sin(2*phi)+(15*e2*e2/256+45*e2**3/1024)*Math.sin(4*phi)-(35*e2**3/3072)*Math.sin(6*phi));
  const x=k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T*T+72*C-58*ep2)*A**5/120);
  const y=k0*(M+N*Math.tan(phi)*(A*A/2+(5-T+9*C+4*C*C)*A**4/24+(61-58*T+T*T+600*C-330*ep2)*A**6/720));
  return {este:500000+x, norte:(lat<0?10000000:0)+y};
 },
 /* inverso: {este, norte} (hemisfério sul) → lat/lon em graus decimais */
 paraGeo:function(este, norte, fuso){
  fuso=fuso||this.fuso; const a=this.a, f=this.f, k0=this.k0, e2=2*f-f*f, ep2=e2/(1-e2), e1=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2));
  const x=este-500000, y=norte-10000000, lam0=((fuso-1)*6-180+3)*Math.PI/180;
  const M=y/k0, mu=M/(a*(1-e2/4-3*e2*e2/64-5*e2**3/256));
  const phi1=mu+(3*e1/2-27*e1**3/32)*Math.sin(2*mu)+(21*e1*e1/16-55*e1**4/32)*Math.sin(4*mu)+(151*e1**3/96)*Math.sin(6*mu);
  const N1=a/Math.sqrt(1-e2*Math.sin(phi1)**2), T1=Math.tan(phi1)**2, C1=ep2*Math.cos(phi1)**2, R1=a*(1-e2)/Math.pow(1-e2*Math.sin(phi1)**2,1.5), D=x/(N1*k0);
  const lat=phi1-(N1*Math.tan(phi1)/R1)*(D*D/2-(5+3*T1+10*C1-4*C1*C1-9*ep2)*D**4/24+(61+90*T1+298*C1+45*T1*T1-252*ep2-3*C1*C1)*D**6/720);
  const lon=lam0+(D-(1+2*T1+C1)*D**3/6+(5-2*C1+28*T1-3*C1*C1+8*ep2+24*T1*T1)*D**5/120)/Math.cos(phi1);
  return {lat:lat*180/Math.PI, lon:lon*180/Math.PI};
 },
 gms:function(dd, lat){ const h=lat?(dd<0?'S':'N'):(dd<0?'W':'E'); dd=Math.abs(dd); const g=Math.floor(dd), m=Math.floor((dd-g)*60), s=((dd-g)*60-m)*60; return g+'°'+String(m).padStart(2,'0')+"'"+s.toFixed(1).replace('.',',')+'"'+h; },
 /* área (m²) e perímetro (m) pela fórmula de Gauss (shoelace) sobre vértices UTM {e, n} */
 poligonal:function(vs){
  const p=vs.map(v=>({x:GEO.numUTM(v.e), y:GEO.numUTM(v.n)})).filter(v=>!isNaN(v.x)&&!isNaN(v.y)); if(p.length<3) return null;
  let s=0, per=0; for(let i=0;i<p.length;i++){ const j=(i+1)%p.length; s+=p[i].x*p[j].y-p[j].x*p[i].y; per+=Math.hypot(p[j].x-p[i].x, p[j].y-p[i].y); }
  return {area:Math.abs(s)/2, perimetro:per, vertices:p.length};
 },
 numUTM:function(t){ t=String(t===undefined||t===null?'':t).trim().replace(/\s*m$/i,''); if(!t) return NaN; if(t.includes(',')) t=t.replace(/\./g,'').replace(',','.'); else if(/^\d{1,3}(\.\d{3})+$/.test(t)) t=t.replace(/\./g,''); return parseFloat(t); },
 fmtUTM:function(v){ return v.toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2}); }
};

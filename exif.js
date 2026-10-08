/* Copiado de src/ui-comum.js por src-app/build.py — não editar aqui */
/* ===== Data, hora e local gravados na foto pelo celular (EXIF) =====
   A foto é reduzida num canvas, e o canvas descarta o EXIF: por isso ele é lido do arquivo original, antes.
   Só JPEG traz esses dados; foto que passou pelo WhatsApp chega sem eles. Nada sai do computador. */
function lerExif(buf){
 try{
  const v=new DataView(buf); if(v.byteLength<12 || v.getUint16(0)!==0xFFD8) return null;
  let p=2;
  while(p+4<=v.byteLength){
   if(v.getUint8(p)!==0xFF) return null;
   const mk=v.getUint8(p+1);
   if(mk===0xDA || mk===0xD9) return null;                         // começou a imagem: não havia EXIF
   const len=v.getUint16(p+2);
   if(mk===0xE1 && len>8 && v.getUint32(p+4)===0x45786966 && v.getUint16(p+8)===0) return lerTiffExif(v, p+10, len-8);
   p+=2+len;
  }
 }catch(e){}
 return null;
}
function lerTiffExif(v, t0, tam){
 const le=v.getUint16(t0)===0x4949;                               // "II" = little-endian; "MM" = big-endian
 const fim=Math.min(v.byteLength-t0, tam);
 const u16=o=>v.getUint16(t0+o, le), u32=o=>v.getUint32(t0+o, le);
 if(fim<8 || u16(2)!==42) return null;
 const ifd=off=>{ const out={}; if(off<8 || off+2>fim) return out; const n=u16(off);
  for(let i=0;i<n && off+2+i*12+12<=fim;i++){ const e=off+2+i*12; out[u16(e)]={tipo:u16(e+2), n:u32(e+4), campo:e+8}; } return out; };
 const texto=en=>{ if(!en || en.tipo!==2) return ''; const off=en.n<=4? en.campo : u32(en.campo); let s='';
  for(let i=0;i<en.n && off+i<fim;i++){ const c=v.getUint8(t0+off+i); if(!c) break; s+=String.fromCharCode(c); } return s; };
 const racionais=en=>{ if(!en || en.tipo!==5) return null; const off=u32(en.campo), r=[];
  for(let i=0;i<en.n;i++){ const o=off+i*8; if(o+8>fim) return null; const d=u32(o+4); r.push(d? u32(o)/d : NaN); } return r; };
 const ifd0=ifd(u32(4)), out={};
 let dt='';
 if(ifd0[0x8769]){ const ex=ifd(u32(ifd0[0x8769].campo)); dt=texto(ex[0x9003])||texto(ex[0x9004]); }   // quando foi tirada
 if(!dt) dt=texto(ifd0[0x0132]);
 const m=/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(dt);
 if(m && m[1]!=='0000'){ out.data=m[1]+'-'+m[2]+'-'+m[3]; out.hora=m[4]+':'+m[5]+':'+m[6]; }
 if(ifd0[0x8825]){
  const g=ifd(u32(ifd0[0x8825].campo)), la=racionais(g[2]), lo=racionais(g[4]);
  const ref=en=>en? texto(en).trim().toUpperCase() : '';
  if(la && lo && la.length===3 && lo.length===3){
   let lat=la[0]+la[1]/60+la[2]/3600, lon=lo[0]+lo[1]/60+lo[2]/3600;
   if(ref(g[1])==='S') lat=-lat; if(ref(g[3])==='W') lon=-lon;
   if(isFinite(lat) && isFinite(lon) && !(lat===0 && lon===0)){ out.lat=lat; out.lon=lon; }
  }
 }
 return (out.data || out.lat!==undefined)? out : null;
}
/* O que fica guardado na foto: data, hora e, havendo GPS, a posição já em UTM 22 S */
function dadosDaFoto(ex){
 if(!ex) return null;
 const d={data:ex.data||'', hora:ex.hora||''};
 if(ex.lat!==undefined && typeof GEO!=='undefined'){ const u=GEO.paraUTM(ex.lat, ex.lon); d.lat=+ex.lat.toFixed(6); d.lon=+ex.lon.toFixed(6); d.e=+u.este.toFixed(2); d.n=+u.norte.toFixed(2); }
 return (d.data || d.e!==undefined)? d : null;
}

// Local palettes; no remote fonts, brand assets or network requests are needed.
export const themes = [
  {id:'light',name:'Garden light',note:'Sage & warm white',bg:'#f7f8f4',panel:'#ffffff',accent:'#234f40'},
  {id:'dark',name:'Garden dark',note:'Forest after hours',bg:'#18241f',panel:'#202e27',accent:'#9cc691'},
  {id:'tesla',name:'Tesla',note:'Graphite & electric red',bg:'#f4f4f4',panel:'#ffffff',accent:'#c71c2c'},
  {id:'apple',name:'Apple',note:'Silver & clean blue',bg:'#f5f5f7',panel:'#ffffff',accent:'#0066cc'},
  {id:'microsoft',name:'Microsoft',note:'Fresh blue & four colours',bg:'#f0f6fc',panel:'#ffffff',accent:'#0067b8',swatches:['#f25022','#7fba00','#00a4ef','#ffb900']},
  {id:'google',name:'Google',note:'Bright, playful & colourful',bg:'#f8fafd',panel:'#ffffff',accent:'#1967d2',swatches:['#4285f4','#ea4335','#fbbc05','#34a853']},
  {id:'netflix',name:'Netflix',note:'Cinema black & red',bg:'#141414',panel:'#222222',accent:'#ff4952'},
  {id:'spotify',name:'Spotify',note:'Deep charcoal & vivid green',bg:'#121212',panel:'#202020',accent:'#1ed760'},
  {id:'amazon',name:'Amazon',note:'Warm orange & midnight blue',bg:'#f8f5ef',panel:'#ffffff',accent:'#995200',swatches:['#232f3e','#ff9900']},
  {id:'github',name:'GitHub',note:'Midnight & soft violet',bg:'#0d1117',panel:'#161b22',accent:'#c6adff'},
  {id:'data-phi',name:'Data-phi.ai',note:'Charcoal, mint & cyan',bg:'#101817',panel:'#1b2926',accent:'#08de87',swatches:['#08de87','#03e4e0','#0dd82f']},
  {id:'ocean',name:'Ocean',note:'Coastal blue & sea glass',bg:'#edf7fa',panel:'#ffffff',accent:'#08758b'},
  {id:'sunset',name:'Sunset',note:'Peach & terracotta',bg:'#fff3eb',panel:'#fffaf6',accent:'#a54129'},
  {id:'lavender',name:'Lavender',note:'Soft lilac & plum',bg:'#f6f0fc',panel:'#ffffff',accent:'#7544a2'}
];
export const defaultCustom={background:'#eef2ff',accent:'#5b43b5'};
const hex=c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c);
const rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
export const mix=(a,b,t)=>'#'+rgb(a).map((v,i)=>Math.round(v*(1-t)+rgb(b)[i]*t).toString(16).padStart(2,'0')).join('');
export function luminance(c){return rgb(c).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
export function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
const ink=c=>contrast(c,'#ffffff')>contrast(c,'#000000')?'#ffffff':'#000000';
export function normalizeSettings(value){
  const s=value&&typeof value==='object'?value:{},c=s.customTheme;
  return {theme:s.theme==='custom'||themes.some(t=>t.id===s.theme)?s.theme:'light',customTheme:{background:hex(c?.background)?c.background:defaultCustom.background,accent:hex(c?.accent)?c.accent:defaultCustom.accent},sound:s.sound===true,seen:s.seen===true};
}
export function themePalette(settings){
  const s=normalizeSettings(settings),custom=s.customTheme;
  const p=s.theme==='custom'?{id:'custom',name:'Custom',bg:custom.background,accent:custom.accent,panel:mix(custom.background,ink(custom.background)==='#ffffff'?'#000000':'#ffffff',ink(custom.background)==='#ffffff'?.10:.65)}:themes.find(t=>t.id===s.theme);
  const dark=ink(p.bg)==='#ffffff',text=ink(p.bg);let muted=mix(p.panel,text,.74);
  for(let i=0;i<32&&(contrast(muted,p.panel)<4.5||contrast(muted,p.bg)<4.5);i++)muted=mix(muted,text,.15);
  if(contrast(muted,p.panel)<4.5||contrast(muted,p.bg)<4.5)muted=text;
  // Accent colours may be arbitrary in Custom. Links use an adjusted colour
  // while buttons retain the selected colour with contrasting button text.
  let link=p.accent;for(let i=0;i<16&&(contrast(link,p.panel)<4.5||contrast(link,p.bg)<4.5);i++)link=mix(link,text,.15);
  if(contrast(link,p.panel)<4.5||contrast(link,p.bg)<4.5)link=text;
  return {...p,dark,vars:{'--bg':p.bg,'--panel':p.panel,'--text':text,'--muted':muted,'--line':mix(p.panel,text,.19),'--green':link,'--accent':p.accent,'--on-accent':ink(p.accent),'--soft':mix(p.panel,p.accent,.10),'--hero':p.accent,'--shadow':`0 6px 24px ${dark?'#00000025':'#172c3310'}`}};
}
export function applyTheme(settings){const p=themePalette(settings),root=document.documentElement;root.dataset.theme=p.dark?'dark':'light';root.dataset.palette=p.id;root.style.colorScheme=p.dark?'dark':'light';for(const [key,value] of Object.entries(p.vars))root.style.setProperty(key,value);document.querySelector('meta[name="theme-color"]')?.setAttribute('content',p.bg);}
export function nextTheme(id){const i=themes.findIndex(t=>t.id===id);return themes[(i+1)%themes.length].id;}

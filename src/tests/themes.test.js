import {it,expect} from 'vitest';
import {themes,normalizeSettings,themePalette,contrast,nextTheme,defaultCustom} from '../lib/themes';
it('preserves existing light/dark settings and safely restores custom themes',()=>{
  expect(normalizeSettings({theme:'dark',sound:true}).theme).toBe('dark');
  expect(normalizeSettings({theme:'tesla'}).theme).toBe('tesla');
  expect(normalizeSettings({theme:'unknown'}).theme).toBe('light');
  const custom=normalizeSettings({theme:'custom',customTheme:{background:'#181818',accent:'#00ff99'}});expect(normalizeSettings(JSON.parse(JSON.stringify(custom)))).toEqual(custom);
  expect(normalizeSettings({theme:'custom',customTheme:{background:'url(bad)',accent:'red;display:none'}}).customTheme).toEqual(defaultCustom);
});
it('every preset and extreme custom colour has readable text, links and buttons',()=>{
  const choices=[...themes.map(t=>({theme:t.id})),...['#000000','#ffffff','#888888','#747474','#757575','#767676','#ff0000','#00ff00','#0000ff'].flatMap(background=>['#000000','#ffffff','#ffcc00','#ff00ff'].map(accent=>({theme:'custom',customTheme:{background,accent}})))];
  for(const settings of choices){const p=themePalette(settings),v=p.vars;expect(contrast(v['--text'],p.panel)).toBeGreaterThanOrEqual(4.5);expect(contrast(v['--text'],p.bg)).toBeGreaterThanOrEqual(4.5);expect(contrast(v['--on-accent'],p.accent)).toBeGreaterThanOrEqual(4.5);expect(contrast(v['--green'],p.panel)).toBeGreaterThanOrEqual(4.5);expect(contrast(v['--muted'],p.bg)).toBeGreaterThanOrEqual(4.5);expect(contrast(v['--muted'],p.panel)).toBeGreaterThanOrEqual(4.5);}
});
it('quick cycling reaches every preset and wraps back to light',()=>{let id='light';const seen=[];for(let i=0;i<themes.length;i++){seen.push(id);id=nextTheme(id);}expect(new Set(seen).size).toBe(themes.length);expect(id).toBe('light');expect(nextTheme('custom')).toBe('light');});

it('every palette has six distinct visible colours and custom preserves all six controls',()=>{for(const t of themes){const p=themePalette({theme:t.id});expect(p.colors).toHaveLength(6);expect(new Set(p.colors).size,t.id).toBe(6);}const s=normalizeSettings({theme:'custom',pet:'panda',customTheme:{...defaultCustom,secondary:'#123abc',navigationAccent:'#aabbcc'}});expect(s.pet).toBe('panda');expect(s.customTheme.secondary).toBe('#123abc');expect(s.customTheme.navigationAccent).toBe('#aabbcc');expect(normalizeSettings({pet:'invalid'}).pet).toBe('cat');});

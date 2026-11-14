import {it,expect,vi,beforeEach} from 'vitest';
import {emptyScreenTime,addScreenTime,mergeScreenTime,screenTotals,validScreenTime,ScreenClock} from '../lib/screen-time';
import {withFamilyPlayers} from '../lib/family-presets';
import * as store from '../lib/storage';
import {loadScreenTime,saveScreenTime} from '../lib/screen-store';
const start=new Date(2026,10,14,12).getTime();
beforeEach(()=>{const values=new Map();vi.stubGlobal('localStorage',{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)});vi.stubGlobal('window',{dispatchEvent:vi.fn()});vi.stubGlobal('CustomEvent',class{constructor(type,options){this.type=type;this.detail=options?.detail;}});});
it('adds exactly the three named profiles without duplicating existing names or changing their IDs',()=>{
  const old={active:'old',profiles:[{id:'old',name:' rahul ',avatar:'X'},{id:'guest',name:'Guest',avatar:'X'}]};const next=withFamilyPlayers(old);expect(next.profiles.map(p=>p.name.trim())).toEqual(['rahul','Guest','Neha','Aparna']);expect(next.active).toBe('old');expect(withFamilyPlayers(next)).toEqual(next);
});
it('initializes Rahul, Neha and Aparna and upgrades an existing local family only once',()=>{
  let meta=store.metadata();expect(meta.profiles.map(p=>p.name)).toEqual(['Rahul','Neha','Aparna']);const id=meta.profiles[2].id;meta=store.deleteProfile(meta,id);expect(store.metadata().profiles).toHaveLength(2);
  store.write('profiles',{active:'old',profiles:[{id:'old',name:'Original',avatar:'X'}]});expect(store.metadata().profiles.map(p=>p.name)).toEqual(['Original','Rahul','Neha','Aparna']);
});
it('keeps per-game totals and splits activity at midnight',()=>{
  const midnight=new Date(2026,10,15).getTime(),s=addScreenTime(emptyScreenTime(),'device','2048',midnight-2000,midnight+3000);
  expect(s.sources.device.games['2048']).toBe(5000);expect(s.sources.device.days['2026-11-14']['2048']).toBe(2000);expect(screenTotals(s,'today',midnight+4000).total).toBe(3000);expect(screenTotals(s,'week',midnight+4000).total).toBe(5000);expect(validScreenTime(s)).toBe(true);
});
it('merges device counters without double-counting retries, reordered updates or restored backups',()=>{
  const a=addScreenTime(emptyScreenTime(),'a','2048',start,start+10000),b=addScreenTime(emptyScreenTime(),'b','wordle',start,start+7000),newer=addScreenTime(a,'a','2048',start+10000,start+13000),merged=mergeScreenTime(newer,b);
  expect(screenTotals(merged).total).toBe(20000);expect(mergeScreenTime(merged,a)).toEqual(merged);expect(mergeScreenTime(a,a)).toEqual(a);expect(mergeScreenTime(b,a)).toEqual(mergeScreenTime(a,b));expect(validScreenTime(merged)).toBe(true);
});
it('retains lifetime totals when daily details age beyond 90 days',()=>{
  let s=emptyScreenTime();for(let day=0;day<110;day++){const time=new Date(2026,0,day+1,12).getTime();s=addScreenTime(s,'a','wordle',time,time+1000);}expect(Object.keys(s.sources.a.days)).toHaveLength(90);expect(screenTotals(s).total).toBe(110000);expect(validScreenTime(s)).toBe(true);
});
it('stops counting in background, flushes on game/profile switches and uses monotonic duration',()=>{
  let mono=0,wall=start;const writes=[],clock=new ScreenClock({write:s=>writes.push(s),mono:()=>mono,wall:()=>wall});clock.set('Rahul','2048',true);mono=3000;wall+=999999;clock.set('Rahul','2048',false);mono=9000;clock.flush();expect(writes).toHaveLength(1);expect(writes[0].end-writes[0].start).toBe(3000);
  clock.set('Neha','wordle',true);mono=14000;clock.set(null,null,false);expect(writes[1].profileId).toBe('Neha');expect(writes[1].game).toBe('wordle');expect(writes[1].end-writes[1].start).toBe(5000);clock.flush();expect(writes).toHaveLength(2);
});
it('includes screen time in backups and restores it independently from game saves',()=>{
  const meta=store.metadata(),s=addScreenTime(emptyScreenTime(),'device','2248',start,start+12345);saveScreenTime(meta.active,s);const backup=store.parseBackup(JSON.stringify(store.exportBackup(meta,{},meta.active)));expect(backup.profiles[0].data.screenTime).toEqual(s);const next=store.importBackup(meta,backup);expect(loadScreenTime(next.active)).toEqual(s);expect(store.loadData(next.active).screenTime).toBeUndefined();store.importBackup(next,backup,next.active);expect(screenTotals(loadScreenTime(next.active)).total).toBe(12345);
});
it('rejects hostile counters, unrecognized games, dates, sources and malformed backups',()=>{
  const s=addScreenTime(emptyScreenTime(),'device','2248',start,start+12345);expect(validScreenTime(s)).toBe(true);for(const n of [-1,NaN,Infinity,1.5]){const bad=structuredClone(s);bad.sources.device.games['2248']=n;expect(validScreenTime(bad)).toBe(false);}const bad=structuredClone(s);bad.sources.device.days['2026-11-14'].unknown=1;expect(validScreenTime(bad)).toBe(false);expect(store.validData({...store.freshData(),screenTime:bad})).toBe(false);
});

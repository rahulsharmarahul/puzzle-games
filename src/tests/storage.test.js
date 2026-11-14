import { beforeEach, describe, it, expect, vi } from 'vitest';
import * as store from '../lib/storage';
import { createGame } from '../lib/game';
import { dailyKey } from '../engines/puzzles';
class MemoryStorage {
  items = new Map();
  get length() { return this.items.size; }
  key(i) { return [...this.items.keys()][i]; }
  getItem(k) { return this.items.get(k) ?? null; }
  setItem(k,v) { this.items.set(k,String(v)); }
  removeItem(k) { this.items.delete(k); }
}
beforeEach(() => { vi.stubGlobal('localStorage',new MemoryStorage()); vi.stubGlobal('window',new EventTarget()); });
describe('Profiles, storage and backups', () => {
  it('accepts old saves and bounded unique favorites, and preserves favorites in backups',()=>{
    const d=store.freshData();expect(store.validData(d)).toBe(true);d.favorites=['uno','sudoku'];expect(store.validData(d)).toBe(true);const meta=store.metadata();store.saveData(meta.active,d);const backup=store.parseBackup(JSON.stringify(store.exportBackup(meta,{})));const restored=store.importBackup(meta,backup);expect(store.loadData(restored.active).favorites).toEqual(['uno','sudoku']);
    for(const favorites of [['uno','uno'],['unknown'],null,'uno',[{}]])expect(store.validData({...d,favorites})).toBe(false);
  });
  it('isolates profiles and resumes exact board, notes, elapsed time and history', () => {
    let meta=store.metadata(); const first=meta.active; meta=store.addProfile(meta,'Second','🐱');
    const g={...createGame('sudoku','hard','save'),elapsed:12345}; let d=store.record(store.freshData(),g,'start'); store.saveData(first,d);
    expect(store.loadData(first).saves.sudoku).toEqual({...g,accounted:12345}); expect(store.loadData(meta.active).saves).toEqual({}); expect(store.validData(d)).toBe(true);
    store.write('profiles',meta); meta=store.deleteProfile(meta,first); expect(meta.profiles).toHaveLength(1); expect(store.read('player:'+first,null)).toBe(null);
  });
  it('exports, validates and restores new or existing players without mixing data', () => {
    const meta=store.metadata(), g=createGame('petdoku','medium','backup'); store.saveData(meta.active,store.record(store.freshData(),g,'start'));
    const backup=store.parseBackup(JSON.stringify(store.exportBackup(meta,{theme:'dark'},meta.active)));
    const next=store.importBackup(meta,backup); expect(next.profiles).toHaveLength(2); expect(next.active).not.toBe(meta.active); expect(store.loadData(next.active).saves.petdoku.id).toBe(g.id);
    const restored=store.importBackup(next,backup,meta.active); expect(restored.profiles).toHaveLength(2);
  });
  it('rejects malformed and hostile backups, invalid puzzle states and future versions', () => {
    for (const text of ['{','null','{}',JSON.stringify({app:'Puzzle Zone',version:99,profiles:[]})]) expect(() => store.parseBackup(text)).toThrow();
    const meta=store.metadata(), b=store.exportBackup(meta,{}); b.profiles[0].data.saves.sudoku=createGame('sudoku','easy','bad'); b.profiles[0].data.saves.sudoku.solution[0]=99; expect(() => store.parseBackup(JSON.stringify(b))).toThrow();
    b.profiles[0].data.saves={}; b.profiles[0].data.stats['__proto__:easy']={}; expect(() => store.parseBackup(JSON.stringify(b))).toThrow();
  });
  it('handles corrupt JSON and quota errors without crashing', () => {
    localStorage.setItem('pz:settings','{broken'); expect(store.read('settings',{theme:'light'})).toEqual({theme:'light'});
    localStorage.setItem('pz:player:test','{"version":1,"data":null}'); expect(store.loadData('test')).toEqual(store.freshData());
    localStorage.setItem=()=>{ throw new DOMException('Full','QuotaExceededError'); }; expect(store.write('settings',{})).toBe(false); expect(store.getWarning()).toContain('could not be saved');
  });
  it('migrates known v0 data while preserving unknown future schema', () => {
    const d=store.freshData(); delete d.longestDaily; localStorage.setItem('pz:player:old',JSON.stringify({version:0,data:d})); expect(store.loadData('old').longestDaily).toBe(0);
    const raw=JSON.stringify({version:99,data:{test:1}}); localStorage.setItem('pz:profiles',raw); store.metadata(); expect(localStorage.getItem('pz:profiles')).toBe(raw);
  });
  it('validates undo stacks, numbers and given cells when restoring', () => {
    const g=createGame('sudoku','easy','validate'); expect(store.validSave(g)).toBe(true); expect(store.validSave({...g,elapsed:NaN})).toBe(false); expect(store.validSave({...g,undo:[{}]})).toBe(false);
    const i=g.givens.findIndex(Boolean); g.board[i]=0; expect(store.validSave(g)).toBe(false);
  });
  it('reports compact storage usage', () => { store.write('settings',{theme:'light'}); expect(store.storageBytes()).toBeGreaterThan(0); expect(store.storageBytes()).toBeLessThan(1024); });
});
describe('Statistics', () => {
  it('accounts time and mistakes once across repeated saves, pause and resume', () => {
    let g=createGame('sudoku','easy','stats'), d=store.record(store.freshData(),g,'start');
    g={...g,elapsed:1000,mistakes:1}; d=store.record(d,g,'save'); d=store.record(d,g,'save');
    expect(store.summarize(d).time).toBe(1000); expect(store.summarize(d).mistakes).toBe(1);
    g={...g,elapsed:3000,hints:1}; d=store.record(d,g,'complete'); const s=store.summarize(d);
    expect(s.time).toBe(3000); expect(s.completed).toBe(1); expect(s.average).toBe(3000); expect(s.best).toBe(3000); expect(s.hints).toBe(1); expect(d.saves).toEqual({}); expect(d.streak).toBe(1); expect(d.dailyStreak).toBe(1);
  });
  it('tracks abandonment and keeps aggregates when history is pruned', () => {
    let d=store.freshData();
    for (let i=0;i<505;i++) { const g={...createGame('petdoku','easy',String(i)),elapsed:1000}; d=store.record(d,g,'start'); d=store.record(d,g,'complete'); }
    expect(d.history).toHaveLength(500); expect(store.summarize(d).completed).toBe(505); expect(store.summarize(d).completionTime).toBe(505000);
    const g=createGame('petdoku','hard','quit'); d=store.record(d,g,'start'); d=store.record(d,g,'abandon'); expect(store.summarize(d).abandoned).toBe(1); expect(d.streak).toBe(0); expect(store.validData(d)).toBe(true);
  });
  it('does not inflate completions from repeated daily results', () => {
    const daily=dailyKey('sudoku','easy','2026-11-13'), g={...createGame('sudoku','easy',daily,daily),elapsed:5000};
    let d=store.record(store.freshData(),g,'start'); d=store.record(d,g,'complete'); d=store.record(d,{...g,id:'replay'},'complete'); expect(store.summarize(d).completed).toBe(1); expect(d.history).toHaveLength(1); expect(d.daily[daily]).toBe(5000);
  });
  it('keeps each game and difficulty separate', () => { const g=createGame('sudoku','expert','levels'); const d=store.record(store.freshData(),g,'start'); expect(store.summarize(d,'sudoku','expert').started).toBe(1); expect(store.summarize(d,'petdoku').started).toBe(0); expect(store.summarize(d,'sudoku','easy').started).toBe(0); });
});

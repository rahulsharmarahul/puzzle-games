import { localDate } from '../engines/puzzles';
import { levels } from '../engines/random';
import { makePuzzle } from '../engines/puzzles';
import { validClub } from './club';
const prefix = 'pz:', version = 1;
let warning = '';
export function getWarning() { return warning; }
export function read(key, fallback) {
  try { const text = localStorage.getItem(prefix + key); if (!text) return fallback; const value = migrate(JSON.parse(text)); if (value?.version !== version) { warning = 'This save uses an unsupported version. Your original data has been kept.'; return fallback; } return value.data; }
  catch { warning = 'Some saved data could not be read. Restore a backup in Settings if needed.'; return fallback; }
}
// Reserved v0 development schema: identical payload, before streaks/accounting
// were introduced. Future migrations belong here and run before validation.
export function migrate(envelope) {
  if (envelope?.version !== 0 || !envelope.data || typeof envelope.data !== 'object') return envelope;
  const value = structuredClone(envelope); value.version = 1;
  if (value.data.saves && value.data.stats) {
    value.data = { ...freshData(), ...value.data };
    for (const g of Object.values(value.data.saves)) g.accounted ??= g.elapsed || 0;
    for (const [key,s] of Object.entries(value.data.stats)) value.data.stats[key] = { ...emptyStats(), ...s };
  }
  return value;
}
export function write(key, data) {
  try { localStorage.setItem(prefix + key, JSON.stringify({ version, data })); return true; }
  catch { warning = 'Progress could not be saved. Browser storage may be full or unavailable. Export a backup before closing.'; window.dispatchEvent(new Event('storage-warning')); return false; }
}
const uid = () => crypto.randomUUID();
export const freshData = () => ({ saves: {}, stats: {}, daily: {}, history: [], streak: 0, longest: 0, dailyStreak: 0, longestDaily: 0, lastDate: null });
export function metadata() {
  const data = read('profiles', null);
  if (data && Array.isArray(data.profiles) && data.profiles.length && data.profiles.every(p => p && typeof p.id === 'string' && /^[\w-]+$/.test(p.id) && typeof p.name === 'string' && typeof p.avatar === 'string') && data.profiles.some(p => p.id === data.active)) return data;
  const id = uid(), initial = { profiles: [{ id, name: 'Player one', avatar: '🌿' }], active: id };
  try { if (!localStorage.getItem(prefix + 'profiles')) write('profiles', initial); } catch { warning = 'Browser storage is unavailable. Export your progress before closing.'; } return initial;
}
export function validSave(g) {
  try {
    if (!g || !['sudoku','petdoku'].includes(g.game) || !levels.includes(g.difficulty) || typeof g.seed !== 'string' || typeof g.id !== 'string' || g.status !== 'playing') return false;
    const expected = makePuzzle(g.game, g.difficulty, g.seed);
    if (['size','givens','solution', ...(g.game === 'petdoku' ? ['regions'] : [])].some(k => JSON.stringify(g[k]) !== JSON.stringify(expected[k]))) return false;
    const max = g.game === 'sudoku' ? 9 : 2;
    const boardOK = b => Array.isArray(b) && b.length === g.size ** 2 && b.every((n,i) => Number.isInteger(n) && n >= 0 && n <= max && (!g.givens[i] || n === g.givens[i]));
    const notesOK = notes => notes && typeof notes === 'object' && !Array.isArray(notes) && Object.entries(notes).every(([i, ns]) => /^\d+$/.test(i) && Number(i) < g.board.length && Array.isArray(ns) && ns.length <= 9 && ns.every(n => Number.isInteger(n) && n >= 1 && n <= 9));
    return boardOK(g.board) && notesOK(g.notes) && ['undo','redo'].every(k => Array.isArray(g[k]) && g[k].length <= 100 && g[k].every(s => boardOK(s.board) && notesOK(s.notes))) && ['elapsed','accounted','mistakes','hints'].every(k => Number.isFinite(g[k]) && g[k] >= 0) && g.accounted <= g.elapsed && (g.daily === null || (typeof g.daily === 'string' && /^v\d+:\d{4}-\d{2}-\d{2}:(sudoku|petdoku):(easy|medium|hard|expert)$/.test(g.daily)));
  } catch { return false; }
}
export function validData(d) {
  if (!d || !d.saves || !d.stats || !d.daily || !Array.isArray(d.history) || d.history.length > 500) return false;
  if (d.club !== undefined && !validClub(d.club,validSave)) return false;
  if (!Object.entries(d.saves).every(([k,g]) => ['sudoku','petdoku'].includes(k) && g.game === k && validSave(g))) return false;
  const numeric = ['started','completed','abandoned','time','completionTime','best','last','mistakes','hints','streak','longest','dailyStreak','longestDaily'];
  if (!Object.entries(d.stats).every(([key,s]) => /^(sudoku|petdoku):(easy|medium|hard|expert)$/.test(key) && numeric.every(k => Number.isFinite(s[k]) && s[k] >= 0) && s.completed + s.abandoned <= s.started)) return false;
  if (!['streak','longest','dailyStreak','longestDaily'].every(k => Number.isFinite(d[k]) && d[k] >= 0) || !(d.lastDate === null || /^\d{4}-\d{2}-\d{2}$/.test(d.lastDate))) return false;
  if (!Object.entries(d.daily).every(([key,t]) => /^v\d+:\d{4}-\d{2}-\d{2}:(sudoku|petdoku):(easy|medium|hard|expert)$/.test(key) && Number.isFinite(t) && t >= 0)) return false;
  return d.history.every(h => h && typeof h.id === 'string' && ['sudoku','petdoku'].includes(h.game) && levels.includes(h.difficulty) && typeof h.date === 'string' && ['elapsed','mistakes','hints'].every(k => Number.isFinite(h[k]) && h[k] >= 0));
}
export function loadData(id) { const data = read(`player:${id}`, freshData()); if (validData(data)) return data; warning = 'An invalid player save was found. It has been preserved; you can import a backup.'; return freshData(); }
export const saveData = (id, data) => write(`player:${id}`, data);
export function addProfile(meta, name, avatar) { const id = uid(); return { profiles: [...meta.profiles, { id, name: name.trim().slice(0,30) || 'Player', avatar }], active: id }; }
export function deleteProfile(meta, id) { if (meta.profiles.length < 2) throw Error('Keep at least one profile.'); const profiles = meta.profiles.filter(p => p.id !== id); const next = { profiles, active: meta.active === id ? profiles[0].id : meta.active }; if (write('profiles', next)) { try { localStorage.removeItem(prefix + 'player:' + id); } catch { /* metadata still hides deleted profile */ } } return next; }
const emptyStats = () => ({ started: 0, completed: 0, abandoned: 0, time: 0, completionTime: 0, best: 0, last: 0, mistakes: 0, hints: 0, streak: 0, longest: 0, dailyStreak: 0, longestDaily: 0, lastDate: null, lastCompletedDate: null });
function touchDate(d) {
  const today = localDate(), yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (d.lastDate !== today) d.dailyStreak = d.lastDate === localDate(yesterday) ? d.dailyStreak + 1 : 1;
  d.lastDate = today; d.longestDaily = Math.max(d.longestDaily, d.dailyStreak);
}
export function record(data, game, event) {
  if (event === 'complete' && (data.history.some(h => h.id === game.id) || game.daily && Object.hasOwn(data.daily, game.daily))) return data;
  const d = structuredClone(data), key = `${game.game}:${game.difficulty}`, s = d.stats[key] ||= emptyStats();
  const previous = d.saves[game.game];
  touchDate(d); touchDate(s);
  s.time += Math.max(0, game.elapsed - (previous?.id === game.id ? previous.accounted : game.accounted));
  s.mistakes += Math.max(0, game.mistakes - (previous?.id === game.id ? previous.mistakes : 0));
  s.hints += Math.max(0, game.hints - (previous?.id === game.id ? previous.hints : 0));
  const accounted = { ...game, accounted: game.elapsed };
  if (event === 'start') s.started++;
  d.saves[game.game] = accounted;
  if (event === 'abandon') { s.abandoned++; d.streak = 0; s.streak = 0; delete d.saves[game.game]; }
  if (event === 'complete') {
    const duplicate = game.daily && Object.hasOwn(d.daily, game.daily);
    if (!duplicate && !d.history.some(h => h.id === game.id)) {
      s.completed++; s.completionTime += game.elapsed; s.last = game.elapsed; s.lastCompletedDate = new Date().toISOString(); s.best = s.completed === 1 ? game.elapsed : Math.min(s.best, game.elapsed);
      d.streak++; d.longest = Math.max(d.longest, d.streak);
      s.streak++; s.longest = Math.max(s.longest, s.streak);
      d.history = [{ id: game.id, game: game.game, difficulty: game.difficulty, elapsed: game.elapsed, mistakes: game.mistakes, hints: game.hints, date: new Date().toISOString(), daily: game.daily }, ...d.history].slice(0,500);
      if (game.daily) d.daily[game.daily] = game.elapsed;
    }
    delete d.saves[game.game];
  }
  return d;
}
export function summarize(data, game = 'all', difficulty = 'all') {
  const entries = Object.entries(data.stats).filter(([k]) => (game === 'all' || k.startsWith(game+':')) && (difficulty === 'all' || k.endsWith(':'+difficulty))).map(([,v]) => v);
  const out = entries.reduce((a,s) => { for (const k of ['started','completed','abandoned','time','completionTime','mistakes','hints']) a[k] = (a[k] || 0) + s[k]; return a; }, emptyStats());
  const times = entries.filter(s => s.completed).map(s => s.best); out.best = times.length ? Math.min(...times) : 0; out.average = out.completed ? out.completionTime / out.completed : 0;
  out.last = [...entries].filter(s => s.completed).sort((a,b) => String(b.lastCompletedDate || '').localeCompare(String(a.lastCompletedDate || '')))[0]?.last || 0;
  out.lastDate = [...entries].map(s => s.lastDate).filter(Boolean).sort().at(-1) || null;
  return out;
}
export function currentDailyStreak(data) { const y = new Date(); y.setDate(y.getDate()-1); return [localDate(),localDate(y)].includes(data.lastDate) ? data.dailyStreak : 0; }
export function exportBackup(meta, settings, onlyId, activeData) {
  return { app: 'Puzzle Zone', version, exportedAt: new Date().toISOString(), settings, profiles: meta.profiles.filter(p => !onlyId || p.id === onlyId).map(p => ({ ...p, data: p.id === meta.active && activeData ? activeData : loadData(p.id) })) };
}
export function parseBackup(text) {
  if (text.length > 8_000_000) throw Error('This backup is too large (maximum 8 MB).');
  let b; try { b = JSON.parse(text); } catch { throw Error('This file is not valid JSON.'); }
  if (b?.app !== 'Puzzle Zone' || b.version !== version || !Array.isArray(b.profiles) || !b.profiles.length || b.profiles.length > 100 || !b.profiles.every(p => typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 30 && typeof p.avatar === 'string' && p.avatar.length < 20 && validData(p.data))) throw Error('This is not a supported Puzzle Zone backup.');
  return b;
}
export function importBackup(meta, backup, targetId = null) {
  if (targetId && (backup.profiles.length !== 1 || !meta.profiles.some(p => p.id === targetId))) throw Error('Choose one profile to restore.');
  const next = structuredClone(meta);
  for (const p of backup.profiles) {
    const id = targetId || uid();
    if (!saveData(id, p.data)) throw Error('Not enough storage to restore. Existing profiles were preserved.');
    if (!targetId) next.profiles.push({ id, name: p.name, avatar: p.avatar });
    next.active = id;
  }
  if (!write('profiles', next)) throw Error('Could not save the restored profile list.');
  return next;
}
export function storageBytes() { let n = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(prefix)) n += (k.length + localStorage.getItem(k).length) * 2; } } catch { /* unavailable */ } return n; }

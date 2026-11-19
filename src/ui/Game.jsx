import {BoardViewport,GameGuide} from './PhonePlay';
import {petFor} from '../lib/pets';
import PetPicker from './PetPicker';
import { useEffect, useRef, useState } from 'react';
import { act, complete, conflicts, elapsedAt, formatTime } from '../lib/game';
import { Icon } from '../main';
import { peers } from '../engines/sudoku';
import { petExclusions } from '../engines/petdoku';
import { loadData, metadata } from '../lib/storage';

export default function Game({ initial, onSave, onHome, onNew, sound, petId='cat',onPetChange }) {
  const petEmoji=petFor(petId).emoji;
  const [g,setG] = useState(initial), [selected,setSelected] = useState(-1), [notes,setNotes] = useState(false), [paused,setPaused] = useState(true), [tick,setTick] = useState(0), [help,setHelp] = useState(false);
  const state = useRef(initial), running = useRef(null), save = useRef(onSave), autoResume = useRef(false), cellRefs = useRef([]);
  const [isBest,setIsBest] = useState(false);
  const [petFeedback, setPetFeedback] = useState('Place a pet to check its spot. Correct pets automatically rule out other cells.');
  const excluded = g.game === 'petdoku' ? petExclusions(g.board, g.regions, g.size, g.solution) : new Set();
  save.current = onSave;
  function checkpoint() {
    if (state.current.status !== 'playing') return state.current;
    state.current = { ...state.current, elapsed: elapsedAt(state.current.elapsed,running.current) };
    if (running.current !== null) running.current = Date.now();
    return state.current;
  }
  function pause() { const next = checkpoint(); running.current = null; setPaused(true); setG(next); save.current(next); }
  function resume() { if (state.current.status !== 'playing') return; running.current = Date.now(); setPaused(false); }
  function chooseNew() { if (state.current.status === 'playing') pause(); onNew(); }
  useEffect(() => {
    const interval = setInterval(() => { if (running.current !== null) setTick(t => t + 1); }, 500);
    const visibility = () => { if (document.hidden) { autoResume.current = running.current !== null; const next = checkpoint(); running.current = null; save.current(next); setPaused(true); setG(next); } else if (autoResume.current && state.current.status === 'playing') { running.current = Date.now(); setPaused(false); autoResume.current = false; } };
    const hide = () => { const next = checkpoint(); running.current = null; save.current(next); };
    document.addEventListener('visibilitychange',visibility); addEventListener('pagehide',hide);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange',visibility); removeEventListener('pagehide',hide); const next = checkpoint(); running.current = null; if (next.status === 'playing') save.current(next); };
  }, []);
  function dispatch(action) {
    if (paused || state.current.status !== 'playing') return;
    let next = act(checkpoint(),action);
    if (g.game === 'petdoku') {
      if (action.type === 'value' && action.value === 2) setPetFeedback(next.solution.includes(action.index) ? 'Correct! This pet is in the right spot. Ruled-out cells are crossed automatically.' : 'Incorrect spot. Move this pet to another cell.');
      else if (action.type === 'hint') setPetFeedback('A correct pet has been revealed. Ruled-out cells are crossed automatically.');
      else setPetFeedback('Board updated. Automatic crosses follow the correct pets currently on the board.');
    }
    if (complete(next)) {
      next = { ...next, status:'complete' }; running.current = null;
      const previous = loadData(metadata().active).stats[`${g.game}:${g.difficulty}`];
      setIsBest(!previous?.completed || next.elapsed < previous.best);
      state.current = next; setG(next); save.current(next,'complete');
      if (sound) { try { const Ctx = window.AudioContext || window.webkitAudioContext; const context = new Ctx(); const gain = context.createGain(); gain.connect(context.destination); gain.gain.setValueAtTime(.06,context.currentTime); gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.7); [523.25,659.25,783.99].forEach((f,i) => { const o=context.createOscillator(); o.frequency.value=f; o.connect(gain); o.start(context.currentTime+i*.12); o.stop(context.currentTime+.7); }); setTimeout(() => context.close(),900); } catch { /* sound is optional */ } }
    } else { state.current = next; setG(next); save.current(next); }
  }
  function restart() {
    if (!confirm('Restart this puzzle? Your entries, notes and undo history will be cleared. Time, mistakes and hints stay counted.')) return;
    const next = { ...checkpoint(), board:[...g.givens],notes:{},undo:[],redo:[] }; state.current=next; setG(next); save.current(next);
    setPetFeedback('Puzzle restarted. Place a pet to check its spot.');
  }
  function choose(i) {
    if (paused) return;
    setSelected(i);
    if (g.game === 'petdoku') {
      if (excluded.has(i) && state.current.board[i] !== 2) { setPetFeedback('This cell is ruled out by a correct pet. Remove that pet or use Undo to reopen it.'); return; }
      dispatch({type:'value',index:i,value:(state.current.board[i]+1)%3});
    }
  }
  const bad = conflicts(g), current = selected >= 0 ? g.board[selected] : 0, elapsed = elapsedAt(g.elapsed,running.current);
  function keydown(e) {
    if (paused) return;
    const i = selected < 0 ? 0 : selected;
    let next = i;
    if (e.key === 'ArrowRight') next = Math.min(g.board.length-1,i+1);
    else if (e.key === 'ArrowLeft') next = Math.max(0,i-1);
    else if (e.key === 'ArrowDown') next = Math.min(g.board.length-1,i+g.size);
    else if (e.key === 'ArrowUp') next = Math.max(0,i-g.size);
    else if (/^[1-9]$/.test(e.key) && g.game === 'sudoku') dispatch({type:notes ? 'note' : 'value',index:i,value:Number(e.key)});
    else if (['Backspace','Delete','0'].includes(e.key)) dispatch({type:'erase',index:i});
    else if (e.key.toLowerCase() === 'n' && g.game === 'sudoku') setNotes(v => !v);
    else if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey)) dispatch({type:e.shiftKey ? 'redo' : 'undo'});
    else return;
    e.preventDefault(); setSelected(next); if (next !== i) cellRefs.current[next]?.focus();
  }
  if (g.status === 'complete') return <div className="completion panel"><span className="completion-art">{g.game === 'sudoku' ? '✦' : petEmoji}</span><div className="eyebrow">A LITTLE WIN WORTH CELEBRATING</div><h1>You found your zone.</h1><p>{g.game === 'sudoku' ? 'Every number in its happy place.' : 'Every pet found a perfect spot.'} Beautifully solved.</p>{isBest && <span className="pill best-badge">✦ New personal best</span>}<div className="summary-grid"><div><small>Difficulty</small><strong>{g.difficulty}</strong></div><div><small>Your time</small><strong>{formatTime(g.elapsed)}</strong></div><div><small>Mistakes</small><strong>{g.mistakes}</strong></div><div><small>Hints</small><strong>{g.hints}</strong></div></div><div className="button-row"><button className="button primary" onClick={chooseNew}>Play another puzzle</button><button className="button secondary" onClick={onHome}>Return home</button></div></div>;
  return <><div className="game-heading"><div><button className="text-button" onClick={onHome}><Icon name="back" size={16}/> Back to play</button><h1>{g.game === 'sudoku' ? 'Sudoku' : 'Petdoku'}<span className="pill">{g.difficulty}{g.daily ? ' · Daily' : ''}</span></h1><p>{g.game === 'sudoku' ? 'A little logic, one number at a time.' : 'Find a happy spot for every little paw.'}</p></div><button className="button secondary" onClick={() => { if (!paused) pause(); setHelp(true); }}>How to play</button></div>{g.game==='petdoku'&&<PetPicker value={petId} onChange={onPetChange}/>}{g.puzzleVersion===2&&<p className="expert-pet-note">Expert 10 x 10: no giveaway regions. Trace rows, columns and region possibilities; instant checks remain available.</p>}<div className="play-layout"><section className="board-panel"><div className="game-meta"><span><Icon name="clock" size={18}/><span aria-label="Elapsed time">{formatTime(elapsed)}</span><button className="icon-button" onClick={paused ? resume : pause} aria-label={paused ? 'Resume game' : 'Pause game'}>{paused ? '▶' : <Icon name="pause" size={17}/>}</button></span><span>{g.mistakes} mistakes · {g.hints} hints</span></div><BoardViewport label={g.game==='sudoku'?'Sudoku':'Petdoku'} width={520}><div className="board-wrapper"><div className={`board ${g.game}-board`} style={{'--size':g.size}} role="group" aria-label={`${g.size} by ${g.size} ${g.game} puzzle`} onKeyDown={keydown}>{g.board.map((storedValue,i) => {
    const autoExcluded = excluded.has(i);
    const value = storedValue === 0 && autoExcluded ? 1 : storedValue;
    const petCorrect = g.game === 'petdoku' && value === 2 && g.solution.includes(i);
    const r = Math.floor(i/g.size), c = i%g.size, region = g.regions?.[i];
    const related = g.game === 'sudoku' && selected >= 0 && peers[selected].includes(i);
    const style = g.game === 'petdoku' ? { borderTopWidth: r && g.regions[i-g.size] !== region ? 3 : 1,borderLeftWidth:c && g.regions[i-1] !== region ? 3 : 1 } : {borderRightWidth:c%3 === 2 && c<8 ? 2 : 1,borderBottomWidth:r%3 === 2 && r<8 ? 2 : 1};
    return <button key={i} ref={el => cellRefs.current[i]=el} className={`cell ${autoExcluded && storedValue !== 2 ? "auto-excluded" : ""} ${petCorrect ? "correct-pet" : ""} ${g.givens[i] ? 'given' : 'entered'} ${related ? 'related' : ''} ${current && current === value && g.game === 'sudoku' ? 'matching' : ''} ${selected === i ? 'cell-selected' : ''} ${(g.game === 'sudoku' && bad.includes(i)) || (g.game === 'petdoku' && value === 2 && !petCorrect) || (g.game === 'sudoku' && value && !g.givens[i] && value !== g.solution[i]) ? 'invalid' : ''} ${g.game === 'petdoku' ? `pet-region-${region}` : ''}`} style={style} aria-invalid={g.game === 'petdoku' && value === 2 ? !petCorrect : undefined} disabled={paused} aria-label={`Row ${r+1}, column ${c+1}, ${g.game === 'petdoku' ? `region ${region+1}, ${value === 2 ? (petCorrect ? 'pet, correct' : 'pet, incorrect') : value === 1 ? (autoExcluded ? 'automatically excluded' : 'excluded') : 'empty'}` : `${value || 'empty'}${g.givens[i] ? ', given' : ''}${g.notes[i]?.length ? ', notes '+g.notes[i].join(', ') : ''}`}${bad.includes(i) ? ', rule conflict' : ''}`} aria-pressed={selected === i} tabIndex={selected === i || selected < 0 && i === 0 ? 0 : -1} onFocus={() => setSelected(i)} onClick={() => choose(i)}>{!paused && (g.game === 'petdoku' ? <><span className="region-number" aria-hidden="true">{region+1}</span><span className={value === 1 ? 'cross' : 'pet'}>{value === 2 ? petEmoji : value === 1 ? '×' : ''}</span>{value === 2 && <span className={petCorrect ? 'pet-verdict correct' : 'pet-verdict incorrect'} aria-hidden="true">{petCorrect ? '✓' : '!'}</span>}</> : value || <span className="cell-notes">{Array.from({length:9},(_,n) => <span key={n}>{g.notes[i]?.includes(n+1) ? n+1 : ''}</span>)}</span>)}</button>;
  })}</div>{paused && <div className="pause-overlay"><span>☕</span><h2>A moment to breathe.</h2><p>Your puzzle is right here.</p><button className="button primary" onClick={resume}>{g.elapsed > 0 ? 'Resume puzzle' : 'Start playing'} <Icon name="arrow" size={18}/></button></div>}</div></BoardViewport><div className="puzzle-controls"><div className="tools">{[['undo','Undo',!g.undo.length],['redo','Redo',!g.redo.length],...(g.game === 'sudoku' ? [['pencil','Notes',false]] : []),['erase','Erase',selected<0],['hint','Hint',false]].map(([icon,label,disabled]) => <button key={label} className={label === 'Notes' && notes ? 'tool active' : 'tool'} disabled={paused || disabled} aria-pressed={label === 'Notes' ? notes : undefined} onClick={() => label === 'Notes' ? setNotes(!notes) : label === 'Hint' ? dispatch({type:'hint'}) : dispatch({type:icon,index:selected})}><Icon name={icon}/><span>{label}</span></button>)}</div>{g.game === 'sudoku' && <div className="number-pad">{Array.from({length:9},(_,i) => <button disabled={paused || selected<0} key={i} onClick={() => dispatch({type:notes ? 'note' : 'value',index:selected,value:i+1})} aria-label={`Enter ${i+1}`}>{i+1}<small>{Math.max(0,9-g.board.filter(n => n === i+1).length)}</small></button>)}</div>}{g.game === 'petdoku' && <div><p className="pet-feedback" role="status" aria-live="polite">{paused ? "Resume your puzzle to check pet placements." : petFeedback}</p><p className="tap-guide">Tap to cycle: <strong>empty → × excluded → {petEmoji} pet → empty</strong>Correct pets show ✓. Incorrect pets show !. Automatic crosses reopen when their pet is removed.</p></div>}</div><div className="board-bottom"><button className="text-button" onClick={restart}>Restart puzzle</button><button className="text-button" onClick={chooseNew}>New puzzle <Icon name="arrow" size={16}/></button></div></section><aside className="play-aside"><GameGuide tip="Puzzle rules and controls"><div className="panel rules-card"><span className="eyebrow">A LITTLE REMINDER</span><h2>{g.game === 'sudoku' ? 'Every number has a place.' : 'Happy pets need space.'}</h2>{g.game === 'sudoku' ? <ul><li>Fill each row with 1–9.</li><li>Fill each column with 1–9.</li><li>Each 3 × 3 box needs 1–9, too.</li><li>No repeats. Use notes to work through possibilities.</li></ul> : <ul><li>One pet in each row.</li><li>One pet in each column.</li><li>One pet in each numbered, coloured region.</li><li>Pets cannot touch, even at corners.</li></ul>}<p className="muted">{g.game === 'sudoku' ? 'Arrow keys move. 1–9 enters a number. N toggles notes. Delete clears.' : 'Region numbers help distinguish the colours. × means you have ruled out a spot.'}</p></div></GameGuide><div className="focus-note">✦<p>No rush. No pressure.<br/>Just you and the next little step.</p><small>Progress saves with every move.</small></div></aside></div>{help && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="help-title"><h2 id="help-title">How to play {g.game === 'sudoku' ? 'Sudoku' : 'Petdoku'}</h2>{g.game === 'sudoku' ? <p>Each row, column and 3 × 3 box must contain 1–9 exactly once. Select an empty cell, then tap a number. Notes add possible numbers without committing. Erase clears a cell; Undo and Redo retrace moves. Incorrect entries are marked with a red underline. Hints reveal one correct cell.</p> : <p>Place exactly one pet in every row, column and numbered colour region. No pets can touch, even diagonally. Tap a cell once for × (excluded), twice for a pet, and again to clear. Each placed pet is checked against the solution: a check means correct, and an exclamation mark means incorrect. Correct pets automatically cross out their row, column, region and touching neighbours. Automatic crosses cannot be changed while their pet remains; removing or undoing the pet reopens them. Hints reveal a correct pet and add the same crosses. Incorrect pets already on the board stay visible so you can remove them.</p>}<p>The timer pauses when you switch away or close the app. Restart clears the board but keeps time, hints and mistakes. A new puzzle abandons your current attempt.</p><button autoFocus className="button primary" onClick={() => setHelp(false)}>Got it</button></section></div>}</>;
}

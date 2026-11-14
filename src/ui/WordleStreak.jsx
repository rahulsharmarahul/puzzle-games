import {wordleStreak} from '../lib/wordle-streak';
export default function WordleStreak({club}){
  const s=wordleStreak(club);
  return <section className="wordle-streak" aria-label="Daily Wordle streak"><div><span aria-hidden="true">🔥</span><strong>{s.current}</strong><small>Current streak</small></div><div><span aria-hidden="true">🏆</span><strong>{s.best}</strong><small>Best streak</small></div><div><strong>{s.today==='won'?'Solved':s.today==='lost'?'Try tomorrow':'Ready to play'}</strong><small>Today’s daily word</small></div><p>Win the daily word on consecutive days. Each date counts once; free play and online rooms do not change your streak.</p></section>;
}

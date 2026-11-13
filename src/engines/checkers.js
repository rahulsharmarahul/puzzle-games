// English/American checkers: mandatory jumps, forward-only men, short kings.
export function createCheckers() {
  const board=Array.from({length:64}, (_,i) => (Math.floor(i/8)+i%8)%2 ? (i<24 ? -1 : i>=40 ? 1 : 0) : 0);
  return {board,turn:0,forced:null,quiet:0,positions:{[`${board.join(',')}:0`]:1},status:'playing',winner:null};
}
function pieceMoves(board, from, jumpsOnly) {
  const piece = board[from], r = Math.floor(from/8), c = from%8, result=[];
  for (const dr of Math.abs(piece)===2 ? [-1,1] : [piece>0 ? -1 : 1]) for (const dc of [-1,1]) {
    const nr=r+dr, nc=c+dc;
    if (nr<0 || nr>7 || nc<0 || nc>7) continue;
    const near=nr*8+nc;
    if (!board[near] && !jumpsOnly) result.push({from,to:near,capture:null});
    const jr=r+dr*2, jc=c+dc*2;
    if (board[near]*piece<0 && jr>=0 && jr<8 && jc>=0 && jc<8 && !board[jr*8+jc]) result.push({from,to:jr*8+jc,capture:near});
  }
  return result;
}
export function checkerMoves(state) {
  if (state.status !== 'playing') return [];
  const sign=state.turn===0 ? 1 : -1;
  const pieces=state.forced===null ? state.board.flatMap((p,i) => p*sign>0 ? [i] : []) : [state.forced];
  const all=pieces.flatMap(i=>pieceMoves(state.board,i,state.forced!==null));
  const captures=all.filter(m=>m.capture!==null);
  return captures.length ? captures : all;
}
export function moveChecker(state, from, to) {
  const move=checkerMoves(state).find(m=>m.from===from && m.to===to);
  if (!move) return state;
  const next=structuredClone(state), piece=next.board[from];
  next.board[from]=0; next.board[to]=piece;
  if (move.capture!==null) next.board[move.capture]=0;
  const crowned=Math.abs(piece)===1 && (piece>0 ? to<8 : to>=56);
  if (crowned) next.board[to]=piece>0 ? 2 : -2;
  next.quiet=move.capture!==null || Math.abs(piece)===1 ? 0 : state.quiet+1;
  // Crowning ends the turn, including during a capture sequence.
  if (move.capture!==null && !crowned && pieceMoves(next.board,to,true).length) { next.forced=to; return next; }
  next.forced=null; next.turn=1-state.turn;
  const key=`${next.board.join(',')}:${next.turn}`;
  next.positions[key]=(next.positions[key]||0)+1;
  if (!checkerMoves(next).length) { next.status='complete'; next.winner=state.turn; }
  else if (next.quiet>=80 || next.positions[key]>=3) { next.status='complete'; next.winner='draw'; }
  return next;
}
export function checkerBot(state) {
  const moves=checkerMoves(state);
  return moves.map(move=>({move,score:(move.capture!==null ? 100 : 0)+(Math.abs(state.board[move.from])===1 && move.to>=56 ? 35 : 0)-Math.abs(move.to%8-3.5)+Math.floor(move.to/8)})).sort((a,b)=>b.score-a.score)[0]?.move;
}

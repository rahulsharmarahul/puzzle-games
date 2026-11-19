import {useRef,useState} from 'react';
export function GameGuide({children,tip='Tap How to play for the rules.'}){
  const [open,setOpen]=useState(()=>typeof matchMedia==='function'&&matchMedia('(min-width: 701px)').matches);
  return <details className="game-guide" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary><strong>How to play</strong><span>{tip}</span></summary><div className="game-guide-content">{children}</div></details>;
}
export function BoardViewport({children,label='game',width=480}){
  const [large,setLarge]=useState(false),lastTouch=useRef(-Infinity);
  return <div className={`board-viewport ${large?'is-enlarged':''}`} style={{'--zoom-board-width':`${width}px`}}><div className="board-pan" role="region" aria-label={`${label} board view`} tabIndex={large?0:undefined}><div className="board-pan-content">{children}</div></div><button className="text-button board-size-toggle" aria-label={`${large?'Fit':'Enlarge'} ${label} board`} aria-pressed={large} onPointerUp={e=>{if(e.pointerType==='touch'||e.pointerType==='pen'){e.preventDefault();lastTouch.current=performance.now();setLarge(value=>!value);}}} onClick={e=>{if(e.detail&&performance.now()-lastTouch.current<800)return;setLarge(value=>!value);}}>{large?'Fit board':'Enlarge board'}</button>{large&&<span className="board-pan-tip">Swipe to pan; tap to play.</span>}</div>;
}

// Original top-down car artwork. The rounded bonnet, windscreen and headlights
// mark the front; its footprint matches the existing puzzle's occupied cells.
export default function EscapeCar({length=68,color='#367fd1',number,rotation=0}){
  const front=length-14,centre=length/2-14;
  return <g className="escape-car" strokeLinejoin="round">
    <g fill="#263448" stroke="none">{[-8,length-32].map(x=><g key={x}><rect x={x} y="-17" width="12" height="7" rx="2"/><rect x={x} y="10" width="12" height="7" rx="2"/></g>)}</g>
    <rect x="-14" y="-13" width={length} height="26" rx="8" fill={color} stroke="#23364d" strokeWidth="1.5"/>
    <path d={`M-6-10H${front-10}`} stroke="#ffffff60" strokeWidth="2" strokeLinecap="round"/>
    <rect x="-6" y="-8" width="11" height="16" rx="3" fill="#afdef0" stroke="#23364d" strokeWidth="1"/>
    <path d={`M${front-25}-9l13 2v14l-13 2z`} fill="#bce9f8" stroke="#23364d" strokeWidth="1"/>
    <g stroke="none"><rect x={front-5} y="-10" width="3" height="6" rx="1" fill="#fff1b0"/><rect x={front-5} y="4" width="3" height="6" rx="1" fill="#fff1b0"/><rect x="-12" y="-9" width="3" height="4" rx="1" fill="#ff9d91"/><rect x="-12" y="5" width="3" height="4" rx="1" fill="#ff9d91"/></g>
    {number!==undefined&&<g transform={`translate(${centre} 0) rotate(${-rotation})`}><circle r="8" fill="#ffffffeb"/><text y="3.5" textAnchor="middle" fill="#23364d" stroke="none" fontSize="10" fontWeight="800">{number}</text></g>}
  </g>;
}

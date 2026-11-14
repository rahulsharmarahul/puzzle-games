import {pets,petFor} from '../lib/pets';
export default function PetPicker({value='cat',onChange}){
  if(!onChange)return null;
  function randomize(){const choices=pets.filter(p=>p.id!==petFor(value).id);onChange(choices[Math.floor(Math.random()*choices.length)].id);}
  return <div className="pet-picker"><div className="pet-picker-heading"><div><strong>Your puzzle pal</strong><span aria-live="polite">{petFor(value).name}</span></div><button type="button" className="pet-random" onClick={randomize}><span aria-hidden="true">🎲</span> Random pet</button></div><div className="pet-options" role="group" aria-label="Petdoku pet options">{pets.map(p=><button type="button" key={p.id} aria-label={`Choose ${p.name}`} aria-pressed={value===p.id} title={p.name} onClick={()=>onChange(p.id)}><span aria-hidden="true">{p.emoji}</span></button>)}</div></div>;
}

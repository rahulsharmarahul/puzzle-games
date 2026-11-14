import {pets,petFor} from '../lib/pets';
export default function PetPicker({value='cat',onChange}){
  if(!onChange)return null;
  return <div className="pet-picker"><div className="pet-picker-heading"><strong>Your puzzle pal</strong><span>{petFor(value).name}</span></div><div className="pet-options" role="group" aria-label="Petdoku pet options">{pets.map(p=><button type="button" key={p.id} aria-label={`Choose ${p.name}`} aria-pressed={value===p.id} title={p.name} onClick={()=>onChange(p.id)}><span aria-hidden="true">{p.emoji}</span></button>)}</div></div>;
}

export const familyPlayers=[{name:'Rahul',avatar:'🚀'},{name:'Neha',avatar:'🌻'},{name:'Aparna',avatar:'🦋'}];
export function withFamilyPlayers(meta){
  const profiles=[...meta.profiles];
  for(const player of familyPlayers)if(!profiles.some(p=>p.name.trim().toLowerCase()===player.name.toLowerCase()))profiles.push({id:crypto.randomUUID(),...player});
  return {...meta,profiles,active:meta.active||profiles[0].id,familyPreset:true};
}

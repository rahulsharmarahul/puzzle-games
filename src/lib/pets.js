export const pets=[
  {id:'cat',name:'Cat',emoji:'🐱'},{id:'panda',name:'Panda',emoji:'🐼'},
  {id:'dog',name:'Puppy',emoji:'🐶'},{id:'rabbit',name:'Bunny',emoji:'🐰'},
  {id:'fox',name:'Fox',emoji:'🦊'},{id:'koala',name:'Koala',emoji:'🐨'},
  {id:'bear',name:'Bear',emoji:'🐻'},{id:'tiger',name:'Tiger',emoji:'🐯'},
  {id:'frog',name:'Frog',emoji:'🐸'},{id:'penguin',name:'Penguin',emoji:'🐧'},
  {id:'hamster',name:'Hamster',emoji:'🐹'},{id:'unicorn',name:'Unicorn',emoji:'🦄'}
];
export const petFor=id=>pets.find(p=>p.id===id)||pets[0];

export class RoomConnection {
  constructor({endpoint,code,token,onState,onStatus,onError,onBusy}){Object.assign(this,{endpoint,code,token,onState,onStatus,onError,onBusy});this.pending=null;this.stopped=false;this.attempt=0;this.socket=null;this.offline=()=>{this.onStatus('reconnecting');this.socket?.close();};this.online=()=>this.reconnect();addEventListener('offline',this.offline);addEventListener('online',this.online);}
  connect(){
    if(this.stopped)return;
    if(navigator.onLine===false){this.onStatus('reconnecting');return;}
    clearTimeout(this.timer);this.onStatus(this.attempt?'reconnecting':'connecting');
    const url=this.endpoint.replace(/^http/,'ws')+`/rooms/${this.code}/socket`;
    const socket=new WebSocket(url,['puzzle-zone-v1','auth.'+this.token]);this.socket=socket;
    socket.onopen=()=>{this.attempt=0;this.onStatus('connected');};
    socket.onmessage=event=>{
      let message;try{message=JSON.parse(event.data);}catch{return;}
      if(message.type==='state'){this.room=message.room;this.onState(message.room);if(this.pending&&this.sentSocket!==socket){this.sentSocket=socket;socket.send(JSON.stringify(this.pending));}}
      if(message.type==='ack'&&message.id===this.pending?.id){this.pending=null;this.onBusy(false);clearTimeout(this.ackTimer);}
      if(message.type==='error'){if(!message.id||message.id===this.pending?.id){this.pending=null;this.onBusy(false);clearTimeout(this.ackTimer);}this.onError(message.error);}
    };
    socket.onerror=()=>{};
    socket.onclose=event=>{
      if(this.stopped||socket!==this.socket)return;
      clearTimeout(this.ackTimer);
      if(event.code===4001||event.code===4004){this.onStatus('closed');this.onError(event.code===4001?'This seat was opened in another tab. Close that tab or reconnect here.':'This room has expired. Create a new room.');return;}
      this.attempt++;this.onStatus('reconnecting');
      if(this.attempt>6){this.onStatus('closed');this.onError('Could not reconnect. Check your internet connection and tap Reconnect.');return;}
      this.timer=setTimeout(()=>this.connect(),Math.min(1000*2**(this.attempt-1),10000));
    };
  }
  send(action){
    if(this.pending||this.socket?.readyState!==WebSocket.OPEN||!this.room)return false;
    this.pending={id:crypto.randomUUID(),revision:this.room.revision,action};this.onBusy(true);
    this.sentSocket=this.socket;
    this.socket.send(JSON.stringify(this.pending));
    this.ackTimer=setTimeout(()=>{if(this.pending){this.onError('Waiting for the server. Reconnecting to check your last move.');this.socket?.close();}},12000);
    return true;
  }
  reconnect(){this.attempt=0;const old=this.socket;this.socket=null;old?.close();this.connect();}
  close(){this.stopped=true;clearTimeout(this.timer);clearTimeout(this.ackTimer);removeEventListener('offline',this.offline);removeEventListener('online',this.online);this.socket?.close(1000,'Left page');}
}

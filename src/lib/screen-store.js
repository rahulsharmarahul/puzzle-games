import {read,write} from './storage';
import {emptyScreenTime,validScreenTime,mergeScreenTime,addScreenTime} from './screen-time';
export function screenSource(){let id=read('screen-source',null);if(typeof id!=='string'||!/^[-\w]{1,80}$/.test(id)){id=crypto.randomUUID();write('screen-source',id);}return id;}
export function loadScreenTime(id){const value=read('screen:'+id,null);return validScreenTime(value)?value:emptyScreenTime();}
export function saveScreenTime(id,value,local=true){if(!validScreenTime(value))return false;if(JSON.stringify(loadScreenTime(id))===JSON.stringify(value))return true;if(!write('screen:'+id,value))return false;if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('pz-screen-change',{detail:{id,local}}));return true;}
export function mergeStoredScreenTime(id,value,local=true){return saveScreenTime(id,mergeScreenTime(loadScreenTime(id),value),local);}
export function recordScreenTime({profileId,game,start,end}){return saveScreenTime(profileId,addScreenTime(loadScreenTime(profileId),screenSource(),game,start,end));}

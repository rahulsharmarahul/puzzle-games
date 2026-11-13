import {describe,it,expect} from 'vitest';
import {sharedRoster,normalizeFamilyCode} from '../lib/family-sync';
describe('Family roster adoption',()=>{
  it('imports canonical family IDs while preserving original local profiles and active choice',()=>{const meta={active:'old',profiles:[{id:'old',name:'Sam',avatar:'*'}]},head={profiles:[{id:'shared',name:'Sam',avatar:'🐱'}]};const next=sharedRoster(meta,head);expect(next.profiles).toHaveLength(2);expect(next.profiles[0]).toMatchObject({id:'shared',shared:true});expect(next.profiles[1]).toMatchObject({id:'old',name:'Sam'});expect(next.active).toBe('old');});
  it('detaches removed family players without discarding their device profile',()=>{const meta={active:'removed',profiles:[{id:'removed',name:'Alex',avatar:'*',shared:true},{id:'kept',name:'Sam',avatar:'*',shared:true}]};const next=sharedRoster(meta,{profiles:[{id:'kept',name:'Sam new',avatar:'🐱'}]});expect(next.profiles.find(p=>p.id==='removed').shared).toBe(false);expect(next.profiles.find(p=>p.id==='kept').name).toBe('Sam new');expect(next.active).toBe('removed');});
  it('normalizes pasted family codes',()=>{expect(normalizeFamilyCode('abcd-efgh-jklm-npqr')).toBe('ABCDEFGHJKLMNPQR');});
});

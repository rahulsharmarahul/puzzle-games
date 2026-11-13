import {describe,it,expect} from 'vitest';
import {rateLimit,RATE_POLICY} from '../../server/limits';
describe('Family-friendly rate limits',()=>{
  it('resets the old ten-room counter immediately',()=>{const result=rateLimit({minute:1,total:300,hour:1,created:10},'room',100000);expect(result.ok).toBe(true);expect(result.next.created).toBe(1);expect(result.next.version).toBe(2);});
  it('allows 120 room creations per shared internet connection per hour',()=>{let state;for(let i=0;i<120;i++){const result=rateLimit(state,'room',100000);expect(result.ok).toBe(true);state=result.next;}const blocked=rateLimit(state,'room',100000);expect(blocked.ok).toBe(false);expect(blocked.error).toContain('120');expect(rateLimit(blocked.next,'join',100001).ok).toBe(true);expect(rateLimit(blocked.next,'room',3600000).ok).toBe(true);});
  it('keeps separate family creation and minute burst protection',()=>{let state;for(let i=0;i<RATE_POLICY.familiesPerHour;i++)state=rateLimit(state,'family',100000).next;expect(rateLimit(state,'family',100000).ok).toBe(false);expect(rateLimit(state,'sync',100000).ok).toBe(true);state=undefined;for(let i=0;i<300;i++)state=rateLimit(state,'sync',100000).next;expect(rateLimit(state,'join',100000).ok).toBe(false);expect(rateLimit(state,'join',120000).ok).toBe(true);});
});

export const RATE_POLICY={version:2,perMinute:300,roomsPerHour:120,familiesPerHour:20};
export function rateLimit(previous,kind,now=Date.now()) {
  const p=RATE_POLICY,minute=Math.floor(now/60000),hour=Math.floor(now/3600000);
  const next=previous?.version===p.version?{...previous}:{version:p.version,minute,total:0,hour,created:0,families:0};
  if(next.minute!==minute){next.minute=minute;next.total=0;}
  if(next.hour!==hour){next.hour=hour;next.created=0;next.families=0;}
  next.total++;if(kind==='room')next.created++;if(kind==='family')next.families++;
  const perMinute=next.total>p.perMinute,rooms=kind==='room'&&next.created>p.roomsPerHour,families=kind==='family'&&next.families>p.familiesPerHour;
  const retryAfter=perMinute?60-now/1000%60:3600-now/1000%3600;
  return {next,ok:!perMinute&&!rooms&&!families,retryAfter:Math.ceil(retryAfter),error:perMinute?'Too many requests. Try again in a minute.':rooms?'Room limit reached (120 new rooms per hour per internet connection). Existing rooms still work.':families?'Family creation limit reached. Use your existing family code.':''};
}


import express from "express";
import webpush from "web-push";
import cron from "node-cron";

const app=express(); app.use(express.json()); app.use(express.static("."));
const PORT=process.env.PORT||3000;
const PUB=process.env.VAPID_PUBLIC_KEY||"";
const PRIV=process.env.VAPID_PRIVATE_KEY||"";
const SUBJECT=process.env.VAPID_SUBJECT||"mailto:you@example.com";
if(PUB&&PRIV) webpush.setVapidDetails(SUBJECT,PUB,PRIV);

// MVP in-memory store. Replace with Supabase/Postgres for production.
const users=new Map();
const keyOf=s=>s.endpoint;

app.get("/api/config",(req,res)=>res.json({vapidPublicKey:PUB}));
app.post("/api/subscribe",(req,res)=>{
  const {subscription,reminder,timezone}=req.body||{};
  if(!subscription?.endpoint)return res.status(400).json({error:"missing subscription"});
  users.set(keyOf(subscription),{subscription,reminder,timezone:timezone||"Asia/Seoul"});
  res.json({ok:true});
});
app.post("/api/reminder",(req,res)=>res.json({ok:true}));

cron.schedule("* * * * *",async()=>{
  const now=new Date();
  for(const u of users.values()){
    if(!u.reminder?.enabled)continue;
    // For production, use a timezone-aware library (e.g. Luxon) and persistent DB.
    const local=new Intl.DateTimeFormat("en-CA",{timeZone:u.timezone,weekday:"short",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(now);
    const obj=Object.fromEntries(local.map(p=>[p.type,p.value]));
    const dayMap={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
    const hhmm=`${obj.hour}:${obj.minute}`;
    if(u.reminder.days?.includes(dayMap[obj.weekday]) && hhmm===u.reminder.time){
      try{await webpush.sendNotification(u.subscription,JSON.stringify({title:"필사루틴 ✍️",body:"오늘의 필사 시간이 되었습니다. 앱을 열어 오늘 분량을 확인하세요."}));}
      catch(e){if(e.statusCode===404||e.statusCode===410)users.delete(keyOf(u.subscription));}
    }
  }
});
app.listen(PORT,()=>console.log(`필사루틴 running on http://localhost:${PORT}`));

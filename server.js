import express from "express";
import webpush from "web-push";
import cron from "node-cron";

const app=express();
app.use(express.json({limit:"200kb"}));
app.use(express.static("."));

const PORT=process.env.PORT||3000;
const PUB=process.env.VAPID_PUBLIC_KEY||"";
const PRIV=process.env.VAPID_PRIVATE_KEY||"";
const SUBJECT=process.env.VAPID_SUBJECT||"mailto:admin@example.com";

if(PUB&&PRIV){
  webpush.setVapidDetails(SUBJECT,PUB,PRIV);
}

// Runtime subscription store.
// The browser re-registers its subscription whenever the app opens.
// On Render Free, runtime memory is lost if the service spins down/restarts.
const users=new Map();
const lastSent=new Map();
const keyOf=s=>s?.endpoint||"";

app.get("/api/health",(req,res)=>res.json({ok:true,pushConfigured:Boolean(PUB&&PRIV),subscriptions:users.size}));
app.get("/api/config",(req,res)=>res.json({vapidPublicKey:PUB,pushConfigured:Boolean(PUB&&PRIV)}));

app.post("/api/subscribe",(req,res)=>{
  const {subscription,reminder,timezone}=req.body||{};
  if(!subscription?.endpoint) return res.status(400).json({error:"missing subscription"});
  users.set(subscription.endpoint,{
    subscription,
    reminder:reminder||{enabled:false,time:"22:00",days:[1,2,3,4,5,6]},
    timezone:timezone||"Asia/Seoul"
  });
  res.json({ok:true});
});

app.post("/api/reminder",(req,res)=>{
  const {endpoint,reminder,timezone}=req.body||{};
  if(!endpoint) return res.status(400).json({error:"missing endpoint"});
  const u=users.get(endpoint);
  if(!u) return res.status(404).json({error:"subscription not registered; reopen the app and save again"});
  u.reminder=reminder||u.reminder;
  u.timezone=timezone||u.timezone;
  users.set(endpoint,u);
  res.json({ok:true});
});

async function sendPush(u,payload){
  if(!PUB||!PRIV) throw new Error("VAPID keys are not configured");
  return webpush.sendNotification(u.subscription,JSON.stringify(payload),{TTL:300});
}

app.post("/api/test-push",async(req,res)=>{
  const {endpoint}=req.body||{};
  const u=users.get(endpoint);
  if(!u) return res.status(404).json({error:"푸시 구독을 찾을 수 없습니다. 알림 설정을 다시 저장해주세요."});
  try{
    await sendPush(u,{
      title:"성경필사 🔔",
      body:"테스트 알림입니다. 실제 푸시가 정상적으로 연결되었습니다.",
      url:"/"
    });
    res.json({ok:true});
  }catch(e){
    if(e.statusCode===404||e.statusCode===410) users.delete(endpoint);
    console.error("test push failed",e.statusCode,e.body||e.message);
    res.status(500).json({error:"푸시 발송 실패: "+(e.statusCode||e.message)});
  }
});

const dayMap={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};

function localParts(date,timeZone){
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone,
    weekday:"short",
    year:"numeric",month:"2-digit",day:"2-digit",
    hour:"2-digit",minute:"2-digit",hour12:false
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
}

async function dispatchDue(){
  const now=new Date();
  for(const [endpoint,u] of users){
    const r=u.reminder;
    if(!r?.enabled||!r.time||!Array.isArray(r.days)) continue;

    const p=localParts(now,u.timezone||"Asia/Seoul");
    const hhmm=`${p.hour}:${p.minute}`;
    const dow=dayMap[p.weekday];
    if(hhmm!==r.time||!r.days.includes(dow)) continue;

    const stamp=`${p.year}-${p.month}-${p.day}-${hhmm}`;
    if(lastSent.get(endpoint)===stamp) continue;

    try{
      await sendPush(u,{
        title:"성경필사 ✍️",
        body:"오늘의 필사 시간이 되었습니다. 말씀과 함께 하루를 시작해보세요.",
        url:"/"
      });
      lastSent.set(endpoint,stamp);
      console.log("push sent",stamp,endpoint.slice(0,45));
    }catch(e){
      console.error("scheduled push failed",e.statusCode,e.body||e.message);
      if(e.statusCode===404||e.statusCode===410) users.delete(endpoint);
    }
  }
}

// Runs every minute while the Render process is awake.
cron.schedule("* * * * *",()=>{dispatchDue().catch(console.error)});

app.listen(PORT,()=>{
  console.log(`성경필사 server running on port ${PORT}`);
  console.log(`push configured: ${Boolean(PUB&&PRIV)}`);
});
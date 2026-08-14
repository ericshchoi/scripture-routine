
const LS = {
  done: "scripture_done_v1", reminder:"scripture_reminder_v1", custom:"scripture_custom_v1"
};
const $ = s => document.querySelector(s);
const fmtDate = iso => {
  const d=new Date(iso+"T00:00:00");
  return `${d.getMonth()+1}/${d.getDate()}(${["일","월","화","수","목","금","토"][d.getDay()]})`;
};
const todayISO = () => new Date().toLocaleDateString("sv-SE");
let schedule = JSON.parse(localStorage.getItem(LS.custom)||"null") || window.BASE_SCHEDULE;
let done = new Set(JSON.parse(localStorage.getItem(LS.done)||"[]"));
let reminder = JSON.parse(localStorage.getItem(LS.reminder)||'{"enabled":false,"time":"22:00","days":[1,2,3,4,5,6]}');

function currentItem(){
  const today=todayISO();
  return schedule.find(x=>x.date===today) || schedule.find(x=>x.date>today && !done.has(x.date)) || schedule[schedule.length-1];
}
function calcStreak(){
  let n=0, d=new Date();
  for(let i=0;i<400;i++){
    const iso=d.toLocaleDateString("sv-SE");
    if(d.getDay()===0){ d.setDate(d.getDate()-1); continue; }
    if(done.has(iso)){n++; d.setDate(d.getDate()-1);}
    else if(iso===todayISO()){d.setDate(d.getDate()-1);}
    else break;
  }
  return n;
}
function render(){
  const cur=currentItem(), today=todayISO();
  $("#todayLabel").textContent = new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric",weekday:"short"}).format(new Date());
  $("#todayRange").textContent = cur ? cur.range : "계획 완료";
  $("#verseCount").textContent = cur ? `약 ${cur.verses}절 · 일요일은 휴식/보충` : "";
  const isDone=done.has(today);
  $("#completeBtn").classList.toggle("hidden",isDone);
  $("#undoBtn").classList.toggle("hidden",!isDone);
  $("#streakPill").textContent=`🔥 ${calcStreak()}일`;

  const total=schedule.length, doneCount=[...done].filter(x=>schedule.some(s=>s.date===x)).length;
  $("#progressPct").textContent=`${Math.round(doneCount/total*100)}%`;
  $("#doneDays").textContent=doneCount;
  $("#remainingDays").textContent=Math.max(0,total-doneCount);

  $("#planList").innerHTML=schedule.map(x=>`<div class="plan-row ${x.date===today?"today":""} ${done.has(x.date)?"done":""}">
    <span class="date">${fmtDate(x.date)}</span><span class="range">${x.range}</span><span class="check">${done.has(x.date)?"✓":""}</span></div>`).join("");

  $("#notifyToggle").checked=reminder.enabled;
  $("#notifyTime").value=reminder.time;
  document.querySelectorAll(".day").forEach(b=>b.classList.toggle("active",reminder.days.includes(+b.dataset.day)));
}
$("#completeBtn").onclick=()=>{
  done.add(todayISO()); localStorage.setItem(LS.done,JSON.stringify([...done]));
  if("clearAppBadge" in navigator) navigator.clearAppBadge();
  render();
};
$("#undoBtn").onclick=()=>{done.delete(todayISO());localStorage.setItem(LS.done,JSON.stringify([...done]));render();};

const labels=["일","월","화","수","목","금","토"];
$("#dayButtons").innerHTML=labels.map((x,i)=>`<button class="day ${reminder.days.includes(i)?"active":""}" data-day="${i}">${x}</button>`).join("");
$("#dayButtons").onclick=e=>{
  if(!e.target.matches(".day"))return;
  const day=+e.target.dataset.day;
  reminder.days=reminder.days.includes(day)?reminder.days.filter(x=>x!==day):[...reminder.days,day].sort();
  e.target.classList.toggle("active");
};

async function requestNotifications(){
  if(!("Notification" in window)) throw new Error("이 브라우저는 알림을 지원하지 않습니다.");
  const permission=await Notification.requestPermission();
  if(permission!=="granted") throw new Error("알림 권한이 허용되지 않았습니다.");
  const reg=await navigator.serviceWorker.ready;
  // Subscribe only when VAPID public key is provided by deployed server.
  try{
    const cfg=await fetch("/api/config").then(r=>r.ok?r.json():null);
    if(cfg?.vapidPublicKey && reg.pushManager){
      const key=urlBase64ToUint8Array(cfg.vapidPublicKey);
      const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
      await fetch("/api/subscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
        subscription:sub, reminder, timezone:Intl.DateTimeFormat().resolvedOptions().timeZone
      })});
    }
  }catch(e){ console.info("Push server not configured yet:",e); }
}
$("#saveReminder").onclick=async()=>{
  reminder.enabled=$("#notifyToggle").checked;
  reminder.time=$("#notifyTime").value;
  if(reminder.enabled){
    try{ await requestNotifications(); $("#notifyHelp").textContent="알림이 저장되었습니다. 배포 서버가 연결되면 앱을 닫아도 지정 시간에 푸시가 옵니다."; }
    catch(e){ $("#notifyHelp").textContent=e.message; return; }
  }
  localStorage.setItem(LS.reminder,JSON.stringify(reminder));
  try{ await fetch("/api/reminder",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({reminder,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone})}); }catch{}
};
function urlBase64ToUint8Array(base64String){
  const padding="=".repeat((4-base64String.length%4)%4), base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(base64); return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

$("#reflowBtn").onclick=()=>{
  // Preserves references but reassigns remaining existing blocks evenly across remaining workdays.
  const today=todayISO();
  const left=schedule.filter(x=>x.date>=today && !done.has(x.date));
  if(!left.length)return;
  const totalVerses=left.reduce((a,b)=>a+b.verses,0);
  const q=Math.floor(totalVerses/left.length), rem=totalVerses%left.length;
  // This MVP keeps existing reference boundaries; true verse-precise reflow requires scripture index on server.
  $("#notifyHelp").textContent=`남은 ${left.length}일 기준 하루 평균 약 ${Math.round(totalVerses/left.length)}절입니다. 다음 버전에서 절 경계까지 자동 재계산됩니다.`;
};

let deferredPrompt;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").classList.remove("hidden");});
$("#installBtn").onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;}};
if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
render();

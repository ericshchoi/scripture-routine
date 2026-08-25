const LS={progress:"scripture_progress_v2",bookProgress:"scripture_book_progress_v31",history:"scripture_history_v31",reminder:"scripture_reminder_v2",target:"scripture_target_date_v31"};
if(!window.NT_BOOKS||!Array.isArray(window.NT_BOOKS)){throw new Error("NT_BOOKS data missing")}
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],BOOKS=window.NT_BOOKS;
const todayISO=()=>new Date().toLocaleDateString("sv-SE"),fmtDate=iso=>{let d=new Date(iso+"T00:00:00");return `${d.getMonth()+1}/${d.getDate()}(${["일","월","화","수","목","금","토"][d.getDay()]})`},ref=x=>`${x.book} ${x.chapter}:${x.verse}`;
const bookTotals=BOOKS.map(b=>b.chapters.reduce((a,n)=>a+n,0)),TOTAL=bookTotals.reduce((a,n)=>a+n,0);
let targetDate=localStorage.getItem(LS.target)||"2026-12-31";
let bookProgress=JSON.parse(localStorage.getItem(LS.bookProgress)||"null");
// migrate old sequential progress once: previous books become 100%, current book keeps its exact location.
if(!bookProgress){bookProgress=BOOKS.map(()=>({chapter:0,verse:0}));let old=JSON.parse(localStorage.getItem(LS.progress)||"null");if(old&&Number.isInteger(old.completedIndex)){let n=old.completedIndex+1;for(let bi=0;bi<BOOKS.length;bi++){let bt=bookTotals[bi];if(n>=bt){let ch=BOOKS[bi].chapters.length;bookProgress[bi]={chapter:ch,verse:BOOKS[bi].chapters[ch-1]};n-=bt}else if(n>0){let ch=1;while(n>BOOKS[bi].chapters[ch-1]){n-=BOOKS[bi].chapters[ch-1];ch++}bookProgress[bi]={chapter:ch,verse:n};n=0;break}}}localStorage.setItem(LS.bookProgress,JSON.stringify(bookProgress))}
let history=JSON.parse(localStorage.getItem(LS.history)||"[]"),reminder=JSON.parse(localStorage.getItem(LS.reminder)||'{"enabled":false,"time":"22:00","days":[1,2,3,4,5,6]}'),schedule=[],activeBook=0;
function completedInBook(bi){let p=bookProgress[bi]||{chapter:0,verse:0};if(!p.chapter)return 0;let sum=BOOKS[bi].chapters.slice(0,p.chapter-1).reduce((a,n)=>a+n,0);return Math.min(bookTotals[bi],sum+Math.min(p.verse,BOOKS[bi].chapters[p.chapter-1]||0))}
function completedTotal(){return bookProgress.reduce((s,_,bi)=>s+completedInBook(bi),0)}
function progressValue(){return Math.max(0,Math.min(100,completedTotal()/TOTAL*100))}function pctText(){let p=progressValue();return p<10?p.toFixed(1):p.toFixed(0)}
function remainingRefs(){let out=[];BOOKS.forEach((b,bi)=>{let done=completedInBook(bi),k=0;b.chapters.forEach((count,ci)=>{for(let v=1;v<=count;v++){if(k++>=done)out.push({book:b.name,bookIndex:bi,chapter:ci+1,verse:v})}})});return out}
function eligibleDates(){let d=new Date(todayISO()+"T00:00:00"),e=new Date(targetDate+"T00:00:00"),a=[];while(d<=e){if(d.getDay()!==0)a.push(d.toLocaleDateString("sv-SE"));d.setDate(d.getDate()+1)}return a}
function generateSchedule(){let rem=remainingRefs(),dates=eligibleDates();if(!rem.length||!dates.length){schedule=[];return}dates=dates.slice(0,Math.min(dates.length,rem.length));let base=Math.floor(rem.length/dates.length),extra=rem.length%dates.length,idx=0;schedule=dates.map((date,i)=>{let n=base+(i<extra?1:0),part=rem.slice(idx,idx+n);idx+=n;return{date,refs:part,verses:n,range:`${ref(part[0])} ~ ${ref(part[part.length-1])}`}})}
function currentItem(){return schedule.find(x=>x.date===todayISO())||schedule.find(x=>x.date>todayISO())||null}function streak(){let set=new Set(history.map(x=>x.date)),n=0,d=new Date();for(let i=0;i<400;i++){let iso=d.toLocaleDateString("sv-SE");if(d.getDay()===0){d.setDate(d.getDate()-1);continue}if(set.has(iso)){n++;d.setDate(d.getDate()-1)}else if(iso===todayISO())d.setDate(d.getDate()-1);else break}return n}
function renderJourney(p){
  const moving=$("#movingProgress"),bubble=$("#journeyBubble");
  if(!moving||!bubble)return;
  const t=Math.max(0,Math.min(100,p))/100;
  const vw=window.innerWidth;
  let x0,y0,x1,y1;
  if(vw<=600){
    // 일반 스마트폰: 아래 첫 계단부터 십자가 직전까지
    x0=17; y0=7.5; x1=76; y1=66;
  }else if(vw>=700){
    // Z Fold 펼친 화면 / 태블릿: 넓어진 계단 원근에 맞춤
    x0=18; y0=7; x1=79; y1=65;
  }else{
    // 중간 폭은 두 경로를 자연스럽게 보간
    const k=(vw-600)/100;
    x0=17+(18-17)*k; y0=7.5+(7-7.5)*k;
    x1=76+(79-76)*k; y1=66+(65-66)*k;
  }
  moving.style.left=`${x0+(x1-x0)*t}%`;
  moving.style.bottom=`${y0+(y1-y0)*t}%`;
  bubble.textContent=`${pctText()}%`;
}
function splitTreemap(items,x,y,w,h,out=[]){if(!items.length)return out;if(items.length===1){out.push({...items[0],x,y,w,h});return out}let total=items.reduce((s,a)=>s+a.total,0),sum=0,cut=0;for(let i=0;i<items.length;i++){if(sum+items[i].total>total/2&&i>0)break;sum+=items[i].total;cut=i+1}cut=Math.max(1,Math.min(items.length-1,cut));let a=items.slice(0,cut),b=items.slice(cut),ratio=a.reduce((s,z)=>s+z.total,0)/total;if(w>=h){splitTreemap(a,x,y,w*ratio,h,out);splitTreemap(b,x+w*ratio,y,w*(1-ratio),h,out)}else{splitTreemap(a,x,y,w,h*ratio,out);splitTreemap(b,x,y+h*ratio,w,h*(1-ratio),out)}return out}
const BOOK_ABBR=["마","막","눅","요","행","롬","고전","고후","갈","엡","빌","골","살전","살후","딤전","딤후","딛","몬","히","약","벧전","벧후","요일","요이","요삼","유","계"];
function renderTreemap(){let box=$("#bookTreemap");if(!box)return;let items=BOOKS.map((b,bi)=>({bi,name:b.name,total:bookTotals[bi]})),rects=splitTreemap(items,0,0,100,100);box.innerHTML=rects.map(r=>{let done=completedInBook(r.bi),pct=done/r.total*100,abbr=BOOK_ABBR[r.bi];return `<button class="book-tile" data-bi="${r.bi}" aria-label="${r.name}" style="left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%"><span class="done-fill" style="width:${pct}%"></span><span class="book-label"><strong>${abbr}</strong><small>${Math.round(pct)}%</small></span></button>`}).join("")}
function openBookModal(bi){activeBook=bi;let b=BOOKS[bi],p=bookProgress[bi]||{chapter:0,verse:0};$("#bookModalTitle").textContent=b.name;$("#bookModalSummary").textContent=`전체 ${bookTotals[bi].toLocaleString()}절 중 ${completedInBook(bi).toLocaleString()}절 완료`;$("#bookChapterSelect").innerHTML='<option value="0">아직 시작 전</option>'+b.chapters.map((_,i)=>`<option value="${i+1}">${i+1}장</option>`).join("");$("#bookChapterSelect").value=p.chapter||0;fillBookVerses(p.chapter||0,p.verse||0);$("#bookProgressModal").classList.remove("hidden");document.body.style.overflow="hidden"}
function fillBookVerses(ch,sel=0){let s=$("#bookVerseSelect");if(!ch){s.innerHTML='<option value="0">0절</option>';s.disabled=true;return}s.disabled=false;let max=BOOKS[activeBook].chapters[ch-1];s.innerHTML=Array.from({length:max},(_,i)=>`<option value="${i+1}">${i+1}절</option>`).join("");s.value=Math.min(Math.max(1,sel||1),max)}
function closeBookModal(){$("#bookProgressModal").classList.add("hidden");document.body.style.overflow=""}
function saveAll(){localStorage.setItem(LS.bookProgress,JSON.stringify(bookProgress))}
function render(){generateSchedule();let cur=currentItem(),p=progressValue(),completed=completedTotal(),remaining=TOTAL-completed;$("#todayLabel").textContent=new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric",weekday:"short"}).format(new Date());$("#todayRange").textContent=cur?cur.range:(remaining===0?"신약 필사 완료 🎉":"목표 기간을 확인해주세요.");$("#verseCount").textContent=cur?`오늘 ${cur.verses}절을 말씀과 함께 은혜롭게 필사해요.`:"";$("#completeBtn").classList.toggle("hidden",!cur);$("#undoBtn").classList.toggle("hidden",!history.some(x=>x.date===todayISO()));$("#progressPct").textContent=`${pctText()}%`;$("#statusPct").textContent=`${pctText()}%`;$("#progressFraction").textContent=`${completed.toLocaleString()} / ${TOTAL.toLocaleString()}절`;$("#completedVerses").textContent=`${completed.toLocaleString()}절`;$("#remainingDays").textContent=`${schedule.length}일`;$("#dailyAverage").textContent=schedule.length?`${Math.round(remaining/schedule.length)}절`:"0절";$("#doneDays").textContent=`${history.length}일`;$("#remainingVerses").textContent=`${remaining.toLocaleString()}절`;$("#streakPill").textContent=`🔥 ${streak()}일 연속`;$("#progressRing").style.setProperty("--p",p.toFixed(2));renderJourney(p);renderTreemap();$("#planList").innerHTML=schedule.length?schedule.map(x=>`<div class="plan-row ${x.date===todayISO()?"today":""}"><span class="date">${fmtDate(x.date)}</span><span>${x.range} · ${x.verses}절</span></div>`).join(""):`<p class="helper">표시할 남은 계획이 없습니다.</p>`;$("#targetDate").value=targetDate;let td=new Date(targetDate+"T00:00:00");$("#footerTargetDate").textContent=`${td.getFullYear()}년 ${td.getMonth()+1}월 ${td.getDate()}일`;$("#notifyToggle").checked=reminder.enabled;$("#notifyTime").value=reminder.time;$$('.day').forEach(b=>b.classList.toggle('active',reminder.days.includes(+b.dataset.day)))}
$("#bookTreemap").onclick=e=>{let b=e.target.closest('.book-tile');if(b)openBookModal(+b.dataset.bi)};$("#bookChapterSelect").onchange=e=>fillBookVerses(+e.target.value,1);$$('[data-close-book]').forEach(x=>x.onclick=closeBookModal);$("#saveBookProgress").onclick=()=>{let ch=+$("#bookChapterSelect").value,v=+$("#bookVerseSelect").value;bookProgress[activeBook]={chapter:ch,verse:ch?v:0};saveAll();closeBookModal();render()};$("#clearBookProgress").onclick=()=>{bookProgress[activeBook]={chapter:0,verse:0};saveAll();closeBookModal();render()};
$("#saveTargetDate").onclick=()=>{let v=$("#targetDate").value;if(!v)return;let min=todayISO();if(v<min){$("#targetDateHelp").textContent="목표일은 오늘 이후로 선택해주세요.";return}targetDate=v;localStorage.setItem(LS.target,targetDate);$("#targetDateHelp").textContent="목표일을 저장했습니다. 남은 필사량을 다시 계산했습니다.";render()};$("#reflowBtn").onclick=render;
$("#completeBtn").onclick=()=>{let cur=currentItem();if(!cur)return;let snapshot=JSON.parse(JSON.stringify(bookProgress));cur.refs.forEach(r=>{let bi=r.bookIndex,now=completedInBook(bi),candidate=BOOKS[bi].chapters.slice(0,r.chapter-1).reduce((a,n)=>a+n,0)+r.verse;if(candidate>now)bookProgress[bi]={chapter:r.chapter,verse:r.verse}});history=history.filter(x=>x.date!==todayISO());history.push({date:todayISO(),snapshot});saveAll();localStorage.setItem(LS.history,JSON.stringify(history));render()};$("#undoBtn").onclick=()=>{let t=todayISO(),h=history.find(x=>x.date===t);if(!h)return;bookProgress=h.snapshot;history=history.filter(x=>x.date!==t);saveAll();localStorage.setItem(LS.history,JSON.stringify(history));render()};
const labels=["일","월","화","수","목","금","토"];
$("#dayButtons").innerHTML=labels.map((x,i)=>`<button class="day ${reminder.days.includes(i)?"active":""}" data-day="${i}">${x}</button>`).join("");
$("#dayButtons").onclick=e=>{
  if(!e.target.matches(".day"))return;
  let d=+e.target.dataset.day;
  reminder.days=reminder.days.includes(d)?reminder.days.filter(x=>x!==d):[...reminder.days,d].sort();
  e.target.classList.toggle("active");
};

function urlBase64ToUint8Array(base64String){
  const padding="=".repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

async function ensurePushSubscription(){
  if(!("serviceWorker" in navigator)) throw new Error("이 브라우저는 푸시 알림을 지원하지 않습니다.");
  if(!("Notification" in window)) throw new Error("이 브라우저는 알림 권한을 지원하지 않습니다.");

  let permission=Notification.permission;
  if(permission!=="granted"){
    permission=await Notification.requestPermission();
  }
  if(permission!=="granted") throw new Error("알림 권한이 허용되지 않았습니다.");

  const reg=await navigator.serviceWorker.ready;
  if(!reg.pushManager) throw new Error("이 기기에서는 Web Push를 사용할 수 없습니다.");

  const cfg=await fetch("/api/config",{cache:"no-store"}).then(r=>{
    if(!r.ok) throw new Error("푸시 서버 설정을 불러오지 못했습니다.");
    return r.json();
  });
  if(!cfg.vapidPublicKey) throw new Error("서버의 푸시 키가 아직 설정되지 않았습니다.");

  let sub=await reg.pushManager.getSubscription();
  if(!sub){
    sub=await reg.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:urlBase64ToUint8Array(cfg.vapidPublicKey)
    });
  }

  const payload={
    subscription:sub,
    reminder,
    timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Seoul"
  };
  const resp=await fetch("/api/subscribe",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify(payload)
  });
  if(!resp.ok) throw new Error("푸시 구독 저장에 실패했습니다.");

  localStorage.setItem("scripture_push_endpoint_v34",sub.endpoint);
  return sub;
}

function setPushStatus(text,type=""){
  const el=$("#pushStatus");
  if(!el)return;
  el.textContent=text;
  el.className="push-status"+(type?` ${type}`:"");
}

async function refreshPushStatus(){
  if(!("Notification" in window)){setPushStatus("이 브라우저는 푸시 알림을 지원하지 않습니다.","error");return}
  if(Notification.permission==="denied"){setPushStatus("알림 권한이 차단되어 있습니다. 휴대폰 설정에서 허용해주세요.","error");return}
  if(Notification.permission!=="granted"){setPushStatus("알림을 켜고 저장하면 휴대폰 푸시가 활성화됩니다.","warn");return}
  try{
    const reg=await navigator.serviceWorker.ready;
    const sub=await reg.pushManager?.getSubscription();
    setPushStatus(sub?"✅ 푸시 알림이 이 기기에 연결되어 있습니다.":"알림 권한은 있으나 푸시 연결이 필요합니다.","ok");
  }catch{
    setPushStatus("푸시 상태를 확인하지 못했습니다.","warn");
  }
}

$("#saveReminder").onclick=async()=>{
  reminder.enabled=$("#notifyToggle").checked;
  reminder.time=$("#notifyTime").value;
  localStorage.setItem(LS.reminder,JSON.stringify(reminder));

  try{
    if(reminder.enabled){
      await ensurePushSubscription();
      $("#notifyHelp").textContent=`매주 선택한 요일 ${reminder.time}에 실제 푸시 알림을 보내도록 저장했습니다.`;
      setPushStatus("✅ 실제 푸시 알림 활성화 완료","ok");
    }else{
      const endpoint=localStorage.getItem("scripture_push_endpoint_v34");
      await fetch("/api/reminder",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({endpoint,reminder,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Seoul"})
      });
      $("#notifyHelp").textContent="필사 알림을 껐습니다.";
      setPushStatus("알림이 꺼져 있습니다.","warn");
    }
  }catch(e){
    $("#notifyHelp").textContent=e.message;
    setPushStatus(`⚠️ ${e.message}`,"error");
  }
};

$("#testPushBtn").onclick=async()=>{
  const btn=$("#testPushBtn");
  btn.disabled=true;
  const original=btn.textContent;
  btn.textContent="테스트 알림 보내는 중…";
  try{
    const sub=await ensurePushSubscription();
    const r=await fetch("/api/test-push",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({endpoint:sub.endpoint})
    });
    const result=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(result.error||"테스트 알림 발송 실패");
    setPushStatus("✅ 테스트 푸시를 보냈습니다. 잠시 후 휴대폰 알림을 확인하세요.","ok");
  }catch(e){
    setPushStatus(`⚠️ ${e.message}`,"error");
  }finally{
    btn.disabled=false;
    btn.textContent=original;
  }
};
function togglePanel(id,forceOpen=true){let p=$("#"+id);if(!p)return;if(forceOpen)p.classList.add('open');else p.classList.toggle('open');setTimeout(()=>p.scrollIntoView({behavior:'smooth',block:'start'}),50)}$$('[data-target]').forEach(b=>b.onclick=()=>togglePanel(b.dataset.target,false));$("#quickAlarmBtn").onclick=()=>togglePanel('reminderPanel',true);$$('[data-scroll]').forEach(b=>b.onclick=()=>{if(b.dataset.scroll==='today')document.querySelector('.today-card').scrollIntoView({behavior:'smooth'});else window.scrollTo({top:0,behavior:'smooth'})});
let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").classList.remove('hidden')});$("#installBtn").onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null}};
function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true}function setupInstallGuide(){let card=$("#installGuideCard"),modal=$("#installGuideModal"),open=$("#installGuideBtn"),native=$("#nativeInstallBtn");if(!card||!modal||!open)return;if(isStandalone()){card.classList.add('hidden');return}open.onclick=()=>{modal.classList.remove('hidden');document.body.style.overflow='hidden'};modal.querySelectorAll('[data-close-install]').forEach(x=>x.onclick=()=>{modal.classList.add('hidden');document.body.style.overflow=''})}
let scriptureJourneyResize;window.addEventListener('resize',()=>{clearTimeout(scriptureJourneyResize);scriptureJourneyResize=setTimeout(()=>renderJourney(progressValue()),120)});if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js?v=20260826-340');setupInstallGuide();render();

// V3.4: refresh server subscription whenever the installed app is opened.
window.addEventListener("load",()=>{
  refreshPushStatus();
  if(reminder?.enabled && Notification.permission==="granted"){
    ensurePushSubscription().catch(()=>{});
  }
});

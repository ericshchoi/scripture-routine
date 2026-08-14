const LS={progress:"scripture_progress_v2",history:"scripture_history_v2",reminder:"scripture_reminder_v2"};
if(!window.NT_BOOKS || !Array.isArray(window.NT_BOOKS) || window.NT_BOOKS.length<20){
  document.body.innerHTML='<main style="padding:24px;font-family:system-ui"><h2>새 버전 데이터를 불러오지 못했습니다.</h2><p>브라우저 캐시를 새로고침한 뒤 다시 열어주세요.</p></main>';
  throw new Error("NT_BOOKS data missing");
}
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], BOOKS=window.NT_BOOKS, TARGET_END="2026-12-31";
const verses=[], verseIndex=new Map();
BOOKS.forEach((b,bi)=>b.chapters.forEach((count,ci)=>{for(let v=1;v<=count;v++){let o={book:b.name,bookIndex:bi,chapter:ci+1,verse:v};verseIndex.set(`${bi}:${ci+1}:${v}`,verses.length);verses.push(o)}}));
const ref=x=>`${x.book} ${x.chapter}:${x.verse}`, todayISO=()=>new Date().toLocaleDateString("sv-SE");
const fmtDate=iso=>{let d=new Date(iso+"T00:00:00");return `${d.getMonth()+1}/${d.getDate()}(${["일","월","화","수","목","금","토"][d.getDay()]})`};
let saved=JSON.parse(localStorage.getItem(LS.progress)||"null");
if(!saved){let bi=BOOKS.findIndex(b=>b.name==="마가복음");saved={completedIndex:verseIndex.get(`${bi}:7:37`),updatedAt:null}}
let history=JSON.parse(localStorage.getItem(LS.history)||"[]");
let reminder=JSON.parse(localStorage.getItem(LS.reminder)||'{"enabled":false,"time":"22:00","days":[1,2,3,4,5,6]}');
let schedule=[];

function eligibleDates(){let d=new Date(todayISO()+"T00:00:00"),e=new Date(TARGET_END+"T00:00:00"),a=[];while(d<=e){if(d.getDay()!==0)a.push(d.toLocaleDateString("sv-SE"));d.setDate(d.getDate()+1)}return a}
function generateSchedule(){let start=(saved.completedIndex??-1)+1,rem=verses.length-start,dates=eligibleDates();if(rem<=0||!dates.length){schedule=[];return}
 dates=dates.slice(0,Math.min(dates.length,rem));let base=Math.floor(rem/dates.length),extra=rem%dates.length,idx=start;
 schedule=dates.map((date,i)=>{let n=base+(i<extra?1:0),s=idx,e=idx+n-1;idx=e+1;return{date,startIndex:s,endIndex:e,verses:n,range:`${ref(verses[s])} ~ ${ref(verses[e])}`}})}
function currentItem(){return schedule.find(x=>x.date===todayISO())||schedule.find(x=>x.date>todayISO())||null}
function progressValue(){return Math.max(0,Math.min(100,(((saved.completedIndex??-1)+1)/verses.length)*100))}
function pctText(){let p=progressValue();return p<10?p.toFixed(1):p.toFixed(0)}
function streak(){let set=new Set(history.map(x=>x.date)),n=0,d=new Date();for(let i=0;i<400;i++){let iso=d.toLocaleDateString("sv-SE");if(d.getDay()===0){d.setDate(d.getDate()-1);continue}if(set.has(iso)){n++;d.setDate(d.getDate()-1)}else if(iso===todayISO())d.setDate(d.getDate()-1);else break}return n}

function buildStairs(){}
function renderJourney(p){
  const bubble=$("#journeyBubble");
  if(!bubble) return;
  const t=Math.max(0,Math.min(100,p))/100;
  bubble.textContent=`${pctText()}%`;
  bubble.style.left=`${18 + t*56}%`;
  bubble.style.top=`${69 - t*50}%`;
}
function remainingCalendarDays(){return schedule.length}
function render(){
 generateSchedule();
 let cur=currentItem(),cp=verses[saved.completedIndex],p=progressValue(),completed=Math.max(0,(saved.completedIndex??-1)+1),remaining=Math.max(0,verses.length-completed);
 $("#todayLabel").textContent=new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric",weekday:"short"}).format(new Date());
 $("#todayRange").textContent=cur?cur.range:(saved.completedIndex>=verses.length-1?"신약 필사 완료 🎉":"올해 계획 기간이 종료되었습니다.");
 $("#verseCount").textContent=cur?`오늘 ${cur.verses}절을 말씀과 함께 은혜롭게 필사해요.`:"";
 $("#completeBtn").classList.toggle("hidden",!cur); $("#undoBtn").classList.toggle("hidden",!history.some(x=>x.date===todayISO()));
 $("#progressPct").textContent=`${pctText()}%`; $("#statusPct").textContent=`${pctText()}%`;
 $("#progressFraction").textContent=`${completed.toLocaleString()} / ${verses.length.toLocaleString()}절`;
 $("#completedVerses").textContent=`${completed.toLocaleString()}절`;
 $("#remainingDays").textContent=`${remainingCalendarDays()}일`;
 $("#dailyAverage").textContent=schedule.length?`${Math.round(remaining/schedule.length)}절`:"0절";
 $("#doneDays").textContent=`${history.length}일`; $("#remainingVerses").textContent=`${remaining.toLocaleString()}절`;
 $("#streakPill").textContent=`🔥 ${streak()}일 연속`;
 $("#progressRing").style.setProperty("--p",p.toFixed(2));
 renderJourney(p);
 $("#progressSummary").textContent=cp?`현재 완료: ${ref(cp)} · 다음 시작: ${saved.completedIndex+1<verses.length?ref(verses[saved.completedIndex+1]):"완료"}`:"아직 시작 전";
 $("#planList").innerHTML=schedule.length?schedule.map(x=>`<div class="plan-row ${x.date===todayISO()?"today":""}"><span class="date">${fmtDate(x.date)}</span><span>${x.range} · ${x.verses}절</span></div>`).join(""):`<p class="helper">표시할 남은 계획이 없습니다.</p>`;
 $("#notifyToggle").checked=reminder.enabled;$("#notifyTime").value=reminder.time;$$(".day").forEach(b=>b.classList.toggle("active",reminder.days.includes(+b.dataset.day)));
}
function fillBooks(){ $("#bookSelect").innerHTML=BOOKS.map((b,i)=>`<option value="${i}">${b.name}</option>`).join("");let c=verses[saved.completedIndex]||verses[0];$("#bookSelect").value=c.bookIndex;fillCh(c.bookIndex,c.chapter);fillV(c.bookIndex,c.chapter,c.verse)}
function fillCh(bi,sel=1){let b=BOOKS[bi];$("#chapterSelect").innerHTML=b.chapters.map((_,i)=>`<option value="${i+1}">${i+1}장</option>`).join("");$("#chapterSelect").value=Math.min(sel,b.chapters.length)}
function fillV(bi,ch,sel=1){let max=BOOKS[bi].chapters[ch-1];$("#verseSelect").innerHTML=Array.from({length:max},(_,i)=>`<option value="${i+1}">${i+1}절</option>`).join("");$("#verseSelect").value=Math.min(sel,max)}
$("#bookSelect").onchange=e=>{fillCh(+e.target.value,1);fillV(+e.target.value,1,1)};$("#chapterSelect").onchange=e=>fillV(+$("#bookSelect").value,+e.target.value,1);
$("#saveProgressBtn").onclick=()=>{let bi=+$("#bookSelect").value,ch=+$("#chapterSelect").value,v=+$("#verseSelect").value,idx=verseIndex.get(`${bi}:${ch}:${v}`);saved={completedIndex:idx,updatedAt:new Date().toISOString()};localStorage.setItem(LS.progress,JSON.stringify(saved));$("#progressEditor").classList.add("collapsed");render()};
$("#progressEditBtn").onclick=()=>$("#progressEditor").classList.toggle("collapsed");
$("#completeBtn").onclick=()=>{let cur=currentItem();if(!cur)return;let t=todayISO();history=history.filter(x=>x.date!==t);history.push({date:t,prevIndex:saved.completedIndex,endIndex:cur.endIndex,range:cur.range});saved={completedIndex:cur.endIndex,updatedAt:new Date().toISOString()};localStorage.setItem(LS.history,JSON.stringify(history));localStorage.setItem(LS.progress,JSON.stringify(saved));render()};
$("#undoBtn").onclick=()=>{let t=todayISO(),h=history.find(x=>x.date===t);if(!h)return;saved={completedIndex:h.prevIndex,updatedAt:new Date().toISOString()};history=history.filter(x=>x.date!==t);localStorage.setItem(LS.history,JSON.stringify(history));localStorage.setItem(LS.progress,JSON.stringify(saved));render()};

const labels=["일","월","화","수","목","금","토"];$("#dayButtons").innerHTML=labels.map((x,i)=>`<button class="day ${reminder.days.includes(i)?"active":""}" data-day="${i}">${x}</button>`).join("");
$("#dayButtons").onclick=e=>{if(!e.target.matches(".day"))return;let d=+e.target.dataset.day;reminder.days=reminder.days.includes(d)?reminder.days.filter(x=>x!==d):[...reminder.days,d].sort();e.target.classList.toggle("active")};
async function requestNotifications(){if(!("Notification"in window))throw new Error("이 브라우저는 알림을 지원하지 않습니다.");let p=await Notification.requestPermission();if(p!=="granted")throw new Error("알림 권한이 허용되지 않았습니다.")}
$("#saveReminder").onclick=async()=>{reminder.enabled=$("#notifyToggle").checked;reminder.time=$("#notifyTime").value;if(reminder.enabled){try{await requestNotifications()}catch(e){$("#notifyHelp").textContent=e.message;return}}localStorage.setItem(LS.reminder,JSON.stringify(reminder));$("#notifyHelp").textContent="알림 설정을 저장했습니다. 서버 푸시 연결은 다음 단계에서 활성화합니다."};
$("#reflowBtn").onclick=()=>{generateSchedule();render()};
function togglePanel(id,forceOpen=true){let p=$("#"+id);if(!p)return; if(forceOpen)p.classList.add("open");else p.classList.toggle("open");setTimeout(()=>p.scrollIntoView({behavior:"smooth",block:"start"}),50)}
$$("[data-target]").forEach(b=>b.onclick=()=>togglePanel(b.dataset.target,false));
$("#quickAlarmBtn").onclick=()=>togglePanel("reminderPanel",true);
$$("[data-scroll]").forEach(b=>b.onclick=()=>{if(b.dataset.scroll==="today")document.querySelector(".today-card").scrollIntoView({behavior:"smooth"});else window.scrollTo({top:0,behavior:"smooth"})});

let deferredPrompt;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").classList.remove("hidden")});$("#installBtn").onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null}};
if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js?v=20260814-6");
buildStairs();fillBooks();if(saved.updatedAt)$("#progressEditor").classList.add("collapsed");render();
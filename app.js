'use strict';

/* ===== ГЛОБАЛЫ ===== */
let currentUser=null,currentPage='home',currentCategory='all';
let replyTo=null,commentImage=null,commentAudio=null,commentAudioPostId=null;
let isRecordingAudio=false,mediaRecorder=null,audioChunks=[];
let recordingPostId=null,recordingStartedAt=0,recordingTimer=null;
let currentProfileUserId=null,postSubcategory='',pendingProfilePhoto=null;
let searchQuery='',searchMode='users',currentAudio=null,playingVoiceId=null;
let editingPostId=null,editingDraftIdx=null,currentProfileTab='posts';
let feedFilter='all',feedView='single',vkPostType='text',isLoginMode=false;
let storyDraft=null,storyViewerStories=[],storyViewerIndex=0,storyViewerTimer=null;
let dRec=null,dStream=null,dChunks=[],lastPostTap=0,vkPostImages=[];
let userSettings={theme:'light',pattern:'stars','sounds-enabled':true,'splash-enabled':true,'notif-likes':true,'notif-comments':true,'notif-follows':true};

/* ===== ХЕЛПЕРЫ ===== */
function escH(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function escA(s){return String(s??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
function tAgo(ts){const s=Math.floor((Date.now()-ts)/1000);if(s<60)return'только что';if(s<3600)return Math.floor(s/60)+' мин';if(s<86400)return Math.floor(s/3600)+' ч';return Math.floor(s/86400)+' дн'}
function mb32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

let toastT=null;
function toast(text,icon){
let t=document.getElementById('mToast');
if(!t){document.body.insertAdjacentHTML('beforeend','<div class="muse-toast" id="mToast"><span></span><span></span></div>');t=document.getElementById('mToast')}
t.children[0].textContent=icon||'✨';t.children[1].textContent=text;
t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2600);
}

/* ===== ЗВУКИ ===== */
let audioCtx=null;
function playSound(type){
if(userSettings['sounds-enabled']===false)return;
try{
if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
const o=audioCtx.createOscillator(),g=audioCtx.createGain();
o.connect(g);g.connect(audioCtx.destination);
const n=audioCtx.currentTime;
if(type==='like'){o.frequency.setValueAtTime(600,n);o.frequency.exponentialRampToValueAtTime(900,n+.08);g.gain.setValueAtTime(.15,n);g.gain.exponentialRampToValueAtTime(.001,n+.15);o.start(n);o.stop(n+.15)}
if(type==='publish'){o.frequency.setValueAtTime(800,n);o.frequency.setValueAtTime(1200,n+.06);o.frequency.setValueAtTime(1600,n+.12);g.gain.setValueAtTime(.12,n);g.gain.exponentialRampToValueAtTime(.001,n+.25);o.start(n);o.stop(n+.25)}
if(type==='comment'){o.frequency.setValueAtTime(500,n);g.gain.setValueAtTime(.1,n);g.gain.exponentialRampToValueAtTime(.001,n+.1);o.start(n);o.stop(n+.1)}
}catch(e){}
}

/* ===== ЗАСТАВКА ===== */
function initSplash(){
const sp=document.getElementById('splash');
if(!sp)return;
if(userSettings['splash-enabled']===false){sp.remove();return}
const stars=document.getElementById('splashStars');
for(let i=0;i<20;i++){
const s=document.createElement('div');
s.className='splash-star';
s.textContent=['✦','✧','★','✨'][Math.floor(Math.random()*4)];
s.style.left=Math.random()*100+'%';s.style.top=Math.random()*100+'%';
s.style.animationDelay=Math.random()*2+'s';s.style.fontSize=(8+Math.random()*8)+'px';
stars.appendChild(s);
}
const text=document.getElementById('splashText');
text.innerHTML='Muse'.split('').map((l,i)=>'<span class="splash-letter" style="animation-delay:'+(i*.18)+'s">'+l+'</span>').join('');
setTimeout(()=>{sp.classList.add('hide');setTimeout(()=>sp.remove(),700)},2500);
}

/* ===== ПАТТЕРНЫ ===== */
function mkPat(syms,color){
var texts=syms.map(function(s,i){
var x=15+(i%3)*90,y=35+Math.floor(i/3)*75,sz=16+(i%3)*6,r=-15+i*11;
return"%3Ctext x='"+x+"' y='"+y+"' font-size='"+sz+"' fill='"+color+"' transform='rotate("+r+" "+x+" "+y+")'%3E"+s+"%3C/text%3E";
}).join('');
return"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='240'%3E"+texts+"%3C/svg%3E\")";
}
const PATTERNS={
stars:['%E2%98%85','%E2%9C%A6','%E2%9C%A7','%E2%98%85','%E2%9C%A6','%E2%9C%A7','%E2%98%85','%E2%9C%A6'],
hearts:['%E2%99%A1','%E2%99%A5','%E2%99%A1','%E2%99%A1','%E2%99%A5','%E2%99%A1','%E2%99%A5','%E2%99%A1'],
notes:['%E2%99%AA','%E2%99%AB','%E2%99%AA','%E2%99%AA','%E2%99%AB','%E2%99%AA','%E2%99%AB','%E2%99%AA'],
art:['%E2%9C%BF','%E2%9D%80','%E2%9C%8E','%E2%9C%BF','%E2%9D%80','%E2%9C%8E','%E2%9C%BF','%E2%9D%80'],
dream:['%E2%9C%A6','%E2%99%A1','%E2%99%AA','%E2%9C%BF','%E2%9C%A7','%E2%99%A5','%E2%99%AB','%E2%9D%80']
};
function applyPattern(){
var pat=userSettings.pattern||'stars';
var isLight=userSettings.theme==='light';
document.querySelectorAll('.pat-style').forEach(s=>s.remove());
if(pat!=='none'&&PATTERNS[pat]){
var st=document.createElement('style');st.className='pat-style';
st.textContent='body::before{background-image:'+mkPat(PATTERNS[pat],isLight?'rgba(0,0,0,.04)':'rgba(255,255,255,.07)')+'!important}';
document.head.appendChild(st);
}else{
var st2=document.createElement('style');st2.className='pat-style';
st2.textContent='body::before{background-image:none!important}';
document.head.appendChild(st2);
}
}
function applyTheme(t){
var themes=['light','dark'];
document.body.className=themes.includes(t)?'theme-'+t:'theme-light';
userSettings.theme=t;
saveUserSettings();
applyPattern();
}

/* ===== ДАННЫЕ ===== */
const challenges=[
{title:'Песня без слов',desc:'Инструментал',tag:'#без_слов',category:'music'},
{title:'Абстракция эмоций',desc:'Выразите эмоцию',tag:'#эмоции',category:'art'},
{title:'Уличный портрет',desc:'Сфотографируйте',tag:'#портрет',category:'photo'},
{title:'Фото в движении',desc:'Движение',tag:'#движение',category:'photo'},
{title:'Микро-рассказ',desc:'100 слов',tag:'#микро_рассказ',category:'text'},
{title:'Песня без слов',desc:'Инструментал',tag:'#без_слов',category:'music'}
];
const samplePosts=[
{id:1,authorId:'s1',author:'Анна К.',handle:'@anna_art',avatar:'А',timestamp:Date.now()-7200000,type:'image',images:['https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800'],caption:'Серия абстракций.',tags:['живопись'],category:'art',likes:42,comments:[]},
{id:2,authorId:'s2',author:'Максим Д.',handle:'@max_photo',avatar:'М',timestamp:Date.now()-18000000,type:'image',images:['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800'],caption:'Утренний кофе.',tags:['фото'],category:'photo',likes:128,comments:[]}
];
const sampleUsers=[
{id:'s1',name:'Анна К.',username:'@anna_art',avatar:'А',bio:'Художник',photo:null,followers:[],following:[],achievements:[],displayedAchievements:[],lastOnline:Date.now()},
{id:'s2',name:'Максим Д.',username:'@max_photo',avatar:'М',bio:'Фотограф',photo:null,followers:[],following:[],achievements:[],displayedAchievements:[],lastOnline:Date.now()-3600000}
];
const ACH=[
{id:'fp',n:'Первый шаг',d:'Первый пост',ic:'⭐',ck:u=>getUserPosts(u.id).length>=1},
{id:'tp',n:'Активист',d:'10 постов',ic:'📝',ck:u=>getUserPosts(u.id).length>=10},
{id:'ftp',n:'Творец',d:'50 постов',ic:'🎨',ck:u=>getUserPosts(u.id).length>=50},
{id:'hp',n:'Легенда',d:'100 постов',ic:'🏆',ck:u=>getUserPosts(u.id).length>=100},
{id:'tl',n:'Популярный',d:'10 лайков',ic:'❤️',ck:u=>getUserTotalLikes(u.id)>=10},
{id:'fl',n:'Признание',d:'50 лайков',ic:'💖',ck:u=>getUserTotalLikes(u.id)>=50},
{id:'cl',n:'Звезда',d:'100 лайков',ic:'✨',ck:u=>getUserTotalLikes(u.id)>=100},
{id:'tfl',n:'Влиятельный',d:'10 подписчиков',ic:'👥',ck:u=>(u.followers||[]).length>=10},
{id:'ffl',n:'Гуру',d:'50 подписчиков',ic:'🌟',ck:u=>(u.followers||[]).length>=50},
{id:'fc',n:'Комментатор',d:'Первый коммент',ic:'💬',ck:u=>getUserComments(u.name).length>=1},
{id:'tc',n:'Собеседник',d:'10 комментов',ic:'🗨️',ck:u=>getUserComments(u.name).length>=10},
{id:'fs',n:'Свидетель',d:'Первая история',ic:'👁️',ck:u=>{try{return getStories().some(s=>s.authorId===u.id)}catch(e){return false}}},
{id:'fm',n:'Коллекционер',d:'Коллекция',ic:'📚',ck:u=>Object.keys(JSON.parse(localStorage.getItem('muse_mb_'+u.id)||'{}')).length>=1},
{id:'ac',n:'Универсал',d:'Все категории',ic:'🔮',ck:u=>{const c=new Set(getUserPosts(u.id).map(p=>p.category));return['text','photo','art','music','video','design'].every(x=>c.has(x))}},
{id:'ws',n:'Неделя огня',d:'7 дней подряд',ic:'🔥',ck:u=>new Set(getUserPosts(u.id).map(p=>new Date(p.timestamp).toDateString())).size>=7},
{id:'fd',n:'Сомнение',d:'Черновик',ic:'💭',ck:u=>JSON.parse(localStorage.getItem('muse_dr_'+u.id)||'[]').length>=1},
{id:'s_n',n:'???',d:'???',secret:true,ic:'🌙',ck:u=>getUserPosts(u.id).some(p=>new Date(p.timestamp).getHours()<5)},
{id:'s_e',n:'???',d:'???',secret:true,ic:'🌅',ck:u=>getUserPosts(u.id).some(p=>{const h=new Date(p.timestamp).getHours();return h>=5&&h<9})},
{id:'s_m',n:'???',d:'???',secret:true,ic:'⚡',ck:u=>{const d={};getUserPosts(u.id).forEach(p=>{const k=new Date(p.timestamp).toDateString();d[k]=(d[k]||0)+1});return Object.values(d).some(n=>n>=3)},
{id:'s_w',n:'???',d:'???',secret:true,ic:'🤐',ck:u=>getUserPosts(u.id).some(p=>p.type!=='text'&&!p.caption)},
{id:'s_v',n:'???',d:'???',secret:true,ic:'📜',ck:u=>getUserPosts(u.id).some(p=>((p.texts||[]).join('')||'').length>=1000)},
{id:'s_1',n:'???',d:'???',secret:true,ic:'1️⃣',ck:u=>getUserPosts(u.id).some(p=>(p.texts||[]).join('').trim().length===1)},
{id:'s_z',n:'???',d:'???',secret:true,ic:'☀️',ck:u=>getUserPosts(u.id).some(p=>new Date(p.timestamp).getHours()===12)},
{id:'s_5',n:'???',d:'???',secret:true,ic:'📖',ck:u=>getUserPosts(u.id).some(p=>((p.texts||[]).join('')||'').length>=5000)}
];
const TASKS={
text:['Напишите хайку','Микро-рассказ 50 слов','Опишите утро','Стих о цвете','Письмо себе','Звук дождя','Ночь совы','Запах лета','Стих 4 строки','Дневник','Диалог предметов','Вкус детства','Сказка 10 строк','Письмо незнакомцу','День наоборот'],
image:['Снимите зелёное','Фото из окна','Ч/б кадр','Тень','Макро','Еда','Улица','Отражение','Минимализм','Рука','Силуэт','Текстура','Животное','Один цвет','Экспозиция'],
art:['Эмоция','Скетч 5 мин','Портрет по памяти','Круги','Одной линией','Натюрморт','Сон','Свой день','Без лица','Город будущего','Пейзаж сна','5 кругов','Не глядя','Суперсила','Вверх ногами'],
audio:['Мелодия','Звук улицы','3 ноты','Ритм','Кавер','Утро','Открытка','5 нот','Вода','Подкаст','Погода','Бит','Колыбельная','Настроение','Сердце'],
video:['15 сек','Таймлапс','Дневник','Дорога','Реклама','Тишина','Процесс','Счастье','Путь','5 ракурсов','Письмо','Сезоны','Утро','Город','Закат'],
design:['Логотип','Плейлист','Иконка','Постер','Мудборд','Редизайн','Открытка','Аватар','Альбом','Схема','Фильм','Приложение','Упаковка','Будущее','Бренд']
};
const DTL={text:'Текст',image:'Фото',art:'Арт',audio:'Музыка',video:'Видео',design:'Дизайн'};
const DCM={text:'text',image:'photo',art:'art',audio:'music',video:'video',design:'design'};
const TSUB={text:['Поэзия','Проза','Рассказ','Эссе'],image:['Портрет','Пейзаж','Уличное','Предметное'],art:['Живопись','Иллюстрация','Цифровое','Скетч'],audio:['Песня','Инструментал','Электроника','Подкаст'],video:['Клип','Влог','Анимация','Короткометражка'],design:['Графика','UI/UX','Брендинг','Типографика']};
const QUOTES=[
{q:'Вдохновение должно застать тебя за работой.',a:'Пикассо'},
{q:'Творчество — позволить себе ошибаться.',a:'Скотт Адамс'},
{q:'Простота — высшая форма изысканности.',a:'Леонардо'},
{q:'Талант — долгое терпение.',a:'Флобер'},
{q:'Не жди музу.',a:'муза'},
{q:'Всё, что вообразишь, — реально.',a:'Пикассо'},
{q:'Первый черновик — дерьмо. Главное — он есть.',a:'Хемингуэй'},
{q:'Стихи не пишутся — случаются.',a:'Рубинштейн'},
{q:'Ждёшь вдохновения — ты зритель.',a:'Бэнкси'},
{q:'Цвет — клавиша, душа — рояль.',a:'Кандинский'},
{q:'Твори тихо.',a:'муза'},
{q:'Музыка — шум, который думает.',a:'Гюго'},
{q:'Писать — дышать.',a:'Кафка'},
{q:'Дизайн — как работает.',a:'Джобс'},
{q:'Творчество заразительно.',a:'Эйнштейн'},
{q:'Каждый день — холст.',a:'муза'},
{q:'Искусство смывает пыль.',a:'Пикассо'},
{q:'Пустая страница — возможность.',a:'муза'},
{q:'Совершенство — нечего убрать.',a:'Сент-Экзюпери'},
{q:'Муза любит смелых.',a:'муза'}
];
const SPARKS={
music:['🎶','🎵','🎤','🎸'],text:['📖','✍️','💭','🪄'],
photo:['📸','🌅','👁️','✨'],art:['🎨','🖌️','🦋','🌈'],
video:['🎬','⚡','🌀','💫'],design:['📐','🎯','🔷','✏️'],
any:['🔥','💜','🧠','👏','🌟']
};
const SPL={'🎶':'Мелодично!','🎵':'Гармонично','🎤':'Вокал!','🎸':'Рок!','📖':'Литература!','✍️':'Перо!','💭':'Задумался…','🪄':'Магия!','📸':'Кадр!','🌅':'Свет!','👁️':'Глаз-алмаз','✨':'Блеск','🎨':'Палитра!','🖌️':'Мазок!','🦋':'Нежно','🌈':'Краски!','🎬':'Кино!','⚡':'Динамика!','🌀':'Затянуло','💫':'Магия!','📐':'Точно!','🎯':'В точку','🔷':'Чисто','✏️':'Эскиз!','🔥':'Зажгло!','💜':'Тронуло','🧠':'Гениально','👏':'Браво!','🌟':'Звезда!'};
const FAIRY_TIPS=['Попробуй хайку прямо сейчас','Сфотографируй зелёное рядом','Напой мелодию в голове','Нарисуй эмоцию','Опиши звук дождя','Фото из окна','Запиши звук улицы','Письмо себе через год','Нарисуй день в 4 кадрах','Кадр в одном цвете'];
const POPULAR_TAGS=['поэзия','ночь','любовь','муза','город','утро','кофе','мечта','свобода','творчество'];
function pickSpark(pid){
try{const p=getAllPosts().find(x=>String(x.id)===String(pid));
const cat=p?(p.category||''):'';
const pool=(SPARKS[cat]&&Math.random()<.7)?SPARKS[cat]:SPARKS.any;
return pool[Math.floor(Math.random()*pool.length)]}catch(e){return'✨'}
}

/* ===== ХРАНИЛИЩЕ ===== */
function getUsers(){
const sv=JSON.parse(localStorage.getItem('muse_users')||'[]');
const ids=sampleUsers.map(u=>u.id);
return[...sampleUsers,...sv.filter(u=>!ids.includes(u.id))];
}
function saveUsers(users){
const ids=sampleUsers.map(u=>u.id);
localStorage.setItem('muse_users',JSON.stringify(users.filter(u=>!ids.includes(u.id))));
}
function getUserById(id){return getUsers().find(u=>u.id===id)}
function getUserPosts(uid){return getAllPosts().filter(p=>p.authorId===uid)}
function getUserTotalLikes(uid){return getUserPosts(uid).reduce((s,p)=>s+(p.likes||0),0)}
function getUserComments(nm){
const ps=JSON.parse(localStorage.getItem('muse_posts')||'[]');
const out=[];ps.forEach(p=>(p.comments||[]).forEach(c=>{if(c.author===nm)out.push(c)}));
return out;
}
function getAllPosts(){return JSON.parse(localStorage.getItem('muse_posts')||'[]')}
function getCommentsForPost(pid){
const ps=JSON.parse(localStorage.getItem('muse_posts')||'[]');
const p=ps.find(x=>String(x.id)===String(pid));
return p?(p.comments||[]):[];
}
function getStories(){
const sv=JSON.parse(localStorage.getItem('muse_stories')||'[]');
const now=Date.now();
const fr=sv.filter(s=>(s.createdAt||0)>now-86400000);
if(fr.length!==sv.length){
sv.filter(s=>!fr.includes(s)).forEach(s=>delMedia(s.data));
localStorage.setItem('muse_stories',JSON.stringify(fr));
}
return fr;
}
function hasStories(uid){return getStories().some(s=>s.authorId===uid)}
function getUserStories(uid){return getStories().filter(s=>s.authorId===uid).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0))}
function getCW(){return challenges[Math.floor(Date.now()/(7*86400000))%challenges.length]}
function ensureSamples(){
const stored=JSON.parse(localStorage.getItem('muse_posts')||'[]');
const del=JSON.parse(localStorage.getItem('muse_del_samples')||'[]');
const ids=new Set(stored.map(p=>String(p.id)));
let ch=false;
samplePosts.forEach(p=>{if(!ids.has(String(p.id))&&!del.includes(String(p.id))){stored.push({...p,likedBy:[]});ch=true}});
if(ch)localStorage.setItem('muse_posts',JSON.stringify(stored));
}

/* ===== INDEXEDDB ===== */
function openDB(){return new Promise((r,j)=>{
if(!window.indexedDB)return j(new Error('no idb'));
const rq=indexedDB.open('muse_media',1);
rq.onupgradeneeded=()=>{if(!rq.result.objectStoreNames.contains('media'))rq.result.createObjectStore('media')};
rq.onsuccess=()=>r(rq.result);rq.onerror=()=>j(rq.error);
})}
function d2b(d){
const m=String(d||'').match(/^data:([^;,]+)?(?:;base64)?,(.*)$/);
if(!m)return null;
try{const b=atob(m[2]);const a=new Uint8Array(b.length);
for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);
return new Blob([a],{type:m[1]||'application/octet-stream'})}catch(e){return null}
}
async function saveMedia(data,type){
const b=data instanceof Blob?data:d2b(data);
if(!b)throw new Error('bad');
const id='m_'+Date.now()+'_'+Math.random().toString(36).slice(2);
const db=await openDB();
await new Promise((r,j)=>{
const tx=db.transaction('media','readwrite');
tx.objectStore('media').put({blob:b,type:type||b.type},id);
tx.oncomplete=r;tx.onerror=()=>j(tx.error);
});
return'idb:'+id;
}
async function getMedia(ref){
if(!String(ref||'').startsWith('idb:'))return ref;
const db=await openDB();
const id=String(ref).slice(4);
return await new Promise((r,j)=>{
const tx=db.transaction('media','readonly');
const q=tx.objectStore('media').get(id);
q.onsuccess=()=>{const v=q.result;r(v?URL.createObjectURL(v.blob):null)};
q.onerror=()=>j(q.error);
});
}
async function delMedia(ref){
if(!String(ref||'').startsWith('idb:'))return;
try{
const db=await openDB();const id=String(ref).slice(4);
await new Promise((r,j)=>{
const tx=db.transaction('media','readwrite');
tx.objectStore('media').delete(id);
tx.oncomplete=r;tx.onerror=()=>j(tx.error);
});
}catch(e){}
}

/* ===== УВЕДОМЛЕНИЯ / АЧИВКИ ===== */
function getNotifs(){if(!currentUser)return[];return JSON.parse(localStorage.getItem('muse_notif_'+currentUser.id)||'[]')}
function saveNotifs(n){if(currentUser)localStorage.setItem('muse_notif_'+currentUser.id,JSON.stringify(n))}
function addNotif(type,from,postId,text,rid){
if(!from||!rid||from.id===rid)return;
const set=JSON.parse(localStorage.getItem('muse_set_'+rid)||'{}');
if(type==='like'&&set['notif-likes']===false)return;
if(type==='comment'&&set['notif-comments']===false)return;
if(type==='follow'&&set['notif-follows']===false)return;
const k='muse_notif_'+rid;
const n=JSON.parse(localStorage.getItem(k)||'[]');
n.unshift({id:Date.now(),type,fromUserName:from.name,fromUserAvatar:from.avatar,fromUserPhoto:from.photo,postId,commentText:text||'',time:Date.now(),read:false});
localStorage.setItem(k,JSON.stringify(n.slice(0,50)));
if(rid===currentUser?.id)updBadge();
}
function updBadge(){
const unread=getNotifs().filter(n=>!n.read).length;
let b=document.getElementById('notifBadge');
if(!b){
const h=document.querySelector('.nav-item[data-page="notifications"]');
if(!h)return;b=document.createElement('span');b.id='notifBadge';h.appendChild(b);
}
b.textContent=unread>9?'9+':unread;
b.style.display=unread?'block':'none';
}
function markRead(){const n=getNotifs();n.forEach(x=>x.read=true);saveNotifs(n)}
function checkAch(){
if(!currentUser)return;
const users=getUsers();
const me=users.find(u=>u.id===currentUser.id);
if(!me)return;
if(!me.achievements)me.achievements=[];
let news=[];
ACH.forEach(a=>{if(!me.achievements.includes(a.id)&&a.ck(me)){me.achievements.push(a.id);news.push(a)}});
if(news.length){toast('Достижение: '+news.map(a=>a.n).join(', '),'🏆');playSound('publish')}
saveUsers(users);currentUser=me;
localStorage.setItem('muse_cur',JSON.stringify(me));
}
function toggleAch(aid){
if(!requireAuth())return;
var users=getUsers();
var me=users.find(u=>u.id===currentUser.id);
if(!me){me=currentUser;users.push(me)}
if(!me.displayedAchievements)me.displayedAchievements=[];
var i=me.displayedAchievements.indexOf(aid);
if(i>-1){me.displayedAchievements.splice(i,1);toast('Убрано','↩')}
else{
if(me.displayedAchievements.length>=5){toast('Максимум 5','⚠');return}
me.displayedAchievements.push(aid);
var ach=ACH.find(a=>a.id===aid);
toast('В профиль: '+(ach?ach.n:''),'✨');
}
saveUsers(users);currentUser=me;
localStorage.setItem('muse_cur',JSON.stringify(me));
if(currentPage==='achievements')renderAchPage(document.getElementById('mainContent'));
else if(currentPage==='profile')renderProfile(document.getElementById('mainContent'));
}

/* ===== СТРИК ===== */
function getStreak(uid){
const posts=getUserPosts(uid);
if(!posts.length)return 0;
const days=new Set(posts.map(p=>new Date(p.timestamp).toDateString()));
let s=0;const today=new Date();
for(let i=0;i<365;i++){
const d=new Date(today);d.setDate(d.getDate()-i);
if(days.has(d.toDateString()))s++;else if(i>0)break;
}
return s;
}
function streakIcon(s){if(s>=30)return'🌳';if(s>=14)return'🌲';if(s>=7)return'🌸';if(s>=4)return'🌿';if(s>=1)return'🌱';return'✨'}
function streakLabel(s){if(s>=30)return'Мастер';if(s>=14)return'Растёт';if(s>=7)return'Цветёт';if(s>=4)return'Зелень';if(s>=1)return'Росток';return'Начни'}
/* ===== ЛЕНТА ===== */
function renderFeed(c){
const ch=getCW();
let h='';

const d=new Date();
const qi=(d.getFullYear()+d.getMonth()*31+d.getDate())%QUOTES.length;
const mq=QUOTES[qi];
h+='<div class="muse-banner"><div class="muse-banner-label">Муза дня</div><div class="muse-banner-quote">«'+escH(mq.q)+'»</div><div class="muse-banner-author">— '+escH(mq.a)+'</div></div>';

const daily=getDaily();
if(daily.tasks[0]){
h+='<div class="task-ticker" onclick="navigate(\'studio\')"><span>☀️</span><span class="task-ticker-text">'+escH(DTL[daily.tasks[0].cat])+': '+escH(daily.tasks[0].text)+'</span><span class="task-ticker-arrow">›</span></div>';
}

h+='<div class="stories-bar"><div class="story-circle" onclick="openCreate()"><div class="story-ring no" style="width:54px;height:54px;border-radius:50%;border:1.5px dashed var(--bor);display:flex;align-items:center;justify-content:center;"><div style="font-size:18px;color:var(--acc)">+</div></div><div class="story-nm" style="color:var(--acc)">Твоя</div></div>';
if(currentUser){
const me=getUserById(currentUser.id);
const fl=me?(me.following||[]):[];
getUsers().forEach(u=>{
if(hasStories(u.id)&&(u.id===currentUser.id||fl.includes(u.id)){
h+='<div class="story-circle" onclick="openStories(\''+u.id+'\')"><div class="story-ring"><div class="story-ring-i">'+(u.photo?'<img src="'+u.photo+'">':escH(u.avatar))+'</div></div><div class="story-nm">'+escH(u.name.split(' ')[0])+'</div></div>';
}
});
}
h+='</div>';

const daysLeft=7-(Date.now()%(7*86400000))/86400000;
h+='<div class="challenge-banner" onclick="navigate(\'challenges\')"><h3>🔥 '+escH(ch.title)+'</h3><p>'+escH(ch.desc)+'</p><span class="challenge-timer">⏰ осталось '+Math.floor(daysLeft)+' д '+Math.floor((daysLeft%1)*24)+' ч</span></div>';

h+='<div class="view-toggle"><button class="view-btn'+(feedView==='single'?' active':'')+'" onclick="setView(\'single\')">▭</button><button class="view-btn'+(feedView==='grid'?' active':'')+'" onclick="setView(\'grid\')">▦▦</button></div>';
h+='<div class="feed-filters"><button class="filter-btn'+(feedFilter==='all'?' active':'')+'" onclick="setFF(\'all\')">Все</button><button class="filter-btn'+(feedFilter==='following'?' active':'')+'" onclick="setFF(\'following\')">Подписки</button></div>';
h+='<div class="categories">';
[['all','Всё'],['photo','Фото'],['art','Живопись'],['music','Музыка'],['text','Тексты'],['video','Видео'],['design','Дизайн']].forEach(x=>{
h+='<button class="category-chip'+(currentCategory===x[0]?' active':'')+'" onclick="setCat(\''+x[0]+'\')">'+x[1]+'</button>';
});
h+='</div>';

const all=getAllPosts().sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
let dp=all;
if(feedFilter==='following'&&currentUser){
const me=getUserById(currentUser.id);
const fl=me?(me.following||[]):[];
dp=all.filter(p=>fl.includes(p.authorId));
}
if(currentCategory!=='all')dp=dp.filter(p=>p.category===currentCategory);

if(!dp.length){h+='<div class="empty-state"><h2>📖</h2><p>Пустая страница — приглашение.</p></div>'}
else if(feedView==='grid'&&dp.length>1){h+='<div class="feed-grid-2">'+dp.map(renderPost).join('')+'</div>'}
else{h+=dp.map(renderPost).join('')}

c.innerHTML=h;
setTimeout(afterRender,60);
}
function setFF(f){feedFilter=f;renderFeed(document.getElementById('mainContent'));showNow()}
function setCat(c){currentCategory=c;renderFeed(document.getElementById('mainContent'));showNow()}
function setView(v){feedView=v;renderFeed(document.getElementById('mainContent'));showNow()}
function showNow(){setTimeout(()=>{document.querySelectorAll('.post-card').forEach(c=>{c.style.opacity='1';c.style.transform='none';c.style.transition='none'});if(typeof attachCar==='function')attachCar()},40)}

/* ===== СТАГГЕР ===== */
let sObs=null;
function afterRender(){
attachCar();
makeExp();
if(!sObs){
sObs=new IntersectionObserver(es=>{
es.forEach(e=>{
if(e.isIntersecting){
e.target.style.transition='opacity .25s ease,transform .3s cubic-bezier(.2,.8,.3,1)';
e.target.style.opacity='1';e.target.style.transform='none';
sObs.unobserve(e.target);
}
});
},{threshold:.05});
}
document.querySelectorAll('.post-card').forEach(c=>{
if(c.style.opacity!=='1'&&!c.dataset.stg){
c.style.opacity='0';c.style.transform='translateY(12px)';c.dataset.stg='1';
sObs.observe(c);
}else{
c.style.opacity='1';c.style.transform='none';
}
});
}
function makeExp(){
document.querySelectorAll('.text-slide').forEach(s=>{
if(s.scrollHeight>260&&!s.querySelector('.exp-btn')){
s.style.maxHeight='220px';s.style.overflow='hidden';s.style.transition='max-height .35s ease';s.style.position='relative';
const f=document.createElement('div');
f.style.cssText='position:absolute;bottom:0;left:0;right:0;height:70px;background:linear-gradient(transparent,var(--sur));pointer-events:none';
s.appendChild(f);
const b=document.createElement('button');
b.className='exp-btn';b.textContent='📖 Читать далее';
b.style.cssText='display:block;margin:8px auto 0;padding:7px 18px;border:1px solid var(--bor);background:var(--sur);color:var(--acc);border-radius:999px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit';
b.onclick=function(e){e.stopPropagation();s.style.maxHeight=s.scrollHeight+'px';b.remove();setTimeout(()=>{f.remove();s.style.maxHeight='';s.style.overflow=''},380)};
s.appendChild(b);
}
});
}
function attachCar(){
document.querySelectorAll('.carousel-track').forEach(t=>{
if(t.dataset.att)return;t.dataset.att='1';
const pid=t.dataset.pid;
const ctr=document.getElementById('ctr-'+pid);
const dots=t.parentElement.querySelectorAll('.carousel-dot');
function upd(){
const i=Math.round(t.scrollLeft/t.offsetWidth);
if(ctr)ctr.textContent=(i+1)+'/'+t.children.length;
dots.forEach((d,j)=>{d.style.background=j===i?'#fff':'rgba(255,255,255,.4)';d.style.width=j===i?'16px':'5px';d.style.borderRadius=j===i?'3px':'50%'});
}
t.addEventListener('scroll',upd);upd();
});
}

/* ===== ПОСТ ===== */
function renderPost(post){
let items=[];
if(post.type==='image'||['photo','art','design'].includes(post.category))items=post.images||[];
else if(post.type==='video'||post.category==='video')items=post.videos||[];
else if(post.type==='text'||post.category==='text')items=post.texts||[];
else if(post.type==='audio'||post.category==='music')items=post.audios||[];

const lb=Array.isArray(post.likedBy)?post.likedBy:[];
const vl=!!(currentUser&&lb.includes(currentUser.id));
const n=items.length;
let media='';

if(n===1){
if(post.type==='image'||['photo','art','design'].includes(post.category)){
media='<div class="post-media" data-pid="'+post.id+'"><img src="'+items[0]+'" data-pid="'+post.id+'" style="width:100%;border-radius:14px;max-height:520px;object-fit:cover;cursor:pointer"><div class="like-overlay" id="lo-'+post.id+'">❤️</div></div>';
}else if(post.type==='text'||post.category==='text'){
media='<div class="post-media" data-pid="'+post.id+'" style="cursor:pointer"><div class="text-slide" data-pid="'+post.id+'">'+escH(items[0])+'</div><div class="like-overlay" id="lo-'+post.id+'">❤️</div></div>';
}else if(post.type==='video'){
media='<div class="post-media"><video controls playsinline preload="metadata" style="width:100%;border-radius:14px;max-height:520px"><source src="'+items[0]+'"></video></div>';
}else if(post.type==='audio'){
media='<div class="post-media"><div class="audio-slide"><div class="audio-title">'+escH(post.audioTitles?post.audioTitles[0]:'Аудио')+'</div><audio controls preload="metadata" src="'+items[0]+'"></audio></div></div>';
}
}else if(n>1){
let sl='';
if(post.type==='image'||['photo','art','design'].includes(post.category)){
sl=items.map(img=>'<img src="'+img+'" style="width:100%;max-height:520px;object-fit:cover;display:block;pointer-events:auto">').join('');
}else if(post.type==='text'||post.category==='text'){
sl=items.map(t=>'<div class="text-slide">'+escH(t)+'</div>').join('');
}
media='<div class="post-media" data-pid="'+post.id+'" style="position:relative"><div style="position:relative"><div class="carousel-track" data-pid="'+post.id+'" style="display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;cursor:grab">'+sl+'</div><div style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.5);color:#fff;padding:4px 10px;border-radius:10px;font-size:11px;font-weight:700;z-index:5" id="ctr-'+post.id+'">1/'+n+'</div><div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:5px;z-index:5">'+items.map((_,i)=>'<div style="width:5px;height:5px;border-radius:50%;background:'+(i===0?'#fff':'rgba(255,255,255,.4)')+';transition:.25s"></div>').join('')+'</div><div class="like-overlay" id="lo-'+post.id+'">❤️</div></div></div>';
}

const allC=getCommentsForPost(post.id);
const rootC=allC.filter(c=>!c.replyTo);
const cc=allC.length;
const isOwn=currentUser&&post.authorId===currentUser.id;
const author=getUserById(post.authorId);
const ta=tAgo(post.timestamp||Date.now());
const cap=(post.caption&&post.type!=='text')?'<div class="post-caption">'+escH(post.caption)+'</div>':'';
const sub=post.subcategory?'<div style="padding:0 16px 6px;color:var(--acc);font-size:10px;font-weight:700;text-transform:uppercase">'+escH(post.subcategory)+'</div>':'';
let allTags=[...(post.tags||[])];
if(post.category&&!allTags.includes(post.category))allTags.push(post.category);
if(post.subcategory&&!allTags.includes(post.subcategory))allTags.push(post.subcategory);
const tags=allTags.length?'<div class="post-tags">'+allTags.map(t=>'<span class="tag" onclick="searchTag(\''+escA(t)+'\')">#'+escH(t)+'</span>').join('')+'</div>':'';

let menu='<div id="pm-'+post.id+'" style="position:absolute;top:50px;right:10px;background:var(--sur);border:1px solid var(--bor);border-radius:12px;box-shadow:0 8px 28px rgba(0,0,20,.15);z-index:50;display:none;min-width:140px;overflow:hidden">';
menu+='<div onclick="addToMoodboard('+post.id+')" style="padding:10px 14px;cursor:pointer;font-size:13px;color:var(--txt)">📚 Коллекция</div>';
if(isOwn){
menu+='<div onclick="editPost('+post.id+')" style="padding:10px 14px;cursor:pointer;font-size:13px;color:var(--txt)">✏️ Изменить</div>';
menu+='<div onclick="pinPost('+post.id+')" style="padding:10px 14px;cursor:pointer;font-size:13px;color:var(--txt)">📌 Закрепить</div>';
menu+='<div onclick="deletePost('+post.id+')" style="padding:10px 14px;cursor:pointer;font-size:13px;color:#ef4444">🗑 Удалить</div>';
}
menu+='</div>';

const hasSt=hasStories(post.authorId);

return'<div class="post-card" id="pc-'+post.id+'">'
+'<div class="post-header" onclick="openProfile(\''+post.authorId+'\')">'
+'<div class="post-avatar'+(hasSt?' sr':'')+'" onclick="event.stopPropagation();'+(hasSt?'openStories(\''+post.authorId+'\')':'')+'">'
+(author&&author.photo?'<img src="'+author.photo+'">':'<span>'+escH((author&&author.avatar)||post.avatar||'?')+'</span>')+'</div>'
+'<div class="post-header-info"><div class="post-author-name">'+escH(post.author)+'</div><div class="post-author-handle">'+escH(post.handle||'')+' · '+ta+'</div></div>'
+(isOwn?'<button class="post-menu-btn" onclick="event.stopPropagation();togglePM('+post.id+')">⋮</button>':'')
+'</div>'+menu+media+cap+sub+tags
+'<div class="post-actions">'
+'<button onclick="toggleLike('+post.id+')" id="lk-'+post.id+'" style="color:'+(vl?'#ef4444':'var(--mut)')+'">'
+'<svg fill="'+(vl?'currentColor':'none')+'" stroke="currentColor" viewBox="0 0 24 24" style="width:20px;height:20px"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg><span>'+(post.likes||0)+'</span></button>'
+'<button onclick="toggleComments('+post.id+')" style="color:var(--mut)">💬<span>'+cc+'</span></button>'
+'<button onclick="sharePost('+post.id+')" style="color:var(--mut);margin-left:auto">↗</button></div>'
+'<div id="cm-'+post.id+'" class="comments-section">'
+'<div id="cml-'+post.id+'">'+rootC.map(c=>renderComment(c,post.id,allC)).join('')+'</div>'
+'<div id="ri-'+post.id+'" style="display:none;align-items:center;justify-content:space-between;background:rgba(124,58,237,.06);padding:5px 10px;border-radius:8px;font-size:11px;color:var(--acc);margin-bottom:6px"><span></span><button onclick="cancelReply('+post.id+')" style="background:none;border:none;color:var(--acc);cursor:pointer;font-size:16px">×</button></div>'
+'<div class="comment-input-wrapper"><div class="comment-input-container">'
+'<input type="text" id="ci-'+post.id+'" placeholder="'+(currentUser?'Комментарий...':'Войдите')+'"'+(currentUser?'':' onclick="showFullAuth(\'login\')" readonly')+'>'
+'<button class="c-btn" style="right:36px" onclick="'+(currentUser?'attachImg('+post.id+')':'showFullAuth(\'login\')')+'"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3"/></svg></button>'
+'<button class="c-btn" style="right:2px" onclick="'+(currentUser?'toggleRec('+post.id+')':'showFullAuth(\'login\')')+'"><svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>'
+'<div id="rs-'+post.id+'" class="c-rec"><i></i><span>Запись</span><span style="margin-left:auto" id="rt-'+post.id+'">00:00</span></div>'
+'<div id="ap-'+post.id+'" style="display:none;margin-top:6px"><div style="display:flex;align-items:center;gap:8px"><button onclick="toggleVP('+post.id+')" id="vp-'+post.id+'" style="width:30px;height:30px;border-radius:50%;background:var(--sur2);color:var(--acc);border:1px solid var(--bor);cursor:pointer;font-size:12px">▶</button><span style="font-size:11px;color:var(--mut)">Голосовое</span><button onclick="rmCA('+post.id+')" style="background:#ef4444;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer">×</button></div></div>'
+'</div><button onclick="'+(currentUser?'addComment('+post.id+')':'showFullAuth(\'login\')')+'" class="comment-submit">➤</button></div></div></div>';
}

/* ===== МЕНЮ ПОСТА ===== */
function togglePM(pid){
document.querySelectorAll('[id^="pm-"]').forEach(m=>{if(m.id!=='pm-'+pid)m.style.display='none'});
const m=document.getElementById('pm-'+pid);
if(m)m.style.display=m.style.display==='block'?'none':'block';
}
function pinPost(pid){
const ps=JSON.parse(localStorage.getItem('muse_posts')||'[]');
const p=ps.find(x=>x.id===pid);
if(p){p.pinned=!p.pinned;localStorage.setItem('muse_posts',JSON.stringify(ps));toast(p.pinned?'Закреплено':'Откреплено','📌')}
document.querySelectorAll('[id^="pm-"]').forEach(m=>m.style.display='none');
}
function editPost(pid){
document.querySelectorAll('[id^="pm-"]').forEach(m=>m.style.display='none');
const post=getAllPosts().find(p=>p.id===pid);
if(!post)return;
const opts={postId:pid,title:'Редактирование',text:post.caption||(post.texts||[]).join('\n\n')||'',tags:(post.tags||[]).join(', '),images:[]};
if(post.images)post.images.forEach(d=>opts.images.push({data:d}));
if(post.videos)post.videos.forEach(d=>opts.images.push({data:d,isVideo:true}));
if(post.audios)post.audios.forEach((d,i)=>opts.images.push({data:d,title:(post.audioTitles||[])[i]||'Трек '+(i+1),isAudio:true}));
openEditor(post.type||'text',post.subcategory||'',opts);
}
function deletePost(pid){
if(!requireAuth())return;
if(!confirm('Удалить?'))return;
const ps=JSON.parse(localStorage.getItem('muse_posts')||'[]');
const rem=ps.filter(p=>p.id!==pid);
if(samplePosts.some(sp=>String(sp.id)===String(pid))){
const del=JSON.parse(localStorage.getItem('muse_del_samples')||'[]');
if(!del.includes(String(pid)))del.push(String(pid));
localStorage.setItem('muse_del_samples',JSON.stringify(del));
}
localStorage.setItem('muse_posts',JSON.stringify(rem));
document.querySelectorAll('[id^="pm-"]').forEach(m=>m.style.display='none');
if(currentPage==='home')renderFeed(document.getElementById('mainContent'));
else if(currentPage==='profile')renderProfile(document.getElementById('mainContent'));
toast('Удалён','🗑');
}

/* ===== ЛАЙК ===== */
function toggleLike(pid){
if(!requireAuth())return;
const ps=JSON.parse(localStorage.getItem('muse_posts')||'[]');
const post=ps.find(p=>String(p.id)===String(pid));
if(!post)return;
post.likedBy=Array.isArray(post.likedBy)?post.likedBy:[];
const idx=post.likedBy.indexOf(currentUser.id);
const btn=document.getElementById('lk-'+pid);
const svg=btn?btn.querySelector('svg'):null;
const span=btn?btn.querySelector('span'):null;
if(idx>=0){
post.likedBy.splice(idx,1);
post.likes=Math.max(0,(post.likes||0)-1);
localStorage.setItem('muse_posts',JSON.stringify(ps));
if(btn)btn.style.color='var(--mut)';
if(svg)svg.setAttribute('fill','none');
if(span)span.textContent=post.likes;
}else{
post.likedBy.push(currentUser.id);
post.likes=(post.likes||0)+1;
localStorage.setItem('muse_posts',JSON.stringify(ps));
const author=getUserById(post.authorId);
if(author&&author.id!==currentUser.id)addNotif('like',currentUser,post.id,'',author.id);
checkAch();
if(btn)btn.style.color='#ef4444';
if(svg)svg.setAttribute('fill','currentColor');
if(span)span.textContent=post.likes;
if(svg){svg.style.animation='none';void svg.offsetWidth;svg.style.animation='heartPop .4s cubic-bezier(.2,.9,.3,1.3)'}
playSound('like');
const spark=pickSpark(pid);
if(btn){
const el=document.createElement('span');
el.className='spark-fly';el.textContent=spark;
btn.appendChild(el);
setTimeout(()=>el.remove(),950);
toast(SPL[spark]||'',spark);
}
}
}

/* Двойной тап — на фото И на текст */
document.addEventListener('click',function(e){
const img=e.target.closest('.post-media img')||e.target.closest('.text-slide');
if(!img)return;
const pid=img.dataset.pid||img.closest('.post-media')?.dataset.pid;
if(!pid)return;
const now=Date.now();
if(now-lastPostTap<350&&now-lastPostTap>50){
const ps=JSON.parse(localStorage.getItem('muse_posts')||'[]');
const post=ps.find(p=>String(p.id)===String(pid));
if(post&&currentUser){
post.likedBy=Array.isArray(post.likedBy)?post.likedBy:[];
if(!post.likedBy.includes(currentUser.id)){
post.likedBy.push(currentUser.id);
post.likes=(post.likes||0)+1;
localStorage.setItem('muse_posts',JSON.stringify(ps));
const btn=document.getElementById('lk-'+pid);
if(btn){
btn.style.color='#ef4444';
const svg=btn.querySelector('svg');
if(svg)svg.setAttribute('fill','currentColor');
const sp=btn.querySelector('span');
if(sp)sp.textContent=post.likes;
svg.style.animation='none';void svg.offsetWidth;svg.style.animation='heartPop .4s cubic-bezier(.2,.9,.3,1.3)';
}
const lo=document.getElementById('lo-'+pid);
if(lo){lo.classList.remove('animate');void lo.offsetWidth;lo.classList.add('animate')}
playSound('like');
const author=getUserById(post.authorId);
if(author&&author.id!==currentUser.id)addNotif('like',currentUser,post.id,'',author.id);
checkAch();
}
}
lastPostTap=0;
}else{lastPostTap=now}
});

/* ===== КОММЕНТАРИИ ===== */
function toggleComments(pid){
const s=document.getElementById('cm-'+pid);
if(!s)return;
if(s.style.display!=='block'){
s.style.display='block';
s.style.opacity='0';s.style.maxHeight='0px';s.style.overflow='hidden';
requestAnimationFrame(()=>requestAnimationFrame(()=>{
s.style.transition='opacity .2s ease,max-height .25s ease';
s.style.opacity='1';s.style.maxHeight=(s.scrollHeight+30)+'px';
setTimeout(()=>{s.style.maxHeight='';s.style.overflow=''},300);
}));
}else{
s.style.transition='opacity .15s ease,max-height .2s ease';
s.style.opacity='0';s.style.maxHeight='0px';s.style.overflow='hidden';
setTimeout(()=>{s.style.display='none';s.style.opacity='';s.style.maxHeight='';s.style.overflow=''},200);
}
}
function renderComment(c,pid,allC){
const replies=allC.filter(x=>x.replyTo===c.id);
const isOwn=currentUser&&c.author===currentUser.name;
const an=c.anonymous;
const aname=an?'Аноним':c.author;
const img=c.image?'<img src="'+c.image+'" class="c-image" onclick="openPV(this.src)">':'';
const txt=c.text?'<div class="c-text">'+escH(c.text)+'</div>':'';
const aud=c.audio?'<div style="display:flex;align-items:center;gap:8px;margin-top:4px"><button class="c-audio-btn" onclick="toggleCVP(\''+c.id+'\')">▶</button><span style="font-size:10px;color:var(--mut)">голосовое</span></div>':'';

let h='<div class="comment">'
+'<div class="c-avatar">'+(an?'?':escH(c.avatar||'?'))+'</div>'
+'<div class="c-content">'
+'<div class="c-header"><span class="c-name">'+escH(aname)+'</span><span class="c-time">· '+tAgo(c.time)+'</span></div>'
+txt+aud+img
+'<button class="c-reply-btn" onclick="startReply('+pid+',\''+escA(aname)+'\','+c.id+')">Ответить</button></div>'
+(isOwn?'<button class="c-del-btn" onclick="delComment('+pid+','+c.id+')">×</button>':'')+'</div>';

replies.forEach(r=>{
const isR=currentUser&&r.author===currentUser.name;
const rN=r.anonymous?'Аноним':r.author;
const rI=r.image?'<img src="'+r.image+'" class="c-image" onclick="openPV(this.src)">':'';
const rT=r.text?'<div class="c-text">'+escH(r.text)+'</div>':'';
h+='<div class="comment reply">'
+'<div class="c-avatar">'+(r.anonymous?'?':escH(r.avatar||'?'))+'</div>'
+'<div class="c-content">'
+'<div class="c-header"><span class="c-name">'+escH(rN)+'</span><span class="c-time">· '+tAgo(r.time)+'</span></div>'
+rT+rI
+'<button class="c-reply-btn" onclick="startReply('+pid+',\''+escA(rN)+'\','+c.id+')">Ответить</button></div>'
+(isR?'<button class="c-del-btn" onclick="delComment('+pid+','+r.id+')">×</button>':'')+'</div>';
});
return h;
}
function findCA(cid){
const ps=JSON.parse(localStorage.getItem('muse_posts')||'[]');
for(const p of ps){
const cs=p.comments||[];
for(let j=0;j<cs.length;j++){
if(String(cs[j].id)===String(cid)&&cs[j].audio)return cs[j].audio;
}
}
return null;
}
function toggleCVP(cid){
if(playingVoiceId===cid&&currentAudio){currentAudio.pause();currentAudio=null;playingVoiceId=null;return}
if(currentAudio){currentAudio.pause();currentAudio=null;playingVoiceId=null}
const src=findCA(cid);
if(!src){toast('Недоступно','⚠');return}
try{
currentAudio=new Audio(src);playingVoiceId=cid;
currentAudio.play().catch(()=>{currentAudio=null;playingVoiceId=null});
currentAudio.onended=()=>{currentAudio=null;playingVoiceId=null};
}catch(e){}
}
function toggleVP(pid){
if(!commentAudio||commentAudioPostId!==pid)return;
if(playingVoiceId==='p-'+pid&&currentAudio){currentAudio.pause();currentAudio=null;playingVoiceId=null;return}
if(currentAudio)currentAudio.pause();
try{
currentAudio=new Audio(commentAudio);playingVoiceId='p-'+pid;
currentAudio.play().catch(()=>{currentAudio=null;playingVoiceId=null});
currentAudio.onended=()=>{currentAudio=null;playingVoiceId=null};
}catch(e){}
}
function delComment(pid,cid){
if(!requireAuth())return;
if(!confirm('Удалить?'))return;
const ps=JSON.parse(localStorage.getItem('muse_posts')||'[]');
const p=ps.find(x=>String(x.id)===String(pid));
if(p&&p.comments){
p.comments=p.comments.filter(c=>c.id!==cid&&c.replyTo!==cid);
localStorage.setItem('muse_posts',JSON.stringify(ps));
}
if(currentPage==='home')renderFeed(document.getElementById('mainContent'));
setTimeout(()=>{const s=document.getElementById('cm-'+pid);if(s)s.style.display='block'},50);
}
function startReply(pid,name,cid){
if(!requireAuth())return;
replyTo={postId:pid,author:name,commentId:cid};
const ind=document.getElementById('ri-'+pid);
if(ind){ind.style.display='flex';ind.querySelector('span').textContent='Ответ @'+name}
const inp=document.getElementById('ci-'+pid);
if(inp)inp.focus();
}
function cancelReply(pid){
replyTo=null;
const ind=document.getElementById('ri-'+pid);
if(ind)ind.style.display='none';
}
function attachImg(pid){
let inp=document.getElementById('cf-'+pid);
if(!inp){
inp=document.createElement('input');
inp.type='file';inp.id='cf-'+pid;inp.accept='image/*';inp.style.display='none';
inp.onchange=function(e){handleCImg(e,pid)};
document.body.appendChild(inp);
}
inp.click();
}
function handleCImg(ev,pid){
const f=ev.target.files[0];
if(!f)return;
const r=new FileReader();
r.onload=e=>{
const img=new Image();
img.onload=()=>{
const c=document.createElement('canvas');
const mx=600;let w=img.width,h=img.height;
if(w>h&&w>mx){h=h*mx/w;w=mx}else if(h>mx){w=w*mx/h;h=mx}
c.width=w;c.height=h;
c.getContext('2d').drawImage(img,0,0,w,h);
commentImage=c.toDataURL('image/jpeg',.8);
};
img.src=e.target.result;
};
r.readAsDataURL(f);
}
async function toggleRec(pid){
if(!requireAuth())return;
const st=document.getElementById('rs-'+pid);
const tm=document.getElementById('rt-'+pid);
if(isRecordingAudio){
if(mediaRecorder&&mediaRecorder.state!=='inactive')mediaRecorder.stop();
isRecordingAudio=false;clearInterval(recordingTimer);
if(st)st.classList.remove('on');
return;
}
try{
const stream=await navigator.mediaDevices.getUserMedia({audio:true});
recordingPostId=pid;recordingStartedAt=Date.now();
mediaRecorder=new MediaRecorder(stream);audioChunks=[];
mediaRecorder.ondataavailable=e=>{if(e.data&&e.data.size)audioChunks.push(e.data)};
mediaRecorder.onstop=()=>{
const blob=new Blob(audioChunks,{type:audioChunks[0]?.type||'audio/webm'});
const r=new FileReader();
r.onload=e=>{
commentAudio=e.target.result;commentAudioPostId=pid;
const ap=document.getElementById('ap-'+pid);
if(ap)ap.style.display='block';
};
r.readAsDataURL(blob);
stream.getTracks().forEach(t=>t.stop());
};
mediaRecorder.start(250);isRecordingAudio=true;
if(st)st.classList.add('on');
if(tm)tm.textContent='00:00';
clearInterval(recordingTimer);
recordingTimer=setInterval(()=>{
if(tm){const s=Math.floor((Date.now()-recordingStartedAt)/1000);tm.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
},250);
}catch(e){toast('Микрофон недоступен','⚠')}
}
function rmCA(pid){
commentAudio=null;commentAudioPostId=null;
const p=document.getElementById('ap-'+pid);
if(p)p.style.display='none';
}
function addComment(pid){
if(!requireAuth())return;
const input=document.getElementById('ci-'+pid);
if(!input)return;
const text=input.value.trim();
if(!text&&!commentImage&&!commentAudio)return;
let rta=null;
if(replyTo&&replyTo.postId===pid){
const allC=getCommentsForPost(pid);
const parent=allC.find(c=>c.id===replyTo.commentId);
if(parent)rta=parent.author;
}
const ps=JSON.parse(localStorage.getItem('muse_posts')||'[]');
const p=ps.find(x=>String(x.id)===String(pid));
if(!p)return;
const c={id:Date.now(),author:currentUser.name,avatar:currentUser.avatar,text,image:commentImage||null,audio:commentAudio||null,replyTo:replyTo&&replyTo.postId===pid?replyTo.commentId:null,replyToAuthor:rta,time:Date.now()};
if(!p.comments)p.comments=[];
p.comments.push(c);
localStorage.setItem('muse_posts',JSON.stringify(ps));
const pa=getUserById(p.authorId);
if(pa)addNotif('comment',currentUser,pid,text,pa.id);
input.value='';
commentImage=null;commentAudio=null;commentAudioPostId=null;replyTo=null;
const list=document.getElementById('cml-'+pid);
if(list){
const allC2=getCommentsForPost(pid);
const rootC=allC2.filter(x=>!x.replyTo);
list.innerHTML=rootC.map(x=>renderComment(x,pid,allC2)).join('');
}
const cb=document.querySelector('#pc-'+pid+' button[onclick*="toggleComments"]');
if(cb){const cs=cb.querySelector('span');if(cs)cs.textContent=p.comments.length}
checkAch();playSound('comment');
toast('Отправлено','💬');
}
function searchTag(t){searchQuery=t;searchMode='tags';navigate('explore')}
function sharePost(pid){
const post=getAllPosts().find(p=>p.id===pid);
if(!post)return;
if(navigator.share){navigator.share({title:'Muse',text:post.caption||'',url:location.href}).catch(()=>{})}
else{navigator.clipboard.writeText(location.href).then(()=>toast('Скопировано','📋')).catch(()=>{})}
}
/* ===== ПРОФИЛЬ ===== */
function renderProfile(c){
if(!currentUser){showFullAuth('login');return}
const uid=currentProfileUserId||currentUser.id;
let user=getUserById(uid);
if(!user&&uid===currentUser.id)user=currentUser;
if(!user){c.innerHTML='<div class="empty-state"><p>Недоступен</p></div>';return}
const isOwn=String(uid)===String(currentUser.id);
const me=getUserById(currentUser.id)||currentUser;
const fl=me.following||[];
const isF=fl.includes(uid);
const posts=getUserPosts(uid).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
const pinned=posts.filter(p=>p.pinned);
const unp=posts.filter(p=>!p.pinned);
const fc=(user.followers||[]).length;
const fic=(user.following||[]).length;
const uAch=user.achievements||[];
const dAch=user.displayedAchievements||[];
const drafts=isOwn?JSON.parse(localStorage.getItem('muse_dr_'+uid)||'[]'):[];
const mbs=isOwn?JSON.parse(localStorage.getItem('muse_mb_'+uid)||'{}'):{};
const hasSt=hasStories(uid);
const streak=getStreak(uid);
const sIcon=streakIcon(streak);

let h='<div class="profile-header">';
h+='<div class="profile-av-w">';
if(hasSt){
h+='<div class="p-av sr" style="cursor:pointer" onclick="openStories(\''+uid+'\')">';
h+=(user.photo?'<img src="'+user.photo+'">':'<span>'+escH(user.avatar)+'</span>')+'</div>';
}else{
h+='<div class="p-av">'+(user.photo?'<img src="'+user.photo+'">':'<span>'+escH(user.avatar)+'</span>')+'</div>';
}
h+='</div>';
h+='<div class="p-name">'+escH(user.name)+'</div>';
h+='<div class="p-handle">'+escH(user.username||'')+'</div>';
if(user.bio)h+='<div class="p-bio">'+escH(user.bio)+'</div>';
h+='<div style="display:flex;justify-content:center;margin-bottom:12px"><div class="streak-badge"><span>'+sIcon+'</span>'+streak+' дн</div></div>';
h+='<div class="p-stats"><div class="p-stat"><b>'+posts.length+'</b><i>публикаций</i></div><div class="p-stat"><b>'+fic+'</b><i>подписок</i></div><div class="p-stat"><b>'+fc+'</b><i>подписчиков</i></div></div>';
h+='<div class="p-buttons">';
if(isOwn){
h+='<button class="p-btn p-btn-primary" onclick="openEditModal()">Редактировать</button>';
h+='<button class="p-btn p-btn-secondary" onclick="navigate(\'achievements\')">Достижения</button>';
}else{
h+='<button class="p-btn '+(isF?'p-btn-secondary':'p-btn-primary')+'" onclick="toggleFollow(\''+uid+'\')">'+(isF?'Вы подписаны':'Подписаться')+'</button>';
}
h+='</div>';
if(dAch.length){
h+='<div class="profile-achievements"><div class="pa-title">Достижения</div><div class="pa-badges">';
dAch.forEach(aid=>{
const a=ACH.find(x=>x.id===aid);
if(a&&uAch.includes(aid))h+='<div class="pa-badge">'+a.ic+' '+escH(a.n)+'</div>';
});
h+='</div></div>';
}
h+='</div>';

h+='<div class="profile-tabs">';
h+='<button class="profile-tab'+(currentProfileTab==='posts'?' active':'')+'" onclick="setPT(\'posts\',this)">Публикации</button>';
if(isOwn)h+='<button class="profile-tab'+(currentProfileTab==='drafts'?' active':'')+'" onclick="setPT(\'drafts\',this)">Черновики ('+drafts.length+')</button>';
if(isOwn)h+='<button class="profile-tab'+(currentProfileTab==='moodboards'?' active':'')+'" onclick="setPT(\'moodboards\',this)">Коллекции ('+Object.keys(mbs).length+')</button>';
h+='</div><div id="ptc"></div>';

c.innerHTML=h;
renderPTab('posts');
setTimeout(afterRender,60);
}
function setPT(t,btn){
currentProfileTab=t;
document.querySelectorAll('.profile-tab').forEach(x=>x.classList.remove('active'));
if(btn)btn.classList.add('active');
renderPTab(t);
}
function renderPTab(t){
const ptc=document.getElementById('ptc');
if(!ptc)return;
const uid=currentProfileUserId||currentUser.id;
if(t==='posts'){
const posts=getUserPosts(uid).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
const pin=posts.filter(p=>p.pinned);
const unp=posts.filter(p=>!p.pinned);
let h='';
if(pin.length)h+='<div class="pinned-section"><div class="pinned-title">📌 Избранное</div>'+pin.map(renderPost).join('')+'</div>';
h+=unp.length?unp.map(renderPost).join(''):'<div class="empty-state"><h2>✍️</h2><p>Первое произведение ждёт.</p></div>';
ptc.innerHTML=h;
}else if(t==='drafts'){
const dr=JSON.parse(localStorage.getItem('muse_dr_'+(currentUser?.id||'t'))||'[]');
ptc.innerHTML=renderDraftsHTML(dr);
}else if(t==='moodboards'){
const mbs=JSON.parse(localStorage.getItem('muse_mb_'+(currentUser?.id||'t'))||'{}');
ptc.innerHTML=renderMbsHTML(mbs);
}
setTimeout(afterRender,60);
}
function renderDraftsHTML(drafts){
if(!drafts.length)return'<div class="empty-state"><h2>📝</h2><p>Ступени к готовой работе.</p></div>';
const tn={text:'Текст',image:'Фото',art:'Арт',design:'Дизайн',audio:'Аудио',video:'Видео'};
return drafts.map((d,i)=>'<div class="draft-card" onclick="editDraft('+i+')">'
+'<div class="draft-icon"><svg class="svg-icon" viewBox="0 0 24 24"><path d="M5 4h14v16H5z"/><path d="M8 9h8M8 13h6"/></svg></div>'
+'<div class="draft-info"><div class="draft-title">'+escH(d.caption||(d.texts&&d.texts[0])||'Без названия')+'</div>'
+'<div class="draft-date">'+(tn[d.type]||d.type)+' · '+new Date(d.timestamp).toLocaleDateString('ru-RU')+'</div></div>'
+'<div class="draft-actions"><button class="draft-btn pub" onclick="event.stopPropagation();pubDraft('+i+')">↑</button>'
+'<button class="draft-btn del" onclick="event.stopPropagation();delDraft('+i+')">×</button></div></div>').join('');
}
function renderMbsHTML(mbs){
const keys=Object.keys(mbs);
if(!keys.length)return'<div class="empty-state"><h2>🖼️</h2><p>Личный музей.</p></div>';
return keys.map(k=>'<div class="mb-card" onclick="openMb(\''+k+'\')"><div class="mb-icon"><svg class="svg-icon" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></div><div class="mb-name" style="flex:1">'+escH(mbs[k].name)+'</div><div class="mb-count">'+mbs[k].posts.length+'</div></div>').join('');
}
function renderAchPage(c){
if(!currentUser){showFullAuth('login');return}
const me=getUserById(currentUser.id)||currentUser;
const un=me.achievements||[];
let h='<div class="info-banner">Нажмите — в профиль (макс. 5)</div>';
h+='<h2 style="margin:0 0 14px;font-size:17px;font-weight:700;color:var(--txt)">'+un.length+'/'+ACH.length+'</h2>';
h+='<div class="ach-grid">';
ACH.forEach(a=>{
const isU=un.includes(a.id);
const isD=(me.displayedAchievements||[]).includes(a.id);
let cls='ach-card';
if(!isU)cls+=' locked';
if(a.secret&&!isU)cls+=' secret';
if(isD)cls+=' sel';
const ic=(a.secret&&!isU)?'❓':a.ic;
const nm=(a.secret&&!isU)?'???':escH(a.n);
const ds=(a.secret&&!isU)?'Секретное':escH(a.d);
h+='<div class="'+cls+'" onclick="toggleAch(\''+a.id+'\')"><div class="ach-icon">'+ic+'</div><div class="ach-nm">'+nm+'</div><div class="ach-ds">'+ds+'</div></div>';
});
h+='</div>';
c.innerHTML=h;
}
function renderDraftsPage(c){
if(!currentUser){showFullAuth('login');return}
c.innerHTML=renderDraftsHTML(JSON.parse(localStorage.getItem('muse_dr_'+currentUser.id)||'[]'));
}
function editDraft(idx){
if(!requireAuth())return;
const dr=JSON.parse(localStorage.getItem('muse_dr_'+currentUser.id)||'[]');
const d=dr[idx];
if(!d)return;
const images=[];
if(d.images)d.images.forEach(x=>images.push({data:x}));
if(d.videos)d.videos.forEach(x=>images.push({data:x,isVideo:true}));
if(d.audios)d.audios.forEach((x,i)=>images.push({data:x,title:(d.audioTitles||[])[i]||'Трек '+(i+1),isAudio:true}));
openEditor(d.type||'text',d.subcategory||'',{draftIdx:idx,title:'Черновик',text:d.caption||(d.texts||[]).join('\n\n')||'',tags:(d.tags||[]).join(', '),images});
}
function pubDraft(idx){
if(!requireAuth())return;
if(!confirm('Опубликовать?'))return;
const key='muse_dr_'+currentUser.id;
const dr=JSON.parse(localStorage.getItem(key)||'[]');
const d=dr[idx];
if(!d)return;
let np={id:Date.now(),authorId:currentUser.id,author:currentUser.name,handle:currentUser.username,avatar:currentUser.avatar,timestamp:Date.now(),type:d.type,caption:d.type==='text'?'':(d.caption||''),tags:d.tags||[],subcategory:d.subcategory||'',likes:0,likedBy:[],comments:[]};
if(d.type==='image'){np.images=d.images||[];np.category='photo'}
else if(d.type==='art'||d.type==='design'){np.images=d.images||[];np.category=d.type}
else if(d.type==='audio'){np.audios=d.audios||[];np.audioTitles=d.audioTitles||[];np.category='music'}
else if(d.type==='video'){np.videos=d.videos||[];np.category='video'}
else{np.texts=d.texts||[d.caption||''];np.category='text'}
const ps=getAllPosts();ps.unshift(np);
try{localStorage.setItem('muse_posts',JSON.stringify(ps))}catch(e){toast('Переполнено','⚠');return}
dr.splice(idx,1);localStorage.setItem(key,JSON.stringify(dr));
checkAch();navigate('home');toast('Опубликовано','🚀');playSound('publish');
}
function delDraft(idx){
if(!confirm('Удалить?'))return;
const key='muse_dr_'+currentUser.id;
const dr=JSON.parse(localStorage.getItem(key)||'[]');
dr.splice(idx,1);localStorage.setItem(key,JSON.stringify(dr));
if(currentPage==='profile')renderProfile(document.getElementById('mainContent'));
else if(currentPage==='drafts')renderDraftsPage(document.getElementById('mainContent'));
}
function renderMbsPage(c){
if(!currentUser){showFullAuth('login');return}
let h='<button onclick="createMb()" style="width:100%;padding:14px;background:linear-gradient(135deg,var(--acc),var(--acc2));color:#fff;border:none;border-radius:14px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;margin-bottom:14px">+ Коллекция</button>';
h+=renderMbsHTML(JSON.parse(localStorage.getItem('muse_mb_'+currentUser.id)||'{}'));
c.innerHTML=h;
}
function createMb(){
if(!requireAuth())return;
const nm=prompt('Название:');
if(!nm||!nm.trim())return;
const mbs=JSON.parse(localStorage.getItem('muse_mb_'+currentUser.id)||'{}');
mbs[Date.now()]={name:nm.trim(),posts:[]};
localStorage.setItem('muse_mb_'+currentUser.id,JSON.stringify(mbs));
renderMbsPage(document.getElementById('mainContent'));
toast('Создана','📚');
}
function openMb(key){
if(!currentUser)return;
const mbs=JSON.parse(localStorage.getItem('muse_mb_'+currentUser.id)||'{}');
const mb=mbs[key];
if(!mb)return;
const ps=getAllPosts().filter(p=>mb.posts.some(id=>String(id)===String(p.id)));
let h='<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px"><button onclick="navigate(\'moodboards\')" style="background:none;border:none;color:var(--acc);font-size:20px;cursor:pointer">←</button><h2 style="margin:0;font-family:Cormorant,Georgia,serif;color:var(--txt)">'+escH(mb.name)+'</h2></div>';
h+=ps.length?ps.map(renderPost).join(''):'<div class="empty-state"><p>Пусто</p></div>';
document.getElementById('mainContent').innerHTML=h;
setTimeout(afterRender,60);
}
function addToMoodboard(pid){
if(!requireAuth())return;
const mbs=JSON.parse(localStorage.getItem('muse_mb_'+currentUser.id)||'{}');
let m=document.getElementById('mbPick');
if(!m){
document.body.insertAdjacentHTML('beforeend','<div class="modal" id="mbPick"><div class="modal-content" style="max-width:340px"><div class="modal-header"><h2>В коллекцию</h2><button class="close-modal" onclick="closeMbPick()">×</button></div><div id="mbList" style="max-height:250px;overflow-y:auto"></div><button class="mb-new" onclick="createMbFor('+pid+')">+ Новая</button></div></div>');
m=document.getElementById('mbPick');
m.addEventListener('click',e=>{if(e.target===m)closeMbPick()});
}
const list=document.getElementById('mbList');
const keys=Object.keys(mbs);
if(!keys.length){list.innerHTML='<div style="text-align:center;padding:20px;color:var(--mut)">Нет коллекций</div>'}
else{
list.innerHTML=keys.map(k=>{
const mb=mbs[k];
const has=mb.posts.some(p=>String(p)===String(pid));
return'<div class="mb-item'+(has?' has':'')+'"'+(has?'':' onclick="pickMb(\''+k+'\', '+pid+')"')+'><div class="mb-icon"><svg class="svg-icon" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></div><div><div class="mb-name">'+escH(mb.name)+'</div><div class="mb-count">'+mb.posts.length+(has?' · добавлен':'')+'</div></div></div>';
}).join('');
}
m.classList.add('active');
}
function closeMbPick(){document.getElementById('mbPick')?.classList.remove('active')}
function pickMb(k,pid){
if(!pid||!currentUser)return;
const key='muse_mb_'+currentUser.id;
const mbs=JSON.parse(localStorage.getItem(key)||'{}');
const mb=mbs[k];if(!mb)return;
if(!mb.posts.some(x=>String(x)===String(pid)))mb.posts.push(pid);
mbs[k]=mb;localStorage.setItem(key,JSON.stringify(mbs));
closeMbPick();toast('Добавлено','📚');
}
function createMbFor(pid){
const nm=prompt('Название:');
if(!nm||!nm.trim())return;
const key='muse_mb_'+currentUser.id;
const mbs=JSON.parse(localStorage.getItem(key)||'{}');
mbs[Date.now()]={name:nm.trim(),posts:[pid]};
localStorage.setItem(key,JSON.stringify(mbs));
closeMbPick();toast('Создана','📚');
}

/* ===== СОЗДАНИЕ ===== */
const CP_DATA=[
{id:'text',name:'Текст',hint:'Стихи и проза',ic:'<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h12M4 18h8"/></svg>'},
{id:'image',name:'Фото',hint:'Снимки',ic:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="M3 16l5-5 4 4 3-3 6 6"/></svg>'},
{id:'art',name:'Арт',hint:'Иллюстрации',ic:'<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0 0 18h1.2a2 2 0 0 0 1.8-2.8l-.4-.8a2 2 0 0 1 1.8-2.9H18a3 3 0 0 0 3-3C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="10" r="1"/></svg>'},
{id:'audio',name:'Музыка',hint:'Треки',ic:'<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>'},
{id:'video',name:'Видео',hint:'Клипы',ic:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="13" height="14" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>'},
{id:'design',name:'Дизайн',hint:'Макеты',ic:'<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M4 15l5-5 3 3 3-4 5 6"/></svg>'},
{id:'history',name:'История',hint:'24 часа',ic:'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h6"/></svg>'}
];
const CP_SUBS={text:['Поэзия','Проза','Рассказ','Эссе'],image:['Портрет','Пейзаж','Уличное','Предметное'],art:['Живопись','Иллюстрация','Цифровое','Скетч'],audio:['Песня','Инструментал','Электроника','Подкаст'],video:['Клип','Влог','Анимация','Короткометражка'],design:['Графика','UI/UX','Брендинг','Типографика']};

function openCreate(){
if(!requireAuth())return;
cpRender();
document.getElementById('createPicker').classList.add('open');
}
function cpRender(){
document.getElementById('cpTitle').textContent='Что создаёшь?';
document.getElementById('cpSub').textContent='Категория';
document.getElementById('cpBack').style.display='none';
const g=document.getElementById('cpGrid');
g.className='cp-grid';
g.innerHTML=CP_DATA.map(c=>'<div class="cp-tile" data-c="'+c.id+'"><div class="cp-tile-ic">'+c.ic+'</div><div class="cp-tile-nm">'+c.name+'</div><div class="cp-tile-ht">'+c.hint+'</div></div>').join('');
g.querySelectorAll('.cp-tile').forEach(t=>t.onclick=()=>cpChoose(t.dataset.c));
}
function cpChoose(cat){
if(cat==='history'){closePicker();openStoryComp();return}
const g=document.getElementById('cpGrid');
g.classList.add('leaving');
setTimeout(()=>{
g.classList.remove('leaving');
const cd=CP_DATA.find(x=>x.id===cat);
document.getElementById('cpTitle').textContent=cd?cd.name:cat;
document.getElementById('cpSub').textContent='Направление';
document.getElementById('cpBack').style.display='';
g.className='cp-grid';
const subs=CP_SUBS[cat]||[];
g.innerHTML=subs.map(s=>'<div class="cp-tile" style="flex-direction:row;gap:10px;padding:14px 12px" data-s="'+s+'"><div class="cp-tile-ic" style="width:38px;height:38px;border-radius:12px">'+cd.ic+'</div><div class="cp-tile-nm" style="font-size:15px">'+s+'</div></div>').join('')
+'<div class="cp-tile" style="flex-direction:row;gap:10px;padding:14px 12px" data-s=""><div class="cp-tile-ic" style="width:38px;height:38px;border-radius:12px">'+cd.ic+'</div><div class="cp-tile-nm" style="font-size:15px">Другое</div></div>';
g.querySelectorAll('.cp-tile').forEach(t=>t.onclick=()=>{closePicker();openEditor(cat,t.dataset.s)});
},170);
}
function cpBack(){cpRender()}
function closePicker(){document.getElementById('createPicker')?.classList.remove('open')}

function openEditor(type,sub,opts){
opts=opts||{};
if(!requireAuth())return;
editingPostId=opts.postId||null;
editingDraftIdx=(opts.draftIdx!==undefined)?opts.draftIdx:null;
vkPostType=type;
postSubcategory=sub||'';
vkPostImages=(opts.images||[]).slice();
document.getElementById('editorText').value=opts.text||'';
document.getElementById('editorTags').value=opts.tags||'';
document.getElementById('editorSubs').innerHTML=CP_SUBS[type]?CP_SUBS[type].map(s=>'<button class="editor-sub'+(s===postSubcategory?' active':'')+'" onclick="selSub(this.textContent)">'+s+'</button>').join(''):'';
document.getElementById('editorHint').textContent={text:'Просто пиши. Муза придёт.',image:'Подпись к фото...',art:'Об этой работе...',audio:'О треке...',video:'Описание видео...',design:'О макете...'}[type]||'';
renderGal();
document.getElementById('editorTitle').textContent=opts.title||sub||type;
document.getElementById('editorOverlay').classList.add('active');
document.getElementById('editorPublish').textContent=opts.postId?'Сохранить':'Опубликовать';
checkCanPublish();
}
function selSub(v){
postSubcategory=v||'';
document.querySelectorAll('.editor-sub').forEach(b=>b.classList.toggle('active',b.textContent===v));
document.getElementById('editorTitle').textContent=v||'Редактор';
}
function closeEditor(){
if(editingPostId||editingDraftIdx!==null){
editingPostId=null;editingDraftIdx=null;
document.getElementById('editorOverlay').classList.remove('active');
return;
}
const text=document.getElementById('editorText').value.trim();
if(text||vkPostImages.length||document.getElementById('editorTags').value.trim()){
document.getElementById('draftDialog').classList.add('active');
}else{
document.getElementById('editorOverlay').classList.remove('active');
}
}
function cancelDraft(){document.getElementById('draftDialog').classList.remove('active')}
function saveDraft(){
if(!currentUser)return;
const text=document.getElementById('editorText').value.trim();
const ts=document.getElementById('editorTags').value.trim();
const tags=ts?ts.split(',').map(t=>t.trim().replace(/^#/,'')).filter(Boolean):[];
const d={id:Date.now(),timestamp:Date.now(),type:vkPostType,texts:['text'].includes(vkPostType)&&text?[text]:[],images:['image','art','design'].includes(vkPostType)?vkPostImages.filter(i=>!i.isAudio&&!i.isVideo).map(i=>i.data):[],videos:vkPostType==='video'?vkPostImages.filter(i=>i.isVideo).map(i=>i.data):[],audios:vkPostType==='audio'?vkPostImages.filter(i=>i.isAudio).map(i=>i.data):[],caption:text,tags,subcategory:postSubcategory};
const dr=JSON.parse(localStorage.getItem('muse_dr_'+currentUser.id)||'[]');
dr.unshift(d);
localStorage.setItem('muse_dr_'+currentUser.id,JSON.stringify(dr));
document.getElementById('draftDialog').classList.remove('active');
document.getElementById('editorOverlay').classList.remove('active');
toast('Сохранено','📝');navigate('drafts');
}
function discardDraft(){
document.getElementById('draftDialog').classList.remove('active');
document.getElementById('editorOverlay').classList.remove('active');
}
function checkCanPublish(){
const text=document.getElementById('editorText')?.value.trim()||'';
const hasMedia=vkPostImages.length>0;
const textOnly=['text'].includes(vkPostType);
document.getElementById('editorPublish').disabled=editingPostId?false:(textOnly?!!text:hasMedia);
}
function handleEditorFiles(ev){
const files=Array.from(ev.target.files||[]);
if(!files.length)return;
let done=0;
const fin=()=>{done++;if(done===files.length){renderGal();checkCanPublish()}};
files.forEach(file=>{
if(file.type.startsWith('audio/')){
const r=new FileReader();
r.onload=e=>{vkPostImages.push({data:e.target.result,title:file.name.replace(/\.[^/.]+$/,''),isAudio:true});fin()};
r.readAsDataURL(file);
}else if(file.type.startsWith('video/')){
const r=new FileReader();
r.onload=e=>{vkPostImages.push({data:e.target.result,isVideo:true});fin()};
r.readAsDataURL(file);
}else{
const r=new FileReader();
r.onload=e=>{
const img=new Image();
img.onload=()=>{
const c=document.createElement('canvas');
const mx=1600;let w=img.width,h=img.height;
if(w>h&&w>mx){h=h*mx/w;w=mx}else if(h>mx){w=w*mx/h;h=mx}
c.width=Math.round(w);c.height=Math.round(h);
c.getContext('2d').drawImage(img,0,0,c.width,c.height);
vkPostImages.push({data:c.toDataURL('image/jpeg',.86)});fin();
};
img.onerror=fin;img.src=e.target.result;
};
r.readAsDataURL(file);
}
});
ev.target.value='';
}
function handleCam(ev,kind){
const f=ev.target.files[0];
if(!f)return;
const r=new FileReader();
r.onload=e=>{vkPostImages.push({data:e.target.result,isVideo:kind==='video'});renderGal();checkCanPublish()};
r.readAsDataURL(f);ev.target.value='';
}
function renderGal(){
const gal=document.getElementById('editorGallery');
if(!gal)return;
const media=['image','art','audio','video','design'].includes(vkPostType);
if(!media){gal.innerHTML='';gal.style.display='none';return}
let h='<div class="eg-cam" onclick="document.getElementById(\'editorFile\').click()"><svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span>Файл</span></div>';
vkPostImages.forEach((item,i)=>{
if(item.isAudio)h+='<div class="eg-item" onclick="rmImg('+i+')" style="display:flex;align-items:center;justify-content:center;background:var(--sur2);color:var(--acc);font-size:9px;padding:4px;text-align:center;cursor:pointer">'+escH(item.title||'Аудио')+'</div>';
else if(item.isVideo)h+='<div class="eg-item" onclick="rmImg('+i+')" style="display:flex;align-items:center;justify-content:center;background:var(--sur2);color:var(--acc);cursor:pointer">🎬</div>';
else h+='<div class="eg-item" onclick="rmImg('+i+')"><img src="'+item.data+'"></div>';
});
gal.innerHTML=h;gal.style.display='flex';
}
function rmImg(i){vkPostImages.splice(i,1);renderGal();checkCanPublish()}
function publishPost(){
if(!currentUser)return;
const text=document.getElementById('editorText').value.trim();
const ts=document.getElementById('editorTags').value.trim();
const tags=ts?ts.split(',').map(t=>t.trim().replace(/^#/,'')).filter(Boolean):[];
const textOnly=['text'].includes(vkPostType);
if(textOnly&&!text)return;
if(!textOnly&&!vkPostImages.length&&!editingPostId&&editingDraftIdx===null)return;
const ps=JSON.parse(localStorage.getItem('muse_posts')||'[]');
if(editingPostId){
const p=ps.find(x=>x.id===editingPostId);
if(!p){editingPostId=null;return}
p.caption=textOnly?'':text;
p.tags=tags;p.subcategory=postSubcategory;
if(textOnly){p.texts=[text];p.category='text'}
else if(vkPostImages.length){
if(['image','art','design'].includes(vkPostType)){p.images=vkPostImages.filter(i=>!i.isAudio&&!i.isVideo).map(i=>i.data);p.category=vkPostType==='image'?'photo':vkPostType}
else if(vkPostType==='video'){p.videos=vkPostImages.filter(i=>i.isVideo).map(i=>i.data);p.category='video'}
else if(vkPostType==='audio'){p.audios=vkPostImages.filter(i=>i.isAudio).map(i=>i.data);p.category='music'}
}
localStorage.setItem('muse_posts',JSON.stringify(ps));
editingPostId=null;vkPostImages=[];editingDraftIdx=null;
document.getElementById('editorOverlay').classList.remove('active');
toast('Обновлено','✏');navigate('home');
return;
}
const np={id:Date.now(),authorId:currentUser.id,author:currentUser.name,handle:currentUser.username,avatar:currentUser.avatar,timestamp:Date.now(),type:vkPostType,caption:textOnly?'':text,tags,subcategory:postSubcategory,likes:0,likedBy:[],comments:[]};
if(['image','art','design'].includes(vkPostType)){np.images=vkPostImages.filter(i=>!i.isAudio&&!i.isVideo).map(i=>i.data);np.category=vkPostType==='image'?'photo':vkPostType}
else if(vkPostType==='video'){np.videos=vkPostImages.filter(i=>i.isVideo).map(i=>i.data);np.category='video'}
else if(vkPostType==='audio'){np.audios=vkPostImages.filter(i=>i.isAudio).map(i=>i.data);np.audioTitles=vkPostImages.filter(i=>i.isAudio).map(i=>i.title);np.category='music'}
else{np.texts=[text];np.category='text'}
ps.unshift(np);
try{localStorage.setItem('muse_posts',JSON.stringify(ps))}catch(e){toast('Переполнено','⚠');return}
if(editingDraftIdx!==null){
const dk='muse_dr_'+currentUser.id;
const dr=JSON.parse(localStorage.getItem(dk)||'[]');
if(dr.length>editingDraftIdx)dr.splice(editingDraftIdx,1);
localStorage.setItem(dk,JSON.stringify(dr));editingDraftIdx=null;
}
vkPostImages=[];
document.getElementById('editorOverlay').classList.remove('active');
checkAch();toast('Опубликовано!','🚀');playSound('publish');navigate('home');
}

/* ===== ИСТОРИИ ===== */
function ensureSC(){
if(!document.getElementById('dsp')){
document.body.insertAdjacentHTML('beforeend','<input id="dsp" type="file" accept="image/*" capture="environment" style="display:none"><input id="dsg" type="file" accept="image/*,video/*,audio/*" style="display:none">');
document.getElementById('dsp').onchange=e=>handleDSF(e);
document.getElementById('dsg').onchange=e=>handleDSF(e);
}
}
function openStoryComp(){
if(!requireAuth())return;
ensureSC();storyDraft=null;
document.getElementById('storyComp').classList.add('active');
renderSP();
}
function closeStoryComp(){
if(dRec){try{dRec.stop()}catch(e){}}
if(dStream){dStream.getTracks().forEach(t=>t.stop());dStream=null}
dRec=null;
document.getElementById('storyComp').classList.remove('active');
}
function renderSP(){
const p=document.getElementById('storyPrev');
const pub=document.getElementById('storyPub');
if(!p)return;
if(storyDraft){
p.innerHTML=storyDraft.type==='image'?'<img src="'+storyDraft.data+'">':storyDraft.type==='video'?'<video src="'+storyDraft.data+'" controls></video>':'<audio src="'+storyDraft.data+'" controls></audio>';
}else{
p.innerHTML='<div class="story-comp-empty"><strong>Создайте историю</strong><span>24 часа</span></div>';
}
if(pub)pub.disabled=!storyDraft;
}
function takeStoryPhoto(){ensureSC();document.getElementById('dsp').click()}
function chooseStoryMedia(){ensureSC();document.getElementById('dsg').click()}
function handleDSF(e){
const f=e.target.files&&e.target.files[0];
e.target.value='';
if(!f)return;
const type=f.type.startsWith('video/')?'video':f.type.startsWith('audio/')?'audio':f.type.startsWith('image/')?'image':null;
if(!type){toast('Фото, видео или аудио','⚠');return}
if(type==='image'){
const r=new FileReader();
r.onload=ev=>{
const img=new Image();
img.onload=()=>{
const mx=1600;let w=img.width,h=img.height;
if(Math.max(w,h)>mx){const k=mx/Math.max(w,h);w=Math.round(w*k);h=Math.round(h*k)}
const c=document.createElement('canvas');c.width=w;c.height=h;
c.getContext('2d').drawImage(img,0,0,w,h);
storyDraft={type:'image',data:c.toDataURL('image/jpeg',.82)};renderSP();
};
img.src=ev.target.result;
};
r.readAsDataURL(f);
}else{
const r=new FileReader();
r.onload=ev=>{storyDraft={type,data:ev.target.result};renderSP()};
r.readAsDataURL(f);
}
}
async function toggleStoryVideo(){
if(dRec){stopDRec();return}
try{
const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:true});
dStream=stream;dChunks=[];
dRec=new MediaRecorder(stream);
dRec.ondataavailable=e=>{if(e.data&&e.data.size)dChunks.push(e.data)};
dRec.onstop=()=>{
const blob=new Blob(dChunks,{type:dChunks[0]?.type||'video/webm'});
const r=new FileReader();
r.onload=e=>{storyDraft={type:'video',data:e.target.result};dRec=null;dStream=null;renderSP()};
r.readAsDataURL(blob);
stream.getTracks().forEach(t=>t.stop());
};
dRec.start(200);renderSP();
document.getElementById('svBtn').textContent='Стоп';
}catch(e){toast('Камера недоступна','⚠')}
}
async function toggleStoryAudio(){
if(dRec){stopDRec();return}
try{
const stream=await navigator.mediaDevices.getUserMedia({audio:true});
dStream=stream;dChunks=[];
dRec=new MediaRecorder(stream);
dRec.ondataavailable=e=>{if(e.data&&e.data.size)dChunks.push(e.data)};
dRec.onstop=()=>{
const blob=new Blob(dChunks,{type:dChunks[0]?.type||'audio/webm'});
const r=new FileReader();
r.onload=e=>{storyDraft={type:'audio',data:e.target.result};dRec=null;dStream=null;renderSP()};
r.readAsDataURL(blob);
stream.getTracks().forEach(t=>t.stop());
};
dRec.start(200);
document.getElementById('saBtn').textContent='Стоп';renderSP();
}catch(e){toast('Микрофон недоступен','⚠')}
}
function stopDRec(){
if(dRec&&dRec.state!=='inactive')dRec.stop();
document.getElementById('svBtn').textContent='🎥';
document.getElementById('saBtn').textContent='🎤';
}
async function publishStory(){
if(!currentUser||!storyDraft||dRec)return;
try{
const ref=await saveMedia(storyDraft.data,storyDraft.type);
const st=getStories();
st.push({id:'s_'+Date.now(),authorId:currentUser.id,author:currentUser.name,type:storyDraft.type,data:ref,createdAt:Date.now()});
localStorage.setItem('muse_stories',JSON.stringify(st));
storyDraft=null;closeStoryComp();navigate('profile');checkAch();
toast('История опубликована','✨');
}catch(e){toast('Не удалось сохранить','⚠')}
}
async function openStories(uid){
try{
const st=getUserStories(uid);
if(!st.length)return;
storyViewerStories=st;storyViewerIndex=0;
let v=document.getElementById('storyViewer');
if(!v){
document.body.insertAdjacentHTML('beforeend','<div id="storyViewer" class="story-viewer"><div class="sv-content"><div class="sv-progress"><i class="sv-progress-bar" id="spBar"></i></div><div class="sv-meta" id="spMeta"></div><button class="sv-close" onclick="closeStories()">×</button><div id="spMedia" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"></div></div></div>');
v=document.getElementById('storyViewer');
v.addEventListener('click',e=>{if(e.target===v)closeStories()});
}
v.classList.add('active');
document.getElementById('spMedia').innerHTML='<div style="color:#fff;opacity:.5;font-size:14px">Загрузка…</div>';
await renderStory();
}catch(e){toast('История недоступна','⚠')}
}
async function renderStory(){
const st=storyViewerStories[storyViewerIndex];
if(!st)return closeStories();
const u=getUserById(st.authorId)||{name:st.author||'Автор'};
document.getElementById('spMeta').textContent=u.name;
const m=document.getElementById('spMedia');
let src=null;
try{src=await getMedia(st.data)}catch(e){src=null}
if(!src){m.innerHTML='<div style="color:#fff;font-size:14px">Недоступно</div>';return}
if(st.type==='video')m.innerHTML='<video src="'+src+'" autoplay playsinline controls style="width:100%;height:100%;object-fit:contain"></video>';
else if(st.type==='audio')m.innerHTML='<audio src="'+src+'" controls autoplay style="width:80%"></audio>';
else m.innerHTML='<img src="'+src+'" style="width:100%;height:100%;object-fit:contain">';
const media=m.firstElementChild;
const dur=st.type==='image'?5000:30000;
const b=document.getElementById('spBar');
if(b){b.style.transition='none';b.style.transform='scaleX(0)';setTimeout(()=>{b.style.transition='transform '+(dur/1000)+'s linear';b.style.transform='scaleX(1)'},30)}
clearTimeout(storyViewerTimer);
if(media&&(st.type==='video'||st.type==='audio'))media.onended=()=>advanceStory();
storyViewerTimer=setTimeout(()=>advanceStory(),dur);
}
function advanceStory(){
clearTimeout(storyViewerTimer);
storyViewerIndex++;
if(storyViewerIndex<storyViewerStories.length)renderStory();
else closeStories();
}
function closeStories(){
clearTimeout(storyViewerTimer);storyViewerTimer=null;
const v=document.getElementById('storyViewer');
if(v)v.classList.remove('active');
const m=document.getElementById('spMedia');
if(m)m.innerHTML='';
}

/* ===== ЗАДАНИЯ ===== */
function getDaily(){
const d=new Date();
const key=''+d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
const rnd=mb32(Number(key));
const tasks=[];
Object.keys(TASKS).forEach(cat=>{
tasks.push({cat,postCat:DCM[cat],text:TASKS[cat][Math.floor(rnd()*TASKS[cat].length)]});
});
return{key,date:d.toLocaleDateString('ru-RU'),tasks};
}
function isTaskDone(t){
if(!currentUser)return false;
const s=new Date();s.setHours(0,0,0,0);
return getUserPosts(currentUser.id).some(p=>p.timestamp>=s.getTime()&&p.category===t.postCat);
}
function showTaskDetail(idx){
const d=getDaily();
const t=d.tasks[idx];
if(!t)return;
const done=isTaskDone(t);
let el=document.getElementById('taskDetail');
if(!el){
document.body.insertAdjacentHTML('beforeend','<div class="task-detail" id="taskDetail"><div class="task-card"><div class="task-cat-badge" id="tdc"></div><div class="task-text" id="tdt"></div><div class="task-desc" id="tdd"></div><div class="task-btns"><button class="task-go" id="tgo">🎨 Творить</button><button class="task-close" onclick="closeTD()">Закрыть</button></div></div></div>');
el=document.getElementById('taskDetail');
el.addEventListener('click',e=>{if(e.target===el)closeTD()});
}
document.getElementById('tdc').textContent=(DTL[t.cat]||t.cat)+(done?' · ✅':'');
document.getElementById('tdt').textContent=t.text;
document.getElementById('tdd').textContent='Опубликуйте работу в этой категории.';
document.getElementById('tgo').textContent=done?'✅ Выполнено':'🎨 Творить';
document.getElementById('tgo').onclick=function(){
closeTD();
if(!requireAuth())return;
closePicker();
openEditor(t.cat,(TSUB[t.cat]||['Другое'])[0],{title:'Задание дня'});
};
el.classList.add('open');
}
function closeTD(){document.getElementById('taskDetail')?.classList.remove('open')}

/* ===== AUTH ===== */
function requireAuth(){
if(!currentUser){document.getElementById('authModal').classList.add('active');return false}
return true;
}
function closeAuthModal(){document.getElementById('authModal').classList.remove('active')}
function showFullAuth(m){
closeAuthModal();
isLoginMode=m==='login';
document.getElementById('authTitle').textContent=isLoginMode?'Войти':'Создать аккаунт';
document.querySelector('.auth-switch span').textContent=isLoginMode?'Нет аккаунта?':'Уже есть аккаунт?';
document.getElementById('authScreen').classList.add('active');
document.getElementById('mainApp').classList.remove('active');
}
function closeFullAuth(){
document.getElementById('authScreen').classList.remove('active');
document.getElementById('mainApp').classList.add('active');
}
function toggleAuthMode(){
isLoginMode=!isLoginMode;
document.getElementById('authTitle').textContent=isLoginMode?'Войти':'Создать аккаунт';
document.querySelector('.auth-switch span').textContent=isLoginMode?'Нет аккаунта?':'Уже есть аккаунт?';
}
function handleAuth(){
const nm=document.getElementById('regName').value.trim();
const un=document.getElementById('regUsername').value.trim().replace(/^@/,'');
const pw=document.getElementById('regPassword').value.trim();
if(!nm||!un||!pw){toast('Заполните все поля','⚠');return}
if(!isLoginMode&&pw.length<4){toast('Пароль минимум 4 символа','⚠');return}
const users=getUsers();
if(isLoginMode){
const u=users.find(x=>x.username===un&&x.password===pw);
if(u){
currentUser=u;
localStorage.setItem('muse_cur',JSON.stringify(u));
const ss=localStorage.getItem('muse_set_'+u.id);
if(ss){try{userSettings={...userSettings,...JSON.parse(ss)}}catch(e){}}
applyTheme(userSettings.theme);
closeFullAuth();updSidebar();navigate(currentPage);updBadge();
toast('С возвращением!','👋');
}else toast('Неверный никнейм или пароль','⚠');
}else{
if(users.find(x=>x.username===un)){toast('Никнейм занят','⚠');return}
const nu={id:'user_'+Date.now(),name:nm,username:un,password:pw,avatar:nm.charAt(0).toUpperCase(),bio:'',photo:null,followers:[],following:[],achievements:[],displayedAchievements:[],lastOnline:Date.now()};
users.push(nu);saveUsers(users);
currentUser=nu;
localStorage.setItem('muse_cur',JSON.stringify(nu));
closeFullAuth();updSidebar();navigate(currentPage);
toast('Добро пожаловать в Muse!','✨');playSound('publish');
}
}
function logout(){
currentUser=null;
localStorage.removeItem('muse_cur');
updBadge();updSidebar();navigate('home');toggleSidebar();
}

/* ===== НАВИГАЦИЯ ===== */
function openProfile(uid){
currentProfileUserId=uid||(currentUser?currentUser.id:null);
navigate('profile');
}
function navigate(page,wh=true){
currentPage=page;
if(wh){try{history.replaceState(null,'','#/'+page)}catch(e){}}
const c=document.getElementById('mainContent');
const t=document.getElementById('pageTitle');
document.querySelectorAll('.sidebar-item').forEach(i=>i.classList.toggle('active',i.dataset.page===page));
document.querySelectorAll('.nav-item').forEach(i=>i.classList.toggle('active',i.dataset.page===page));
switch(page){
case'home':t.textContent='Muse';renderFeed(c);break;
case'studio':t.textContent='Muse';renderStudio(c);break;
case'profile':t.textContent='Профиль';renderProfile(c);break;
case'popular':t.textContent='Популярное';renderPopular(c);break;
case'challenges':t.textContent='Челлендж';renderChallenges(c);break;
case'explore':t.textContent='Обзор';renderExplore(c);break;
case'notifications':t.textContent='Уведомления';renderNotifs(c);markRead();updBadge();break;
case'achievements':t.textContent='Достижения';renderAchPage(c);break;
case'drafts':t.textContent='Черновики';renderDraftsPage(c);break;
case'moodboards':t.textContent='Коллекции';renderMbsPage(c);break;
case'random':t.textContent='Случайный';renderRandom(c);break;
case'following':t.textContent='Подписки';renderFollowing(c);break;
}
}
function toggleSidebar(){
if(window.matchMedia&&window.matchMedia('(min-width:769px)').matches)return;
document.getElementById('sidebar').classList.toggle('active');
document.getElementById('sidebarOverlay').classList.toggle('active');
}
function updSidebar(){
if(!currentUser){
document.getElementById('sName').textContent='Гость';
document.getElementById('sHandle').textContent='@guest';
document.getElementById('sAv').textContent='?';return;
}
document.getElementById('sName').textContent=currentUser.name;
document.getElementById('sHandle').textContent=currentUser.username;
const a=document.getElementById('sAv');
a.textContent=currentUser.avatar;
if(currentUser.photo)a.innerHTML='<img src="'+currentUser.photo+'">';
}
function toggleFollow(tid){
if(!requireAuth())return;
const users=getUsers();
const me=users.find(u=>u.id===currentUser.id);
const t=users.find(u=>u.id===tid);
if(!me||!t||tid===currentUser.id)return;
if(!me.following)me.following=[];
if(!t.followers)t.followers=[];
const isF=me.following.includes(tid);
if(isF){
me.following=me.following.filter(id=>id!==tid);
t.followers=t.followers.filter(id=>id!==currentUser.id);
toast('Отписка','👋');
}else{
me.following.push(tid);
t.followers.push(currentUser.id);
addNotif('follow',currentUser,null,'',t.id);
toast('Подписка','✨');
}
saveUsers(users);currentUser=me;
localStorage.setItem('muse_cur',JSON.stringify(me));
checkAch();
const c=document.getElementById('mainContent');
if(currentPage==='explore')renderExplore(c);
else if(currentPage==='random')renderRandom(c);
else renderProfile(c);
}

/* ===== СТРАНИЦЫ ===== */
function renderExplore(c){
const users=getUsers();
const fl=currentUser?((getUserById(currentUser.id)||currentUser).following||[]):[];
let h='<div style="display:flex;gap:6px;margin-bottom:12px">';
h+='<button style="flex:1;padding:9px;border:none;border-radius:12px;background:'+(searchMode==='users'?'linear-gradient(135deg,var(--acc),var(--acc2))':'var(--sur)')+';color:'+(searchMode==='users'?'#fff':'var(--mut)')+';font-family:inherit;font-weight:600;cursor:pointer" onclick="setSM(\'users\')">Люди</button>';
h+='<button style="flex:1;padding:9px;border:none;border-radius:12px;background:'+(searchMode==='tags'?'linear-gradient(135deg,var(--acc),var(--acc2))':'var(--sur)')+';color:'+(searchMode==='tags'?'#fff':'var(--mut)')+';font-family:inherit;font-weight:600;cursor:pointer" onclick="setSM(\'tags\')">Теги</button></div>';
h+='<div class="search-wrap"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input type="text" class="search-input" id="si" placeholder="Поиск..." value="'+escH(searchQuery)+'" oninput="handleS(this.value)"></div>';
if(searchMode==='users'){
h+='<div style="font-family:Cormorant,Georgia,serif;font-size:18px;font-weight:700;color:var(--txt);margin-bottom:10px">Авторы</div>';
const disp=users.filter(u=>{
if(currentUser&&u.id===currentUser.id)return false;
if(!searchQuery)return true;
const q=searchQuery.toLowerCase();
return u.name.toLowerCase().includes(q)||u.username.toLowerCase().includes(q);
});
h+=disp.length?disp.map(u=>{
const isF=fl.includes(u.id);
return'<div class="user-card" onclick="openProfile(\''+u.id+'\')">'
+'<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--acc),var(--acc2));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:16px;overflow:hidden;flex-shrink:0">'+(u.photo?'<img src="'+u.photo+'" style="width:100%;height:100%;object-fit:cover">':escH(u.avatar))+'</div>'
+'<div style="flex:1"><div style="font-weight:600;font-size:14px;color:var(--txt)">'+escH(u.name)+'</div><div style="font-size:12px;color:var(--mut)">'+escH(u.username)+'</div></div>'
+'<button onclick="event.stopPropagation();toggleFollow(\''+u.id+'\')" style="padding:8px 14px;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-size:12px;font-family:inherit;background:'+(isF?'var(--sur2)':'linear-gradient(135deg,var(--acc),var(--acc2))')+';color:'+(isF?'var(--mut)':'#fff')+'">'+(isF?'Отписаться':'Подписаться')+'</button></div>';
}).join(''):'<div class="empty-state"><p>Не найдено</p></div>';
}else{
const tm={};
getAllPosts().forEach(p=>(p.tags||[]).forEach(t=>{
const k=t.toLowerCase();
if(!tm[k])tm[k]={tag:t,posts:[]};
tm[k].posts.push(p);
}));
let tags=Object.values(tm);
if(searchQuery){const q=searchQuery.toLowerCase().replace(/^#/,'');tags=tags.filter(t=>t.tag.toLowerCase().includes(q))}
tags.sort((a,b)=>b.posts.length-a.posts.length);
h+=tags.length?tags.slice(0,20).map(x=>'<div style="padding:14px;background:var(--sur);border:1px solid var(--bor);border-radius:16px;margin-bottom:10px;box-shadow:var(--sh)"><div style="display:flex;gap:8px;margin-bottom:8px"><span style="font-size:13px;font-weight:600;color:var(--acc);background:rgba(124,58,237,.06);padding:4px 10px;border-radius:8px">#'+escH(x.tag)+'</span><span style="font-size:11px;color:var(--mut)">'+x.posts.length+'</span></div>'+x.posts.slice(0,2).map(renderPost).join('')+'</div>').join(''):'<div class="empty-state"><p>Не найдено</p></div>';
}
c.innerHTML=h;
setTimeout(afterRender,60);
}
function setSM(m){searchMode=m;searchQuery='';renderExplore(document.getElementById('mainContent'))}
function handleS(q){searchQuery=q;renderExplore(document.getElementById('mainContent'));setTimeout(()=>{const i=document.getElementById('si');if(i){i.focus();i.setSelectionRange(q.length,q.length)}},10)}
function renderNotifs(c){
if(!currentUser){showFullAuth('login');return}
const ns=getNotifs();
if(!ns.length){c.innerHTML='<div class="empty-state"><h2>🌙</h2><p>Тишина — тоже музыка.</p></div>';return}
c.innerHTML=ns.map(n=>{
let t='';
if(n.type==='like')t='<b>'+escH(n.fromUserName)+'</b> оценил';
else if(n.type==='comment')t='<b>'+escH(n.fromUserName)+'</b> прокомментировал';
else if(n.type==='follow')t='<b>'+escH(n.fromUserName)+'</b> подписался';
return'<div class="notification-item'+(n.read?'':' unread')+'" onclick="notifClick('+n.id+')">'
+'<div class="notification-avatar">'+(n.fromUserPhoto?'<img src="'+n.fromUserPhoto+'">':escH(n.fromUserAvatar||'?'))+'</div>'
+'<div style="flex:1"><div style="font-size:13px;color:var(--txt)">'+t+'</div><div style="font-size:11px;color:var(--mut)">'+tAgo(n.time)+'</div></div></div>';
}).join('');
}
function notifClick(id){
const ns=getNotifs();
const n=ns.find(x=>x.id===id);
if(!n)return;
n.read=true;saveNotifs(ns);updBadge();
if(n.postId){navigate('home');
setTimeout(()=>{
const s=document.getElementById('cm-'+n.postId);
if(s){s.style.display='block';s.scrollIntoView({behavior:'smooth',block:'center'})}
else{const el=document.getElementById('pc-'+n.postId);if(el)el.scrollIntoView({behavior:'smooth',block:'center'})}
},150);
}
}
function renderChallenges(c){
const ch=getCW();
const votes=JSON.parse(localStorage.getItem('muse_cv')||'{}');
const ps=getAllPosts().filter(p=>p.tags&&p.tags.some(t=>t.toLowerCase().includes(ch.tag.replace('#','').toLowerCase())));
const top=ps.sort((a,b)=>(b.likes||0)-(a.likes||0)).slice(0,5);
let h='<div class="info-banner">Новый челлендж каждую неделю</div>';
h+='<div class="challenge-banner" style="cursor:default"><h3>'+escH(ch.title)+'</h3><p>'+escH(ch.desc)+' · '+ps.length+' работ</p>';
if(top.length){
h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">';
top.forEach(p=>{
const v=!!votes[p.id]&&votes[p.id]===currentUser?.id;
h+='<button onclick="votePost('+p.id+')" style="padding:7px 14px;border-radius:14px;background:'+(v?'rgba(255,255,255,.2)':'rgba(255,255,255,.08)')+';color:#fff;border:1px solid rgba(255,255,255,.15);cursor:pointer;font-size:12px;font-weight:600;font-family:inherit">'+escH(p.author)+' — '+p.likes+(v?' ✓':'')+'</button>';
});
h+='</div>';
}else h+='<p style="font-size:12px;opacity:.7;margin-top:8px">Тег: '+escH(ch.tag)+'</p>';
h+='</div>';
c.innerHTML=h;
}
function votePost(pid){
if(!requireAuth())return;
const votes=JSON.parse(localStorage.getItem('muse_cv')||'{}');
if(votes[pid]===currentUser.id)delete votes[pid];
else votes[pid]=currentUser.id;
localStorage.setItem('muse_cv',JSON.stringify(votes));
renderChallenges(document.getElementById('mainContent'));
}
function renderPopular(c){
const ps=getAllPosts().filter(p=>(p.timestamp||0)>=Date.now()-86400000).sort((a,b)=>(b.likes||0)-(a.likes||0));
let h='<div class="info-banner">Популярное за 24 часа</div>';
if(!ps.length)h+='<div class="empty-state"><h2>🌙</h2><p>Тишина — тоже музыка.</p></div>';
else h+=ps.map((p,i)=>'<div style="position:relative">'+(i<3?'<div style="position:absolute;top:10px;left:10px;font-size:22px;z-index:10">'+['🥇','🥈','🥉'][i]+'</div>':'')+renderPost(p)+'</div>').join('');
c.innerHTML=h;
setTimeout(afterRender,60);
}
function renderFollowing(c){
if(!currentUser){showFullAuth('login');return}
const me=getUserById(currentUser.id)||currentUser;
const fl=me.following||[];
let h='<div class="info-banner">Ваши подписки</div>';
if(!fl.length)h+='<div class="empty-state"><p>Нет подписок</p></div>';
else{
const ps=getAllPosts().filter(p=>fl.includes(p.authorId)).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
h+=ps.length?ps.map(renderPost).join(''):'<div class="empty-state"><p>Тихо</p></div>';
}
c.innerHTML=h;
setTimeout(afterRender,60);
}
function renderRandom(c){
const users=getUsers().filter(u=>u.id!==currentUser?.id);
if(!users.length){c.innerHTML='<div class="empty-state"><p>Мало пользователей</p></div>';return}
const u=users[Math.floor(Math.random()*users.length)];
const ps=getUserPosts(u.id);
let h='<div style="background:linear-gradient(135deg,var(--acc),var(--acc2));color:#fff;padding:22px;border-radius:20px;text-align:center;margin-bottom:16px;cursor:pointer" onclick="openProfile(\''+u.id+'\')">'
+'<h3 style="font-family:Cormorant,Georgia,serif;font-size:18px;margin-bottom:12px">🎲 Случайный творец</h3>'
+'<div style="width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,.15);margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;overflow:hidden;border:3px solid rgba(255,255,255,.25)">'+(u.photo?'<img src="'+u.photo+'" style="width:100%;height:100%;object-fit:cover">':escH(u.avatar))+'</div>'
+'<div style="font-size:18px;font-weight:700">'+escH(u.name)+'</div><div style="font-size:13px;opacity:.8">'+escH(u.username)+'</div>'
+'<div style="font-size:12px;opacity:.8;margin:8px 0">'+ps.length+' работ</div></div>';
if(ps.length)h+=ps.slice(0,3).map(renderPost).join('');
c.innerHTML=h;
setTimeout(afterRender,60);
}
function renderStudio(c){
if(!currentUser){showFullAuth('login');return}
const ps=getUserPosts(currentUser.id);
const likes=ps.reduce((s,p)=>s+(p.likes||0),0);
const cm=ps.reduce((s,p)=>s+((p.comments||[]).length),0);
const dr=JSON.parse(localStorage.getItem('muse_dr_'+currentUser.id)||'[]');
const mb=JSON.parse(localStorage.getItem('muse_mb_'+currentUser.id)||'{}');
const me=getUserById(currentUser.id)||currentUser;
const fol=((me&&me.followers)||[]).length;
const st=getStreak(currentUser.id);
const daily=getDaily();

let h='<div class="studio-hero"><div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.7">Dashboard</div><h2>Muse Studio</h2><p style="font-size:12px;opacity:.8">Твоё творчество</p>'
+'<div style="display:flex;align-items:center;gap:10px;margin-top:10px;padding:8px 14px;background:rgba(255,255,255,.15);border-radius:12px"><span style="font-size:26px">'+streakIcon(st)+'</span><div><b style="font-size:14px;display:block">'+st+' дн</b><span style="font-size:10px;opacity:.8">'+streakLabel(st)+'</span></div></div></div>';
h+='<div class="studio-stats"><div class="studio-stat"><b>'+ps.length+'</b><span>публикаций</span></div><div class="studio-stat"><b>'+likes+'</b><span>лайков</span></div><div class="studio-stat"><b>'+cm+'</b><span>комментариев</span></div><div class="studio-stat"><b>'+fol+'</b><span>подписчиков</span></div></div>';
h+='<div class="daily-tasks"><div class="dt-h"><div class="dt-title">☀️ Задания дня</div><div class="dt-date">'+daily.date+'</div></div>';
daily.tasks.forEach((t,i)=>{
const done=isTaskDone(t);
h+='<div class="dt-item'+(done?' dt-done':'')+'" style="cursor:pointer" onclick="showTaskDetail('+i+')"><span class="dt-cat">'+(DTL[t.cat]||t.cat)+'</span><span class="dt-text">'+escH(t.text)+'</span><span class="dt-check">'+(done?'✅':'›')+'</span></div>';
});
h+='</div>';
const pop=getAllPosts().sort((a,b)=>(b.likes||0)-(a.likes||0)).slice(0,3);
if(pop.length){
h+='<div style="margin-top:16px"><div style="font-family:Cormorant,Georgia,serif;font-size:18px;font-weight:700;color:var(--txt);margin-bottom:10px">💡 Вдохновение</div>'+pop.map(renderPost).join('')+'</div>';
}
h+='<div class="studio-actions"><button class="studio-action" onclick="openCreate()"><b>Создать</b><span>Текст, фото, музыка</span></button><button class="studio-action" onclick="navigate(\'drafts\')"><b>Черновики · '+dr.length+'</b><span>Продолжить</span></button><button class="studio-action" onclick="navigate(\'moodboards\')"><b>Коллекции · '+Object.keys(mb).length+'</b><span>Вдохновение</span></button></div>';
c.innerHTML=h;
setTimeout(afterRender,60);
}

/* ===== НАСТРОЙКИ ===== */
function openVKSettings(){
if(currentUser){
document.getElementById('vsName').textContent=currentUser.name;
document.getElementById('vsHandle').textContent=currentUser.username;
const a=document.getElementById('vsAv');
a.textContent=currentUser.avatar;
if(currentUser.photo)a.innerHTML='<img src="'+currentUser.photo+'">';
}
document.getElementById('vkSettingsPage').classList.add('active');
document.getElementById('settingsMainPage').style.display='block';
document.querySelectorAll('.settings-subpage').forEach(p=>p.classList.remove('active'));
}
function closeVKSettings(){document.getElementById('vkSettingsPage').classList.remove('active')}
function openSettingsSub(n){
document.getElementById('settingsMainPage').style.display='none';
document.querySelectorAll('.settings-subpage').forEach(p=>p.classList.remove('active'));
const sp=document.getElementById('subpage-'+n);
if(sp)sp.classList.add('active');
if(n==='appearance')renderPers();
document.querySelectorAll('.toggle-switch').forEach(el=>{
if(userSettings[el.id]!==undefined)el.classList.toggle('active',userSettings[el.id]);
});
}
function closeSettingsSub(){
document.getElementById('settingsMainPage').style.display='block';
document.querySelectorAll('.settings-subpage').forEach(p=>p.classList.remove('active'));
}
function smartBack(){
var sub=document.querySelector('.settings-subpage.active');
if(sub)closeSettingsSub();
else closeVKSettings();
}
function toggleSetting(id){
const el=document.getElementById(id);
if(!el)return;
el.classList.toggle('active');
userSettings[id]=el.classList.contains('active');
saveUserSettings();
}
function saveUserSettings(){
if(currentUser)localStorage.setItem('muse_set_'+currentUser.id,JSON.stringify(userSettings));
localStorage.setItem('muse_prefs',JSON.stringify(userSettings));
}
const THEMES={light:{label:'Светлая',bg:'linear-gradient(135deg,#f4f4fa,#e8e8f4)',txt:'#333'},dark:{label:'Тёмная',bg:'linear-gradient(135deg,#0e1020,#1a1a3e)',txt:'#fff'}};
const PATP={stars:{label:'Звёзды',icon:'★'},hearts:{label:'Сердца',icon:'♡'},notes:{label:'Ноты',icon:'♪'},art:{label:'Арт',icon:'✿'},dream:{label:'Мечта',icon:'✦'},none:{label:'Чистый',icon:'—'}};
function renderPers(){
const tg=document.getElementById('themeGrid');
const pg=document.getElementById('patGrid');
if(!tg||!pg)return;
tg.innerHTML=Object.keys(THEMES).map(tid=>{
const t=THEMES[tid];
return'<div class="pers-item'+(userSettings.theme===tid?' sel':'')+'" style="background:'+t.bg+';color:'+t.txt+'" onclick="setPersTheme(\''+tid+'\')"><div class="pers-check">✓</div><span>'+t.label+'</span></div>';
}).join('');
pg.innerHTML=Object.keys(PATP).map(pid=>{
const p=PATP[pid];
return'<div class="pers-item'+(userSettings.pattern===pid?' sel':'')+'" style="background:var(--sur2);color:var(--acc)" onclick="setPersPat(\''+pid+'\')"><div class="pers-check">✓</div><span style="font-size:16px">'+p.icon+'</span><span>'+p.label+'</span></div>';
}).join('');
}
function setPersTheme(t){userSettings.theme=t;applyTheme(t);renderPers();toast('Тема изменена','🎨')}
function setPersPat(p){userSettings.pattern=p;saveUserSettings();applyPattern();renderPers();toast('Фон изменён','✨')}

/* ===== МОДАЛКИ ===== */
function openEditModal(){
if(!requireAuth())return;
closeVKSettings();
document.getElementById('editName').value=currentUser.name;
document.getElementById('editUsername').value=currentUser.username;
document.getElementById('editBio').value=currentUser.bio||'';
pendingProfilePhoto=currentUser.photo||null;
const p=document.getElementById('editAvPrev');
p.innerHTML=currentUser.photo?'<img src="'+currentUser.photo+'" style="width:100%;height:100%;object-fit:cover">':currentUser.avatar;
document.getElementById('editModal').classList.add('active');
}
function closeEditModal(){document.getElementById('editModal').classList.remove('active');pendingProfilePhoto=null}
function handlePhoto(ev){
const f=ev.target.files[0];
if(!f)return;
const r=new FileReader();
r.onload=e=>{
const img=new Image();
img.onload=()=>{
const c=document.createElement('canvas');
const mx=400;let w=img.width,h=img.height;
if(w>h&&w>mx){h=h*mx/w;w=mx}else if(h>mx){w=w*mx/h;h=mx}
c.width=w;c.height=h;
c.getContext('2d').drawImage(img,0,0,w,h);
pendingProfilePhoto=c.toDataURL('image/jpeg',.9);
document.getElementById('editAvPrev').innerHTML='<img src="'+pendingProfilePhoto+'" style="width:100%;height:100%;object-fit:cover">';
};
img.src=e.target.result;
};
r.readAsDataURL(f);ev.target.value='';
}
function saveProfile(){
if(!currentUser)return;
const nm=document.getElementById('editName').value.trim();
const un=document.getElementById('editUsername').value.trim().replace(/^@/,'');
const bio=document.getElementById('editBio').value.trim();
if(!nm||!un){toast('Заполните имя и ник','⚠');return}
currentUser.name=nm;currentUser.username=un;currentUser.bio=bio;
currentUser.avatar=nm.charAt(0).toUpperCase();
if(pendingProfilePhoto)currentUser.photo=pendingProfilePhoto;
localStorage.setItem('muse_cur',JSON.stringify(currentUser));
const users=getUsers();
const i=users.findIndex(x=>x.id===currentUser.id);
if(i!==-1){users[i]=currentUser;saveUsers(users)}
closeEditModal();
currentProfileUserId=currentUser.id;
updSidebar();renderProfile(document.getElementById('mainContent'));
toast('Сохранено','✨');
}
function openChangePassword(){if(!requireAuth())return;closeVKSettings();document.getElementById('passModal').classList.add('active')}
function closePassModal(){
document.getElementById('passModal').classList.remove('active');
document.getElementById('curPass').value='';
document.getElementById('newPass').value='';
document.getElementById('cfPass').value='';
}
function changePass(){
const cur=document.getElementById('curPass').value;
const np=document.getElementById('newPass').value;
const cf=document.getElementById('cfPass').value;
if(cur!==currentUser.password){toast('Неверный пароль','⚠');return}
if(np.length<4){toast('Минимум 4','⚠');return}
if(np!==cf){toast('Не совпадают','⚠');return}
currentUser.password=np;
localStorage.setItem('muse_cur',JSON.stringify(currentUser));
const users=JSON.parse(localStorage.getItem('muse_users')||'[]');
const i=users.findIndex(u=>u.id===currentUser.id);
if(i!==-1){users[i]=currentUser;localStorage.setItem('muse_users',JSON.stringify(users))}
closePassModal();toast('Изменён','🔐');
}
function openPV(src){
document.getElementById('photoViewerImg').src=src;
document.getElementById('photoViewer').classList.add('active');
}
function closePhotoViewer(){document.getElementById('photoViewer').classList.remove('active')}

/* ===== ФЕЯ ===== */
function showFairy(){
const f=document.getElementById('museFairy');
if(!f)return;
const today=new Date().toDateString();
if(localStorage.getItem('muse_fairy_date')===today)return;
localStorage.setItem('muse_fairy_date',today);
document.getElementById('fairyTip').textContent=FAIRY_TIPS[Math.floor(Math.random()*FAIRY_TIPS.length)];
f.classList.add('show');
setTimeout(()=>f.classList.remove('show'),8000);
f.onclick=()=>f.classList.remove('show');
}
function inspireMe(){
const ps=getAllPosts();
if(!ps.length){toast('Пока нет постов','📭');return}
const p=ps[Math.floor(Math.random()*ps.length)];
navigate('home');
setTimeout(()=>{
const el=document.getElementById('pc-'+p.id);
if(el){
el.scrollIntoView({behavior:'smooth',block:'center'});
el.style.boxShadow='0 0 0 3px var(--acc)';
setTimeout(()=>{el.style.boxShadow=''},2000);
}
},300);
toast('Вдохновение!','✨');
}

/* ===== ЗАПУСК ===== */
window.onload=function(){
const prefs=localStorage.getItem('muse_prefs');
if(prefs){try{userSettings=JSON.parse(prefs)}catch(e){}}
const sv=localStorage.getItem('muse_cur');
if(sv){try{currentUser=JSON.parse(sv)}catch(e){currentUser=null}}
if(currentUser){
updSidebar();
const ss=localStorage.getItem('muse_set_'+currentUser.id);
if(ss){try{userSettings={...userSettings,...JSON.parse(ss)}}catch(e){}}
}
applyTheme(userSettings.theme||'light');
initSplash();
ensureSamples();
navigate('home');
updBadge();
setTimeout(showFairy,8000);
};

/* ===== СЛУШАТЕЛИ ===== */
document.getElementById('editorOverlay')?.addEventListener('click',function(e){if(e.target===this)closeEditor()});
document.getElementById('draftDialog')?.addEventListener('click',function(e){if(e.target===this)cancelDraft()});
document.getElementById('editModal')?.addEventListener('click',function(e){if(e.target===this)closeEditModal()});
document.getElementById('passModal')?.addEventListener('click',function(e){if(e.target===this)closePassModal()});
document.getElementById('photoViewer')?.addEventListener('click',function(e){if(e.target===this)closePhotoViewer()});
document.addEventListener('click',function(e){
if(!e.target.closest('[onclick*="togglePM"]')&&!e.target.closest('[id^="pm-"]')){
document.querySelectorAll('[id^="pm-"]').forEach(m=>m.style.display='none');
}
});
document.addEventListener('keydown',function(e){
if(e.key==='Escape'){
if(document.getElementById('photoViewer')?.classList.contains('active'))closePhotoViewer();
else if(document.getElementById('editModal')?.classList.contains('active'))closeEditModal();
else if(document.getElementById('passModal')?.classList.contains('active'))closePassModal();
else if(document.getElementById('createPicker')?.classList.contains('open'))closePicker();
else if(document.getElementById('taskDetail')?.classList.contains('open'))closeTD();
else if(document.getElementById('storyComp')?.classList.contains('active'))closeStoryComp();
}
});
document.getElementById('editorText')?.addEventListener('input',checkCanPublish);

/* Умная кнопка назад в настройках */
setTimeout(function(){
var mb=document.querySelector('#vkSettingsPage > .vk-set-head .vk-set-back');
if(mb)mb.onclick=smartBack;
document.querySelectorAll('.settings-subpage .vk-set-back').forEach(function(btn){
btn.onclick=function(){closeSettingsSub()};
});
},100);

/* Route */
(function(){
function boot(){
if(!currentUser)return;
var p=(location.hash||'').replace(/^#\//,'');
if(p&&['home','studio','profile','popular','challenges','explore','notifications','achievements','drafts','moodboards','random','following'].includes(p))navigate(p,false);
}
window.addEventListener('hashchange',boot);
window.addEventListener('load',function(){setTimeout(boot,100)});
})();

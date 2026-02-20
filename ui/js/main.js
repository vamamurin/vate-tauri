const { invoke } = window.__TAURI__.core;

const COLORS = [
  { hex: '#c084fc', name: 'Lavender' },
  { hex: '#f472b6', name: 'Rose' },
  { hex: '#67e8f9', name: 'Cyan' },
  { hex: '#34d399', name: 'Emerald' },
  { hex: '#fbbf24', name: 'Gold' },
  { hex: '#f87171', name: 'Coral' },
];

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

let current  = new Date();
let today    = new Date();
let selected = { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() };
let events   = {};
let chosenColor = COLORS[0].hex;

function key(y,m,d){ return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

async function saveToDisk() {
  try {
    await invoke('save_jobs', { jobsJson: JSON.stringify(events) });
  } catch (e) {
    console.error("Lỗi lưu file:", e);
  }
}

function render(){
  const y = current.getFullYear(), m = current.getMonth();

  document.getElementById('monthTitle').innerHTML = `<em>${MONTHS[m]}</em> ${y}`;

  document.getElementById('dayLabels').innerHTML =
    DAYS.map((d,i)=>`<div class="day-label${i===0||i===6?' we':''}">${d}</div>`).join('');

  const firstDay    = new Date(y,m,1).getDay();
  const daysInMonth = new Date(y,m+1,0).getDate();
  const daysInPrev  = new Date(y,m,0).getDate();
  const grid        = document.getElementById('daysGrid');
  grid.innerHTML    = '';

  let cells = [];
  for(let i=firstDay-1;i>=0;i--) cells.push({day:daysInPrev-i, mo:m===0?11:m-1, yr:m===0?y-1:y, other:true});
  for(let d=1;d<=daysInMonth;d++) cells.push({day:d, mo:m, yr:y, other:false});
  while(cells.length<42){
    let d=cells.length-firstDay-daysInMonth+1;
    cells.push({day:d, mo:m===11?0:m+1, yr:m===11?y+1:y, other:true});
  }

  cells.forEach(c=>{
    const div     = document.createElement('div');
    const cellKey = key(c.yr, c.mo, c.day);
    const isToday = !c.other && c.day===today.getDate() && c.mo===today.getMonth() && c.yr===today.getFullYear();
    const isSel   = selected && key(selected.y,selected.m,selected.d)===cellKey;
    const dow     = new Date(c.yr,c.mo,c.day).getDay();
    const isWE    = dow===0||dow===6;
    const evList  = events[cellKey]||[];

    div.className = ['day-cell',
      c.other?'other-month':'',
      isToday?'today':'',
      isSel?'selected':'',
      isWE&&!c.other?'we-day':''
    ].filter(Boolean).join(' ');

    const num = document.createElement('div');
    num.className   = 'day-num';
    num.textContent = c.day;
    div.appendChild(num);

    if(evList.length){
      const dots = document.createElement('div');
      dots.className = 'dots';
      evList.slice(0,5).forEach(e=>{
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.style.cssText = `background:${e.color};color:${e.color}`;
        dots.appendChild(dot);
      });
      div.appendChild(dots);

      if(evList.length>1){
        const badge = document.createElement('div');
        badge.className   = 'event-count';
        badge.textContent = evList.length;
        div.appendChild(badge);
      }
    }

    if(!c.other){
      div.addEventListener('click',()=>{
        selected = {y:c.yr, m:c.mo, d:c.day};
        render(); renderPanel();
      });
    }

    grid.appendChild(div);
  });

  const totalDays  = daysInMonth;
  const currentDay = (y===today.getFullYear()&&m===today.getMonth()) ? today.getDate() : 0;
  const pct        = Math.round((currentDay/totalDays)*100);
  document.getElementById('progressFill').style.width  = pct+'%';
  document.getElementById('progressLabel').textContent = pct ? `${pct}% through ${MONTHS[m]}` : MONTHS[m];

  const totalEvs = Object.values(events).flat().length;
  document.getElementById('streakCount').textContent = totalEvs;
}

function renderPanel(){
  if(!selected) return;
  const k    = key(selected.y, selected.m, selected.d);
  const date = new Date(selected.y, selected.m, selected.d);

  document.getElementById('selWeekday').textContent = date.toLocaleDateString('en-US',{weekday:'long'});
  document.getElementById('selDate').textContent    = date.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});

  const evList = events[k]||[];
  const list   = document.getElementById('eventList');
  if(!evList.length){ list.innerHTML='<div class="no-events">No events for this day</div>'; return; }

  list.innerHTML = evList.map((e,i)=>`
    <div class="event-item">
      <div class="event-color-dot" style="background:${e.color};color:${e.color}"></div>
      <div class="event-info">
        <div class="event-name">${e.name}</div>
        ${e.time?`<div class="event-time">${fmtTime(e.time)}</div>`:''}
      </div>
      <button class="del-btn" data-k="${k}" data-i="${i}">✕</button>
    </div>
  `).join('');


  list.querySelectorAll('.del-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const ki=btn.dataset.k, ii=parseInt(btn.dataset.i);
      events[ki].splice(ii,1);
      if(!events[ki].length) delete events[ki];
      
      await saveToDisk(); 
      
      render(); renderPanel();
    });
  });
}

function fmtTime(t){
  if(!t) return '';
  const [h,m]=t.split(':'); const hr=parseInt(h);
  return `${hr%12||12}:${m} ${hr<12?'AM':'PM'}`;
}

const colorRow = document.getElementById('colorRow');
COLORS.forEach(c=>{
  const btn = document.createElement('div');
  btn.className = 'cpick'+(c.hex===chosenColor?' active':'');
  btn.style.background = c.hex;
  btn.title = c.name;
  btn.addEventListener('click',()=>{
    chosenColor = c.hex;
    colorRow.querySelectorAll('.cpick').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  });
  colorRow.appendChild(btn);
});

document.getElementById('legend').innerHTML = COLORS.slice(0,4).map(c=>
`<div class="legend-item"><div class="legend-dot" style="background:${c.hex};box-shadow:0 0 6px ${c.hex}"></div>${c.name}</div>`
).join('');

document.getElementById('closeBtn').addEventListener('click', () => {
  invoke('exit_app');
});


document.getElementById('addBtn').addEventListener('click', async ()=>{
  if(!selected) return;
  const name = document.getElementById('eventName').value.trim();
  if(!name) return;
  const time = document.getElementById('eventTime').value;
  const k = key(selected.y, selected.m, selected.d);
  if(!events[k]) events[k]=[];
  events[k].push({name,time,color:chosenColor});
  events[k].sort((a,b)=>a.time.localeCompare(b.time));
  document.getElementById('eventName').value='';
  document.getElementById('eventTime').value='';
  
  await saveToDisk(); 
  
  render(); renderPanel();
});

document.getElementById('eventName').addEventListener('keydown',e=>{ if(e.key==='Enter') document.getElementById('addBtn').click(); });
document.getElementById('prevBtn').addEventListener('click',()=>{ current.setMonth(current.getMonth()-1); render(); });
document.getElementById('nextBtn').addEventListener('click',()=>{ current.setMonth(current.getMonth()+1); render(); });
document.getElementById('todayBtn').addEventListener('click',()=>{
  current = new Date();
  selected = {y:today.getFullYear(),m:today.getMonth(),d:today.getDate()};
  render(); renderPanel();
});

async function initApp() {
  try {
    const data = await invoke('load_jobs');
    if (data) {
      events = JSON.parse(data);
    }
  } catch (e) {
    console.error("Lỗi đọc file từ Rust, tạo lịch trống:", e);
    events = {};
  }

  render();
  renderPanel();
}

initApp();

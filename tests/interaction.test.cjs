// Runtime regression tests with mocked DOM/media APIs, not a browser or live-call test.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(process.env.MIZAN_HTML||require('node:path').join(__dirname,'../index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
function boot(options={}){
  const nodes=new Map(), events={}, timers=new Map(), intervals=new Map();let seq=0;
  function element(key){
    if(nodes.has(key))return nodes.get(key);
    const classes=new Set();
    const el={id:key.replace(/^#/,''),value:'',checked:false,dataset:{},children:[],textContent:'',innerHTML:'',src:'',disabled:false,
      classList:{add(...xs){xs.forEach(x=>classes.add(x))},remove(...xs){xs.forEach(x=>classes.delete(x))},contains:x=>classes.has(x),toggle(x,on){on=on??!classes.has(x);on?classes.add(x):classes.delete(x);return on}},
      style:{setProperty(k,v){this[k]=v},removeProperty(k){delete this[k]}},
      setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]},
      addEventListener(k,v){this['on'+k]=v},appendChild(x){this.children.push(x)},focus(){},click(){this.onclick?.()},pause(){},load(){},remove(){},play(){return Promise.resolve()},
      closest(s){return s==='.workout-view'?view:element(s)},querySelector:s=>element(s),querySelectorAll:s=>all(s)};
    nodes.set(key,el);return el;
  }
  const actualIds=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
  const select=s=>/^#[\w-]+$/.test(s)&&!actualIds.has(s.slice(1))?null:element(s);
  const pages=['homePage','chatPage','workoutsPage','progressPage','mealsPage','profilePage'].map(x=>element('#'+x));
  const nav=pages.map((p,i)=>{const n=element('nav'+i);n.dataset.go=p.id;return n});
  const view=element('.workout-view');const step=element('routine-title');step.textContent='مشي هادئ';
  view.querySelector=()=>step;view.querySelectorAll=()=>[step];
  const timer=element('.start-timer');timer.dataset.seconds='60';
  function all(s){if(s==='.page')return pages;if(s==='[data-go]'||s==='.nav'||s==='.bottom .nav')return nav;if(s==='.start-timer')return [timer];return []}
  element('#language').value='ar';
  element('input[name=coach]:checked').value='female';
  const storage=new Map();
  let recognition, stopped=0, requests=0, fetches=0, resolveMedia, channel;
  const stream={getTracks:()=>[{stop(){stopped++}}]};
  class Recognition{constructor(){recognition=this}start(){} stop(){this.onend?.()}abort(){this.onend?.()}}
  const context={console:{error(){}},URLSearchParams,AbortController,Date,Math,JSON,Number,String,Error,location:{search:''},scrollTo(){},
    document:{getElementById:id=>select("#"+id),querySelector:select,querySelectorAll:all,createElement:element,body:element('body'),documentElement:element('html'),addEventListener(k,v){events[k]=v}},
    localStorage:{getItem:k=>storage.get(k)??null,setItem(k,v){if(options.storageDenied)throw Error('quota');storage.set(k,v)}},
    navigator:{mediaDevices:{getUserMedia(){requests++;if(options.mediaDenied)return Promise.reject(Object.assign(Error('denied'),{name:'NotAllowedError'}));if(options.pendingMedia)return new Promise(r=>resolveMedia=r);return Promise.resolve(stream)}}},
    isSecureContext:true,SpeechRecognition:options.noSR?undefined:Recognition,
    setTimeout(fn,ms){timers.set(++seq,{fn,ms});return seq},clearTimeout:id=>timers.delete(id),setInterval(fn,ms){intervals.set(++seq,{fn,ms});return seq},clearInterval:id=>intervals.delete(id),
    RTCPeerConnection:class {addTrack(){} createDataChannel(){channel={readyState:'open',send(){},close(){}};return channel}async createOffer(){return {sdp:'mock-offer'}}async setLocalDescription(){}async setRemoteDescription(){channel.onopen()}close(){}},
    fetch:async()=>{fetches++;return options.connected?{ok:true,json:async()=>({value:'test-token'}),text:async()=>'mock-answer'}:{ok:false}},addEventListener(k,v){events[k]=v}};
  context.window=context;vm.createContext(context);scripts.forEach(s=>vm.runInContext(s,context));
  // Test-only bridge: top-level lexical declarations in the app are not properties of the VM global.
  context.__mizanTest=vm.runInContext(`({coachReply,contextualPrompt,get profile(){return profile},set profile(v){profile=v}})`,context);
  return {nodes,select,events,timers,intervals,storage,timer,nav,context,get app(){return context.__mizanTest},get channel(){return channel},get recognition(){return recognition},get stopped(){return stopped},get requests(){return requests},get fetches(){return fetches},resolveMedia(){resolveMedia(stream)}};
}
test('startup binds microphone, onboarding and profile after timer registration',()=>{const a=boot();for(const id of ['micBtn','onNext','saveProfile','addWater'])assert.equal(typeof a.select('#'+id).onclick,'function');});
test('navigation updates active page and body mode',()=>{const a=boot();a.nav[1].onclick();assert(a.select('#chatPage').classList.contains('active'));assert.equal(a.context.document.body.dataset.mode,'conversation')});
test('onboarding completes and saves the profile',()=>{const a=boot();a.select('#healthConsent').checked=true;for(let i=0;i<6;i++)a.select('#onNext').onclick();assert(a.select('#onboarding').classList.contains('hide'));assert.equal(JSON.parse(a.storage.get('mizan_profile')).onboarded,true)});
test('workout starts, counts down and stops without undefined card',()=>{const a=boot();a.timer.onclick();assert(a.select('#workoutStage').classList.contains('active'));assert.equal(a.select('#workoutStageTimer').textContent,'01:00');[...a.intervals.values()].find(x=>x.ms===1000).fn();assert.equal(a.select('#workoutStageTimer').textContent,'00:59');a.select('#stopWorkout').onclick();assert(!a.select('#workoutStage').classList.contains('active'));assert(![...a.intervals.values()].some(x=>x.ms===1000))});
test('microphone toggles and resets after permission error',()=>{const a=boot();a.select('#micBtn').onclick();assert.equal(a.select('#micBtn')['aria-pressed'],'true');a.recognition.onstart();assert(a.select('#avatar').classList.contains('listening'));a.recognition.onerror({error:'not-allowed'});assert.equal(a.select('#micBtn')['aria-pressed'],'false');assert.match(a.select('#homeStatus').textContent,/اسمحي/)});
test('unsupported recognition keeps text input available',()=>{const a=boot({noSR:true});a.select('#micBtn').onclick();assert.match(a.select('#toast').textContent,/غير متاح/);assert.equal(typeof a.select('#sendBtn').onclick,'function')});
test('storage failure does not stop initialization',()=>{const a=boot({storageDenied:true});assert.equal(typeof a.select('#onNext').onclick,'function');assert.match(a.select('#toast').textContent,/تعذّر الحفظ/)});


test('service worker bypasses external tokens and no-store requests',()=>{
 const listeners={};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../sw.js'),'utf8'),{self:{location:{origin:'https://example.test'},addEventListener:(k,v)=>listeners[k]=v},URL});
 for(const request of [{method:'GET',url:'https://voice.example/token'},{method:'GET',url:'https://example.test/token',cache:'no-store'},{method:'POST',url:'https://example.test/session'}])listeners.fetch({request,respondWith(){assert.fail('must bypass service worker')}});
});

test('voice fallback opens chat and starts browser recognition without paid requests',async()=>{const a=boot();await a.select('#aiVoiceBtn').onclick();assert.equal(a.requests,0);assert.equal(a.fetches,0);assert(a.select('#chatPage').classList.contains('active'));const start=[...a.timers.values()].find(t=>t.ms===180);assert(start);start.fn();assert(a.recognition);assert.equal(a.select('#micBtn')['aria-pressed'],'true');assert(!a.select('#voiceStage').classList.contains('active'))});

test('safety routing precedes ordinary food and language fallback',()=>{
 const a=boot();a.select('#language').value='en';
 const reply=a.app.coachReply('I have chest pain and want dinner');
 assert.match(reply,/safety comes first/i);
 assert.doesNotMatch(reply,/breakfast|lunch|dinner/i);
});

test('medical boundary is localized outside Arabic',()=>{
 const a=boot();a.select('#language').value='sv';
 const reply=a.app.coachReply('Kan du ändra min medicin och dosering?');
 assert.match(reply,/MIZAN är för välmående och livsstil/);
 assert.match(reply,/inte diagnos|ställer inte diagnos/);
});

test('teen weight-pressure requests get wellbeing guard',()=>{
 const a=boot();a.app.profile={...a.app.profile,age:15};a.select('#language').value='en';
 const reply=a.app.coachReply('I want rapid weight loss and calorie targets');
 assert.match(reply,/energy, sleep, balanced food/i);
 assert.doesNotMatch(reply,/calorie target/i);
});

test('external AI prompt uses minimum context rather than full health context',()=>{
 const a=boot();a.app.profile={age:30,goal:'wellness',health:'private full health note',mental:'private mental note',country:'SE',language:'en'};
 const prompt=a.app.contextualPrompt('hello');
 assert.match(prompt,/age|العمر/i);
 assert.doesNotMatch(prompt,/private full health note|private mental note/);
});

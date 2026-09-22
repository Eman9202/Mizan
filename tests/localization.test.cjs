const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.join(__dirname,'..');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function boot(onboarded=true){
 const errors=[],console=new VirtualConsole();
 console.on('jsdomError',e=>{if(!/CSS|HTMLMediaElement/.test(e.message))errors.push(e.message)});
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://mizan.test',runScripts:'outside-only',virtualConsole:console});
 const w=dom.window;w.scrollTo=()=>{};w.HTMLMediaElement.prototype.pause=()=>{};
 w.localStorage.setItem('mizan_profile',JSON.stringify({onboarded,name:'Test اسم',language:'ar',country:'SE',coach:'female',health:'بيانات المستخدم'}));
 w.localStorage.setItem('mizan_effects','false');
 for(const s of w.document.querySelectorAll('script'))w.eval(s.src?fs.readFileSync(path.join(root,s.getAttribute('src')),'utf8'):s.textContent);
 return {dom,w,errors,$:s=>w.document.querySelector(s)};
}
function remainingArabic(w){
 const result=[],walker=w.document.createTreeWalker(w.document.body,w.NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){
  const n=walker.currentNode;
  // Native language names and explicit user content should never be translated.
  if(n.parentElement.closest('script,style,textarea,option,[data-value="ar"],#contextSummary,#greeting,.msg.me,[data-user-content]'))continue;
  if(/[\u0600-\u06ff]/.test(n.textContent))result.push(n.textContent.trim());
 }
 return [...new Set(result)];
}
test('Swedish and Bosnian cover screens, dynamic updates and round-trip language switches',async()=>{
 const a=boot();try{
  await tick();const coach=a.$('input[name="coach"]'),initialCountry=[...a.$('#country').options].map(o=>o.value);
  for(const lang of ['sv','bs','ar','sv','bs']){
   a.$('#language').value=lang;a.$('#language').dispatchEvent(new a.w.Event('change'));await tick();
   assert.equal(a.w.document.documentElement.dir,lang==='ar'?'rtl':'ltr');
   for(const nav of a.w.document.querySelectorAll('.bottom .nav')){nav.click();await tick();assert(a.$('#'+nav.dataset.go).classList.contains('active'));}
   a.$('#addWater').click();await tick();
   if(lang!=='ar')assert.deepEqual(remainingArabic(a.w),[]);
   else assert.match(a.$('#dailyPath').textContent,/مسارك اليوم/);
   assert.equal(a.$('input[name="coach"]'),coach,'checkbox/radio elements must not be recreated');
   assert.deepEqual([...a.$('#country').options].map(o=>o.value),initialCountry);
   assert.equal(a.$('#name').value,'Test اسم');assert.equal(a.$('#health').value,'بيانات المستخدم');
   a.$('#saveProfile').click();await tick();
   assert.equal(JSON.parse(a.w.localStorage.getItem('mizan_profile')).language,lang);
  }
  assert.deepEqual(a.errors,[]);
 }finally{a.dom.window.close()}
});
test('onboarding language changes translate nested labels and preserve form input',async()=>{
 const a=boot(false);try{
  a.$('#onName').value='Test';
  for(const lang of ['sv','bs','ar']){
   a.$('#languageChoices [data-value="'+lang+'"]').click();await tick();
   assert.equal(a.w.document.documentElement.lang,lang);
   if(lang==='bs')assert.match(a.$('#onboarding').textContent,/Vaša privatnost/);
   if(lang==='sv')assert.match(a.$('#onboarding').textContent,/Din integritet/);
   if(lang==='ar')assert.match(a.$('#onboarding').textContent,/خصوصيتك/);
   assert.equal(a.$('#onName').value,'Test');
  }
 }finally{a.dom.window.close()}
});

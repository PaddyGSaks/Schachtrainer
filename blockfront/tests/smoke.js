// Rauchtest: startet mehrere Schlachten im Handy-Emulator und meldet JavaScript-Fehler.
// Aufruf: node tests/smoke.js   (benötigt: npm i -D playwright)
const {chromium}=require('playwright');const path=require('path');
const url='file://'+path.resolve(__dirname,'..','index.html')+'?seed=21';
const cases=[
 {battle:'dday',country:'usa',base:'ship'},{battle:'stalingrad',country:'ussr',base:'gun'},
 {battle:'berlin',country:'ussr',base:'reichstag'},{battle:'berlin',country:'de',base:'reichstag'},
 {battle:'kursk',country:'de',role:'tank',tank:'tiger',base:'camp'},{battle:'alamein',country:'au',base:'camp'},
 {battle:'iwojima',country:'usa',base:'camp'},{battle:'cassino',country:'pl',base:'camp'},
 {battle:'britain',country:'uk',base:'home'},{battle:'pearl',country:'usa',base:'g0'},{battle:'pearl',country:'jp',base:'west'},
 {battle:'free',country:'it',mode:'urban',theme:'desert',role:'smoke',base:'camp'}];
(async()=>{
 const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 let bad=0;
 for(const cs of cases){
  const c=await b.newContext({viewport:{width:800,height:380},isMobile:true,hasTouch:true});
  await c.addInitScript(v=>{try{localStorage.setItem('blockfront-cfg',v)}catch(e){}},JSON.stringify({uniform:0,...cs}));
  const p=await c.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto(url);await p.evaluate(()=>document.getElementById('startBtn').click());
  try{await p.waitForFunction(()=>window.__bf,{timeout:90000});await p.tap('#play');await p.waitForTimeout(1500)}catch(e){errs.push('Start-Timeout')}
  console.log((errs.length?'FEHLER ':'ok     ')+JSON.stringify(cs)+(errs.length?' '+errs.join(' | '):''));
  if(errs.length)bad++;await c.close();
 }
 await b.close();process.exit(bad?1:0);
})();

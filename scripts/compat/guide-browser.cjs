const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
let puppeteer;try{puppeteer=require('puppeteer')}catch{puppeteer=require(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'puppeteer'))}
const base=process.env.VPYLAB_TEST_URL||'https://vpylab.pages.dev',out=process.env.VPYLAB_TEST_OUT||'/private/tmp/vpylab-production-guide';
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await puppeteer.launch({headless:'shell'}),page=await browser.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));try{
 await page.setViewport({width:1440,height:1100});await page.goto(base+'/guide',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('main h1')?.textContent.trim()==='사용 안내');
 for(const id of ['start','forge','fork','character','projects'])assert(await page.$('#'+id),id);results.push('five-guide-sections');
 const text=await page.$eval('main',e=>e.textContent);for(const value of ['obj.pos.x += 0.1','33개','공개 내리기','8개','AI 없이','VPyLab 자체 기능'])assert(text.includes(value),value);results.push('guide-matches-shipped-features');
 const links=await page.$$eval('main a[href]',els=>els.map(e=>e.getAttribute('href')));for(const href of ['/forge','/tutorials/forge-character','/missions','/gallery','/docs#compound'])assert(links.includes(href),href);assert(!links.includes('/training'));results.push('valid-learning-links');
 await page.screenshot({path:path.join(out,'production-guide-desktop.png')});await page.$eval('a[href="#forge"]',e=>e.click());await new Promise(r=>setTimeout(r,150));await page.screenshot({path:path.join(out,'production-guide-forge.png')});
 for(const width of [360,768]){await page.setViewport({width,height:960});await page.evaluate(()=>scrollTo(0,0));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'production-guide-'+width+'.png')});results.push('guide-responsive-'+width);}
 assert.deepEqual(errors,[]);console.log('guide-browser passed',results.length);
 }finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({generatedAt:new Date().toISOString(),url:base,results,errors},null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

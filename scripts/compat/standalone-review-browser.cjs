const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');let puppeteer;try{puppeteer=require('puppeteer')}catch{puppeteer=require(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'puppeteer'))}
const root=path.resolve(__dirname,'../..'),out=process.env.VPYLAB_TEST_OUT||path.join(os.tmpdir(),'vpylab-standalone-review');
(async()=>{
 fs.mkdirSync(out,{recursive:true});const {generateStandaloneHTML}=await import(path.join(root,'shared/export-html.js'));
 const code=fs.readFileSync(path.join(root,'scripts/compat/fixtures/camera-compound.py'),'utf8');
 let html=process.env.VPYLAB_EXPORT_HTML?fs.readFileSync(process.env.VPYLAB_EXPORT_HTML,'utf8'):generateStandaloneHTML(code,'Camera and compound check');const index=html.lastIndexOf('</script>');html=html.slice(0,index)+'window.__reviewRuntime={cameraSystem,camera,controls,meshes,renderer,scene,processCmd};\n'+html.slice(index);
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await puppeteer.launch({headless:'shell',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--mute-audio']});const errors=[];let result;
 try{
  const page=await browser.newPage();await page.setViewport({width:1200,height:900});page.on('pageerror',e=>errors.push(e.message));await page.setRequestInterception(true);
  page.on('request',async request=>{const url=request.url();let file;
   const three='https://cdn.jsdelivr.net/npm/three@0.183.2/',py='https://cdn.jsdelivr.net/pyodide/v0.27.0/full/';
   if(url.startsWith(three))file=path.join(root,'client/node_modules/three',url.slice(three.length));
   if(url.startsWith(py))file=path.join(root,'client/public/pyodide/v0.27.0',url.slice(py.length));
   if(!file)return request.continue();
   try{await request.respond({status:200,headers:{'access-control-allow-origin':'*'},contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/octet-stream',body:fs.readFileSync(file)})}catch{await request.abort()}
  });
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.waitForSelector('#start-overlay');await page.click('#start-overlay');
  await page.waitForFunction(()=>document.querySelector('#console').textContent.includes('STANDALONE_CAMERA_COMPOUND_OK'),{timeout:60000,polling:100});
  if(process.env.VPYLAB_ORIENTATION_CHECK)await page.waitForFunction(()=>document.querySelector('#console').textContent.includes('ORIENTATION_PROPERTIES_OK'),{timeout:20000,polling:100});
  await new Promise(r=>setTimeout(r,300));result=await page.evaluate(()=>{const {cameraSystem,meshes,renderer}=window.__reviewRuntime;const m=meshes.get('obj_1').material;return {camera:cameraSystem.getState(),color:m.color.toArray(),opacity:m.opacity,transparent:m.transparent,emissive:m.emissiveIntensity,roughness:m.roughness,drawCalls:renderer.info.render.calls}});
  assert.deepEqual(result.camera.center,[8,1,-2]);result.camera.pos.forEach((v,i)=>assert(Math.abs(v-[8,3,2][i])<1e-8));assert.deepEqual(result.color,[1,0.2,0.1]);assert.equal(result.opacity,0.3);assert.equal(result.transparent,true);assert(result.emissive>0);assert(Math.abs(result.roughness-0.1)<1e-9);assert(result.drawCalls>0);
  const range=result.camera.range;await page.setViewport({width:390,height:844});await new Promise(r=>setTimeout(r,250));const portrait=await page.evaluate(()=>window.__reviewRuntime.cameraSystem.getState());assert(Math.abs(portrait.range-range)<1e-8);result.portrait=portrait;
  await page.evaluate(()=>window.__reviewRuntime.processCmd({action:'update',id:'obj_3',opacity:1,color:[1,1,1],emissive:false}));await new Promise(r=>setTimeout(r,150));assert.equal(await page.evaluate(()=>window.__reviewRuntime.meshes.get('obj_1').material.transparent),false);
  const primitiveAnchors=await page.evaluate(()=>{
    const {processCmd,meshes,scene}=window.__reviewRuntime;const results=[];
    for(const type of ['cylinder','cone']){
      const id='anchor-'+type;
      processCmd({action:'create',id,type,pos:[2,3,4],axis:[0,2,0],radius:.2});
      processCmd({action:'update',id,radius:.4});processCmd({action:'update',id,axis:[0,4,0]});scene.updateMatrixWorld(true);
      const mesh=meshes.get(id),attr=mesh.geometry.getAttribute('position'),ys=[];
      for(let i=0;i<attr.count;i++){const point=mesh.position.clone().fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld);ys.push(point.y);}
      results.push({type,min:Math.min(...ys),max:Math.max(...ys)});
    }
    return results;
  });
  for(const p of primitiveAnchors){assert(Math.abs(p.min-3)<1e-6);assert(Math.abs(p.max-7)<1e-6);}result.primitiveAnchors=primitiveAnchors;
  if(process.env.VPYLAB_ORIENTATION_CHECK){
    const orientation=await page.evaluate(()=>{const {meshes}=window.__reviewRuntime;const e=meshes.get('obj_4'),r=meshes.get('obj_5');return {scale:e.scale.toArray(),kind:e.geometry.type,axis:[1,0,0].map((_,i)=>new (e.position.constructor)(1,0,0).applyQuaternion(e.quaternion).getComponent(i)),normal:[0,0,1].map((_,i)=>new (r.position.constructor)(0,0,1).applyQuaternion(r.quaternion).getComponent(i))};});
    assert.deepEqual(orientation.scale,[4,.6,.8]);assert.equal(orientation.kind,'SphereGeometry');orientation.axis.forEach((v,i)=>assert(Math.abs(v-[0,1,0][i])<1e-6));orientation.normal.forEach((v,i)=>assert(Math.abs(v-[0,0,1][i])<1e-6));result.orientation=orientation;
  }
  await page.screenshot({path:path.join(out,'standalone-camera-compound.png')});assert.deepEqual(errors,[]);result.passed=true;console.log('standalone-camera-compound-resize passed');
 }finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({generatedAt:new Date().toISOString(),result,errors},null,2));await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});

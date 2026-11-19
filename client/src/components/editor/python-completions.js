import { apiReferenceDocs } from '../../data/docs';
import { vocabularyWord } from '../../data/code-vocabulary';

const extensions=new Set(['play_sound','play_note','play_chord','play_sequence','play_sfx','bgm','scatter3d','surface3d','line3d','bar3d']);
const functions=new Map(apiReferenceDocs.filter(d=>/^\w+$/.test(d.id)&&(d.signature?.startsWith(d.id+'(')||extensions.has(d.id))).map(d=>[d.id,d]));
const aliases={소리:'play_sound',음표:'play_note_and_wait',화음:'play_chord',효과음:'play_sfx',배경음악:'bgm',산점도:'scatter3d',표면그래프:'surface3d',선그래프:'line3d',막대그래프:'bar3d'};
for(const [alias,name]of Object.entries(aliases))if(functions.has(name))functions.set(alias,functions.get(name));
// textures. 뒤의 목록과 한글 뜻은 문서의 '텍스처 프리셋' 표를 그대로 씁니다 (새 재질을 문서에 넣으면 자동 완성에도 나옵니다).
const texturePresets=apiReferenceDocs.find(d=>d.id==='textures-presets')?.params||[];
const shapes=new Set(['sphere','box','ellipsoid','cylinder','cone','ring','arrow','pyramid','compound','curve','helix','label','extrusion']);
const members={
 vector:['x','y','z','mag','mag2','hat','dot','cross','norm','proj','comp','diff_angle','rotate','equals'],
 scene:['center','range','forward','up','background','width','height','autoscale','userzoom','userspin','fov','ambient','objects','camera','mouse','bind','unbind','waitfor','pause','caption','title'],
 object:['pos','color','opacity','size','axis','up','length','height','width','visible','emissive','texture','make_trail','rotate','clone','delete','clear_trail'],
 list:['append','extend','insert','pop','remove','clear','index','count','sort','reverse','copy'],
 color:['red','green','blue','white','black','yellow','cyan','magenta','orange','purple','pink','gray','hsv_to_rgb','rgb_to_hsv'],
};
const extras={print:'값을 출력하기',len:'개수',range:'반복할 숫자',abs:'절댓값',round:'반올림',min:'가장 작은 값',max:'가장 큰 값',sum:'합계',enumerate:'번호와 값',zip:'나란히 묶기',int:'정수로',float:'실수로',str:'문자열로',list:'목록으로',dict:'키와 값으로',sorted:'정렬한 목록',sin:'사인',cos:'코사인',sqrt:'제곱근',pi:'원주율',textures:'재질 모음 (textures.earth)',random:'0부터 1 사이 난수',True:'참',False:'거짓',None:'값 없음',for:'하나씩 반복',while:'조건 동안 반복',if:'조건 확인',else:'그렇지 않으면',elif:'다른 조건',def:'함수 정의',return:'값 돌려주기',break:'반복 끝내기',continue:'다음 반복',from:'가져올 곳',import:'가져오기',in:'안에',and:'그리고',or:'또는',not:'아님'};
const word=(id,prefix)=>vocabularyWord(id,prefix);
const docText=(d,locale)=>d?.[locale]||d?.ko||'';
const identifier=/[\p{L}_][\p{L}\p{N}_]*/u;

// 문자열·주석을 읽지 않고, 괄호 깊이를 따라 현재 호출과 인자만 찾습니다.
export function pythonContext(source){
 let masked='',quote='',triple=false,comment=false;const stack=[];
 for(let i=0;i<source.length;i++){
  const c=source[i];
  if(comment){if(c==='\n'){comment=false;masked+='\n';}else masked+=' ';continue;}
  if(quote){if(c==='\\'){masked+='  ';i++;continue;}if(triple&&source.slice(i,i+3)===quote.repeat(3)){masked+='   ';i+=2;quote='';}else if(!triple&&c===quote){masked+=' ';quote='';}else masked+=c==='\n'?'\n':' ';continue;}
  if(c==='#'){comment=true;masked+=' ';continue;}
  if(c==='"'||c==="'"){quote=c;triple=source.slice(i,i+3)===c.repeat(3);masked+=triple?'   ':' ';if(triple)i+=2;continue;}
  masked+=c;
  if('([{'.includes(c)){const name=c==='('?masked.slice(0,-1).match(/([\p{L}_][\p{L}\p{N}_.]*)\s*$/u)?.[1]:null;stack.push({open:c,name,start:i+1,segments:[]});}
  else if(')]}'.includes(c))stack.pop();
  else if(c===','&&stack.at(-1)?.open==='('){const call=stack.at(-1);call.segments.push(masked.slice(call.start,i));call.start=i+1;}
 }
 return{masked,blocked:!!quote||comment,call:[...stack].reverse().find(s=>s.open==='('&&s.name)};
}
function declarations(masked){
 const result=new Map(),statements=[];let depth=0,start=0;
 for(let i=0;i<=masked.length;i++){const c=masked[i];if(c&&'([{'.includes(c))depth++;else if(c&&')]}'.includes(c))depth=Math.max(0,depth-1);if(i===masked.length||depth===0&&(c==='\n'||c===';')){statements.push(masked.slice(start,i));start=i+1;}}
 for(const line of statements){
  let expression=line.trim(),assigned=[],unpacked=false;
  for(;;){const m=expression.match(/^([\p{L}_][\p{L}\p{N}_]*(?:[ \t]*,[ \t]*[\p{L}_][\p{L}\p{N}_]*)*)[ \t]*=(?!=)[ \t]*([\s\S]*)$/u);if(!m)break;unpacked=unpacked||m[1].includes(',');assigned.push(...m[1].split(',').map(x=>x.trim()));expression=m[2];}
  const type=expression.match(/^([\w]+)\s*\(/)?.[1],inferred=shapes.has(type)?type:type==='vector'?'vector':expression.startsWith('[')?'list':null;
  for(const name of assigned)result.set(name,unpacked?null:inferred);
  const fn=line.match(/^[ \t]*def[ \t]+([\p{L}_][\p{L}\p{N}_]*)[ \t]*\(([\s\S]*)/u);
  if(fn){result.set(fn[1],'function');const args=fn[2].slice(0,fn[2].lastIndexOf(')'));let nested=0,offset=0;for(let i=0;i<=args.length;i++){const c=args[i];if(c&&'([{'.includes(c))nested++;else if(c&&')]}'.includes(c))nested--;if(i===args.length||c===','&&nested===0){const name=args.slice(offset,i).trim().match(/^[*]*([\p{L}_][\p{L}\p{N}_]*)/u)?.[1];if(name)result.set(name,null);offset=i+1;}}}
  const loop=line.match(/^[ \t]*for[ \t]+(.+?)[ \t]+in[ \t]/u);if(loop)for(const name of loop[1].split(',').map(x=>x.trim()))if(/^[\p{L}_][\p{L}\p{N}_]*$/u.test(name))result.set(name,null);
 }
 return result;
}
function receiverType(receiver,declared){if(receiver==='scene'||receiver==='color')return receiver;if(/\.(pos|axis|up|size|color|velocity|center|forward)$/.test(receiver))return'vector';return declared.get(receiver);}
function typeMembers(type){if(type==='vector'||type==='list'||type==='scene'||type==='color')return members[type];if(shapes.has(type))return[...new Set([...(type==='label'?['visible','delete']:type==='curve'?['visible','append','modify','clear','point','npoints','pop','shift','unshift']:members.object),...(functions.get(type)?.params||[]).map(p=>p.name)])];return[];}
export function completionChoices(source,locale='ko'){
 const context=pythonContext(source);if(context.blocked||/(?:^|[^\p{L}\p{N}_])\d+\.$/u.test(context.masked))return[];const declared=declarations(context.masked),member=context.masked.match(/([\p{L}_][\p{L}\p{N}_.]*)\.([\p{L}\p{N}_]*)$/u),ko=locale==='ko';
 const choice=(name,detail,description,kind='property',insertText=name)=>({name,detail,description,kind,insertText});
 // 학생이 textures라는 이름을 직접 만들었거나(textures = []) 다른 객체의 속성(a.textures.)이면 재질 목록을 내지 않습니다.
 if(member&&member[1]==='textures'&&!declared.has('textures')&&!/[.\])]$/.test(context.masked.slice(0,member.index).trimEnd()))return texturePresets.map(p=>choice(p.name,ko?p.desc.ko:p.desc.en,ko?`sphere(texture=textures.${p.name})처럼 도형의 표면에 입혀요.`:`Use it as a surface: sphere(texture=textures.${p.name})`));
 if(member){const type=receiverType(member[1],declared);return typeMembers(type).map(name=>choice(name,ko?(word(name,member[1]+'.'+name)?.meaning||'속성·동작'):'Property / method',ko?(word(name,member[1]+'.'+name)?.explanation||'현재 객체에서 사용할 수 있는 이름입니다.'):(word(name)?.english||'A member of this object.')));}
 if(/\.[\p{L}\p{N}_]*$/u.test(context.masked))return[];
 const values=[...[...declared].filter(([name])=>identifier.test(name)&&!functions.has(name)&&!extras[name]).map(([name])=>choice(name,ko?'내 코드의 이름':'Name in this code',ko?'이 코드에서 정의한 이름입니다.':'A name defined in this code.','variable')),...[...functions].map(([name,d])=>choice(name,ko?(word(name)?.meaning||docText(d.title,locale)):(d.title?.en||name),docText(d.description,locale),'function')),...Object.entries(extras).map(([name,meaning])=>choice(name,ko?meaning:'Python',ko?meaning:name,'keyword'))];
 const call=context.call,doc=call&&functions.get(call.name),segment=call?context.masked.slice(call.start):'';
 if(doc&&/^\s*[\p{L}\p{N}_]*$/u.test(segment)){
  const used=new Set(call.segments.map(s=>s.trim().match(/^([\w]+)\s*=(?!=)/)?.[1]).filter(Boolean)),positional=call.segments.filter(s=>s.trim()&&!/^\s*\w+\s*=(?!=)/.test(s)).length;
  if(['vector','rate','sleep'].includes(doc.id))return values;
  const params=(doc.params||[]).filter((p,i)=>i>=positional&&!used.has(p.name)&&/^\w+$/.test(p.name)).map(p=>choice(p.name,docText(p.desc||p.description,locale),ko?(word(p.name)?.explanation||docText(p.desc||p.description,locale)):(word(p.name)?.english||docText(p.desc||p.description,locale)),'parameter',p.name+'='));
  return shapes.has(doc.id)?[...params,...values]:[...values,...params];
 }
 return values;
}
const registrations=new WeakMap();
export function registerPythonHelp(monaco,getLocale=()=> 'ko'){
 if(registrations.has(monaco))return registrations.get(monaco);
 const textBefore=(model,p)=>model.getValueInRange({startLineNumber:1,startColumn:1,endLineNumber:p.lineNumber,endColumn:p.column});
 const completion=monaco.languages.registerCompletionItemProvider('python',{triggerCharacters:['.','(',','],provideCompletionItems(model,p){const prefix=textBefore(model,p);if(prefix.length>100_000)return{suggestions:[]};const w=model.getWordUntilPosition(p),whole=model.getWordAtPosition(p),range={startLineNumber:p.lineNumber,endLineNumber:p.lineNumber,startColumn:w.startColumn,endColumn:whole?.endColumn||w.endColumn};const hasEquals=/^\s*=/.test(model.getLineContent(p.lineNumber).slice(range.endColumn-1));return{suggestions:completionChoices(prefix,getLocale()).map((c,i)=>({label:{label:c.name,description:c.detail},kind:c.kind==='function'?monaco.languages.CompletionItemKind.Function:c.kind==='variable'?monaco.languages.CompletionItemKind.Variable:c.kind==='keyword'?monaco.languages.CompletionItemKind.Keyword:monaco.languages.CompletionItemKind.Property,detail:c.detail,documentation:c.description,insertText:c.kind==='parameter'&&hasEquals?c.name:c.insertText,range,sortText:String(i).padStart(4,'0')}))};}});
 const hover=monaco.languages.registerHoverProvider('python',{provideHover(model,p){const before=textBefore(model,p);if(pythonContext(before).blocked)return null;const w=model.getWordAtPosition(p);if(!w)return null;const term=word(w.word,model.getLineContent(p.lineNumber).slice(0,w.endColumn-1)),d=functions.get(w.word),locale=getLocale();if(!term&&!d)return null;return{range:{startLineNumber:p.lineNumber,endLineNumber:p.lineNumber,startColumn:w.startColumn,endColumn:w.endColumn},contents:[{value:'**'+w.word+'** · '+(locale==='ko'?(term?.meaning||docText(d?.title,locale)):(d?.title?.en||w.word))},{value:locale==='ko'?(term?.explanation||docText(d?.description,locale)):(term?.english||docText(d?.description,locale))}]};}});
 const signature=monaco.languages.registerSignatureHelpProvider('python',{signatureHelpTriggerCharacters:['(',','],signatureHelpRetriggerCharacters:[','],provideSignatureHelp(model,p){const c=pythonContext(textBefore(model,p));if(c.blocked||!c.call)return null;const d=functions.get(c.call.name);if(!d)return null;const params=d.params||[],locale=getLocale(),value={signatures:[{label:c.call.name+'('+params.map(x=>x.name).join(', ')+')',documentation:locale==='ko'?(word(c.call.name)?.meaning||''):undefined,parameters:params.map(x=>({label:x.name,documentation:docText(x.desc||x.description,locale)}))}],activeSignature:0,activeParameter:Math.max(0,params.findIndex(x=>x.name===c.masked.slice(c.call.start).trim().match(/^(\w+)\s*=/)?.[1])>=0?params.findIndex(x=>x.name===c.masked.slice(c.call.start).trim().match(/^(\w+)\s*=/)?.[1]):Math.min(c.call.segments.length,Math.max(0,params.length-1)))};return{value,dispose(){}};}});
 const handle={dispose(){completion.dispose();hover.dispose();signature.dispose();registrations.delete(monaco);}};registrations.set(monaco,handle);return handle;
}

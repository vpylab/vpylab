import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import dotenv from '../../server/node_modules/dotenv/lib/main.js';
import { apiReferenceDocs as docs } from '../../client/src/data/docs.js';
import { projectDir } from '../project-paths.mjs';
import { proposeShape } from '../../shared/shape-proposal.js';
const args=process.argv.slice(2);
if(!args.includes('--live'))throw new Error('실제 API 호출은 --live를 명시해야 합니다');
const value=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:null};
const root=fileURLToPath(new URL('../..',import.meta.url));
let apiKey=process.env.UPSTAGE_API_KEY;
const keyProject=value('--key-project');
if(!apiKey&&keyProject)apiKey=dotenv.parse(await fs.readFile(path.join(projectDir(keyProject),'server/.env'))).UPSTAGE_API_KEY;
const out=value('--out')||path.join(os.tmpdir(),'vpylab-solar-shapes');await fs.mkdir(out,{recursive:true});
const documentation=await fs.readFile(path.join(root,'docs/VPYTHON_API.md'),'utf8')+'\n\n# 전체 앱 내 API 레퍼런스\n'+JSON.stringify(docs,null,2);
const cases=[
 ['hemisphere','바닥이 막힌 파란 반구를 만들어 주세요. 반지름 1, 높이 1, 바닥 중앙은 (0,0,0)입니다.'],
 ['house','빨간 박공지붕, 하얀 벽, 파란 문이 있는 작은 집 모양을 만들어 주세요. 지붕의 단면은 삼각형입니다.'],
 ['heart','분홍색 납작한 입체 하트 장식 모양을 만들어 주세요. 완벽하지 않으면 근사임을 설명해 주세요.'],
 ['robot','둥근 노란 머리, 파란 몸통, 흰 두 눈, 두 팔과 두 다리가 있는 정적인 장난감 로봇 모양을 만들어 주세요.'],
 ['hollow-cup','윗면이 열리고 바닥은 막힌 컵 모양을 만들어 주세요. 안쪽이 실제로 비어 있어야 하며 손잡이는 없어도 됩니다.'],
 ['unsupported','소리와 키보드 조작이 있는 자동차 경주 게임의 전체 코드를 만들어 주세요.'],
];
const results=[];
for(const [id,request] of cases){
 try {const result=await proposeShape({request,documentation,apiKey});results.push({id,request,...result});if(result.code)await fs.writeFile(path.join(out,id+'.py'),result.code);console.log(JSON.stringify({id,status:result.spec.status,parts:result.spec.parts.length,model:result.model,elapsedMs:result.elapsedMs}));}
 catch(error){results.push({id,request,error:error.message});console.log(JSON.stringify({id,error:error.message}));}
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify({generatedAt:new Date().toISOString(),documentationBytes:Buffer.byteLength(documentation),documentationSha256:createHash('sha256').update(documentation).digest('hex'),results},null,2));
}
if(results.some(r=>r.error))process.exitCode=1;

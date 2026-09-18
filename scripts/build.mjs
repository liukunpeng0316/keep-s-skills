import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {zipSync,unzipSync,strFromU8} from 'fflate';
import {parse} from 'yaml';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function build(root=project){
  const config=JSON.parse(await fs.readFile(path.join(root,'site.config.json'),'utf8'));
  const repository=process.env.GITHUB_REPOSITORY||config.repository;
  const branch=process.env.GITHUB_REF_NAME||config.branch||'main';
  if(repository&&!/^[-\w.]+\/[-\w.]+$/.test(repository))throw Error('repository 应为 用户名/仓库名');
  const out=path.join(root,'dist');
  const records=[];
  const archives=[];
  const downloadNames=new Set();
  function reserve(name){const key=name.toLowerCase();if(downloadNames.has(key))throw Error(`下载文件名重复：${name}，请重命名 ZIP 或文件夹`);downloadNames.add(key);}
  for(const entry of await fs.readdir(path.join(root,'skills'),{withFileTypes:true})){
    if(entry.isSymbolicLink())throw Error(`不支持符号链接：${entry.name}`);
    if(entry.isFile()&&/\.zip$/i.test(entry.name)){
      reserve(entry.name);
      const archive=await fs.readFile(path.join(root,'skills',entry.name));
      const candidates=[];let count=0;let total=0;
      // Inspect metadata without extracting archive contents to disk or running scripts.
      const docs=unzipSync(archive,{filter(file){
        const parts=file.name.split('/');
        if(file.name.startsWith('/')||file.name.includes('\\')||parts.includes('..')||/^[A-Za-z]:/.test(file.name))throw Error(`ZIP 包含不安全路径：${entry.name}`);
        if(file.name.endsWith('/')||parts.includes('__MACOSX')||parts.some(p=>p.startsWith('._')))return false;
        count++;total+=file.originalSize;
        if(count>10000||total>200*1024*1024)throw Error(`ZIP 解压后过大：${entry.name}`);
        if(parts.at(-1)==='SKILL.md'){
          if(file.originalSize>1024*1024)throw Error(`SKILL.md 超过 1 MB：${entry.name}`);
          candidates.push(file.name);return true;
        }
        return false;
      }});
      const rootDoc=candidates.includes('SKILL.md')?'SKILL.md':candidates.length===1?candidates[0]:null;
      if(!rootDoc)throw Error(`${entry.name}：需要一个明确的 SKILL.md（根目录或单个 Skill 文件夹中）`);
      const doc=strFromU8(docs[rootDoc]).replace(/^\uFEFF/,'');
      const front=doc.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
      const metadata=front?parse(front[1]):{};
      archives.push([entry.name,archive]);
      records.push({id:entry.name,name:typeof metadata?.name==='string'?metadata.name:entry.name.replace(/\.zip$/i,''),description:typeof metadata?.description==='string'?metadata.description:'',files:count,size:archive.length,download:entry.name,source:entry.name,sourceType:'blob'});
      continue;
    }
    if(!entry.isDirectory()||entry.name.startsWith('.'))continue;
    const folder=path.join(root,'skills',entry.name);
    const doc=(await fs.readFile(path.join(folder,'SKILL.md'),'utf8')).replace(/^\uFEFF/,'');
    const front=doc.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    const metadata=front?parse(front[1]):{};
    const name=typeof metadata?.name==='string'?metadata.name:entry.name;
    const description=typeof metadata?.description==='string'?metadata.description:'';
    const files=Object.create(null);
    async function walk(dir,prefix){
      for(const item of await fs.readdir(dir,{withFileTypes:true})){
        if(item.isSymbolicLink())throw Error(`不支持符号链接：${prefix}/${item.name}`);
        const absolute=path.join(dir,item.name),relative=`${prefix}/${item.name}`;
        if(item.isDirectory())await walk(absolute,relative);
        else if(item.isFile())files[relative]=new Uint8Array(await fs.readFile(absolute));
      }
    }
    await walk(folder,entry.name);
    const archive=zipSync(files,{level:6});
    reserve(`${entry.name}.zip`);
    archives.push([`${entry.name}.zip`,archive]);
    records.push({id:entry.name,name,description,files:Object.keys(files).length,size:archive.length,download:`${entry.name}.zip`,source:entry.name,sourceType:'tree'});
  }
  records.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
  // All inputs are validated before replacing generated output. Only dist is removed.
  await fs.rm(out,{recursive:true,force:true});
  await fs.mkdir(path.join(out,'downloads'),{recursive:true});
  for(const asset of ['index.html','style.css','app.js'])await fs.copyFile(path.join(root,asset),path.join(out,asset));
  for(const [name,archive] of archives)await fs.writeFile(path.join(out,'downloads',name),archive);
  await fs.writeFile(path.join(out,'catalog.js'),`window.SKILLS_CATALOG = ${JSON.stringify({repository,branch,skills:records}).replace(/</g,'\\u003c')};\n`);
  await fs.writeFile(path.join(out,'.nojekyll'),'');
  console.log(`已生成 ${records.length} 个 Skills，输出：${out}`);
  return records;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await build();

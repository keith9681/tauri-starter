import fs from 'node:fs';
try {
  const [input, output] = process.argv.slice(2);
  const data = JSON.parse(fs.readFileSync(input, 'utf8'));
  const nodes = data.fileNodes, imports = data.importEdges, allEdges = data.allEdges;
  const byId = new Map(nodes.map(n => [n.id, n]));
  const paths = nodes.map(n => (n.filePath || n.name || '').replace(/\\/g, '/'));
  const dirs = paths.map(p => p.split('/').slice(0, -1));
  let common = dirs[0] || [];
  for (const d of dirs.slice(1)) { let i=0; while(i<common.length && common[i]===d[i]) i++; common=common.slice(0,i); }
  const groupOf = n => { const p=(n.filePath||n.name||'').replace(/\\/g,'/').split('/'); const rest=p.slice(common.length); return rest.length>1 ? rest[0] : 'root'; };
  const directoryGroups={}, nodeTypeGroups={};
  for (const n of nodes) { (directoryGroups[groupOf(n)] ||= []).push(n.id); (nodeTypeGroups[n.type] ||= []).push(n.id); }
  const fanIn={}, fanOut={}, inter=new Map(), cross=new Map(), internal={}, involved={};
  for (const n of nodes) { fanIn[n.id]=0; fanOut[n.id]=0; }
  for (const e of imports) { fanOut[e.source]++; fanIn[e.target]++; const a=groupOf(byId.get(e.source)),b=groupOf(byId.get(e.target)); involved[a]=(involved[a]||0)+1; if(a!==b) involved[b]=(involved[b]||0)+1; else internal[a]=(internal[a]||0)+1; if(a!==b) inter.set(`${a}\0${b}`,(inter.get(`${a}\0${b}`)||0)+1); }
  for (const e of allEdges) { const a=byId.get(e.source).type,b=byId.get(e.target).type,k=`${a}\0${b}\0${e.type}`; cross.set(k,(cross.get(k)||0)+1); }
  const pats=[[/^(routes?|api|controllers?|endpoints?|handlers?)$/,'api'],[/^(services?|core|lib|domain|logic|internal|signals)$/,'service'],[/^(models?|db|data|persistence|repository|entities|migrations|sql|database|schema)$/,'data'],[/^(components?|views?|pages?|ui|layouts?|screens?)$/,'ui'],[/^(utils?|helpers?|common|shared|tools|pkg)$/,'utility'],[/^(config|constants|env|settings)$/,'config'],[/^(__tests__|tests?|specs?)$/,'test'],[/^(types?|interfaces?|schemas?|contracts?|dtos?|dto|request|response)$/,'types'],[/^(hooks)$/,'hooks'],[/^(store|state|reducers|actions|slices)$/,'state'],[/^(assets|static|public)$/,'assets'],[/^(docs|documentation|wiki)$/,'documentation'],[/^(deploy|deployment|infra|infrastructure|docker|k8s|kubernetes|helm|charts|terraform|tf)$/,'infrastructure'],[/^(\.github|\.gitlab|\.circleci)$/,'ci-cd'],[/^(bin|cmd)$/,'entry']];
  const patternMatches={}; for(const g of Object.keys(directoryGroups)){ const m=pats.find(([r])=>r.test(g)); if(m) patternMatches[g]=m[1]; }
  const interGroupImports=[...inter].map(([k,count])=>{const [from,to]=k.split('\0');return {from,to,count}});
  const pairs=new Set(interGroupImports.map(x=>[x.from,x.to].sort().join('\0'))), dependencyDirection=[];
  for(const p of pairs){const [a,b]=p.split('\0'),ab=inter.get(`${a}\0${b}`)||0,ba=inter.get(`${b}\0${a}`)||0;if(ab>ba)dependencyDirection.push({dependent:a,dependsOn:b});else if(ba>ab)dependencyDirection.push({dependent:b,dependsOn:a});}
  const infra=paths.filter(p=>/(Dockerfile|docker-compose|\.github\/workflows|\.gitlab-ci|Jenkinsfile|\.tf(vars)?$|(^|\/)k8s|kubernetes|helm|charts)/i.test(p));
  const groups=Object.keys(directoryGroups), docs=nodes.filter(n=>n.type==='document'||/\.(md|rst)$/i.test(n.filePath||'')); const covered=new Set(docs.map(groupOf));
  const result={scriptCompleted:true,directoryGroups,nodeTypeGroups,crossCategoryEdges:[...cross].map(([k,count])=>{const[fromType,toType,edgeType]=k.split('\0');return{fromType,toType,edgeType,count}}),interGroupImports,intraGroupDensity:Object.fromEntries(groups.map(g=>[g,{internalEdges:internal[g]||0,totalEdges:involved[g]||0,density:(involved[g]||0)?(internal[g]||0)/involved[g]:0}])),patternMatches,deploymentTopology:{hasDockerfile:infra.some(p=>/Dockerfile/i.test(p)),hasCompose:infra.some(p=>/docker-compose/i.test(p)),hasK8s:infra.some(p=>/(k8s|kubernetes|helm|charts)/i.test(p)),hasTerraform:infra.some(p=>/\.tf(vars)?$/i.test(p)),hasCI:infra.some(p=>/(\.github\/workflows|\.gitlab-ci|Jenkinsfile)/i.test(p)),infraFiles:infra},dataPipeline:{schemaFiles:paths.filter(p=>/\.(sql|graphql|gql|proto|prisma)$/i.test(p)),migrationFiles:paths.filter(p=>/migrations?\//i.test(p)),dataModelFiles:nodes.filter(n=>/(data-model|model|entity)/i.test((n.tags||[]).join(' '))).map(n=>n.filePath),apiHandlerFiles:nodes.filter(n=>/(api-handler|endpoint)/i.test((n.tags||[]).join(' '))).map(n=>n.filePath)},docCoverage:{groupsWithDocs:covered.size,totalGroups:groups.length,coverageRatio:groups.length?covered.size/groups.length:0,undocumentedGroups:groups.filter(g=>!covered.has(g))},dependencyDirection,fileStats:{totalFileNodes:nodes.length,filesPerGroup:Object.fromEntries(groups.map(g=>[g,directoryGroups[g].length])),nodeTypeCounts:Object.fromEntries(Object.entries(nodeTypeGroups).map(([k,v])=>[k,v.length]))},fileFanIn:fanIn,fileFanOut:fanOut};
  fs.writeFileSync(output, JSON.stringify(result,null,2));
} catch(e) { console.error(e.stack||e); process.exit(1); }

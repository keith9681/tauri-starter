import fs from 'node:fs';

function fail(error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
}

try {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) throw new Error('usage: node ua-tour-analyze.js <input> <output>');
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const nodes = input.nodes || [];
  const edges = input.edges || [];
  const layers = input.layers || [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const fanIn = new Map(nodes.map((node) => [node.id, 0]));
  const fanOut = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    if (fanIn.has(edge.target)) fanIn.set(edge.target, fanIn.get(edge.target) + 1);
    if (fanOut.has(edge.source)) fanOut.set(edge.source, fanOut.get(edge.source) + 1);
  }
  const rank = (map, key) => [...map].map(([id, value]) => ({id, [key]: value, name: byId.get(id)?.name || id}))
    .sort((a, b) => b[key] - a[key] || a.id.localeCompare(b.id)).slice(0, 20);
  const fanInRanking = rank(fanIn, 'fanIn');
  const fanOutRanking = rank(fanOut, 'fanOut');
  const outValues = [...fanOut.values()].sort((a, b) => a - b);
  const inValues = [...fanIn.values()].sort((a, b) => a - b);
  const percentile = (xs, p) => xs[Math.max(0, Math.ceil(xs.length * p) - 1)] || 0;
  const out90 = percentile(outValues, 0.9);
  const in25 = percentile(inValues, 0.25);
  const entryNames = new Set(['index.ts','index.js','main.ts','main.js','app.ts','app.js','server.ts','server.js','mod.rs','main.go','main.py','main.rs','manage.py','app.py','wsgi.py','asgi.py','run.py','__main__.py','Application.java','Main.java','Program.cs','config.ru','index.php','App.swift','Application.kt','main.cpp','main.c']);
  const entryPointCandidates = nodes.map((node) => {
    let score = 0;
    const path = (node.filePath || '').replace(/\\/g, '/');
    const name = node.name || path.split('/').pop() || '';
    const depth = path.split('/').filter(Boolean).length;
    if (node.type === 'document') {
      if (path === 'README.md' || (name === 'README.md' && depth <= 1)) score += 5;
      else if (/\.md$/i.test(name) && depth <= 1) score += 2;
    } else if (node.type === 'file') {
      if (entryNames.has(name)) score += 3;
      if (depth <= 2) score += 1;
      if ((fanOut.get(node.id) || 0) >= out90) score += 1;
      if ((fanIn.get(node.id) || 0) <= in25) score += 1;
    }
    return {id: node.id, score, name, summary: node.summary || ''};
  }).filter((x) => x.score > 0).sort((a,b) => b.score-a.score || a.id.localeCompare(b.id)).slice(0,5);
  const codeStart = entryPointCandidates.find((x) => byId.get(x.id)?.type === 'file')?.id;
  const order = [], depthMap = {}, byDepth = {};
  if (codeStart) {
    const queue = [codeStart]; depthMap[codeStart] = 0;
    while (queue.length) {
      const id = queue.shift(); order.push(id);
      const d = depthMap[id]; (byDepth[d] ||= []).push(id);
      for (const edge of edges) if (edge.source === id && (edge.type === 'imports' || edge.type === 'calls') && byId.has(edge.target) && depthMap[edge.target] === undefined) {
        depthMap[edge.target] = d + 1; queue.push(edge.target);
      }
    }
  }
  const pick = (types) => nodes.filter((n) => types.includes(n.type)).map((n) => ({id:n.id,name:n.name,type:n.type,summary:n.summary||''}));
  const relation = new Set(edges.filter((e) => e.type === 'imports' || e.type === 'calls').map((e) => `${e.source}\u0000${e.target}`));
  const clusters = [];
  const seen = new Set();
  for (const edge of edges) {
    if (!relation.has(`${edge.target}\u0000${edge.source}`)) continue;
    const key = [edge.source, edge.target].sort().join('\u0000');
    if (seen.has(key)) continue; seen.add(key);
    const members = new Set([edge.source, edge.target]);
    let changed = true;
    while (changed && members.size < 5) {
      changed = false;
      for (const node of nodes) {
        if (members.has(node.id)) continue;
        const links = [...members].filter((m) => relation.has(`${node.id}\u0000${m}`) || relation.has(`${m}\u0000${node.id}`)).length;
        if (links >= 2) { members.add(node.id); changed = true; if (members.size >= 5) break; }
      }
    }
    const ids = [...members];
    const edgeCount = edges.filter((e) => members.has(e.source) && members.has(e.target)).length;
    clusters.push({nodes:ids, edgeCount});
  }
  clusters.sort((a,b) => b.edgeCount-a.edgeCount || b.nodes.length-a.nodes.length);
  const nodeSummaryIndex = Object.fromEntries(nodes.map((n) => [n.id,{name:n.name,type:n.type,summary:n.summary||''}]));
  const result = {scriptCompleted:true,entryPointCandidates,fanInRanking,fanOutRanking,bfsTraversal:{startNode:codeStart||null,order,depthMap,byDepth},nonCodeFiles:{documentation:pick(['document']),infrastructure:pick(['service','pipeline','resource']),data:pick(['table','schema','endpoint']),config:pick(['config'])},clusters:clusters.slice(0,10),layers:{count:layers.length,list:layers.map(({id,name,description})=>({id,name,description}))},nodeSummaryIndex,totalNodes:nodes.length,totalEdges:edges.length};
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
} catch (error) { fail(error); }

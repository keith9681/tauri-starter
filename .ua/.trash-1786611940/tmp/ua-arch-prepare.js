import fs from 'node:fs';
const [src, out] = process.argv.slice(2);
const graph = JSON.parse(fs.readFileSync(src, 'utf8'));
const allowed = new Set(['file','config','document','service','pipeline','table','schema','resource','endpoint']);
const fileNodes = graph.nodes.filter(n => allowed.has(n.type));
const ids = new Set(fileNodes.map(n => n.id));
const allEdges = graph.edges.filter(e => ids.has(e.source) && ids.has(e.target));
const importEdges = allEdges.filter(e => e.type === 'imports');
fs.writeFileSync(out, JSON.stringify({fileNodes, importEdges, allEdges}, null, 2));

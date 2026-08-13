import fs from 'node:fs';
import path from 'node:path';
const [graphPath, layersPath, outputPath] = process.argv.slice(2);
if (!graphPath || !layersPath || !outputPath) process.exit(1);
const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
const layersRaw = JSON.parse(fs.readFileSync(layersPath, 'utf8'));
const layers = Array.isArray(layersRaw) ? layersRaw : (layersRaw.layers || []);
fs.mkdirSync(path.dirname(outputPath), {recursive:true});
fs.writeFileSync(outputPath, JSON.stringify({nodes:graph.nodes||[],edges:graph.edges||[],layers}, null, 2));

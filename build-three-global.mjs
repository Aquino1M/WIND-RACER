import fs from 'node:fs';

function splitModule(source) {
  const exportIndex = source.lastIndexOf('export{');
  if (exportIndex < 0) throw new Error('Exports do Three.js não encontrados.');
  const exportList = source.slice(exportIndex + 7).replace(/\};?\s*$/, '');
  const pairs = exportList.split(',').map(item => {
    const [local, exported = local] = item.trim().split(/\s+as\s+/);
    return { local, exported };
  });
  return { body: source.slice(0, exportIndex), pairs };
}

const core = splitModule(fs.readFileSync('node_modules/three/build/three.core.min.js', 'utf8'));
const moduleSource = fs.readFileSync('node_modules/three/build/three.module.min.js', 'utf8');
const importMatch = moduleSource.match(/import\{([^}]+)\}from["']\.\/three\.core\.min\.js["'];?/);
if (!importMatch) throw new Error('Import do núcleo Three.js não encontrado.');
const cleanedModule = moduleSource.replace(importMatch[0], '').replace(/export\{[^}]+\}from["']\.\/three\.core\.min\.js["'];?/, '');
const modulePart = splitModule(cleanedModule);
const importBindings = importMatch[1].split(',').map(item => {
  const [exported, local = exported] = item.trim().split(/\s+as\s+/);
  return `${JSON.stringify(exported)}:${local}`;
}).join(',');
const coreExports = core.pairs.map(p => `${JSON.stringify(p.exported)}:${p.local}`).join(',');
const moduleExports = modulePart.pairs.map(p => `${JSON.stringify(p.exported)}:${p.local}`).join(',');
const output = `window.THREE=(()=>{const CORE=(()=>{${core.body};return{${coreExports}}})()` +
  `;return(()=>{const{${importBindings}}=CORE;${modulePart.body};return{...CORE,${moduleExports}}})()})();`;
fs.writeFileSync('vendor/three.global.min.js', output);

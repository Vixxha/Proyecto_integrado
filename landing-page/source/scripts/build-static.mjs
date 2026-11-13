// Portable static artifact of the same React page when Next.js cannot be installed.
import { build } from 'esbuild';
import { mkdir, writeFile, readFile, rm, stat, cp } from 'node:fs/promises';
import {createRequire} from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, dirname, extname } from 'node:path';
const tsconfigRaw = { compilerOptions: { jsx: 'react-jsx', target: 'ES2020' } };
// Avoid native discovery outside this checkout on restricted Windows hosts.
const localFiles={name:'checkout-files',setup(builder){
 builder.onResolve({filter:/.*/},async args=>{
  if(/^https?:/.test(args.path)||args.path.startsWith('/'))return {path:args.path,external:true};
  const base=args.importer?dirname(args.importer):process.cwd();
  if(!args.path.startsWith('.')&&!args.path.match(/^[A-Z]:/i)&&args.kind!=='entry-point'){
   if(builder.initialOptions.platform==='node')return {path:args.path,external:true};
   if(args.path==='lucide-react')return {path:resolve('node_modules/lucide-react/dist/esm/lucide-react.js'),namespace:'checkout'};
   return {path:createRequire(resolve(base,'package.json')).resolve(args.path),namespace:'checkout'};
  }
  const target=resolve(base,args.path);
  for(const candidate of [target,...['.tsx','.ts','.mjs','.js','.css','.json'].map(x=>target+x)]){
   try {if((await stat(candidate)).isFile())return {path:candidate,namespace:'checkout'};}catch{}
  }
  throw new Error('Cannot resolve '+args.path);
 });
 builder.onLoad({filter:/.*/,namespace:'checkout'},async args=>({contents:await readFile(args.path,'utf8'),loader:({'.tsx':'tsx','.ts':'ts','.css':'css','.json':'json'})[extname(args.path)]||'js',resolveDir:dirname(args.path)}));
}};
await mkdir('out/assets', { recursive: true });
await cp('public','out',{recursive:true});
await build({ plugins:[localFiles], tsconfigRaw, stdin: { contents: "import {hydrateRoot} from 'react-dom/client'; import Page from './app/page'; import './app/globals.css'; import {createElement} from 'react'; hydrateRoot(document.getElementById('app'),createElement(Page));", resolveDir: process.cwd(), sourcefile: 'entry.tsx', loader: 'tsx' }, bundle:true, minify:true, outfile:'out/assets/site.js', jsx:'automatic', define:{'process.env.NODE_ENV':'"production"'}, legalComments:'none' });
await build({ plugins:[localFiles], tsconfigRaw, entryPoints:['app/page.tsx'], bundle:true, platform:'node', format:'esm', outfile:'out/page-render.mjs', jsx:'automatic', packages:'external' });
const { default: Page } = await import(pathToFileURL(resolve('out/page-render.mjs')).href);
const { createElement } = await import('react');
const { renderToString } = await import('react-dom/server');
const html = renderToString(createElement(Page));
await writeFile('out/index.html',`<!doctype html><html lang="es-CL"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#234e43"><meta name="description" content="Inscribe a tus hijos e hijas en el programa municipal de Navidad de La Florida."><title>Navidad en familia | La Florida</title><link rel="stylesheet" href="/assets/site.css"></head><body><div id="app">${html}</div><script type="module" src="/assets/site.js"></script></body></html>`);
await rm('out/page-render.mjs');
const document = await readFile('out/index.html','utf8');
if(!document.includes('Una Navidad') || !document.includes('<form') || !document.includes('id="inscripcion"')) throw new Error('Static page verification failed');
console.log('Static artifact built and verified in out/');

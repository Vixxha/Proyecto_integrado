import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('site-manifest.json','utf8'));
for(const [file,expected] of Object.entries(manifest)){
 const actual=createHash('sha256').update(await readFile('site/'+file)).digest('hex');
 if(actual!==expected)throw new Error('El archivo compilado cambió: '+file);
}
console.log('Sitio estático verificado: '+Object.keys(manifest).length+' archivos.');

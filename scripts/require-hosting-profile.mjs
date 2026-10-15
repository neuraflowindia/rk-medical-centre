import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export function requireHostingProfile(project){
  const origins=[project.origin,project.worker?.origin,...(project.aliases||[])];
  if(project.environment!=='production'||origins.some(value=>{
    try{const u=new URL(value);return u.protocol!=='https:'||u.origin!==value||u.hostname.endsWith('.invalid')||u.hostname==='localhost';}catch{return true;}
  }))throw Error('Hosting is not configured. Set the confirmed production identity, owned website and worker addresses before building for Vercel. The local preview remains available.');
  if(!project.database_targets?.migration)throw Error('The declared production migration connection is missing.');
  if(!project.sender?.email||project.sender.email.endsWith('@example.invalid'))throw Error('The verified sender is not configured.');
  return project;
}
if(process.argv[1]===fileURLToPath(import.meta.url))requireHostingProfile(JSON.parse(readFileSync(new URL('../appointment-settings/project.json',import.meta.url))));

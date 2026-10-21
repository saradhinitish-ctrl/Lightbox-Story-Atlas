import { activeDraftRoot, children, type Project, type DeskNode } from './desk-model';
export function sectionForNode(project:Project,id:string):DeskNode|undefined{
 const seen=new Set<string>();let node=project.nodes.find(n=>n.id===id);
 while(node?.parent&&!seen.has(node.id)){seen.add(node.id);node=project.nodes.find(n=>n.id===node!.parent);}
 return node?.parent===null?node:undefined;
}
export function sectionFolder(project:Project,section:DeskNode|undefined){return section?.role==='draft'?activeDraftRoot(project):section;}
export function sectionEntries(project:Project,section:DeskNode|undefined){const folder=sectionFolder(project,section);return folder?children(project,folder.id).filter(n=>n.role!=='draft-version'):[];}
export function ancestorFolders(project:Project,id:string){const ids:string[]=[],seen=new Set<string>();let node=project.nodes.find(n=>n.id===id);while(node?.parent&&!seen.has(node.id)){seen.add(node.id);ids.push(node.parent);node=project.nodes.find(n=>n.id===node!.parent);}return ids;}

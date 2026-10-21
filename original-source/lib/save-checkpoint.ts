export async function saveCheckpoint({flush,acknowledged,inFlight,blocked,lastError,wait=()=>new Promise<void>(resolve=>setTimeout(resolve,100))}:{flush:()=>Promise<unknown>;acknowledged:()=>boolean;inFlight:()=>boolean;blocked:()=>string;lastError:()=>string;wait?:()=>Promise<void>}){
 for(let attempt=0;attempt<200;attempt++){
  const reason=blocked();if(reason)throw Error(reason);if(acknowledged())return;
  await flush();if(acknowledged())return;if(!inFlight()&&lastError())throw Error(lastError());await wait();
 }
 throw Error('Saving is still pending. Keep this tab open and check the save indicator.');
}

const fs=require('node:fs');
const sim=require('../engine.js');

const stagesFor=sim.stagesFor;
if(require.main===module){
 const scenarios=Object.fromEntries(Array.from({length:20},(_,i)=>[i+1,stagesFor(i+1)]));
 fs.writeFileSync(require('node:path').join(__dirname,'scenarios.json'),JSON.stringify(scenarios));
}
module.exports={stagesFor};

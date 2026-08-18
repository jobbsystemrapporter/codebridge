import{runDoctor}from'./doctor-lib.mjs';const result=await runDoctor();console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;

process.on("uncaughtException",(err)=>{
    console.log("Uncaught Exception Occured");
    console.log(`error name : ${err.name}`);
    console.log(`error message : ${err.message}`);
    console.log("shutting down process");
    console.log("please clear MongoDB and Redis DBs");
    process.exit(1);
})

const server=require("./app.js");
const closeApp=require("./DBControllers/ErrorHandler.js")

server.listen(8000,()=>{
    console.log("server is listening on port 8000");
})

process.on("unhandledRejection",async(err)=>{
    closeApp(err);
})

module.exports=server;

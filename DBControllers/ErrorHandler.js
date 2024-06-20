
const server=require("../server");

const closeApp=async (err)=>{
    console.log("-------------------------------------------------------------------------------------------------------------------")
    console.log("some error has occured")
    console.log(`error name : ${err.name}`);
    console.log(`error message : ${err.message}`);
    console.log("shutting down server");
    process.exit(1);
    console.log("-------------------------------------------------------------------------------------------------------------------")
}

module.exports=closeApp;
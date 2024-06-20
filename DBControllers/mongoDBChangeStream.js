const controllers=require("../AppControllers/Controllers.js");


const mongoStreamHandler=async(socketID,C_passLat,C_passLng,collection,client,pipeLine=[])=>{
    console.log('changestream started for this Passenger socket');
    const changeStream=await collection.watch(pipeLine);
    changeStream.on('change',(change)=>{
        console.log(change);
        if(change.operationType=="insert"){
            let new_drvrSocketID=change.fullDocument.socketID;
            let new_drvrCoords=change.fullDocument.location.coordinates;
            let new_drvrLat=new_drvrCoords[1];
            let new_drvrLng=new_drvrCoords[0];

           let dist=controllers.findDistance(new_drvrLng,new_drvrLat,C_passLng,C_passLat)
           console.log(`new driver at distence ${dist} for passneger ${socketID}`)
           string=`${new_drvrSocketID},${new_drvrLng},${new_drvrLat}`;

            if(dist<=2){
                 client.zAdd(socketID,{
                    score:dist,
                    value:string
                }).then((data)=>{
                   // console.log(data);
                });  
            }
        }
    })
}

module.exports=mongoStreamHandler;
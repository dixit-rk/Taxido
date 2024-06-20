
exports.findFromMongodb=async(Drivers,passLat,passLng)=>{
    drvrs=await Drivers.find({
        location:{
            $near:{
                $geometry:{type:"Point",coordinates:[passLng,passLat]},
                $minDistance:0,
                $maxDistance:2000
            }
        }
    }).toArray();
    return drvrs;
}

exports.findDistance=(dLng,dLat,passLng,passLat)=>{
    
    lon1 =  passLng * Math.PI / 180;
    lon2 = dLng * Math.PI / 180;
    lat1 = passLat* Math.PI / 180;
    lat2 = dLat * Math.PI / 180;   

    let dlon = lon2 - lon1; 
    let dlat = lat2 - lat1;
    let a = Math.pow(Math.sin(dlat / 2), 2)
             + Math.cos(lat1) * Math.cos(lat2)
             * Math.pow(Math.sin(dlon / 2),2);
           
    let c = 2 * Math.asin(Math.sqrt(a));
    let r = 6371;

     dist=c*r;
     return dist;
}


exports.addToRedisdb=async (drvrs,client,passLat,passLng,pass_socket_id)=>{
    for(i=0;i<drvrs.length;i++){
            
        dLng=drvrs[i].location.coordinates[0];
        dLat=drvrs[i].location.coordinates[1];
        dId=drvrs[i].socketID; 

        dist=this.findDistance(dLng,dLat,passLng,passLat);

        string=`${dId},${dLng},${dLat}`;
        await client.zAdd(pass_socket_id,{
            score:dist,
            value:string
            
        });         
    }
}


exports.showDrivers=(drivers_to_show,socket)=>{
    const finalArray=[];
    const drvrArray=[];
    drivers_to_show.forEach(element => {
    lng=element.value.split(',')[1];
    lat=element.value.split(',')[2];
    
    drvrArray.push({lng:lng,lat:lat,type:"drvr"});
    finalArray.push({name:element.value.split(',')[0],distance:`${element.score} KMS`});
   });
   console.log(finalArray);
   console.log(drvrArray);
   socket.emit("getListOfDrivers",finalArray);
   socket.emit("getMarkersOfDrivers",drvrArray);
}
const mongoose=require('mongoose');
const closeApp=require("./ErrorHandler");
exports.conn=new Promise((resolve,reject)=>{
   
    var Drivers;
    var URI='';
    mongoose.connect(URI,{
        useNewUrlParser:true
    }).then(()=>{
        console.log("Taxido Database Connected Successfully");
        const connection=mongoose.connection;
        Drivers=connection.collection('DriversInfo');
        Drivers.createIndex({location:"2dsphere"}).then(async()=>{
          console.log(await Drivers.getIndexes());
         // console.log(Drivers);
         resolve(Drivers);
        }).catch((err)=>{
            closeApp(err);
        });
    }
    )
})


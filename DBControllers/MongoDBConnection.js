const mongoose=require('mongoose');
const closeApp=require("./ErrorHandler");

exports.conn=new Promise((resolve,reject)=>{
   
    var Drivers;
    var URI="mongodb+srv://superUser:dixit@cluster0.zsdhrt0.mongodb.net/Taxido?retryWrites=true&w=majority&appName=Cluster0";
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


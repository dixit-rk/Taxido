const http = require('http');
const express = require('express');
const {Server} = require('socket.io');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const { protect } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(cookieParser());

// Auth routes
app.use('/auth', require('./routes/auth'));


const controllers=require('./AppControllers/Controllers.js')
const RedisCloudClient=require('./DBControllers/RedisConnection.js')
const MongoDBClient=require("./DBControllers/MongoDBConnection.js")


//Redis setup

let client;
RedisCloudClient.conn.then((cli)=>{
    client=cli;
});

//mongoDB setup

let Drivers;

MongoDBClient.conn.then((Coll)=>{
    Drivers=Coll;
   
});


//chnageStream setUp

const mongoStreamHandler=require("./DBControllers/mongoDBChangeStream.js")


//App logic

io.on('connection',async (socket)=>{

    //when user connects with server
    console.log(`${socket.id} is connected from backend`);

    //differentiate whether user is passenger or driver
    socket.on('UserInfo',async(data)=>{
        if(data.role=="Passenger"){              //passenger logic

           var pass_socket_id=data.id;
           var passLat=data.passLat;
           var passLng=data.passLng;
            console.log(`passLat: ${passLat} pass lng:${passLng}`)

            //mongodbChangeStream starts for that passenger so that we can apply refreshList functionality
            mongoStreamHandler(pass_socket_id,passLat,passLng,Drivers,client);
           
            //finding Drivers from mongoDB
            console.log("finding driver for passenger")
            let drvrs=await controllers.findFromMongodb(Drivers,passLat,passLng);
            
            //adding Drivers to RedisDB
            await controllers.addToRedisdb(drvrs,client,passLat,passLng,pass_socket_id);

            //getting list of drivers from redis and sending it to passenger
             client.zRangeWithScores(pass_socket_id,0,10000,"withscores").then((data)=>{
                controllers.showDrivers(data,socket);
            })

            //When Customer click on refreshList
            socket.on("refreshList",()=>{
                 client.zRangeWithScores(pass_socket_id,0,10000,"withscores").then((data)=>{
                    controllers.showDrivers(data,socket);
                })
            })
            
            //when passenger sends request to drvr,secretly joins drvr's room
            socket.on("passJoinRoom",(data)=>{
                let checkDrvrId=data.drvrId;
                client.zRangeWithScores(pass_socket_id,0,10000,"withscores").then((data2)=>{
                    let count=0;
                    data2.forEach(element => {
                        id=element.value.split(",")[0];
                        if(id==checkDrvrId){
                         count++;
                        }
                    });   
                    if(count>0){
                        let req=`passenger ${data.passId} wants to join room of driver ${data.drvrId} at distance ${data.distance} metres`;
                        console.log(req);
                        socket.join(data.drvrId);
                        socket.to(data.drvrId).emit("passReq",{passId:data.passId,drvrId:data.drvId,request:req,passLng:passLng,passLat:passLat});
                        
                    }else{
                        socket.emit("disDrvr",{msg:`The driver you have requested is now disconnected,please refresh`});
                    }
                    
                })
               
            })

            //if drvr rejects,passenger leaves his secretly joined room
            socket.on("leaveRoom",(data)=>{
                console.log(data.roomId);
                socket.leave(data.roomId);
                console.log("left the room");
            })
            
            //when passenger sends message,server sends it to room but only drvr can listen to that server's emitted message which is from passenger
            socket.on("messageFromPass",(data)=>{
                io.to(data.room).emit("msg",{msg:data.msg,PassId:data.room,usr:data.usr});
            })

        }
        
        if(data.role=="Driver"){              //driver logic

            //insert new driver and create his room with his socketId and add drvr to MONGODB
            socket.join(socket.id);
            drvrLat=data.drvrLat;
            drvrLng=data.drvrLng;
            await Drivers.insertOne({
                location:{type:"Point",coordinates:[drvrLng,drvrLat]},
                socketID:socket.id
            })
           
            //when drvr sends response to passenger request
            socket.on("drvrResPonse",(data)=>{
                console.log(data.dec);
                console.log(socket.id);
                if(data.dec==true){
                    console.log("acc");
                    io.to(socket.id).emit("IsAcc",{status:true,msg:"Connected with Driver successfully",dID:socket.id,drvrLng:data.drvrLng,drvrLat:data.drvrLat,pID:data.passId});
                }else{
                    console.log("rej");
                    io.to(socket.id).emit("IsAcc",{status:false,msg:"Cannot connect with Driver,please Refresh",dID:socket.id,pID:data.passId});
                }
            })

            //to track marker of driver
            socket.on("LocationChange",(data)=>{
                io.to(socket.id).emit("LocationChange",{clng:data.clng,clat:data.clat})
            })

            //when driver sends message(works same like passenger)
            socket.on("messageFromdrvr",(data)=>{
                console.log(data.msg);
                console.log(data.room);
                io.to(data.room).emit("msg",{msg:data.msg,driverId:data.room,usr:data.usr});
            })
            
        }
    })

    //if some user disconnected
    socket.on('disconnect',async()=>{
        console.log(`${socket.id} is disconnected from backend`);
        driver=await Drivers.findOne({socketID:socket.id});          //check if he is driver,but don't remove now
        client.zRangeWithScores(socket.id,0,10000,"withscores").then((data)=>{
            console.log(socket.id);
            console.log("here");
            console.log(data);
        })
        await client.del(socket.id).then((err,res)=>{                      //check if he is passenger,remove fom REDIS DB
            console.log("passenger removed");
            console.log(`passenger with id: ${socket.id} removed`);
            io.emit("checkRemovedPassenger",{id:socket.id});
        });
        if(driver){
            delString=`${driver.socketID},${driver.location.coordinates[0]},${driver.location.coordinates[1]}`
            console.log(delString);
            keys=await client.keys("*");
            console.log(keys);
            io.to(socket.id).emit("drvrLeft",{room:socket.id});
            for(d=0;d<keys.length;d++){        
                                                                         //remove disconnected drvr from every passenger's list in REDISDB
               await client.zRem(keys[d],delString).then(()=>{
                    console.log(`driver ${driver.socketID} is removed from passenger ${keys[d]}`);
                })
            }
            await Drivers.deleteOne({socketID:socket.id});          //remove drvr from mongoDB
            console.log('driver removed');
        }
    })
})

// Static files
app.use(express.static('../public'));
app.use(express.static('./StaticFiles'));

// Main route - protected
app.get('/', protect, (req, res) => {
    res.sendFile(__dirname + '/StaticFiles/server.html');
});

// Auth pages
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/StaticFiles/login.html');
});

app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/StaticFiles/signup.html');
});

// Socket.IO connection handling
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
        } catch (err) {
            console.log('Invalid token, continuing as guest');
        }
    }
    next();
});

module.exports=server;
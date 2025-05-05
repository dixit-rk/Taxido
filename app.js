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

// Track driver availability
const availableDrivers = new Set(); // Set of available driver IDs

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
           
            //finding Drivers from mongoDB - ONLY AVAILABLE DRIVERS
            console.log("finding driver for passenger")
            let allDrivers = await controllers.findFromMongodb(Drivers,passLat,passLng);
            
            // Filter only available drivers
            let drvrs = allDrivers.filter(driver => availableDrivers.has(driver.socketID));
            
            //adding Drivers to RedisDB
            await controllers.addToRedisdb(drvrs,client,passLat,passLng,pass_socket_id);

            //getting list of drivers from redis and sending it to passenger
             client.zRangeWithScores(pass_socket_id,0,10000,"withscores").then((data)=>{
                controllers.showDrivers(data,socket);
            })

            //When Customer click on refreshList
            socket.on("refreshList",()=>{
                 // First, clear old driver data for this passenger
                 client.del(pass_socket_id).then(async () => {
                     console.log(`Cleared Redis data for passenger ${pass_socket_id} before refresh`);
                     
                     // Find available drivers from MongoDB
                     let allDrivers = await controllers.findFromMongodb(Drivers, passLat, passLng);
                     
                     // Double-check with in-memory set of available drivers
                     let drvrs = allDrivers.filter(driver => availableDrivers.has(driver.socketID));
                     
                     // Add filtered drivers to Redis
                     await controllers.addToRedisdb(drvrs, client, passLat, passLng, pass_socket_id);
                     
                     // Show updated driver list
                     client.zRangeWithScores(pass_socket_id, 0, 10000, "withscores").then((data) => {
                         controllers.showDrivers(data, socket);
                     });
                 });
            })
            
            //when passenger sends request to drvr,secretly joins drvr's room
            socket.on("passJoinRoom",(data)=>{
                let checkDrvrId=data.drvrId;
                
                // First, check if the driver is still available
                const driverIsAvailable = availableDrivers.has(checkDrvrId);
                
                if (!driverIsAvailable) {
                    // Driver is already busy with another passenger
                    socket.emit("disDrvr", {
                        msg: `This driver is already busy with another passenger. Please refresh the list.`,
                        driverUnavailable: true
                    });
                    return;
                }
                
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
                        socket.to(data.drvrId).emit("passReq",{
                            passId: data.passId,
                            drvrId: data.drvId,
                            request: req,
                            passLng: passLng,
                            passLat: passLat,
                            destination: data.destination,
                            maxPrice: data.maxPrice
                        });
                        
                    }else{
                        socket.emit("disDrvr",{
                            msg: `The driver you have requested is now disconnected, please refresh the list.`,
                            driverUnavailable: true
                        });
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
                socketID:socket.id,
                available: true
            });
            
            // Mark driver as available when they connect
            availableDrivers.add(socket.id);
            console.log(`Driver ${socket.id} marked as available`);
           
            //when drvr sends response to passenger request
            socket.on("drvrResPonse",(data)=>{
                console.log("Driver response:", data);
                console.log("Driver socket ID:", socket.id);
                
                try {
                    if(data.dec === true){
                        console.log("Driver accepted the request");
                        
                        // Remove driver from available list
                        availableDrivers.delete(socket.id);
                        console.log(`Driver ${socket.id} marked as unavailable`);
                        
                        // Update driver's available status in MongoDB
                        Drivers.updateOne(
                            { socketID: socket.id },
                            { $set: { available: false } }
                        );
                        
                        // Get all connected sockets for the driver's room
                        console.log(`Finding passengers who sent requests to driver ${socket.id}`);
                        const acceptedPassengerId = data.passId;
                        
                        try {
                            // Get all socket rooms this driver is in
                            const rooms = io.of("/").adapter.rooms;
                            const driverRooms = rooms.get(socket.id);
                            
                            if (driverRooms) {
                                console.log(`Driver ${socket.id} is in room`);
                                
                                // Get all sockets who have joined the driver's room (sent requests)
                                const socketsInDriverRoom = Array.from(io.of('/').adapter.sids.keys())
                                    .filter(socketId => {
                                        const socketRooms = io.of('/').adapter.sids.get(socketId);
                                        return socketRooms && socketRooms.has(socket.id) && socketId !== socket.id;
                                    });
                                
                                console.log(`Found ${socketsInDriverRoom.length} passengers who sent requests to driver ${socket.id}`);
                                
                                // Notify all other passengers except the accepted one
                                socketsInDriverRoom.forEach(passengerSocketId => {
                                    if (passengerSocketId !== acceptedPassengerId) {
                                        console.log(`Notifying passenger ${passengerSocketId} that driver is now busy`);
                                        io.to(passengerSocketId).emit("disDrvr", {
                                            msg: "This driver has accepted another passenger's request. Please refresh the list.",
                                            driverUnavailable: true
                                        });
                                    }
                                });
                            }
                        } catch (error) {
                            console.error("Error notifying passengers:", error);
                        }
                        
                        // Broadcast to ALL passengers that this driver is no longer available
                        // This ensures even passengers who haven't sent a request but have this driver in their list get notified
                        io.emit("driverBecameBusy", {
                            driverId: socket.id,
                            msg: "A driver in your list is now busy with another passenger."
                        });
                        
                        // Remove this driver from all passengers' Redis lists
                        removeDriverFromAllPassengers(socket.id, client);
                        
                        io.to(socket.id).emit("IsAcc", {
                            status: true,
                            msg: "Connected with Driver successfully",
                            dID: socket.id,
                            drvrLng: data.drvrLng,
                            drvrLat: data.drvrLat,
                            pID: data.passId
                        });
                        
                        // Also emit to the passenger
                        io.to(data.passId).emit("IsAcc", {
                            status: true,
                            msg: "Connected with Driver successfully",
                            dID: socket.id,
                            drvrLng: data.drvrLng,
                            drvrLat: data.drvrLat,
                            pID: data.passId
                        });
                    } else {
                        console.log("Driver rejected the request");
                        io.to(socket.id).emit("IsAcc", {
                            status: false,
                            msg: "Request rejected",
                            dID: socket.id,
                            pID: data.passId
                        });
                        
                        // Also emit to the passenger
                        io.to(data.passId).emit("IsAcc", {
                            status: false,
                            msg: "Driver rejected your request. Please try another driver.",
                            dID: socket.id,
                            pID: data.passId
                        });
                    }
                } catch (error) {
                    console.error("Error in driver response handler:", error);
                }
            });

            // When driver is ready for new passengers after drop-off
            socket.on("driverReady", async (data) => {
                try {
                    // Mark driver as available
                    availableDrivers.add(socket.id);
                    console.log(`Driver ${socket.id} is now available for new passengers`);
                    
                    // Update driver's location and available status in MongoDB
                    await Drivers.updateOne(
                        { socketID: socket.id },
                        { 
                            $set: { 
                                available: true,
                                location: {
                                    type: "Point",
                                    coordinates: [data.drvrLng, data.drvrLat]
                                }
                            } 
                        }
                    );
                    
                    // Broadcast to all clients that this driver is available again
                    io.emit("driverBecameAvailable", {
                        driverId: socket.id,
                        drvrLat: data.drvrLat,
                        drvrLng: data.drvrLng,
                        msg: "A driver has become available for rides"
                    });
                    
                    // Driver is now available to new passengers
                    io.to(socket.id).emit("driverReadyConfirmed", {
                        msg: "You are now available for new passengers",
                        status: true
                    });
                } catch (error) {
                    console.error("Error in driverReady handler:", error);
                    io.to(socket.id).emit("driverReadyConfirmed", {
                        msg: "Error setting availability status",
                        status: false
                    });
                }
            });

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
        
        // If this was a driver, remove from available drivers list
        if (availableDrivers.has(socket.id)) {
            availableDrivers.delete(socket.id);
            console.log(`Driver ${socket.id} removed from available list`);
        }
        
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

// Helper function to remove driver from all passengers' Redis lists
async function removeDriverFromAllPassengers(driverSocketId, redisClient) {
    try {
        // Get all keys (passenger IDs) from Redis
        const keys = await redisClient.keys("*");
        console.log(`Removing driver ${driverSocketId} from ${keys.length} passenger lists`);
        
        // Find driver's coordinates from MongoDB
        const driver = await Drivers.findOne({ socketID: driverSocketId });
        if (!driver) {
            console.log(`Driver ${driverSocketId} not found in MongoDB`);
            return;
        }
        
        // Create delete string used in Redis
        const delString = `${driverSocketId},${driver.location.coordinates[0]},${driver.location.coordinates[1]}`;
        
        // Remove driver from each passenger's list
        for (let i = 0; i < keys.length; i++) {
            await redisClient.zRem(keys[i], delString).then(() => {
                console.log(`Driver ${driverSocketId} removed from passenger ${keys[i]}`);
            });
        }
    } catch (error) {
        console.error("Error removing driver from passenger lists:", error);
    }
}

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
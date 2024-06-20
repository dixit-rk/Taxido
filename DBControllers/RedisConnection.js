const {createClient}=require('redis');
const closeApp=require("./ErrorHandler");
let reconnection_tries=2;
exports.conn=new Promise((resolve,reject)=>{
    REDIS_URI=''
    REDIS_PASSWORD=''

    const client = createClient({
        password: REDIS_PASSWORD,
        socket: {
            host: REDIS_URI,
            port: 10614,
            reconnectStrategy: function () {
                return 1000;
              }
        }
    });
    client.on("error",(err)=>{
        console.log("some error has occured in REDIS DB Connection");
    })
    .on("ready",()=>{
        console.log("RedisDB is ready to be used!!");
    })
    .on("connect",()=>{
        reconnection_tries=5;
        console.log("connected to RedisDB");
    })

    client.on("end",()=>{
        console.log("client disconnected");
    })

    client.on("reconnecting",()=>{
        console.log(`attempt no :${reconnection_tries}`);
        reconnection_tries--;
        if(reconnection_tries==0){
           client.disconnect().then(()=>{
            console.log("Redis client disconnected");
            let error=new Error("Redis Server Disconnected");
            error.name="Redis Server Connection Lost";
            closeApp(error);
           });
        }
    })
    client.connect().then(()=>{
        reconnection_tries=2;
        resolve(client);
    })

})


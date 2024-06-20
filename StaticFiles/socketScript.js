
let Passenger = document.getElementById("Passenger");
let Driver = document.getElementById("Driver");
let listOfdrivers = document.getElementById("driversList");
let refreshButton = document.getElementById("Refresh");
let span=document.getElementById("role");
let buttonBox=document.getElementById("buttons");
let msgInput=document.getElementById("messageInput");
let msgBox=document.getElementById("messages");

Passenger.addEventListener('click', async () => {
   buttonBox.removeChild(Passenger);
   buttonBox.removeChild(Driver);
   span.textContent="You are connected as Passenger";
   heading.textContent = "Currently Available Drivers' List";
    let myRoom = "";
    await navigator.geolocation.getCurrentPosition(
        (data) => {
            let spMarker;
            let spMarker2;
            addMarkers([{ lng: data.coords.longitude, lat: data.coords.latitude, type: "pass" }], map);
            map.setCenter([data.coords.longitude, data.coords.latitude])
            console.log(`Lat: ${data.coords.latitude}\nLng: ${data.coords.longitude}`);
            passLat = data.coords.latitude;
            passLng = data.coords.longitude;
            const socket = io();
            socket.on('connect', () => {
                console.log(`${socket.id} Passenger is connected from frontEnd`);
                socket.emit('UserInfo', { id: socket.id, role: 'Passenger', passLat: passLat, passLng: passLng });
            })
            socket.on("getMarkersOfDrivers", (data) => {
                console.log(data);
                addMarkers(data, map);
            })
            socket.on("getListOfDrivers", (data) => {
                listOfdrivers.innerHTML = "";
                if(data.length==0){
                    let t=document.createTextNode("No drivers are currently available in 1KM radius,please refresh");
                    listOfdrivers.appendChild(t);
                }else{
                    data.forEach(element => {
                        const drvrButton = document.createElement("button");
                        const li = document.createElement("li");
                        li.setAttribute("style", "margin :1px")
                        drvrButton.textContent = JSON.stringify(element);
                        drvrButton.setAttribute("id", element.name);
                        drvrButton.setAttribute("class", element.distance);
                        li.appendChild(drvrButton);
                        listOfdrivers.appendChild(li);
                         
                        drvrButton.addEventListener("click", () => {
                            socket.on("disDrvr",(data)=>{
                                listOfdrivers.innerHTML="";
                                let disDrvrMSG=document.createElement("div");
                                disDrvrMSG.textContent=data.msg;
                                listOfdrivers.appendChild(disDrvrMSG);
                            })
                            socket.emit("passJoinRoom", { passId: socket.id, drvrId: drvrButton.id, distance: drvrButton.className });
                            listOfdrivers.innerHTML="";
                            let loader1=document.createElement("div");
                            let msg1=document.createTextNode("Connecting With Driver....")
                            loader1.setAttribute("class","loader");
                            listOfdrivers.appendChild(loader1);
                            listOfdrivers.appendChild(msg1);
                        })
                }
                );

            }
        })
            refreshButton.addEventListener('click', () => {
                listOfdrivers.innerHTML="";
                document.querySelectorAll('.marker-icon2').forEach(e => e.remove());
                document.querySelectorAll('.marker-border2').forEach(e => e.remove());
                socket.emit('refreshList', "");
            })
            socket.on("IsAcc", (data) => {
                if (data.status == true && data.pID==socket.id){
                    msgInput.removeAttribute("disabled");
                    document.querySelectorAll('.marker-icon2').forEach(e => e.remove());
                    document.querySelectorAll('.marker-border2').forEach(e => e.remove());
                    console.log(`final lat:${data.drvrLat},final lng:${data.drvrLng}`)
                    spMarker = createSpecialMarker();
                    setSpecialMarkerLocaton(spMarker, data.drvrLng, data.drvrLat, map);

                    spMarker2 = createSpecialMarker();
                    myRoom = data.dID;
                    console.log(`my room is ${myRoom}`)
                    listOfdrivers.innerHTML = "";
                    const res = document.createTextNode(data.msg);
                    listOfdrivers.appendChild(res);
                } else if(data.status == false && data.pID==socket.id){
                    document.querySelectorAll('.marker-icon2').forEach(e => e.remove());
                    document.querySelectorAll('.marker-border2').forEach(e => e.remove());
                    console.log("rej called")
                    listOfdrivers.innerHTML = "";
                    const res = document.createTextNode(data.msg);
                    socket.emit("leaveRoom", { roomId: data.dID });
                    listOfdrivers.appendChild(res);
                }
            })

            sendButton.addEventListener('click', () => {
                const messageText = messageInput.value.trim();
                if (messageText !== '') {
                    socket.emit("messageFromPass", { msg: messageText, room: myRoom, usr: socket.id });
                    messageInput.value = ''; // Clear input field after sending message
                }
            });

            socket.on("LocationChange", (data) => {
                console.log(data.clat, data.clng)
                spMarker.remove();
                setSpecialMarkerLocaton(spMarker2, data.clng, data.clat, map);
            })

            socket.on("msg", (data) => {
                if (data.usr == socket.id) {
                    addMessage(data.msg, 1);
                } else {
                    addMessage(data.msg, 0);
                }
            })

            socket.on("drvrLeft",(data)=>{
                msgInput.setAttribute("disabled","disabled");
                msgBox.innerHTML="";
                spMarker.remove();
                spMarker2.remove();
                console.log("drvrLeft")
                socket.emit("leaveRoom", { roomId: data.room });
                let el=document.createElement("h1");
                el.textContent="Driver disconnected,please refresh the list to see find new driver"
                listOfdrivers.innerHTML="";
                listOfdrivers.appendChild(el);
            })

        })
},
    (err) => {
        console.log(err);
    }
)


Driver.addEventListener('click', () => {
   buttonBox.removeChild(Passenger);
   buttonBox.removeChild(Driver);
   buttonBox.removeChild(refreshButton);
   span.textContent="You are connected as Driver";
    heading.textContent = "Waiting For Passneger's Request";
    let myRoom = "";
    let myPassenger="";
    let spMarker=undefined;
    navigator.geolocation.getCurrentPosition(
        (data) => {
            let originalM = createSpecialMarker();
            setSpecialMarkerLocaton(originalM, data.coords.longitude, data.coords.latitude, map);
            originalM.on('drag', () => {
                Slat = originalM.getLngLat().lat;
                Slng = originalM.getLngLat().lng;
                console.log(Slat);
                console.log(Slng);
                console.log("--------------------")
                socket.emit('LocationChange', { clng: Slng, clat: Slat });
            })
            map.setCenter([data.coords.longitude, data.coords.latitude])
            const socket = io();
            let myLng = data.coords.longitude;
            let myLat = data.coords.latitude;
            socket.on('connect', () => {
                myRoom = socket.id;
                console.log(`Lat: ${data.coords.latitude}\nLng: ${data.coords.longitude}`);
                drvrLat = data.coords.latitude;
                drvrLng = data.coords.longitude;

                console.log(`${socket.id} Driver is connected from frontEnd`);
                socket.emit('UserInfo', { id: socket.id, role: 'Driver', drvrLat: drvrLat, drvrLng: drvrLng });
                socket.on("passReq", (data) => {
                    var passLat = data.passLat;
                    var passLng = data.passLng;
                    var passId=   data.passId;

                    console.log(`acc lat:${passLat} acc Lng:${passLng}`)

                    console.log(JSON.stringify(data));
                    const passReq = document.createTextNode(data.request);

                    const acceptBtn = document.createElement("button");

                    const rejectBtn = document.createElement("button");
                    rejectBtn.setAttribute("id",passId+"preq");
                   

                    acceptBtn.textContent = "Accept";
                    rejectBtn.textContent = "Reject";

                    const li = document.createElement("li");
                    li.setAttribute("style", "margin :1px")
                    li.setAttribute("id",passId+"preq");
                   

                    li.appendChild(passReq);
                    li.appendChild(acceptBtn);
                    li.appendChild(rejectBtn);

                    acceptBtn.addEventListener("click", () => {
                        myPassenger=data.passId;
                        msgInput.removeAttribute("disabled");
                        socket.emit("drvrResPonse", { dec: true, passId: data.passId, myId: socket.id, drvrLng: myLng, drvrLat: myLat });
                        spMarker=createSpecialMarker2();
                        setSpecialMarkerLocaton(spMarker,passLng,passLat,map);

                       listOfdrivers.innerHTML="";
                       let d=document.createElement("div");
                       d.textContent="Connected with passenger successfully!!"
                       listOfdrivers.appendChild(d);
                        console.log("YES");
                    })

                    rejectBtn.addEventListener("click", () => {
                        socket.emit("drvrResPonse", { dec: false, passId: data.passId });
                        let delLi=document.getElementById(rejectBtn.id);
                        listOfdrivers.removeChild(delLi);
                        console.log("NO");
                    })
                    
                    listOfdrivers.appendChild(li);
                })

                sendButton.addEventListener('click', () => {
                    const messageText = messageInput.value.trim();
                    if (messageText !== '') {
                        socket.emit("messageFromdrvr", { msg: messageText, room: myRoom, usr: socket.id });
                        messageInput.value = ''; // Clear input field after sending message
                    }
                });

                socket.on("msg", (data) => {
                    if (data.usr == socket.id) {
                        addMessage(data.msg, 1);
                    } else {
                        addMessage(data.msg, 0);
                    }
                })

                socket.on("checkRemovedPassenger",(data)=>{
                    if(data.id==myPassenger){
                        msgInput.setAttribute("disabled","disabled");
                        msgBox.innerHTML="";
                        listOfdrivers.innerHTML="";
                        let text=document.createTextNode("Passenger is disconnected,please wait for another passeger's request");
                        listOfdrivers.appendChild(text);
                        spMarker.remove();
                    }
                })

            })
        })
},

    (err) => {
        console.log(err);
    }
)


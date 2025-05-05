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
            // Get token from cookie
            const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
            const socket = io({
                auth: { token: token || '' }
            });
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
                                disDrvrMSG.style.color = "#721c24";
                                disDrvrMSG.style.backgroundColor = "#f8d7da";
                                disDrvrMSG.style.padding = "10px";
                                disDrvrMSG.style.borderRadius = "5px";
                                disDrvrMSG.style.marginBottom = "15px";
                                listOfdrivers.appendChild(disDrvrMSG);
                                
                                // If driver is unavailable, automatically refresh the driver list after 3 seconds
                                if (data.driverUnavailable) {
                                    // Add refresh indicator
                                    let refreshingMsg = document.createElement("div");
                                    refreshingMsg.textContent = "Refreshing driver list...";
                                    refreshingMsg.style.fontStyle = "italic";
                                    listOfdrivers.appendChild(refreshingMsg);
                                    
                                    // Auto refresh after 3 seconds
                                    setTimeout(() => {
                                        console.log('Auto-refreshing driver list...');
                                        listOfdrivers.innerHTML = "";
                                        document.querySelectorAll('.marker-icon2').forEach(e => e.remove());
                                        document.querySelectorAll('.marker-border2').forEach(e => e.remove());
                                        socket.emit('refreshList', "");
                                    }, 3000);
                                }
                            })
                            
                            // Replace with ride request form
                            listOfdrivers.innerHTML = "";
                            
                            // Create form for destination and price
                            const requestForm = document.createElement("form");
                            requestForm.setAttribute("id", "rideRequestForm");
                            
                            // Form title
                            const formTitle = document.createElement("h3");
                            formTitle.textContent = "Ride Request Details";
                            requestForm.appendChild(formTitle);
                            
                            // Destination input
                            const destLabel = document.createElement("label");
                            destLabel.textContent = "Destination:";
                            destLabel.setAttribute("for", "destination");
                            requestForm.appendChild(destLabel);
                            
                            const destInput = document.createElement("input");
                            destInput.setAttribute("type", "text");
                            destInput.setAttribute("id", "destination");
                            destInput.setAttribute("placeholder", "Enter your destination");
                            destInput.setAttribute("required", "true");
                            destInput.dataset.driverId = drvrButton.id;
                            requestForm.appendChild(destInput);
                            
                            // Maximum price input
                            const priceLabel = document.createElement("label");
                            priceLabel.textContent = "Maximum Price (₹):";
                            priceLabel.setAttribute("for", "maxPrice");
                            requestForm.appendChild(priceLabel);
                            
                            const priceInput = document.createElement("input");
                            priceInput.setAttribute("type", "number");
                            priceInput.setAttribute("id", "maxPrice");
                            priceInput.setAttribute("placeholder", "Enter maximum amount");
                            priceInput.setAttribute("required", "true");
                            priceInput.setAttribute("min", "10");
                            requestForm.appendChild(priceInput);
                            
                            // Submit button
                            const submitBtn = document.createElement("button");
                            submitBtn.setAttribute("type", "submit");
                            submitBtn.textContent = "Send Request";
                            requestForm.appendChild(submitBtn);
                            
                            // Cancel button
                            const cancelBtn = document.createElement("button");
                            cancelBtn.setAttribute("type", "button");
                            cancelBtn.textContent = "Cancel";
                            cancelBtn.addEventListener("click", () => {
                                // Display drivers list again
                                socket.emit('refreshList', "");
                            });
                            requestForm.appendChild(cancelBtn);
                            
                            // Add form to drivers list container
                            listOfdrivers.appendChild(requestForm);
                            
                            // Handle form submission
                            requestForm.addEventListener("submit", (e) => {
                                e.preventDefault();
                                const destination = destInput.value;
                                const maxPrice = priceInput.value;
                                
                                // Send request to driver with additional info
                                socket.emit("passJoinRoom", { 
                                    passId: socket.id, 
                                    drvrId: drvrButton.id, 
                                    distance: drvrButton.className,
                                    destination: destination,
                                    maxPrice: maxPrice
                                });
                                
                                // Show loader
                                listOfdrivers.innerHTML = "";
                                let loader1 = document.createElement("div");
                                let msg1 = document.createTextNode("Connecting With Driver...");
                                loader1.setAttribute("class", "loader");
                                listOfdrivers.appendChild(loader1);
                                listOfdrivers.appendChild(msg1);
                            });
                        })
                }
                );

            }
        })
            // Set up refresh functionality
            function setupRefreshButton(socket) {
                refreshButton.onclick = () => {
                    console.log('Refreshing driver list...');
                    listOfdrivers.innerHTML = "";
                    document.querySelectorAll('.marker-icon2').forEach(e => e.remove());
                    document.querySelectorAll('.marker-border2').forEach(e => e.remove());
                    socket.emit('refreshList', "");
                };
            }
            
            setupRefreshButton(socket);
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

            // Add handler for when a driver becomes busy
            socket.on("driverBecameBusy", (data) => {
                console.log(`Driver ${data.driverId} is now busy with another passenger`);
                
                // Check if this driver is in our list and remove it
                const driverButtons = document.querySelectorAll("button[id]");
                let driverFound = false;
                
                driverButtons.forEach(button => {
                    if (button.id === data.driverId) {
                        // This driver is in our list and is now busy
                        driverFound = true;
                        button.parentElement.remove();
                        
                        // If we're in the middle of sending a request to this driver, stop and notify
                        if (listOfdrivers.querySelector("#rideRequestForm") && 
                            document.getElementById("destination") && 
                            document.getElementById("destination").dataset.driverId === data.driverId) {
                            listOfdrivers.innerHTML = "";
                            let busyMsg = document.createElement("div");
                            busyMsg.textContent = "This driver just accepted another passenger's request. Please select another driver.";
                            busyMsg.style.color = "#721c24";
                            busyMsg.style.backgroundColor = "#f8d7da";
                            busyMsg.style.padding = "10px";
                            busyMsg.style.borderRadius = "5px";
                            listOfdrivers.appendChild(busyMsg);
                            
                            // Auto refresh after 3 seconds
                            setTimeout(() => {
                                socket.emit('refreshList', "");
                            }, 3000);
                        }
                    }
                });
                
                // If driver list is now empty, show message
                if (driverFound && document.querySelectorAll("button[id]").length === 0) {
                    listOfdrivers.innerHTML = "";
                    let noDriversMsg = document.createElement("div");
                    noDriversMsg.textContent = "No drivers are currently available. Please try again later.";
                    listOfdrivers.appendChild(noDriversMsg);
                }
            });
            
            // Add handler for the disDrvr event with more detailed handling
            socket.on("disDrvr", (data) => {
                console.log("Driver unavailable message received:", data);
                
                listOfdrivers.innerHTML = "";
                let disDrvrMSG = document.createElement("div");
                disDrvrMSG.textContent = data.msg;
                disDrvrMSG.style.color = "#721c24";
                disDrvrMSG.style.backgroundColor = "#f8d7da";
                disDrvrMSG.style.padding = "10px";
                disDrvrMSG.style.borderRadius = "5px";
                disDrvrMSG.style.marginBottom = "15px";
                listOfdrivers.appendChild(disDrvrMSG);
                
                // If driver is unavailable, automatically refresh the driver list after 3 seconds
                if (data.driverUnavailable) {
                    // Add refresh indicator
                    let refreshingMsg = document.createElement("div");
                    refreshingMsg.textContent = "Refreshing driver list...";
                    refreshingMsg.style.fontStyle = "italic";
                    listOfdrivers.appendChild(refreshingMsg);
                    
                    // Auto refresh after 3 seconds
                    setTimeout(() => {
                        console.log('Auto-refreshing driver list...');
                        listOfdrivers.innerHTML = "";
                        document.querySelectorAll('.marker-icon2').forEach(e => e.remove());
                        document.querySelectorAll('.marker-border2').forEach(e => e.remove());
                        socket.emit('refreshList', "");
                    }, 3000);
                }
            });

            // Handler for when a driver becomes available again
            socket.on("driverBecameAvailable", (data) => {
                console.log(`Driver ${data.driverId} is now available for passengers`);
                
                // Check if we already have this driver in our list
                const existingDrivers = Array.from(document.querySelectorAll("button[id]")).map(btn => btn.id);
                
                // If the driver isn't already in our list, force a refresh to get updated driver list
                if (!existingDrivers.includes(data.driverId)) {
                    console.log("Refreshing driver list to include newly available driver");
                    
                    // Only refresh if we're on the main driver list view (not in a form or other state)
                    const isOnMainView = !listOfdrivers.querySelector("#rideRequestForm") && 
                                         !document.querySelector(".loader");
                    
                    if (isOnMainView) {
                        // Show a notification about new driver
                        const newDriverMsg = document.createElement("div");
                        newDriverMsg.textContent = "New driver(s) available! Refreshing list...";
                        newDriverMsg.style.color = "#0c5460";
                        newDriverMsg.style.backgroundColor = "#d1ecf1";
                        newDriverMsg.style.padding = "10px";
                        newDriverMsg.style.borderRadius = "5px";
                        newDriverMsg.style.marginBottom = "10px";
                        
                        // Only add the message if we're showing the driver list
                        if (listOfdrivers.childNodes.length > 0) {
                            listOfdrivers.insertBefore(newDriverMsg, listOfdrivers.firstChild);
                        }
                        
                        // Trigger refresh after a short delay
                        setTimeout(() => {
                            document.querySelectorAll('.marker-icon2').forEach(e => e.remove());
                            document.querySelectorAll('.marker-border2').forEach(e => e.remove());
                            socket.emit('refreshList', "");
                        }, 2000);
                    }
                }
            });
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
            // Create a marker for the driver's own position
            let originalM = createSpecialMarker();
            setSpecialMarkerLocaton(originalM, data.coords.longitude, data.coords.latitude, map);
            
            // Make the driver's marker draggable for location updates
            originalM.on('drag', () => {
                Slat = originalM.getLngLat().lat;
                Slng = originalM.getLngLat().lng;
                console.log(Slat);
                console.log(Slng);
                console.log("--------------------")
                socket.emit('LocationChange', { clng: Slng, clat: Slat });
            })
            
            map.setCenter([data.coords.longitude, data.coords.latitude])
            // Get token from cookie
            const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
            const socket = io({
                auth: { token: token || '' }
            });
            let myLng = data.coords.longitude;
            let myLat = data.coords.latitude;
            socket.on('connect', () => {
                myRoom = socket.id;
                console.log(`Lat: ${data.coords.latitude}\nLng: ${data.coords.longitude}`);
                drvrLat = data.coords.latitude;
                drvrLng = data.coords.longitude;

                console.log(`${socket.id} Driver is connected from frontEnd`);
                socket.emit('UserInfo', { id: socket.id, role: 'Driver', drvrLat: drvrLat, drvrLng: drvrLng });
                
                // Initialize pending requests container
                const pendingRequestsContainer = document.createElement("div");
                pendingRequestsContainer.setAttribute("id", "pendingRequests");
                pendingRequestsContainer.style.marginTop = "20px";
                pendingRequestsContainer.style.display = "none"; // Hidden initially
                const requestsTitle = document.createElement("h3");
                requestsTitle.textContent = "Pending Ride Requests";
                requestsTitle.style.color = "#007bff";
                pendingRequestsContainer.appendChild(requestsTitle);
                listOfdrivers.appendChild(pendingRequestsContainer);
                
                // Storage for pending requests (will be shown in UI)
                const pendingRequests = new Map();
                
                socket.on("passReq", (data) => {
                    var passLat = data.passLat;
                    var passLng = data.passLng;
                    var passId = data.passId;
                    var destination = data.destination || "Not specified";
                    var maxPrice = data.maxPrice || "Not specified";

                    console.log(`New request received from passenger ${passId}`);
                    console.log(JSON.stringify(data));
                    
                    // Store this request in the pending requests map
                    pendingRequests.set(passId, {
                        passId: passId,
                        passLat: passLat,
                        passLng: passLng,
                        destination: destination,
                        maxPrice: maxPrice,
                        distance: data.request ? data.request.split(' at distance ')[1] : 'Unknown'
                    });
                    
                    // Make sure pending requests container is visible
                    const pendingRequestsContainer = document.getElementById("pendingRequests");
                    pendingRequestsContainer.style.display = "block";
                    
                    // Clear previous requests and recreate the list
                    // Keep the title by removing all other child nodes
                    while (pendingRequestsContainer.childNodes.length > 1) {
                        pendingRequestsContainer.removeChild(pendingRequestsContainer.lastChild);
                    }
                    
                    // Add count of pending requests
                    const requestCount = document.createElement("p");
                    requestCount.textContent = `You have ${pendingRequests.size} pending ride request(s)`;
                    requestCount.style.fontWeight = "bold";
                    pendingRequestsContainer.appendChild(requestCount);
                    
                    // Create a request card for each pending request
                    pendingRequests.forEach((request, reqPassId) => {
                        // Create request info container
                        const requestInfo = document.createElement("div");
                        requestInfo.setAttribute("class", "request-info");
                        requestInfo.setAttribute("id", `req-${reqPassId}`);
                        
                        // Passenger ID
                        const passInfo = document.createElement("p");
                        passInfo.textContent = `Passenger ID: ${reqPassId}`;
                        requestInfo.appendChild(passInfo);
                        
                        // Distance
                        const distanceInfo = document.createElement("p");
                        distanceInfo.textContent = `Distance: ${request.distance}`;
                        requestInfo.appendChild(distanceInfo);
                        
                        // Destination
                        const destinationInfo = document.createElement("p");
                        destinationInfo.textContent = `Destination: ${request.destination}`;
                        requestInfo.appendChild(destinationInfo);
                        
                        // Max Price
                        const priceInfo = document.createElement("p");
                        priceInfo.textContent = `Maximum Price: ₹${request.maxPrice}`;
                        requestInfo.appendChild(priceInfo);
                        
                        // Accept button
                        const acceptBtn = document.createElement("button");
                        acceptBtn.textContent = "Accept";
                        acceptBtn.setAttribute("class", "accept-btn");
                        acceptBtn.addEventListener("click", () => {
                            // Accept this passenger's request
                            socket.emit("drvrResPonse", { 
                                dec: true, 
                                passId: reqPassId, 
                                drvrLat: myLat, 
                                drvrLng: myLng 
                            });
                            
                            // Clear pending requests UI
                            pendingRequestsContainer.style.display = "none";
                            pendingRequests.clear();
                            
                            // Show accepted request UI
                            myPassenger = reqPassId;
                            listOfdrivers.innerHTML = "";
                            
                            // Update the UI to show connected status
                            let successMsg = document.createElement("div");
                            successMsg.textContent = "Connected with passenger successfully!";
                            successMsg.style.padding = "10px";
                            successMsg.style.backgroundColor = "#d4edda";
                            successMsg.style.borderRadius = "5px";
                            successMsg.style.color = "#155724";
                            successMsg.style.marginTop = "10px";
                            listOfdrivers.appendChild(successMsg);
                            
                            // Add "Ready for New Passenger" button
                            const readyButton = document.createElement("button");
                            readyButton.textContent = "Trip Completed - Ready for New Passenger";
                            readyButton.style.backgroundColor = "#28a745";
                            readyButton.style.color = "white";
                            readyButton.style.padding = "10px";
                            readyButton.style.borderRadius = "5px";
                            readyButton.style.marginTop = "15px";
                            readyButton.style.width = "100%";
                            
                            // When driver completes the trip and is ready for new passengers
                            readyButton.addEventListener("click", () => {
                                // Update driver location and notify server that driver is available
                                navigator.geolocation.getCurrentPosition((position) => {
                                    const currentLat = position.coords.latitude;
                                    const currentLng = position.coords.longitude;
                                    
                                    // Emit driver ready event with current coordinates
                                    socket.emit("driverReady", {
                                        drvrLat: currentLat,
                                        drvrLng: currentLng
                                    });
                                    
                                    // Clear chat and reset UI
                                    msgInput.setAttribute("disabled", "disabled");
                                    msgBox.innerHTML = "";
                                    
                                    // Update UI to show driver is now available
                                    listOfdrivers.innerHTML = "";
                                    let availableMsg = document.createElement("div");
                                    availableMsg.textContent = "You are now available for new ride requests";
                                    availableMsg.style.padding = "10px";
                                    availableMsg.style.backgroundColor = "#d4edda";
                                    availableMsg.style.borderRadius = "5px";
                                    availableMsg.style.color = "#155724";
                                    availableMsg.style.marginTop = "10px";
                                    listOfdrivers.appendChild(availableMsg);
                                    
                                    // Re-add the pending requests container (empty)
                                    pendingRequestsContainer.style.display = "none";
                                    listOfdrivers.appendChild(pendingRequestsContainer);
                                });
                            });
                            
                            listOfdrivers.appendChild(readyButton);
                            
                            // Create marker for passenger location
                            if (spMarker) {
                                // If exists, remove it first
                                try {
                                    spMarker.remove();
                                } catch (e) {
                                    console.log("Error removing marker:", e);
                                }
                            }
                            
                            // Create a new marker at passenger location
                            try {
                                spMarker = createSpecialMarker();
                                setSpecialMarkerLocaton(spMarker, request.passLng, request.passLat, map);
                                // Add a label to distinguish this marker
                                const markerDiv = document.createElement('div');
                                markerDiv.style.position = 'absolute';
                                markerDiv.style.bottom = '25px';
                                markerDiv.style.left = '0px';
                                markerDiv.style.backgroundColor = 'white';
                                markerDiv.style.padding = '5px';
                                markerDiv.style.borderRadius = '5px';
                                markerDiv.style.fontSize = '12px';
                                markerDiv.style.fontWeight = 'bold';
                                markerDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                                markerDiv.textContent = 'Passenger';
                                
                                // Add the label to the marker or map near the marker's position
                                spMarker.getElement().appendChild(markerDiv);
                                
                                msgInput.removeAttribute("disabled");
                            } catch (e) {
                                console.log("Error creating marker:", e);
                            }
                        });
                        requestInfo.appendChild(acceptBtn);
                        
                        // Reject button
                        const rejectBtn = document.createElement("button");
                        rejectBtn.textContent = "Reject";
                        rejectBtn.setAttribute("class", "reject-btn");
                        rejectBtn.addEventListener("click", () => {
                            // Reject this passenger's request
                            socket.emit("drvrResPonse", { 
                                dec: false, 
                                passId: reqPassId 
                            });
                            
                            // Remove this request from the pending list
                            pendingRequests.delete(reqPassId);
                            
                            // Remove the request card from UI
                            requestInfo.remove();
                            
                            // Update request count
                            requestCount.textContent = `You have ${pendingRequests.size} pending ride request(s)`;
                            
                            // If no more pending requests, hide the container
                            if (pendingRequests.size === 0) {
                                pendingRequestsContainer.style.display = "none";
                            }
                        });
                        requestInfo.appendChild(rejectBtn);
                        
                        pendingRequestsContainer.appendChild(requestInfo);
                    });
                });

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

                socket.on("driverReadyConfirmed", (data) => {
                    if (data.status) {
                        console.log("Driver ready status confirmed:", data.msg);
                        
                        // Update heading to show waiting status
                        heading.textContent = "Waiting For Passenger's Request";
                    } else {
                        console.error("Error setting driver ready status:", data.msg);
                    }
                });

            })
        })
},

    (err) => {
        console.log(err);
    }
)


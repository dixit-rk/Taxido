function addMarkers(markers, map) {
    size = 50;

    //iterate over every marker object in an array
    markers.forEach((marker) => {
        let longitude = marker.lng;
        let latitude = marker.lat;
        let type = marker.type;

        console.log(`passed lng=${longitude} lat=${latitude}`)

        //if passneger
        if (type == "pass") {
            let div = document.createElement('div');
            div.innerHTML = "<p> passneger </p>"
            let border = document.createElement('div');
            border.className = 'marker-border1';

            let icon = document.createElement('div');
            icon.className = 'marker-icon1';

            border.appendChild(icon);

            popup = new tt.Popup({
                closeButton: false,
                offset: size,
                anchor: 'bottom'
            })
                .setDOMContent(div);

            let marker = new tt.Marker({
                draggable: true,
                element: border
            })
                .setLngLat([longitude, latitude])
                .setPopup(popup);
            marker.addTo(map);
        }

        //if driver
        if (type == "drvr") {
            let div = document.createElement('div');
            div.innerHTML = "<p> Driver </p>"
            let border = document.createElement('div');
            border.className = 'marker-border2';

            let icon = document.createElement('div');
            icon.className = 'marker-icon2';

            border.appendChild(icon);

            popup = new tt.Popup({
                closeButton: false,
                offset: size,
                anchor: 'bottom'
            })
                .setDOMContent(div);

            let marker = new tt.Marker({
                element: border,
                draggable: true
            })
                .setLngLat([longitude, latitude])
                .setPopup(popup);
            marker.addTo(map);

        }

    })
}

function createSpecialMarker() {
    size = 50;
    let div = document.createElement('div');
    div.innerHTML = "<p> Driver </p>"
    let border = document.createElement('div');
    border.className = 'marker-border2';

    let icon = document.createElement('div');
    icon.className = 'marker-icon2';

    border.appendChild(icon);

    popup = new tt.Popup({
        closeButton: false,
        offset: size,
        anchor: 'bottom'
    }).setDOMContent(div);

    let marker = new tt.Marker({
        element: border,
        draggable: true
    }).setPopup(popup)

    return marker;
}

function createSpecialMarker2() {
    size = 50;
    let div = document.createElement('div');
    div.innerHTML = "<p> Passenger </p>"
    let border = document.createElement('div');
    border.className = 'marker-border1';

    let icon = document.createElement('div');
    icon.className = 'marker-icon1';

    border.appendChild(icon);

    popup = new tt.Popup({
        closeButton: false,
        offset: size,
        anchor: 'bottom'
    }).setDOMContent(div);

    let marker = new tt.Marker({
        element: border,
        draggable: true
    }).setPopup(popup)

    return marker;
}

function setSpecialMarkerLocaton(marker, longitude, latitude, map) {
    console.log("called");
    marker.setLngLat([longitude, latitude]).addTo(map);

}


const map = tt.map({
    key: "cy92ZsGgBJI0Aco6GVH9s4rqUsO8YDUN",
    container: "map",
    zoom: 15,
    //  style:"https://api.tomtom.com/style/2/custom/style/dG9tdG9tQEBAbDg5dWxRelNUbTU3QmhxNzs0ZjA3ZTZhZS0yMjhhLTRhNGYtODNjYi01NWVkNWNmMGRiNWU=.json?key=cy92ZsGgBJI0Aco6GVH9s4rqUsO8YDUN"
})


const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const heading = document.getElementById('heading');

    function addMessage(messageText, color) {
        const message = document.createElement('div');
        if (color == 1) {
            message.setAttribute("class", "message1");
        } else {
            message.setAttribute("class", "message0");
        }

        message.textContent = messageText;
        messagesContainer.appendChild(message);
        scrollToBottom();
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

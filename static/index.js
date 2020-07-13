document.addEventListener("DOMContentLoaded", () => {
    // Connect to websocket
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    socket.on("connect", () => {
        const req = new XMLHttpRequest();
        req.open("POST", "/open")
        req.onload = () => {
            loadPage(JSON.parse(req.responseText));
        }
        req.send();
    })

    socket.on("update-channel", data => {
        if (localStorage.getItem("channelName") === data.channelName) {
            document.querySelector('#chat').appendChild(createMessage(data));
            const listItems = document.querySelector('#chat').querySelectorAll("div");
            if (listItems.length > 100) {
                listItems[0].parentElement.removeChild(listItems[0]);
            }
            document.querySelector('#chat').scrollTop = document.querySelector('#chat').scrollHeight;
        }
    })

    socket.on("channel-creation", data => {
        createChannelButton(data.channelName)
    })

    const sendBox = document.querySelector('#form');
    const textarea = document.querySelector('#textarea');

    sendBox.onsubmit = () => {
        if (textarea.value.length !== 0) {
            socket.emit("send", {
                "channelName": localStorage.getItem("channelName"),
                "sender": localStorage.getItem("username"),
                "message": sendBox.querySelector('textarea').value
            })
            document.querySelector('#chat').scrollTop = document.querySelector('#chat').scrollHeight;
        }
        sendBox.querySelector('textarea').value = "";
        return false;
    };


    textarea.onkeydown = e => {
        if (e.keyCode === 13 && !e.shiftKey) {
            e.preventDefault();
            document.querySelector('#form').onsubmit();
        }
    }

    const newChannel = document.querySelector('#new-channel-name');
    newChannel.onsubmit = () => {
      socket.emit("create-channel", {
        "channelName": newChannel.querySelector('input').value
      })
      newChannel.querySelector('input').value = "";
      return false;
    };

})

function loadPage(data) {
    localStorage.setItem("username", data.username)

    loadMessages(data.chat)

    localStorage.setItem("channelName", data.channelName);
    document.querySelector('#channel-name').innerHTML = data.channelName;

    localStorage.setItem("channels", data.channels);
    loadChannels(data.channels);
}

function loadMessages(messages) {
    const chat = document.querySelector('#chat');
    chat.innerHTML = "";
    messages.forEach((item, i) => {
        chat.appendChild(createMessage(item));
    });
    document.querySelector('#chat').scrollTop = document.querySelector('#chat').scrollHeight;
}

function loadChannels(channelList) {
    document.querySelector('#buttons').innerHTML = "";
    channelList.forEach((channelName, i) => {
        createChannelButton(channelName)
    });
}

function createChannelButton(channelName) {
    const channel = document.createElement("button");
    channel.className = "list-group-item text-light";

    if (channelName === localStorage.getItem("channelName")) {
        channel.className += " bg-secondary";
    } else {
        channel.className += " bg-dark";
    }

    channel.onclick = () => {
        const switchRequest = new XMLHttpRequest();
        switchRequest.open("POST", "/switch-channel")

        switchRequest.onload = () => {
            loadPage(JSON.parse(switchRequest.responseText))
        }

        const sentData = new FormData();
        sentData.append("channelName", channelName)
        switchRequest.send(sentData)
    }

    channel.innerHTML = channelName;
    document.querySelector('#buttons').appendChild(channel);
}

function createMessage(messageData) {
    const container = document.createElement("div");
    const username = localStorage.getItem("username")
    const isUserMessage = messageData.sender === username;
    if (isUserMessage) {
        container.className = "user-message";
        container.appendChild(document.createElement("div"));
    } else {
        container.className = "others-message";
    }

    const message = document.createElement("div");
    message.className = "message";

    const usr = document.createElement("p");
    usr.className = "username";
    usr.innerHTML = messageData.sender;
    message.appendChild(usr);

    for (let paragraph of messageData.message.split("\n")) {
        const pa = document.createElement("p");
        pa.innerHTML = paragraph;
        message.appendChild(pa);
    }

    const time = document.createElement("footer");
    time.className = "time text-right";
    time.innerHTML = messageData.sentAt;

    message.appendChild(time);
    container.appendChild(message);

    return container;
}

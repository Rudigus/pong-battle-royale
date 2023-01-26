const usernamePromptContainer = document.getElementById("username-prompt-container");
const usernameInput = document.getElementById("username-input");
const playButton = document.getElementById("play-button");
const canvas = document.getElementById("myCanvas");
const context = canvas.getContext("2d");
const matchLeaderboard = document.getElementById("match-leaderboard");
const leadersContainer = document.getElementById("leaders-container");

const serverMessageType = Object.freeze({
    SESSION: 0,
    LEADERBOARD: 1,
    PLAYER_ID: 2,
});

const clientMessageType = Object.freeze({
    ACTION: 0,
    USERNAME: 1,
});

let playerId = null;

let webSocket = null;

function sendSocketMessage(payload, type) {
    const message = {
        type: type,
        payload: payload
    };
    if (webSocket.readyState === WebSocket.OPEN) {
        webSocket.send(JSON.stringify(message));
    } else {
        console.warn("webSocket is not connected");
    }
}

playButton?.addEventListener("click", startGame);

function startGame() {
    setupClient();
    setupSocket();
    usernamePromptContainer.remove();
}

function setupClient() {
    const KEY = {
        LEFT: 37,
        RIGHT: 39,
    };

    let touch = null;

    webSocket = new WebSocket('ws://localhost:2222/');
    //webSocket = new WebSocket('ws://0.tcp.sa.ngrok.io:14920');

    document.addEventListener('touchstart', (ev) => {
        touch = null;

        if(ev.touches.length == 0) { return; }

        touch = ev.touches[0];
    })

    document.addEventListener('touchend', (ev) => {
        touch = null;

        if(ev.touches.length == 0) { return; }

        touch = ev.touches[0];
    })

    setInterval(() => {
        if(!touch) { return; }

        if(touch.clientX < canvas.width / 2) {
            sendSocketMessage('move_left', clientMessageType.ACTION);
        } else {
            sendSocketMessage('move_right', clientMessageType.ACTION);
        }
    }, 1000/30);

    document.addEventListener('keydown', (ev) => {
        switch(ev.keyCode) {
            case KEY.LEFT:
                sendSocketMessage('move_left', clientMessageType.ACTION);
                break;
            case KEY.RIGHT: 
                sendSocketMessage('move_right', clientMessageType.ACTION);
                break;
        }
    })
}

function setupSocket() {
    function getPointInWorld(x, y) {
        y = -y; // Canvas y-axis is inverted

        const distanceFromCenter = 5;

        const xScale = (canvas.width / (2 * distanceFromCenter));
        const yScale = (canvas.height / (2 * distanceFromCenter));

        return {
            x: (x * xScale),
            y: (y * yScale),
        }
    }
    function handleSessionMessage(data) {
        let worldAngleOffsetToCenterPlayer = 0;
        
        context.strokeStyle = "black";
        context.lineWidth = 1;

        const me = data.players.find((player) => { return (player.id === playerId); });
        worldAngleOffsetToCenterPlayer = -(me.minAngle + ((me.maxAngle + me.size - me.minAngle) / 2)); // Undo rotation
        worldAngleOffsetToCenterPlayer += 180 * (Math.PI / 180) // Offset to screen bottom

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        context.translate((canvas.width / 2), (canvas.height / 2));
        context.rotate(worldAngleOffsetToCenterPlayer);

        const ballPos = getPointInWorld(data.ball.position.x, data.ball.position.y);
        context.beginPath();
        context.arc(ballPos.x, ballPos.y, 5, 0, (2 * Math.PI));
        context.fillStyle = "#FFFFFF";
        context.fill();

        const distanceFromCenter = data.playersDistanceFromCenter;
        context.lineWidth = 5;
        data.players.forEach(player => {
            const a =  getPointInWorld((Math.sin(player.angle              ) * distanceFromCenter), (Math.cos(player.angle              ) * distanceFromCenter));
            const b =  getPointInWorld((Math.sin(player.angle + player.size) * distanceFromCenter), (Math.cos(player.angle + player.size) * distanceFromCenter));

            context.strokeStyle = (player === me) ? "red" : "black";

            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
        });
    }
    function addLeaderEntry(leader) {
        const leaderEntry = document.createElement("div");

        const leaderName = document.createElement("label");
        leaderName.innerText = leader.name;
        leaderName.style.color = "white";

        const leaderScore = document.createElement("label");
        leaderScore.innerText = leader.score;
        leaderScore.style.color = "white";
        leaderScore.style.position = "absolute";
        leaderScore.style.right = "15%";

        leaderEntry.appendChild(leaderName);
        leaderEntry.appendChild(leaderScore);
        leadersContainer.appendChild(leaderEntry);
    }
    function handleLeaderboardMessage(data) {
        if (window.getComputedStyle(matchLeaderboard, null).getPropertyValue("display") == "none") {
            matchLeaderboard.style.display = "block";
        }
        leadersContainer.replaceChildren();
        data.leaders.forEach(leader => addLeaderEntry(leader));
    }
    webSocket.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        switch (message.type) {
            case serverMessageType.SESSION:
                handleSessionMessage(message.payload);
                break;
            case serverMessageType.PLAYER_ID:
                playerId = message.payload;
                break;
            case serverMessageType.LEADERBOARD:
                handleLeaderboardMessage(message.payload);
                break;
            default:
                return;
        }
    };
    webSocket.onopen = async () => {
        sendSocketMessage(usernameInput.value, clientMessageType.USERNAME);
    };
}
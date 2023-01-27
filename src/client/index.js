const usernamePromptContainer = document.getElementById("username-prompt-container");
const usernameInput = document.getElementById("username-input");
const playButton = document.getElementById("play-button");
const canvas = document.getElementById("myCanvas");
const context = canvas.getContext("2d");
const matchLeaderboard = document.getElementById("match-leaderboard");
const leadersContainer = document.getElementById("leaders-container");

class GameLoop {
    FPS = 60;
    lastTime = null;
    requiredElapsed = (1000 / this.FPS);

    action = null;
    deltaTime = 0;

    constructor(action) {
        this.action = action;

        requestAnimationFrame(this.loop.bind(this));
    }

    loop(now) {
        requestAnimationFrame(this.loop.bind(this));
        
        if (!this.lastTime) { this.lastTime = now; }

        this.deltaTime = ((now - this.lastTime) / 1000);

        if(this.action) {
            this.action();
        }
        
        this.lastTime = now;
    }
}

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

let lastDataFromServer = null;
let currentDataFromServer = null;
let interpolatedDataFromServer = null;

let gameLoop = null;

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

    gameLoop = new GameLoop(loop);
}

function loop() {
    render();
}

function getInterpolatedDataFromServer() {
    const lastData = lastDataFromServer;
    const currentData = currentDataFromServer;

    const interpolatedData = (interpolatedDataFromServer ?? lastData);

    if(!gameLoop) { return null; }
    
    if(!lastData        ) { return null; }
    if(!currentData     ) { return null; }
    if(!interpolatedData) { return null; }

    function vectorMoveTowards(current, target, maxDelta)
    {
        const deltaX = (target.x - current.x);
        const deltaY = (target.y - current.y);
        const magnitude = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));

        if (magnitude <= maxDelta || magnitude == 0)
        {
            return target;
        }

        return {
            x: current.x + deltaX / magnitude * maxDelta,
            y: current.y + deltaY / magnitude * maxDelta,
        }
    }

    function moveTowards(current, target, maxDelta) {
        if (Math.abs(target - current) <= maxDelta) { return target; }
    
        return current + Math.sign(target - current) * maxDelta;
    }

    // Interpolate ball position
    {
        const from = interpolatedData.ball.position;
        const to   = currentData.ball.position;
        const step = (interpolatedData.ball.speed * gameLoop.deltaTime);

        interpolatedData.ball.position = vectorMoveTowards(from, to, step);
    }

    // Interpolate players angle
    interpolatedData.players = interpolatedData.players.map((item, index) => {
        const from = interpolatedData.players[index];
        const to   =      currentData.players[index];

        item.angle = moveTowards(from.angle, to.angle, (item.speed * gameLoop.deltaTime));

        return item;
    });

    return interpolatedData;
}

function render() {
    const data = getInterpolatedDataFromServer();

    if(!data) { return; }

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
        
        // Render player name text
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.translate((canvas.width / 2), (canvas.height / 2));

        const nameAngle = (worldAngleOffsetToCenterPlayer + player.angle + (player.size / 2));
        const namePos = getPointInWorld(
            (Math.sin(nameAngle) * distanceFromCenter), 
            (Math.cos(nameAngle) * distanceFromCenter)
        );

        context.font = "12px Arial";
        context.textAlign = "center";
        context.fillText(`Player #${player.id}`, namePos.x, namePos.y);
        context.restore();
    });
}

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
    function handleSessionMessage(data) {
        lastDataFromServer = currentDataFromServer;
        currentDataFromServer = data;
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
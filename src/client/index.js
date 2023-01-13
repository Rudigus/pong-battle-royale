const usernamePromptContainer = document.getElementById("username-prompt-container")
const playButton = document.getElementById("play-button")
const canvas = document.getElementById("myCanvas")
const context = canvas.getContext("2d")

let playerId = null;

playButton?.addEventListener("click", startGame);

function startGame() {
    setupClient();
    usernamePromptContainer.remove();
}

function setupClient() {
    const KEY = {
        LEFT: 37,
        RIGHT: 39,
    };

    let touch = null;

    const webSocket = new WebSocket('ws://localhost:2222/');
    //const webSocket = new WebSocket('ws://0.tcp.sa.ngrok.io:14920');

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
            webSocket.send('move_left');
        } else {
            webSocket.send('move_right');
        }
    }, 1000/30);

    document.addEventListener('keydown', (ev) => {
        switch(ev.keyCode) {
            case KEY.LEFT:
                webSocket.send('move_left');
            break;

            case KEY.RIGHT: 
                webSocket.send('move_right');
            break;
        }
    })

    setupClientUpdate(webSocket);
}

function setupClientUpdate(webSocket) {
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
    webSocket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        let worldAngleOffsetToCenterPlayer = 0;

        // Get player id from server
        if(playerId == null) {
            if(data.id) {
                playerId = data.id;
            }

            return;
        }
        context.clearRect(-canvas.width, -canvas.height, canvas.width * 1.5, canvas.height * 1.5);

        context.strokeStyle = "black";
        context.lineWidth = 1;

        const me = data.players.find((player) => { return (player.id === playerId); });
        worldAngleOffsetToCenterPlayer = -(me.minAngle + ((me.maxAngle + me.size - me.minAngle) / 2)); // Undo rotation
        worldAngleOffsetToCenterPlayer += 180 * (Math.PI / 180) // Offset to screen bottom

        context.setTransform(1, 0, 0, 1, 0, 0);
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
    };
}
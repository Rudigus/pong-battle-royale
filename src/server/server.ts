import { Server, WebSocket} from "ws";
import { Vector } from "vecti";

import Player from "./game/player";
import Ball from "./game/ball";
import { Line } from "./utils/line";
import GameLoop from "./utils/gameLoop";
import { clamp, moveTowards, normal, reflectVector } from "./utils/Math";
import { ServerMessageType, ServerSocketMessage, ClientMessageType, ClientSocketMessage } from "./data/socket";
import { PlayerData, SessionData } from "./data/session";
import { LeaderboardData } from "./data/leaderboard";
// import { randomUUID } from "crypto";
const circleToLineCollision = require('line-circle-collision');

const server = new Server({ port: 2222 });

const playersDistanceFromCenter = 5;
let ball = new Ball();
let players: Player[] = [];
let leaderboard: LeaderboardData = {
    leaders: []
};
let availableID = 0;

function generateSocketMessage(payload: any, type: ServerMessageType) {
    const message: ServerSocketMessage = {
        type: type,
        payload: payload
    };
    return JSON.stringify(message);
}

GameLoop.init();
GameLoop.setLoopAction(
    logicUpdate.bind(this), 
    physicsUpdate.bind(this)
);

server.on('connection', function(socket) {
    console.log("new connection");

    addPlayer(socket);

    socket.on('message', async (data) => {
        //console.log(`[Player] [Data] ${data}`);

        //console.log("DATA");

        const player = players.find((item) => item.socket === socket);
        //console.log(player);
        if(!player) { return; }

        const message = JSON.parse(data.toString()) as ClientSocketMessage;
        switch (message.type) {
            case ClientMessageType.Action:
                player.action = message.payload;
                break;
            case ClientMessageType.Username:
                leaderboard.leaders.push({
                    playerID: player.id,
                    name: message.payload,
                    score: 0
                });
                const replyMessage = generateSocketMessage(leaderboard, ServerMessageType.Leaderboard);
                players.forEach((player) => { player.socket.send(replyMessage); });
                break;
        }
    });

    socket.on('error', (err) => {
        console.log(`[Player] [Error] ${err}`);

        socket.close();
    });

    socket.on('timeout', () => {
        console.log('[Player] [Timeout] Closing connection with the client');
        
        socket.close();
    });

    socket.on('end', () => {
        console.log('[Player] [Disconnection] Closing connection with the client');
    });

    socket.on('close', () => {
        console.log('[Player] [Close] Connection with the client closed');

        const removedPlayer = players.find((item) => {
            return item.socket === socket;
        });

        players = players.filter((item) => {
            return item.socket !== socket;
        })
    
        console.log("PLAYERS " + players.length);
        
        if (removedPlayer != null) {
            leaderboard.leaders = leaderboard.leaders.filter((leader) => {
                return leader.playerID !== removedPlayer.id;
            })
            const replyMessage = generateSocketMessage(leaderboard, ServerMessageType.Leaderboard);
            players.forEach((player) => { player.socket.send(replyMessage); });
        } else {
            console.warn("Player not found");
        }

        reloadPlayersPositions();
    })
});

function addPlayer(socket: WebSocket) {
    function generateID(): number {
        const id = availableID;
        availableID++;
        return id;
    }

    const id = generateID();
    // const id = randomUUID();

    const newPlayer: Player = {
        id: id,
        socket: socket,
        size: 0, // Initialized in reloadPlayersPositions
        speed: 0, // Initialized in reloadPlayersPositions
        angle: 0, // Initialized in reloadPlayersPositions
        minAngle: 0, // Initialized in reloadPlayersPositions
        maxAngle: 0, // Initialized in reloadPlayersPositions
        lastAngle: 0, // Initialized in reloadPlayersPositions
        physicsAngle: 0 // Initialized in reloadPlayersPositions
    }
    
    const message = generateSocketMessage(id, ServerMessageType.PlayerID);

    socket.send(message);

    players.push(newPlayer);

    reloadPlayersPositions();
}

function reloadPlayersPositions() {
    if(players.length == 0) { return; }

    const FULL_CIRCLE = (360 * (Math.PI / 180)); // 360 degrees to radians
    const SECTION_SIZE = (FULL_CIRCLE / players.length);

    const PLAYER_SIZE = (SECTION_SIZE / 5);
    const PLAYER_SPEED = (SECTION_SIZE / 2);

    players.forEach((item, index) => {
        item.size = PLAYER_SIZE;
        item.speed = PLAYER_SPEED;

        item.minAngle = (index * SECTION_SIZE);
        item.maxAngle = ((item.minAngle + SECTION_SIZE) - PLAYER_SIZE);

        item.angle = ((item.minAngle + ((item.maxAngle - item.minAngle) / 2)));
        item.lastAngle = item.angle;
        item.physicsAngle = item.angle;
    });

    console.log("PLAYERS " + players.length);
}

function updatePlayersInput() {
    players.forEach((player) => {
        player.lastAngle = player.angle;

        if(!player.action) { return; }

        switch(player.action) {
            case "move_left":
                player.physicsAngle = clamp(
                    player.angle + (player.speed * GameLoop.getLogicDeltaTime()), 
                    player.minAngle, 
                    player.maxAngle
                );
            break;

            case "move_right":
                player.physicsAngle = clamp(
                    player.angle - (player.speed * GameLoop.getLogicDeltaTime()), 
                    player.minAngle, 
                    player.maxAngle
                );
            break;
        }

        player.action = undefined;
    });
}

function checkBallCollisionWithPlayer(player: Player, ballLinecast: Line): boolean {
    function playerColliderLineForAngle(angle: number, size: number): Line {
        return new Line(
            new Vector(Math.sin(angle + size), Math.cos(angle + size)).multiply(playersDistanceFromCenter),
            new Vector(Math.sin(angle), Math.cos(angle)).multiply(playersDistanceFromCenter),
        );
    }

    function checkBallCollision(playerCollider: Line): boolean {
        // Check for trajectory collision
        const collisionPoint = ballLinecast.intersects(playerCollider);
    
        if(collisionPoint) {
            const centerDir = new Vector(0, 0).subtract(collisionPoint.point).normalize();

            // Move to near exact position. (if exact, collision would happen forever)
            ball.position = collisionPoint.point.add(centerDir.multiply(ball.radius)); 
    
            // Reflect ball direction
            ball.direction = reflectVector(ball.direction, collisionPoint.normal);

            return true;
        }

        return false;
    }

    const playerCollider = playerColliderLineForAngle(player.angle, player.size);

    if(checkBallCollision(playerCollider)) {
        return true;
    }

    // Check if circle collides with line
    const circle = [ball.position.x, ball.position.y],
        radius = ball.radius,
        a = [playerCollider.pointA.x, playerCollider.pointA.y],
        b = [playerCollider.pointB.x, playerCollider.pointB.y]
    
    if(circleToLineCollision(a, b, circle, radius)) {
        // Reflect ball direction
        ball.direction = normal(playerCollider); // Simplified redirection
        return true;
    }

    return false;
}

function updateBall() {
    // Ball position before changes
    const tempBallPos = ball.position

    // pos = (pos + (dir * speed))
    ball.position = ball.position.add((ball.direction.multiply(ball.speed * GameLoop.getPhysicsDeltaTime())));

    // Ball movement line points
    const ballLinecast = new Line(tempBallPos, ball.position);

    // Check collisions
    players.forEach((player) => {
        if(checkBallCollisionWithPlayer(player, ballLinecast)) {
        }
    });

    // Ball out of bounds
    if(ball.position.length() > playersDistanceFromCenter + 1) {
        let angle = Math.atan2(ball.position.y, ball.position.x) - Math.PI / 2;
        if (angle < 0) {
            angle += 2 * Math.PI;
        }
        angle = (Math.PI * 2) - angle;
        const loser = players.find(player => { return (player.minAngle <= angle && angle <= player.maxAngle + player.size) });

        if(loser) {
            //loser.socket.terminate();

            const winningLeaders = leaderboard.leaders.filter(leader => leader.playerID != loser.id);
            if (winningLeaders) {
                winningLeaders.forEach(leader => leader.score += 1);
                const message = generateSocketMessage(leaderboard, ServerMessageType.Leaderboard);
                players.forEach((player) => { player.socket.send(message); });
            }

            //console.log(`Player ${loser.id} LOST!`)
        }

        ball.position = new Vector(0, 0); // Reset to initial position
        ball.direction = new Vector(Math.random() - Math.random(), Math.random() - Math.random()).normalize(); // Reset to initial direction
    }
}

function updatePlayersPhysics() {
    players.forEach((player) => {
        player.lastAngle = player.angle;
        player.angle = moveTowards(player.angle, player.physicsAngle, (player.speed * GameLoop.getPhysicsDeltaTime()));
    });
}

function logicUpdate() {
    updatePlayersInput();

    const game_data: SessionData = {
        ball: {
            speed: ball.speed,
            position: ball.position,
        },
        players: players.map<PlayerData>((item) => {
            return {
                id: item.id,
                size: item.size,
                speed: item.speed,
                angle: item.angle,
                minAngle: item.minAngle,
                maxAngle: item.maxAngle,
            }
        }),
        playersDistanceFromCenter: playersDistanceFromCenter
    }

    const response = generateSocketMessage(game_data, ServerMessageType.Session);

    players.forEach((item) => { item.socket.send(response); });
}

function physicsUpdate() {
    updateBall();
    updatePlayersPhysics();
}

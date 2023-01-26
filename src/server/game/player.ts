import { WebSocket } from "ws";

export default interface Player {
    id: number;
    // id: string;
    socket: WebSocket;
    action?: string;

    size: number;
    speed: number;
    angle: number;
    minAngle: number;
    maxAngle: number;

    lastAngle: number;

    // Angle to be updated by physics loop, to prevent tunneling
    physicsAngle: number;
}
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
}
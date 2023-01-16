import { Vector } from "vecti"

export interface BallData {
    position: Vector;
}

export interface PlayerData {
    id: number;
    // id: string;
    size: number;
    angle: number;
    minAngle: number;
    maxAngle: number;
}

export interface SessionData {
    ball: BallData;
    players: PlayerData[];
    playersDistanceFromCenter: number;
}
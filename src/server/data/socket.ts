export enum MessageType {
    Session,
    Leaderboard,
    PlayerID,
}

export interface SocketMessage {
    type: MessageType;
    payload: any;
}
export enum ServerMessageType {
    Session,
    Leaderboard,
    PlayerID,
}

export interface ServerSocketMessage {
    type: ServerMessageType;
    payload: any;
}

export enum ClientMessageType {
    Action,
    Username,
}

export interface ClientSocketMessage {
    type: ClientMessageType;
    payload: any;
}
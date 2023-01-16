export interface LeaderData {
    playerID: number,
    name: string;
    score: number;
}

export interface LeaderboardData {
    leaders: LeaderData[];
}
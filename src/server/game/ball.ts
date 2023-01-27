import { Vector } from "vecti";

export default class Ball {
    radius: number = 0.15;
    speed: number;
    position: Vector;
    direction: Vector;

    constructor() {
        this.speed = 3;
        
        this.position = new Vector(0, 0);
        this.direction = new Vector(Math.random() - Math.random(), Math.random() - Math.random()).normalize();
    }
}
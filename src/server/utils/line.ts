import { Vector } from "vecti";
import { checkIntersection } from 'line-intersect';
import { CollisionData } from "./collisionData";
import { normal } from "./Math";

export class Line {
    pointA: Vector;
    pointB: Vector;

    constructor(pointA: Vector, pointB: Vector) {
        this.pointA = pointA;
        this.pointB = pointB;
    }

    intersects(line: Line): null | CollisionData {
        const result = checkIntersection(this.pointA.x, this.pointA.y, this.pointB.x, this.pointB.y, line.pointA.x, line.pointA.y, line.pointB.x, line.pointB.y);

        if(result.type !== "intersecting") { return null; }
        
        return {
            point: new Vector(result.point.x, result.point.y),
            normal: normal(line) // Target normal
        }
    }
}

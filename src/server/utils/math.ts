import { Vector } from "vecti";
import { Line } from "./line";

export function clamp(value: number, min: number, max: number) {
    if(value < min) { return min; }
    if(value > max) { return max; }

    return value;
}

// r = d − 2(d⋅n)n
// where d⋅n is the dot product, and n must be normalized.
export function reflectVector(direction: Vector, normal: Vector): Vector {
    const dot = direction.dot(normal); // (d.n)
    
    return direction.subtract(
        normal.multiply(2 * dot) // 2(d.n)n
    )
}

export function normal(line: Line): Vector {
    const delta = line.pointB.subtract(line.pointA).normalize();

    return new Vector(-delta.y, delta.x);
    // OR
    return new Vector(delta.y, -delta.x);
}
class Loop {
    private static ONE_SECOND: number = 1000;

    private FPS: number = 0;
    private deltaTime: number = 0;
    private lastTimestamp: number = 0;

    private timer: NodeJS.Timer;
    private action: (() => void) | undefined;

    public constructor(fps: number) {
        this.FPS = fps;
        this.timer = setInterval(this.loop.bind(this), (Loop.ONE_SECOND / this.FPS));
    }

    public setLoopAction(action: () => void) {
        this.action = action;
    }

    public getDeltaTime() {
        return this.deltaTime;
    }

    public destroy() {
        clearInterval(this.timer);
    }

    private loop() {
        var now = Date.now();

        this.deltaTime = ((now - this.lastTimestamp) / Loop.ONE_SECOND);
        this.lastTimestamp = now;

        this.action?.();
    } 
}

export default class GameLoop {
    private static logicUpdate: Loop;
    private static physicsUpdate: Loop;

    public static init() {
        this.logicUpdate = new Loop(30);
        this.physicsUpdate = new Loop(60);
    }

    public static setLoopAction(logicUpdate: () => void, physicsUpdate: () => void) {
        this.logicUpdate.setLoopAction(logicUpdate);
        this.physicsUpdate.setLoopAction(physicsUpdate);
    }

    public static getLogicDeltaTime() {
        return this.logicUpdate.getDeltaTime();
    }

    public static getPhysicsDeltaTime() {
        return this.physicsUpdate.getDeltaTime();
    }

    public static destroy() {
        this.logicUpdate.destroy();
        this.physicsUpdate.destroy();
    } 
}
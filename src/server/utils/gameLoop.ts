export default class GameLoop {
    private static ONE_SECOND = 1000;

    private static FPS = 30;
    private static deltaTime = 0;
    private static lastTimestamp = 0;

    private static timer: NodeJS.Timer;
    private static executeOnLoop: (() => void) | undefined;

    public static init() {
        this.timer = setInterval(this.loop.bind(this), (this.ONE_SECOND / this.FPS));
    }

    public static setLoopAction(executeOnLoop: () => void) {
        this.executeOnLoop = executeOnLoop;
    }

    public static getDeltaTime() {
        return this.deltaTime;
    }

    public static destroy() {
        clearInterval(this.timer);
    }

    private static loop() {
        var now = Date.now();

        this.deltaTime = ((now - this.lastTimestamp) / this.ONE_SECOND);
        this.lastTimestamp = now;

        this.executeOnLoop?.();
    }   
}
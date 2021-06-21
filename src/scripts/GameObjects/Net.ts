import Player from "./Player";

export enum HorizontalMovement {
    LEFT,
    RIGHT,
    NONE,
}

export enum VerticalMovement {
    UP,
    DOWN,
    NONE,
}

export default class Net {
    player: Player;
    scene: Phaser.Scene;

    horizontalMovement: HorizontalMovement = HorizontalMovement.LEFT;
    VerticalMovement: VerticalMovement = VerticalMovement.UP;

    constructor(scene: Phaser.Scene, player: Player) {
        this.scene = scene;
        this.player = player;
    }

    setIsMovingRight() {}
    setIsMovingUp() {}
}
export default class StaticPhysicsRect extends Phaser.GameObjects.Rectangle implements Phaser.GameObjects.GameObject {
    constructor(scene: Phaser.Scene, x: number, y: number, width?: number, height?: number) {
        super(scene, x, y, width, height);

        scene.add.existing(this);
        scene.physics.add.existing(this, true);
    }
}
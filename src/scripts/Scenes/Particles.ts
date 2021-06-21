import { EventKeys } from "./Constants/Keys";
import { Images } from "./Constants/Resources";

export default class Particles extends Phaser.Scene {
    shoots: Phaser.GameObjects.Particles.ParticleEmitterManager;

    constructor() {
        super('particles');
        console.log('Particles scene created');
    }

    create() {
        console.log('Scene create() run');

        // Particles
        this.shoots = this.add.particles(Images.HIT);

        // Create events for shooting
        this.createShootEvents();
    }

    private createShootEvents(): void {
        this.events.on(EventKeys.SHOOT, (data) => {
            this.shoots.createEmitter({
                // 
                x: data.x,
                y: data.y,
                frequency: 1,
                maxParticles: 1,


                scale: {
                    random: true,
                    start: 0.18,
                    end: 0.01
                },
                rotate: {
                    random: true,
                    start: 0,
                    end: 180
                },
                blendMode: 'ADD',
                lifespan: 100
            });
        }, this);
    }
}
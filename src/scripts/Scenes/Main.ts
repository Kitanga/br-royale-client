import Player, { ServerPlayerEventType } from "../GameObjects/Player";
import { Images, Maps, MapTilesets } from "./Constants/Resources";
import StaticPhysicsRect from "../GameObjects/StaticPhysicsRect";
// import io from 'socket.io-client/build/';
import "socket.io-client/dist/socket.io.js";
import Particles from './Particles';

import Store from "../Store";
import uuid from 'node-uuid';
import { EventKeys } from './Constants/Keys';

export default class Main extends Phaser.Scene {
    players: { [key: string]: Player | null } = {};
    player: Player;
    // collidables: Phaser.GameObjects.Rectangle[];
    collidables: Phaser.GameObjects.GameObject[];
    // collidablesLayer: Phaser.Tilemaps.ObjectLayer;
    collidablesLayer: Phaser.Tilemaps.TilemapLayer;

    target: Player | null;
    targetOutline: Phaser.GameObjects.Sprite;
    mouse: Phaser.GameObjects.Sprite;
    mouseInput: Phaser.Input.Pointer;
    socket: any;
    fakeUserID: string;

    playerLayerGroup: Phaser.GameObjects.Group;
    uiLayerGroup: Phaser.GameObjects.Group;

    shootParticles: Phaser.GameObjects.Particles.ParticleEmitterManager;

    particlesScene: Particles;
    spawnPoints: Phaser.Math.Vector2[];

    constructor() {
        super('main');
    }

    init() {
        this.particlesScene = this.scene.run('particles').get('particles') as Particles;

        console.log('Particle Scene:', this.particlesScene);

        this.socket = (window as any).socket;
    }

    createPlayer(data) {
        console.warn('Creating player:', data);
        try {
            const player = this.players[data.id] = new Player(this, data.x, data.y, Images.PLAYER, false, data.id);
            player.rotation = data.r;
            this.objectToWallCollision(player);
            // this.players[data.id].kills = data.k;
        } catch (err) {
            console.error(err);
        }
        // this.updateScore();
    }

    createShootParticles() {
        this.shootParticles = this.add.particles(Images.HIT);
    }

    setupSocket() {
        // this.fakeUserID = localStorage.getItem('id') || uuid.v4();
        // this.fakeUserID = this.socket.id;
        // localStorage.setItem('id', this.fakeUserID);

        // console.log('fakeID:', this.fakeUserID);

        // console.log('Socket:', this.socket);

        this.socket.on('update', data => {
            // console.log('An update has been received!', data);
            // Update player position by id
            if (this.players[data.id]) {
                const player = (this.players[data.id] as Player);

                // TODO: WOrk on respawning!

                switch (data.type) {
                    case ServerPlayerEventType.MOVE:
                        // console.log('Receiving movement data from', data.id)
                        player.x = data?.x ?? player.x;
                        player.y = data?.y ?? player.y;
                        // console.log('Player position changed to:', player.x, player.y);
                        // player.rotation = data.r;
                        if (data.data) {
                            player.pressedKeys[data.data.key] = data.data.isPressed;
                        }
                        break;
                    case ServerPlayerEventType.ROTATION:
                        this.tweens.add({
                            targets: player,
                            props: {
                                rotation: { value: data.r, duration: 250 },
                            }
                        });
                        break;
                }
            } else {
                this.createPlayer(data);
            }
        });

        // const { width, height } = this.cameras.cameras[0];

        const name = 'Someone in SA';

        const x = this.player.x;
        const y = this.player.y;
        const id = this.socket.id;
        const h = 1;

        console.log('Connected');
        const initData = {
            id: this.socket.id,
            x,
            y,
            h,
            name
        };

        console.log('Initialization data:', initData);

        this.socket.emit('init', initData);

        this.socket.on('new-player', data => {
            console.log('Event:', 'new');
            console.log('New player:', data);
            this.createPlayer(data);
        });

        this.socket.on('players', players => {
            console.log('All players currently connected:', players);
            for (let key in players) {
                if (players.hasOwnProperty(key) && this.socket.id !== key) {
                    console.log('Creating player from player event:', players[key]);

                    if (players[key]) {
                        this.createPlayer(players[key]);
                    }
                }
            }

            console.log('Event:Players', players);
        });

        this.socket.on('kill', data => {
            console.log('Event:', 'kill', data);
            // TODO: Find out why spawning isn't working
            if (this.socket.id !== data.d) {
                (this.players[data.d] as Player).respawn();
                // this.updateScore();
            } else {
                this.player.respawn();
            }
        });

        this.socket.on('remove-player', data => {
            console.log('Event:', 'disconnected');
            this.players[data]?.destroy();
            this.players[data] = null;
        });

        this.socket.on('dmg', data => {
            console.log('Got damage report!', data);

            if (data.d) {
                if (data.d == this.player.socketID) {
                    this.players[data.a]?.shoot(this.player, data.dmg);
                    console.log(`I've been damaged, my current health is ${this.player.health}`)
                } else {
                    this.players[data.a]?.shoot(this.players[data.d] as Player, data.dmg);
                }
            } else {
                this.particlesScene.events.emit(EventKeys.SHOOT, {
                    x: data.x,
                    y: data.y
                });
            }
        });

        this.socket.on('respawn', (spawnIndex) => {
            const {x, y} = this.spawnPoints[spawnIndex];
            
            this.player.setPosition(x, y);
        });
    }

    create() {
        this.input.setDefaultCursor('none');

        this.createMap();

        this.targetOutline = this.add.sprite(0, 0, Images.TARGETTED).setVisible(false);
        const { width, height } = this.cameras.cameras[0];

        const { x, y } = this.getSpawnPoint();

        this.player = new Player(this, x, y, Images.PLAYER, true, this.socket.id ?? '');

        this.createShootParticles();

        this.setupSocket();

        console.log('Game Dimensions:', this.cameras.main.width, this.cameras.main.height);
        this.player.setCollideWorldBounds(true);

        this.setupCollision();

        this.mouse = this.add.sprite(0, 0, Images.CROSSHAIR);
        this.mouse.depth = 100;
        this.mouseInput = this.input.activePointer;

        this.input.on('pointermove', pointer => {
            this.mouse.setPosition(pointer.x, pointer.y);
        });
    }

    updateScore() {
        console.clear();

        console.log(`You have ${this.player.kills} eliminations`);

        for (let key in this.players) {
            if (this.players.hasOwnProperty(key)) {
                console.log(`${(this.players[key] as Player).name} has ${(this.players[key] as Player).kills} eliminations`);
            }
        }
    }

    private createMap() {
        // debugger;
        const map = this.add.tilemap(Maps.RUINED_CITY, 32, 32, 28, 28);
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        const jawbreakerTileset = map.addTilesetImage(MapTilesets.JAWBREAKER, Images.JAWBREAKER);
        const galletcityTileset = map.addTilesetImage(MapTilesets.GALLETCITY, Images.GALLETCITY);
        const azulTileset = map.addTilesetImage(MapTilesets.AZUL, Images.AZUL);

        const walkableLayer = (window as any).w =  map.createLayer('walkable', [
            jawbreakerTileset,
            galletcityTileset,
            azulTileset,
        ]);

        const spawnTile = [
            [16, 0],
            [27, 7],
            [23, 27],
            [1, 27],
            [0, 7],
        ];
        console.log('Walkable layer:', walkableLayer);
        this.spawnPoints = spawnTile.map(([x, y]) => {
            const tile = walkableLayer.getTileAt(x, y);

            return new Phaser.Math.Vector2(tile.getCenterX(), tile.getCenterY());
        });


        // this.collidablesLayer = map.getObjectLayer('collidables');
        // this.collidables = map.createFromObjects('collidables', {

        // });
        this.collidablesLayer = map.createLayer('collidablesView', [
            jawbreakerTileset,
            galletcityTileset,
            azulTileset,
        ]);
        this.collidablesLayer.setCollisionByExclusion([-1]);

        console.log('Collidable layer:', this.collidablesLayer);
    }

    /**
     * This method adds up all the distance of players to spawn point and then spawns the players accordingly
     * @param spawnPointIndex THe index of Spawn point
     */
    getSpawnPointDistanceSum(spawnPointIndex: number): number {
        const spawnPoint = this.spawnPoints[spawnPointIndex];

        const playerList = Object.entries(this.players);

        if (playerList.length) {
            const totalDistance: number = playerList
                .filter(val => val[1])
                .map(val => val[1] as Player)
                .map((player: Player) => {
                    return {
                        // 
                        x: player.x,
                        y: player.y
                    };
                })
                .map(pos => {
                    if (typeof pos.x !== 'undefined' && typeof pos.y !== 'undefined') {
                        return Phaser.Math.Distance.Between(spawnPoint.x, spawnPoint.y, pos.x, pos.y);
                    } else {
                        return 0;
                    }
                })
                .reduce((acc: number, currentVal: number) => acc + currentVal);

            return totalDistance;
        } else {
            return 0;
        }
    }

    getSpawnPoint(): Phaser.Math.Vector2 {
        const spawnIndex = this.spawnPoints.map((point, ix: number) => {
            return {
                sum: this.getSpawnPointDistanceSum(ix),
                index: ix
            };
        })
            .sort((a, b) => b.sum - a.sum)[0].index;

        return this.spawnPoints[spawnIndex];
    }

    setupCollision() {
        this.objectToWallCollision(this.player);
    }

    objectToWallCollision(gameObj: Player) {
        this.physics.add.collider(gameObj, this.collidablesLayer);
    }

    lastUpdatedServer = 0;
    updateInterval = 1000;

    now = performance.now();
    update() {
        this.player.update();
        for (let player in this.players) {
            if (this.players[player]) {
                (this.players[player] as Player).update();
            }
        }

        this.now = performance.now();
        if (this.now - this.lastUpdatedServer > this.updateInterval) {
            this.socket.emit('update', {
                type: ServerPlayerEventType.ROTATION,
                id: this.socket.id,
                r: this.player.rotation
            });
            this.lastUpdatedServer = this.now;
        }
    }
}
import { EventKeys } from "../Scenes/Constants/Keys";
import { Images } from "../Scenes/Constants/Resources";
import Main from "../Scenes/Main";

interface IActions {
    moveLeft: number,
    moveRight: number,
    moveUp: number,
    moveDown: number,
}

enum WeaponType {
    AR,
    SMG,
    PISTOL
}
enum WeaponAmmoMax {
    AR = 20,
    SMG = 25,
    PISTOL = 14
}
enum WeaponFireRate {
    AR = 10,
    SMG = 17,
    PISTOL = 4
}
enum WeaponReloadTime {
    AR = 1700,
    SMG = 1400,
    PISTOL = 1000
}
enum WeaponDamage {
    AR = 15,
    SMG = 7,
    PISTOL = 13
}

// Server event type
export enum ServerPlayerEventType {
    MOVE,
    ROTATION
}

export default class Player extends Phaser.Physics.Arcade.Sprite {
    // Player stats
    health = 100;
    maxHealth = 100;
    maxAmmo = 25;
    ammo = [WeaponAmmoMax.AR, WeaponAmmoMax.SMG, WeaponAmmoMax.PISTOL];
    reloadTime = 1700;
    fireRate = 17;
    damage = 17;
    msBeforeNextRound = 0;
    currentWeapon: WeaponType;
    // actionQueue: any[] = [];

    private canShoot = true;
    private lastShoot = 0;

    protected collidablesLayer: Phaser.Tilemaps.TilemapLayer;

    mousePointer: Phaser.Input.Pointer;

    originalX = 0;
    originalY = 0;

    scene: Main;

    // Controls
    pressedKeys = {
        // Movement
        moveLeft: false,
        moveRight: false,
        moveUp: false,
        moveDown: false,

        // Actions
        shoot: false
    };

    keys = {}

    readonly BASE_SPEED = 170;

    socketID: string;

    kills = 0;

    healthBar: Phaser.GameObjects.Sprite;
    healthBorder: Phaser.GameObjects.Sprite;
    healthBarTopMargin = 43;
    healthBarScale: number;
    healthBarWidth: number;

    constructor(scene: Main, x: number, y: number, texture: string | Phaser.Textures.Texture, isPlayerControlled = true, socketID) {
        super(scene, x, y, texture);

        this.originalX = x;
        this.originalY = y;

        this.setPosition(x, y);

        this.socketID = socketID;

        if (isPlayerControlled) {
            console.log('Socket ID:', this.socketID);
        }

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);

        this.collidablesLayer = scene.collidablesLayer;

        const pWidth = scene.textures.get(Images.PLAYER).get().width;

        const scale = 43 / pWidth;

        this.setScale(scale);

        if (isPlayerControlled) {
            console.log('Player controlled');
            this.setControls({
                moveLeft: Phaser.Input.Keyboard.KeyCodes.A,
                moveRight: Phaser.Input.Keyboard.KeyCodes.D,
                moveUp: Phaser.Input.Keyboard.KeyCodes.W,
                moveDown: Phaser.Input.Keyboard.KeyCodes.S,
            });
            scene.input.on('pointerup', () => {
                this.shoot();
            });

            this.attachHealthBar();
        } else {
            this.on('pointerover', () => {
                scene.targetOutline.setPosition(this.x, this.y);
                scene.targetOutline.setVisible(true);
                scene.target = this;
            });
            this.on('pointerout', () => {
                scene.targetOutline.setVisible(false);
                scene.target = null;
            });

            this.keys = {};

            this.updateRotation = (() => { }) as any;

            this.setInteractive();
        }

        this.setWeapon(WeaponType.AR);

        this.mousePointer = scene.input.activePointer;
    }

    attachHealthBar() {
        // 
        const {x, y} = this.getCenter();

        // const pWidth = this.scene.textures.get(Images.BAR).get().width;

        // const scale = 60 / pWidth;

        this.healthBarScale = .52;
        
        this.healthBar = this.scene.add.sprite(x, y + this.healthBarTopMargin, Images.BAR);
        // TODO: Do health bars using Graphics
        this.healthBar.originX = 0;
        // this.healthBar.originY = 0;
        this.healthBar.scaleX = this.healthBarScale;
        this.healthBarWidth = this.healthBar.displayWidth;
        // this.healthBar.scaleY = this.healthBarScale;
        this.healthBorder = this.scene.add.sprite(x, y, Images.BORDER);
        this.healthBorder.scaleX = this.healthBarScale;
        // this.healthBorder.scaleY = this.healthBarScale;
        // this.healthBorder.originX = 0;
        // this.healthBorder.originY = 0.5;
    }

    updatePlayerUI() {
        if (this.healthBar) {
            const {x, y} = this.getCenter();
            // const oldWidth = this.healthBar.displayWidth;
            this.healthBar.setPosition(x, y + this.healthBarTopMargin);this.healthBar.x
            this.healthBorder.setPosition(x, y + this.healthBarTopMargin);
            // this.healthBar.scaleX = (this.health / this.maxHealth) * this.healthBarScale;
            this.healthBar.displayWidth = (this.health / this.maxHealth) * this.healthBarWidth;


            // this.healthBar.x -= oldWidth - this.healthBar.displayWidth;
        }
    }

    shoot(_target?: Player, dmg?: number) {
        const target = _target ?? (this.scene as Main).target;

        // console.log('Distance', distance);
        const canHit: boolean | Phaser.Tilemaps.Tile = this.checkIfCanHit(_target);

        // If the canHit prop is null then we haven't hit any solid tiles 
        if (!canHit) {
            this.scene.particlesScene.events.emit(EventKeys.SHOOT, {
                x: _target || this.mousePointer.x,
                y: _target || this.mousePointer.y
            });

            if (target && this.health > 0) {
                target.health -= dmg ?? this.damage;

                console.log(`Player:${this.socketID}'s health is ${this.health}`);
                // Send a damage message to server here
                if (!dmg) {
                    this.scene.socket.emit('dmg', {
                        d: target.socketID,
                        a: this.socketID ?? this.scene.socket.id,
                        w: this.currentWeapon
                    });
                }

                if (target.health < 1) {
                    console.log('Someone got hit hard');
                    target.health = 100;
                    // target.respawn();
                    // this.scene.socket.emit('kill', {
                    //     d: target.socketID,
                    //     k: this.socketID
                    // });
                }

            } else {
                this.scene.socket.emit('dmg', {
                    a: this.socketID,
                    w: this.currentWeapon,
                    x: this.scene.mouse.x,
                    y: this.scene.mouse.y
                });
                this.scene.particlesScene.events.emit(EventKeys.SHOOT, {
                    x: this.mousePointer.x,
                    y: this.mousePointer.y
                });
            }
        } else {
            const tile: Phaser.Tilemaps.Tile = canHit as Phaser.Tilemaps.Tile;

            const x = tile.getLeft();
            const y = tile.getTop();
            const w = tile.width;
            const h = tile.height;

            const intersect = Phaser.Geom.Intersects.GetLineToRectangle(new Phaser.Geom.Line(this.x, this.y, this.mousePointer.x, this.mousePointer.y), new Phaser.Geom.Rectangle(x, y, w, h)).sort((a, b) => {
                const distA = Phaser.Math.Distance.BetweenPoints(a, this);
                const distB = Phaser.Math.Distance.BetweenPoints(b, this);

                return distA - distB;
            })[0];

            this.scene.particlesScene.events.emit(EventKeys.SHOOT, {
                x: intersect.x,
                y: intersect.y
            });
        }
    }

    private checkIfCanHit(target?: Player): boolean | Phaser.Tilemaps.Tile {
        const pointer = target || this.mousePointer;

        console.log('Pointer:', pointer);
        
        const tileWidth = this.collidablesLayer.tilemap.tileWidth;
        const tileHeight = this.collidablesLayer.tilemap.tileHeight;

        const tileX = Math.floor(this.x / tileWidth);
        const tileY = Math.floor(this.y / tileHeight);

        const targetTileX = Math.floor(pointer.x / tileWidth);
        const targetTileY = Math.floor(pointer.y / tileHeight);

        let canHit = this.findCollidableTile(tileX, tileY, targetTileX, targetTileY);

        return canHit;
    }

    private findCollidableTile(x0: number, y0: number, x1: number, y1: number): boolean | Phaser.Tilemaps.Tile {
        let canHit: boolean | Phaser.Tilemaps.Tile = false;

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = (x0 < x1) ? 1 : -1;
        const sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        while (true) {
            if ((x0 == x1) && (y0 == y1)) {
                canHit = this.checkTile(x1, y1);
                break;
            }
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }

            const tile = this.checkTile(x0, y0);

            if (tile) {
                canHit = tile;
                break;
            }
        }

        return canHit;
    }

    private checkTile(x: number, y: number) {
        const tile = this.collidablesLayer.getTileAt(x, y);

        console.log('Tile:', tile);
        
        return tile;
    }

    respawn() {
        this.x = this.originalX;
        this.y = this.originalY;
        this.health = 100;
        this.rotation += Math.PI * Math.random() * 7;
    }

    setWeapon(type: WeaponType) {
        switch (type) {
            case WeaponType.AR:
                this.maxAmmo = WeaponAmmoMax.AR;
                this.reloadTime = WeaponReloadTime.AR;
                this.fireRate = WeaponFireRate.AR;
                this.damage = WeaponDamage.AR;
                this.msBeforeNextRound = 500;
                this.currentWeapon = WeaponType.AR;
                break;
            case WeaponType.SMG:
                this.maxAmmo = WeaponAmmoMax.SMG;
                this.reloadTime = WeaponReloadTime.SMG;
                this.fireRate = WeaponFireRate.SMG;
                this.damage = WeaponDamage.SMG;
                this.msBeforeNextRound = 500;
                this.currentWeapon = WeaponType.SMG;
                break;
            case WeaponType.PISTOL:
                this.maxAmmo = WeaponAmmoMax.PISTOL;
                this.reloadTime = WeaponReloadTime.PISTOL;
                this.fireRate = WeaponFireRate.PISTOL;
                this.damage = WeaponDamage.PISTOL;
                this.msBeforeNextRound = 500;
                this.currentWeapon = WeaponType.PISTOL;
                break;
        }
    }

    updateRotation(): Phaser.Physics.Arcade.Sprite {
        const pointer = this.scene.input.activePointer;
        const pos = this.body.position;

        const angle = Phaser.Math.Angle.Between(pos.x, pos.y, pointer.worldX, pointer.worldY);

        this.rotation = angle;
        return this;
    }

    setControls(config: IActions) {
        this.scene.input.keyboard.removeAllListeners();

        this.keys = {};

        for (let key in config) {
            this.keys[config[key]] = (isPressed: boolean) => {
                console.log(key, 'has been pressed!', isPressed);
                this.setControl(key, isPressed);
            };
        }

        this.scene.input.keyboard.on('keyup', event => {
            if (this.keys[event.keyCode]) {
                this.keys[event.keyCode](false);
            }
        });
        this.scene.input.keyboard.on('keydown', event => {
            if (this.keys[event.keyCode]) {
                this.keys[event.keyCode](true);
                this.isMoving();
            }
        });
    }

    private setControl(key: string, isPressed: boolean) {
        if (this.pressedKeys[key] !== isPressed) {
            // Update the server about this (delta packets)
            console.log('Sending to server');
            this.scene.socket.emit('update', {
                type: ServerPlayerEventType.MOVE,
                data: {
                    key,
                    isPressed
                },
                id: this.scene.socket.id,
                x: this.x,
                y: this.y,
                // r: this.rotation
            });

            console.log('My position changed to:', this.x, this.y);
        }

        this.pressedKeys[key] = isPressed;
    }

    private isMoving() {
        if (!(this.pressedKeys.moveRight || this.pressedKeys.moveLeft)) {
            // 
            // Not moving horizontally
        }

        if (!(this.pressedKeys.moveUp || this.pressedKeys.moveDown)) {
            // 
            // Not moving vertically
        }
    }

    /** Move, shoot, etc. */
    doActions() {
        const keys = this.pressedKeys;

        // Movement
        if (keys.moveUp) {
            // 
            this.setVelocityY(-this.BASE_SPEED);
        } else if (keys.moveDown) {
            // 
            this.setVelocityY(this.BASE_SPEED);
        } else {
            this.setVelocityY(0);
        }

        if (keys.moveLeft) {
            // 
            this.setVelocityX(-this.BASE_SPEED);
        } else if (keys.moveRight) {
            // 
            this.setVelocityX(this.BASE_SPEED);
        } else {
            this.setVelocityX(0);
        }

        // Shoot
        if (keys.shoot) {
            // this.shoot
            // (this.scene as Main).target.health -= this.damage;
            // console.log('Health:', (this.scene as Main).target.health);
        } else {
            // this.pressedKeys.shoot = false;
        }
    }

    checkWeapon() {
        // this.shouldReload();
        // this.isShooting();
    }

    update() {
        this.updateRotation();
        this.doActions();
        this.checkWeapon();
        this.updatePlayerUI();
    }
}

// TODO: Work on UI using Bootstrap 4
import { Images, Maps, MapTilesets } from "./Constants/Resources";

export default class Preloader extends Phaser.Scene {
    constructor() {
        super('preloader');
    }

    preload() {
        this.load.image(Images.PLAYER, 'assets/player.png');
        this.load.image(Images.CROSSHAIR, 'assets/crosshair.png');
        this.load.image(Images.TARGETTED, 'assets/targetted.png');
        this.load.image(Images.HIT, 'assets/hit.png');
        this.load.tilemapTiledJSON(Maps.RUINED_CITY, 'assets/map.json');
        this.load.image(Images.JAWBREAKER, 'assets/jawbreaker_tiles.png');
        this.load.image(Images.GALLETCITY, 'assets/galletcity_tiles.png');
        this.load.image(Images.AZUL, 'assets/azul_tiles.png');
        this.load.image(Images.BAR, 'assets/bar.png');
        this.load.image(Images.BORDER, 'assets/border.png');
    }

    create() {
        this.scene.start('main');
    }
}
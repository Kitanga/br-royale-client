import 'phaser';
import Main from './Scenes/Main';
import Particles from './Scenes/Particles';
import Preloader from './Scenes/Preloader';
import { io } from 'socket.io-client';

const config = {
    type: Phaser.AUTO,
    backgroundColor: '#6b7b39',
    width: 896,
    height: 896,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 896,
        height: 896
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [Preloader, Main, Particles]
};

// this.socket = (window as any).io('http://35.177.90.143:3400');
// this.socket = (window as any).io('https://ec2-13-244-167-113.af-south-1.compute.amazonaws.com');
let url = location.origin;

url = url.replace('10001', '3400');
url = url.replace('5500', '3400');
url = url.replace('5501', '3400');
url = url.replace('5000', '3400');

url = url.replace('http', 'ws');

console.log('URL:', url);

(window as any).socket = io(url);

(window as any).socket.on('connect', () => {
    const game = new Phaser.Game(config);
});

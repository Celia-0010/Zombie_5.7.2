import ASSETS from './assets.js';

export default {
    player:
    {
        left: {
            key: 'player-left',
            texture: ASSETS.spritesheet.characters.key,
            frameRate: 10,
            config: { frames: [ 15, 16, 17, 18 ] },
            repeat: 0
        },
        down:
        {
            key: 'player-down',
            texture: ASSETS.spritesheet.characters.key,
            frameRate: 10,
            config: { frames: [ 0, 1, 2, 3 ] },
            repeat: 0
        },
        up:
        {
            key: 'player-up',
            texture: ASSETS.spritesheet.characters.key,
            frameRate: 10,
            config: { frames: [ 5, 6, 7, 8 ] },
            repeat: 0
        },
        right:
        {
            key: 'player-right',
            texture: ASSETS.spritesheet.characters.key,
            frameRate: 10,
            config: { frames: [ 10, 11, 12, 13 ] },
            repeat: 0
        },
    },
    enemy: {
        left:
        {
            key: 'enemy-left',
            texture: ASSETS.spritesheet.zombie.key,
            frameRate: 10,
            config: { frames: [ 33, 34, 35, 36, 37, 38, 39, 40, 41, 42 ] },
            repeat: 0
        },
        down:
        {
            key: 'enemy-down',
            texture: ASSETS.spritesheet.zombie.key,
            frameRate: 10,
            config: { frames: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ] },
            repeat: 0
        },
        up:
        {
            key: 'enemy-up',
            texture: ASSETS.spritesheet.zombie.key,
            frameRate: 10,
            config: { frames: [ 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
            repeat: 0
        },
        right:
        {
            key: 'enemy-right',
            texture: ASSETS.spritesheet.zombie.key,
            frameRate: 10,
            config: { frames: [ 22, 23, 24, 25, 26, 27, 28, 29, 30, 31 ] },
            repeat: 0
        },
    },
    npc:{
        left: {
            key: 'npc-left',
            texture: ASSETS.spritesheet.npc.key,
            frameRate: 10,
            config: { frames: [ 12, 16, 20 ] },
            repeat: 0
        },
        down:
        {
            key: 'npc-down',
            texture: ASSETS.spritesheet.npc.key,
            frameRate: 10,
            config: { frames: [ 13, 17, 21 ] },
            repeat: 0
        },
        up:
        {
            key: 'npc-up',
            texture: ASSETS.spritesheet.npc.key,
            frameRate: 10,
            config: { frames: [ 14, 18, 22 ] },
            repeat: 0
        },
        right:
        {
            key: 'npc-right',
            texture: ASSETS.spritesheet.npc.key,
            frameRate: 10,
            config: { frames: [ 15, 19, 23 ] },
            repeat: 0
        }
    },

    vehicle: {
        left:
        {
            key: 'vehicle-left',
            texture: ASSETS.spritesheet.vehicle.key,
            frameRate: 10,
            config: { frames: [ 4 ] },
            repeat: 0
        },
        down:
        {
            key: 'vehicle-down',
            texture: ASSETS.spritesheet.vehicle.key,
            frameRate: 10,
            config: { frames: [ 2 ] },
            repeat: 0
        },
        up:
        {
            key: 'vehicle-up',
            texture: ASSETS.spritesheet.vehicle.key,
            frameRate: 10,
            config: { frames: [ 6 ] },
            repeat: 0
        },
        right:
        {
            key: 'vehicle-right',
            texture: ASSETS.spritesheet.vehicle.key,
            frameRate: 10,
            config: { frames: [ 0 ] },
            repeat: 0
        },
    },
};
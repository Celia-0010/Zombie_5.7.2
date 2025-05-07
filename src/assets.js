export default {
    'audio': {
        score: {
            key: 'reject-sound',
            args: ['assets/sound/cry.mp3']
        },
    },
    // 'image': {
    //     spikes: {
    //         key: 'spikes',
    //         args: ['assets/spikes.png']
    //     },
    // },
    'image': {
        heart:{
            key:'heart',
            args: ['assets/heart.png', {
                frameWidth: 32,
                frameHeight: 32
        }]
        },

        anheihk: {
            key: '\u6697\u9ed1hk',
            args: ['assets/level1/暗黑hk.png', {
                frameWidth: 32,
                frameHeight: 32
            }]
        },
        anheihk2: {
            key: '\u6697\u9ed1hk2',
            args: ['assets/level1/暗黑hk2.png', {
                frameWidth: 32,
                frameHeight: 32
            }]
        },
        anheihk3: {
            key: '\u6697\u9ed1hk3',
            args: ['assets/level1/暗黑hk3.png', {
                frameWidth: 32,
                frameHeight: 32
            }]
        },
        guangdian: {
            key: '\u5149\u70b92',
            args: ['assets/level1/光点.png', {
                frameWidth: 32,
                frameHeight: 32
            }]
        },
        guangdian2: {
            key: '\u5149\u70b92',
            args: ['assets/level1/光点2.png', {
                frameWidth: 32,
                frameHeight: 32
            }]
        },
        xianggangpaizi: {
            key: '\u9999\u6e2f\u724c\u5b50',
            args: ['assets/level1/香港牌子.jpg', {
                frameWidth: 32,
                frameHeight: 32
            }]
        },
        hkpaizi: {
            key: 'HK\u724c\u5b50',
            args: ['assets/level1/HK牌子.png', {
                frameWidth: 32,
                frameHeight: 32
            }]
        },
        
        anheiqita: {
            key: '\u6697\u9ed1\u5176\u4ed6\u5efa\u7b51',
            args: ['assets/level1/暗黑其他建筑.png', {
                frameWidth: 32,
                frameHeight: 32
            }]
        },

        insideC: {
            key: 'inside_C',
            args: ['assets/level1/inside_C.png', {
                frameWidth: 32,
                frameHeight: 32
            }]
        },

        maibuqi: {
            key: '\u4e70\u4e0d\u8d77\u597d\u4e1c\u897f',
            args: ['assets/level2/买不起好东西.png', {
            frameWidth: 32,
            frameHeight: 32
            }]
        },
        a5: {
            key: '\u7d20\u6750/A5',
            args: ['assets/level2/A5.png', {
            frameWidth: 32,
            frameHeight: 32
            }]
        },
        anheihk2: {
            key: '\u6697\u9ed1hk',
            args: ['assets/level2/暗黑hk.png', {
            frameWidth: 32,
            frameHeight: 32
            }]
        },
        feiqijianzhu: {
            key: '\u5e9f\u5f03\u5efa\u7b512',
            args: ['assets/level2/废弃建筑2.png', {
            frameWidth: 32,
            frameHeight: 32
            }]
        },
        tilesf: {
            key: '/rectTileUniverse_BasicDirt_Tiles_F',
            args: ['assets/level2/rectTileUniverse_BasicDirt_Tiles_F.png', {
            frameWidth: 32,
            frameHeight: 32
            }]
        },
        feiqihuoche: {
            key: '\u5e9f\u5f03\u8d27\u8f661',
            args: ['assets/level2/废弃货车1.png', {
            frameWidth: 32,
            frameHeight: 32
            }]
        },
        deadbody: {
            key: '/tiled/deadbody',
            args: ['assets/level2/deadbody.png', {
            frameWidth: 32,
            frameHeight: 32
            }]
        },
        jiayouzhan: {
            key: '\u52a0\u6cb9\u7ad9',
            args: ['assets/level2/加油站.png', {
            frameWidth: 32,
            frameHeight: 32
            }]
        },
        feiqijianzhu3: {
            key: '\u5e9f\u5f03\u5efa\u7b513',
            args: ['assets/level2/废弃建筑3.png', {
            frameWidth: 32,
            frameHeight: 32
            }]
        },
        objects: {
            key: 'Objects',
            args: ['assets/level2/Objects.png', {
            frameWidth: 32,
            frameHeight: 32
            }]
        },
        Animation222: {
            key: 'Animation2',
            args: ['assets/level2/Animation2.png', {
            frameWidth: 32,
            frameHeight: 32
            }]
        },
        Animation333: {
            key: 'Animation3',
            args: ['assets/level2/Animation3.png', {
            frameWidth: 32,
            frameHeight: 32
            }]
        },
        feiqijianzhu4: {
            key: '\u5e9f\u5f03\u5efa\u7b514',
            args: ['assets/level2/废弃建筑4.png', {
            frameWidth: 32,
            frameHeight: 32
            }]
        },
        feiqizhiwu: {
            key: '\u5e9f\u5f03\u690d\u7269',
            args: ['assets/level2/废弃植物.png', {
            frameWidth: 32,
            frameHeight: 32
            }]
        },
        feiqijianzhu22: {
            key: '\u5e9f\u589f\u5efa\u7b51',
            args: ['assets/level2/废墟建筑.png', {
            frameWidth: 32,
            frameHeight: 32
            }]
        }

    },


    'spritesheet': {

        characters: {
            key: 'characters',
            args: ['assets/characterwalk.png', {
                frameWidth: 40,
                frameHeight: 40
            }]
        },

        zombie: {
            key: 'zombie',
            args: ['assets/zombie.png', {
                frameWidth: 40,
                frameHeight: 40
            }]
        },


        npc: {
            key: 'npc',
            args: ['assets/characters.png', {
                frameWidth: 32,
                frameHeight: 32
            }]
        },

        vehicle:{
            key:'vehicle',
            args: ['assets/vehicle2.png', {
                frameWidth: 140,
                frameHeight: 140
        }]
        },
    },
    
    'tilemapTiledJSON': {
        level1: {
            key: 'level1-map', // 第一个关卡的tilemap
            args: ['assets/level1/zombie_round1_1.json']
        },
        indoor: {
            key: 'indoor-map', // 室内地图
            args: ['assets/indoor.json'] // 确保路径正确
        },
        level2: {
            key: 'level2-map', // 第二个关卡的tilemap
            args:  ['assets/level2/zombie_round2.json']
        },
        level3: {
            key: 'level3-map', // 第三个关卡的tilemap
            args: ['assets/level3_tilemap.json']
        },
    },
}
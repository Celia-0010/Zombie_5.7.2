import ASSETS from '../assets.js';
import ANIMATION from '../animation.js';
import Player from '../gameObjects/Player.js';
import Enemy from '../gameObjects/Enemy.js';
import Coin from '../gameObjects/Coin.js';
import Bomb from '../gameObjects/Bomb.js';
import Door from '../gameObjects/Door.js';
import NPC from '../gameObjects/NPC.js';
import DialogueSystem from '../gameObjects/DialogueSystem.js';

export class Game extends Phaser.Scene
{
    constructor()
    {
        super('Game');
    }
    init(data) {
    // 如果 data.levelIndex 未定义，则默认从第 0 关开始
    this.currentLevelIndex = data.levelIndex ?? 0;
        }


    create ()
    {
        this.initVariables();
        this.initAnimations();
        this.initInput();
        this.initGroups();
        this.initMap();
        this.initPlayer();
        this.initPhysics();
        
        this.cameras.main.setZoom(3);
        this.cameras.main.setBounds(this.mapX, this.mapY, this.mapWidth * this.tileSize, this.mapHeight * this.tileSize);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);  // 相机跟随玩家，平滑移动
        this.initGameUi();
        this.initVehicleUi();
        this.updateVehicleUI();
        
        //按F进入载具
        this.input.keyboard.on('keydown-F', this.handleVehicleToggle, this);
        // ↓↓↓ 在玩家实例位置上，创建一个“停放用”的车辆精灵 ↓↓↓
        this.parkedVehicle = this.add.sprite(
            this.player.x, this.player.y,
            ASSETS.spritesheet.vehicle.key,                   // 车辆所在的 spritesheet
        )
        .setDepth(50)
        .setVisible(false);    // ←—— 一定要隐藏

        this.addNPC(10, 3); // 假设在(10, 3)位置添加NPC
    }

    update(time, delta) {
        // —— 始终刷新 UI —— 
        this.scoreText.setText(`Score: ${this.score}`);
        this.refreshHearts();

        // —— 再根据 gameStarted 决定要不要跑世界逻辑 —— 
        if (!this.gameStarted) return;

        this.player.update(time, delta);

        this.addEnemy();

        // 检查玩家是否到达地图最右边
        const mapRightEdge = this.mapX + this.mapWidth * this.tileSize;
        if (this.player.x >= mapRightEdge - this.player.width) {
            this.loadNextLevel(); // 进入下一关
        }

        this.npcGroup.getChildren().forEach(npc => {
            npc.update(delta, this.player);
        });
        
        this.cameras.main.centerOnX(this.player.x);
    }
    

    loadNextLevel() {
        // 检查是否还有下一关
        if (this.currentLevelIndex >= this.levels.length - 1) {
            // 如果没有更多关卡，游戏胜利或回到第一关
            this.GameOver(true); // true表示胜利
            return;
        }
       this.scene.restart({
       levelIndex: this.currentLevelIndex + 1
          });
    }

    initVariables ()
    {
        this.gameStarted = false;
        this.score = 0;
        this.centreX = this.scale.width * 0.5;
        this.centreY = this.scale.height * 0.5;

        this.spawnCounterEnemy = 0;
        this.spawnRateEnemy = 3 * 60;

        this.inVehicle = true;

        // 关卡配置（每个关卡有不同的 tileId 和地图尺寸）
        this.levels = [
            {
                tilemapKey: 'level1-map',  // 关卡 1
                tileIds: {
                    walls: [419, 387, 4293, 4292, 426, 425, 393, 394, 4260, 4261, 4229, 4228,0, 1017, 1018, 1019, 1020, 1021, 1022, 1023, 1049, 1050, 1051, 1052, 1053, 1054, 1055, 653, 654, 651, 652, 655, 656, 1081, 1082, 1083, 1084, 1085, 1086, 1087, 683, 684, 685, 686, 687, 688, 1010, 1011, 1012, 1013, 1014, 1113, 1114, 1115, 1116, 1117, 1118, 1119, 770, 771, 772, 773, 774, 775, 776, 777, 778, 715, 716, 717, 718, 719, 720, 1042, 1043, 1044, 1045, 1046, 1145, 1146, 1147, 1148, 1149, 1150, 1151, 802, 803, 804, 805, 806, 807, 808, 809, 810, 747, 748, 749, 750, 751, 752, 1058, 1059, 1060, 1061, 1062, 1063, 1064, 1065, 1066, 1074, 1075, 1076, 1077, 1078, 1177, 1178, 1179, 1180, 1181, 1182, 1183, 834, 835, 836, 837, 838, 839, 840, 841, 842, 779, 780, 781, 782, 783, 784, 1090, 1091, 1092, 1093, 1094, 1095, 1096, 1097, 1098, 1106, 1107, 1108, 1109, 1110, 1209, 1210, 1211, 1212, 1213, 1214, 1215, 866, 867, 868, 869, 870, 871, 872, 873, 874, 811, 812, 813, 814, 815, 816, 1122, 1123, 1124, 1125, 1126, 1127, 1128, 1129, 1130, 1138, 1139, 1140, 1141, 1142, 1241, 1242, 1243, 1244, 1245, 1246, 1247, 898, 899, 900, 901, 902, 903, 904, 905, 906, 843, 844, 845, 846, 847, 848, 1154, 1155, 1156, 1157, 1158, 1159, 1160, 1161, 1162, 1170, 1171, 1172, 1173, 1174, 1273, 1274, 1275, 1276, 1277, 1278, 1279, 930, 931, 932, 933, 934, 935, 936, 937, 938, 875, 876, 877, 878, 879, 880, 1186, 1187, 1188, 1189, 1190, 1191, 1192, 1193, 1194, 1202, 1203, 1204, 1205, 1206, 1305, 1306, 1307, 1308, 1309, 1310, 1311, 962, 963, 964, 965, 966, 967, 968, 969, 970, 907, 908, 909, 910, 911, 912, 1218, 1219, 1220, 1221, 1222, 1223, 1224, 1225, 1226, 1234, 1235, 1236, 1237, 1238, 994, 995, 996, 997, 998, 999, 1000, 1001, 1002, 939, 940, 941, 942, 943, 944, 1250, 1251, 1252, 1253, 1254, 1255, 1256, 1257, 1258, 1266, 1267, 1268, 1269, 1270, 1026, 1027, 1028, 1029, 1030, 1031, 1032, 1033, 1034, 971, 972, 973, 974, 975, 976, 1282, 1283, 1284, 1285, 1286, 1287, 1288, 1289, 1290, 1298, 1299, 1300, 1301, 1302],
                },
                mapWidth: 40,
                mapHeight: 20,
                playerStart: { x: 1, y: 16 },
                enemyStart: { x: 12, y: 4 }
            },
            {
                tilemapKey: 'level2-map',  // 关卡 2
                tileIds: {
                    walls: [16, 17, 45, 46, 47, 48, 53, 54, 55, 56],
                },
                mapWidth: 40,
                mapHeight: 20,
                playerStart: { x: 0, y: 0 },
                enemyStart: { x: 12, y: 4 }
            },
            {
                tilemapKey: 'level3-map',  // 关卡 3
                tileIds: {
                    player: 96,
                    enemy: 95,
                    coin: 94,
                    bomb: 106,
                    walls: [16, 17, 45, 46, 47, 48, 53, 54, 55, 56],
                    door: 86
                },
                mapWidth: 50,
                mapHeight: 10,
                playerStart: { x: 0, y: 6 },
                enemyStart: { x: 12, y: 4 }
            }
        ];


        this.randomEvents = [
            { text: '遭遇丧尸袭击，生命 -20',   effect: { health: -20 } },
            { text: '遇到好心幸存者，生命 +10', effect: { health: +10 } },
            { text: '遇到坏人袭击，生命 -10',   effect: { health: -10 } },
            { text: '发现食物补给，饥饿 +20',   effect: { hunger: +20 } },
            { text: '发现燃料补给，燃料 +20',   effect: { fuel:   +20 } }
        ];
        // —— 把每次事件的变动都记录下来 —— 
        this.eventHistory = [];

        this.level = this.levels[this.currentLevelIndex];

        // 随机背景图像生成
        this.tiles = [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 44 ];
        this.tileSize = 32; // tile 的宽度和高度
        this.halfTileSize = this.tileSize * 0.5;

        // 设置地图尺寸
        this.mapHeight = this.level.mapHeight; // 使用当前关卡的高度
        this.mapWidth = this.level.mapWidth; // 使用当前关卡的宽度

        this.mapX = this.centreX - (this.mapWidth * this.tileSize * 0.5);
        this.mapY = this.centreY - (this.mapHeight * this.tileSize * 0.5);

        this.map; // 地图引用
        this.groundLayer; // 地图背景层
        this.levelLayer; // 关卡层
    }

    initGameUi() {
        const W = this.scale.width;
        const H = this.scale.height;

        // Create tutorial text
        this.tutorialText = this.add.text(
        W / 2, H / 2,
            'Arrow keys to move!\nPress Spacebar to Start',
            {
                fontFamily: 'Arial Black',
                fontSize: '42px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 8,
                align: 'center'
            }
        )
            .setOrigin(0.5)
            .setScrollFactor(0)   // 固定位置
            .setDepth(100);

        // Create score text
        this.scoreText = this.add.text(
            W / 2 - 250, H / 2 - 160,
            'Score: 0',
            {
                fontFamily: 'Arial Black',
                fontSize: '22px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 8
            }
        )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(100);

        // Create game over text
        this.gameOverText = this.add.text(
            W / 2, H / 2,
            'Game Over',
            {
                fontFamily: 'Arial Black',
                fontSize: '64px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 8,
                align: 'center'
            }
        )
            .setOrigin(0.5)
            .setScrollFactor(0)   // 固定位置
            .setDepth(100)
            .setVisible(false);
        
        this.exitButton = this.add.text(W/2 - 300, H/2 + 90, 'Exit Vehicle', {
            fontSize: '18px', fill: '#fff', backgroundColor: '#000'
            })
            .setScrollFactor(0).setInteractive().setDepth(100);

        this.enterButton = this.add.text(W/2 + 150, H/2 + 90, 'Enter Vehicle', {
            fontSize: '18px', fill: '#fff', backgroundColor: '#666'
            })
            .setScrollFactor(0).setInteractive().setDepth(100)
            .setAlpha(0.5);  // 初始灰色，不可点击

        
        // 创建属性心形条
        const rows = [ H / 2 + 130, H / 2 + 150, H / 2 + 170 ];
        const stats = [ 'health', 'hunger', 'fuel' ];
        this.heartGroups = {};

        stats.forEach((stat, i) => {
            // 为每个属性新建一个数组，用来保存这一行所有的心形精灵
            this.heartGroups[stat] = [];

            this.add.text(
            W/2 - 310,         // 文本 x
            rows[i]-13,           // 文本 y 对应这一行
            stat.charAt(0).toUpperCase() + stat.slice(1), // 首字母大写
            {
                fontFamily: 'Arial Black',
                fontSize: '10px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 8,
            }
        )
            .setScrollFactor(0)
            .setDepth(100);

            // 循环生成 10 个心形图标
            for (let j = 0; j < 10; j++) {
                const img = this.add.image(
                    W / 2 - 250 + j * 25,
                    rows[i],
                    'heart'
                )
         
                .setScrollFactor(0)  // 固定在屏幕上，不随摄像机移动
                .setDepth(100)       // 保证在最前面

                this.heartGroups[stat].push(img);
            }
        });
        this.refreshHearts();
    }

    handleVehicleToggle() {
    if (this.inVehicle) {
        // —— 下车 前先把车子停在哪儿记下来 —— 
        this.vehicleX = this.player.x;
        this.vehicleY = this.player.y;
        this.parkedVehicle.setPosition(this.vehicleX, this.vehicleY).setVisible(true);

        this.inVehicle = false;
        this.player.enterCharacterMode();

    } else {
        // —— 上车 —— 先检查玩家离车够不够近 —— 
        const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        this.vehicleX, this.vehicleY
        );
        if (dist <= this.tileSize) {
        this.inVehicle = true;
        this.player.enterVehicleMode();
        this.parkedVehicle.setVisible(false);
        } else {
        // 太远就弹个提示
        const msg = this.add.text(
            this.scale.width/2, this.scale.height - 80,
            'You are too far from the vehicle',
            { font:'16px Arial', fill:'#ffffff', backgroundColor:'#000000' }
        )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(300);
        this.time.delayedCall(1500, () => msg.destroy());
        }
    }

    // 刷新一下按钮的高亮状态
    this.updateVehicleUI();
    }

    // Game.js

    initVehicleUi() {
    const W = this.scale.width, H = this.scale.height;

    this.exitButton = this.add.text(W/2 - 100, H - 50, 'Exit (F)', {
        fontSize: '18px', fill:'#fff', backgroundColor:'#000'
    })
        .setScrollFactor(0).setDepth(200);

    this.enterButton = this.add.text(W/2 + 100, H - 50, 'Enter (F)', {
        fontSize: '18px', fill:'#fff', backgroundColor:'#000'
    })
        .setScrollFactor(0).setDepth(200);
    }

    updateVehicleUI() {
    if (this.inVehicle) {
        this.exitButton.setAlpha(1);
        this.enterButton.setAlpha(0.5);
    } else {
        this.exitButton.setAlpha(0.5);
        this.enterButton.setAlpha(1);
    }
    }



    refreshHearts() 
    {
        ['health','hunger','fuel'].forEach(stat => {
            const val = Math.ceil(this.player[stat]/10);
            this.heartGroups[stat].forEach((spr, i) => spr.setVisible(i<val));
        });
        // 如果任一属性归零，就触发失败
        if (
            this.player.health <= 0 ||
            this.player.hunger <= 0 ||
            this.player.fuel   <= 0
        ) {
            this.GameOver();
        }
    } 

   /** 弹窗：询问是否进入房间，点击后切换到 RoomScene **/
    showRoomEnterPopup() {
        const W = this.scale.width, H = this.scale.height;
        this.popupElems = [];  // 新增：存放所有弹窗元素
                // 先把“对话框底板”放这层

        const bg = this.add.image(W/2, H/2, 'yesno-panel')
            .setScrollFactor(0)
            .setDepth(200)
            .setDisplaySize(400, 240);

        const txt = this.add.text(W/2, H/2 - 20,
                        'Do you want to enter?',
                        { font:'26px Minecraft', fill:'#f6ecdc', align:'center' ,
                            // 阴影相关
                            shadow: {
                                offsetX: 3,        // 阴影 X 偏移
                                offsetY: 5,        // 阴影 Y 偏移
                                color:   '#000000',// 阴影颜色
                                blur:    5,        // 阴影高斯模糊半径
                                stroke:  true,     // 阴影是否作用在描边上
                                fill:    true      // 阴影是否作用在填充上
                            }})

                        .setOrigin(0.5).setScrollFactor(0).setDepth(200);
        const yes = this.add.text(W/2 - 70, H/2 + 74, 'Yes',
                        { font:'16px Minecraft', fill:'#e5c6a4'})
                        .setOrigin(0.5).setInteractive().setScrollFactor(0).setDepth(200);
        const no  = this.add.text(W/2 + 70, H/2 + 74, 'No',
                        { font:'16px Minecraft', fill:'#e5c6a4'})
                        .setOrigin(0.5).setInteractive().setScrollFactor(0).setDepth(200);
       

        this.popupElems.push(bg);
        this.popupElems.push(txt);
        this.popupElems.push(yes);
        this.popupElems.push(no);

        yes.once('pointerdown', () => {
            this.popupElems.forEach(o => o.destroy());
            this.popupElems = null;
            this.scene.pause('Game');
            this.scene.setVisible(false, 'Game');
            this.scene.launch('RoomScene', { gameScene: this });
        });


        no.once('pointerdown', () => {
            this.popupElems.forEach(o => o.destroy());
            this.popupElems = null;
            // 此处不用切换场景，直接让弹窗消失，游戏继续；
        });
    }

       /** 触发一次随机事件：抽取、应用到 this.health/hunger/fuel、记录历史并弹出提示 **/
    triggerRandomEvent() {
        const evt = Phaser.Math.RND.pick(this.randomEvents);

        Object.entries(evt.effect).forEach(([stat, delta]) => {
            // —— 更新玩家实例上的属性 —— 
            const old = this.player[stat];
            this.player[stat] = Phaser.Math.Clamp(old + delta, 0, 100);

            // —— 把事件也记到玩家身上 —— 
            if (!this.player.eventHistory) this.player.eventHistory = [];
            this.player.eventHistory.push({ stat, delta, ts: Date.now() });
        });

        const msg = this.add.text(
            this.scale.width/2,
            this.scale.height/2,
            evt.text,
            { font:'24px Arial', fill:'#ffffff', backgroundColor:'#000000' }
        )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(300);

        this.time.delayedCall(1500, () => msg.destroy());
    }



    initAnimations ()
    {
        const playerAnimations = ANIMATION.player;
        for (const key in playerAnimations)
        {
            const animation = playerAnimations[ key ];

            this.anims.create({
                key: animation.key,
                frames: this.anims.generateFrameNumbers(animation.texture, animation.config),
                frameRate: animation.frameRate,
                repeat: animation.repeat
            });
        };

        const enemyAnimations = ANIMATION.enemy;
        for (const key in enemyAnimations)
        {
            const animation = enemyAnimations[ key ];

            this.anims.create({
                key: animation.key,
                frames: this.anims.generateFrameNumbers(animation.texture, animation.config),
                frameRate: animation.frameRate,
                repeat: animation.repeat
            });
        };

        const npcAnimations = ANIMATION.npc;
        for (const key in npcAnimations)
        {
            const animation = npcAnimations[ key ];

            this.anims.create({
                key: animation.key,
                frames: this.anims.generateFrameNumbers(animation.texture, animation.config),
                frameRate: animation.frameRate,
                repeat: animation.repeat
            });
        };

        const vehicleAnims = ANIMATION.vehicle;
        for (const dir in vehicleAnims) {
            const anim = vehicleAnims[dir];
            this.anims.create({
            key: anim.key,
            frames: this.anims.generateFrameNumbers(anim.texture, anim.config),
            frameRate: anim.frameRate,
            repeat: anim.repeat
            });
        };
    }

    initGroups ()
    {
        this.enemyGroup = this.add.group();
        this.itemGroup = this.add.group();
        this.doorGroup = this.add.group(); // 新增门组
        this.npcGroup = this.add.group(); // 新增NPC组
    }

    initPhysics() {
        // 1) 玩家与敌人重叠：调用 hitPlayer
        this.physics.add.overlap(
            this.player,
            this.enemyGroup,
            this.hitPlayer,
            null,
            this
        );

        // 2) 玩家与物品（Coin/Bomb）重叠：调用 collectItem
        this.physics.add.overlap(
            this.player,
            this.itemGroup,
            this.collectItem,
            null,
            this
        );

        // 只在玩家与门相邻一格时才触发
        this.physics.add.overlap(
        this.player,
        this.doorGroup,
        (player, door) => {
            if (!door.prompted) {
            door.prompted = true;
            door.triggerEnterRoom();
            }
        },
        (player, door) => {
            const mapOffset = this.mapX; // 或者用 getMapOffset 拿到 mapX/Y
            const tileSize  = this.tileSize;
            const px = Math.round((player.x - mapOffset) / tileSize);
            const py = Math.round((player.y - this.mapY) / tileSize);
            const dx = Math.round((door.x   - mapOffset) / tileSize);
            const dy = Math.round((door.y   - this.mapY) / tileSize);
            return (Math.abs(px - dx) + Math.abs(py - dy)) === 1;
            },
        null,   // 不再使用自定义过滤
        this
        );

    }

    initPlayer ()
    {
        this.player = new Player(this, this.playerStart.x, this.playerStart.y);
    }

    initInput ()
    {
        this.cursors = this.input.keyboard.createCursorKeys();

        // check for spacebar press only once
        this.cursors.space.once('down', (key, event) =>
        {
            this.startGame();
        });
    }

    initVehicleKey() {
        // 绑定 F 键
        this.keyF = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        }

    // create tile map data
    initMap ()
    {
        /* ───────── 0. 读取本关配置 ───────── */
        const cur = this.levels[this.currentLevelIndex];

        this.mapWidth    = cur.mapWidth;
        this.mapHeight   = cur.mapHeight;
        this.playerStart = { ...cur.playerStart };
        this.enemyStart  = { ...cur.enemyStart };
        this.tileIds     = cur.tileIds;

        /* ───────── 1. 创建 Tiled 地图 ───────── */
        this.map = this.make.tilemap({ key: cur.tilemapKey });

        /* 1.1 为每个 tileset 注册贴图（key 必须和 JSON 中 tilesets[].name 一致） */
        const tilesets = this.map.tilesets.map(ts =>
            this.map.addTilesetImage(ts.name)          // ← 这里用 ts.name 就够
        );

        // 3.2 其余图层全部放进一个 Group
        this.levelLayerGroup = this.add.group();

        const layerNames = [
            'sidewalk',
            'main road',
            'secondary road',
            '\u571f',
            'greenery\u5e95\u4e0b',
            'hk',
            'sidebuilding',
            'building',
            'greenery\u4e0a\u5c42',
            '\u5176\u4ed6\u724c\u5b50',
            '\u5149\u6807',
        ];

        layerNames.forEach(name => {
            const layer = this.map.createLayer(name, tilesets, this.mapX, this.mapY);
            this.levelLayerGroup.add(layer);

            // 把“墙”瓦片设为碰撞
            if (this.tileIds?.walls) {
                layer.setCollision(this.tileIds.walls);
            }
            if (name === '\u5149\u6807') {
                for (let y = 0; y < this.mapHeight; y++) {
                    for (let x = 0; x < this.mapWidth; x++) {
                        const tile = layer.getTileAt(x, y);
                        if (tile && tile.index !== 0) {
                            // 清掉光标瓦片
                            tile.index = -1;
                            // 在同一格生成 Door
                            this.addDoor(x, y);
                        }
                    }
                }
            }
        });
        

        /* 3.3 保存一层做逻辑扫描（这里选 'building'） */
        this.levelLayer = this.levelLayerGroup.getChildren()
                            .find(l => l.layer.name === 'building');

        /* ───────── 4. 遍历格子 → 生成动态元素 ───────── */
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {

                const tile = this.levelLayer.getTileAt(x, y);
                if (!tile) continue;

                switch (tile.index) {

                    case this.tileIds.player:
                        tile.index = -1;
                        this.playerStart = { x, y };
                        break;

                    case this.tileIds.enemy:
                        tile.index = -1;
                        this.enemyStart  = { x, y };
                        break;
                }
            }
        }
    }


    startGame ()
    {
        this.gameStarted = true;
        this.tutorialText.setVisible(false);
    }

    addEnemy ()
    {
        // spawn enemy every 3 seconds
        if (this.spawnCounterEnemy-- > 0) return;
        this.spawnCounterEnemy = this.spawnRateEnemy;

        const enemy = new Enemy(this, this.enemyStart.x, this.enemyStart.y);
        this.enemyGroup.add(enemy);
    }

    addCoin (x, y)
    {
        this.itemGroup.add(new Coin(this, x, y));
    }

    // 为每个门添加门对象
    addDoor(x, y) {
        const door = new Door(this, x, y);
        this.doorGroup.add(door); // 仅需添加到组
    }

    // 添加NPC方法
    addNPC(x, y) {
        const npc = new NPC(this, x, y, 'NPC Name', 'npc_portrait', 'Friendly', 'Background Info');  // 创建NPC
        this.npcGroup.add(npc); // 添加到npc组
        const dialogueSystem = new DialogueSystem(this, npc);  // 创建对话系统实例
        npc.dialogueSystem = dialogueSystem; // 将对话系统传给NPC
        npc.dialogueSystem.createDialogueBox(); // 创建对话框
    }

    removeItem (item)
    {
        this.itemGroup.remove(item, true, true);

        // check if all items have been collected
        if (this.itemGroup.getChildren().length === 0)
        {
            this.GameOver();
        }
    }

    addBomb (x, y)
    {
        this.itemGroup.add(new Bomb(this, x, y));
    }

    destroyEnemies ()
    {
        this.updateScore(100 * this.enemyGroup.getChildren().length);
        this.enemyGroup.clear(true, true);
    }

    hitPlayer (player, obstacle)
    {
        player.hit();
    }

    clearCurrentLevel() {
        // 清理敌人、物品、门、NPC 等
        this.enemyGroup.clear(true, true);
        this.itemGroup.clear(true, true);
        this.doorGroup.clear(true, true);
        this.npcGroup.clear(true, true);

        // 清理地图层
        if (this.groundLayer) {
            this.groundLayer.destroy(true);
        }
        if (this.levelLayer) {
            this.levelLayer.destroy(true);
        }
    }

    collectItem (player, item)
    {
        item.collect();
    }

    updateScore (points)
    {
        this.score += points;
        this.scoreText.setText(`Score: ${this.score}`);
    }

    getMapOffset ()
    {
        return {
            x: this.mapX + this.halfTileSize,
            y: this.mapY + this.halfTileSize,
            width: this.mapWidth,
            height: this.mapHeight,
            tileSize: this.tileSize
        }
    }

    getTileAt (x, y)
    {
        const tile = this.levelLayer.getTileAtWorldXY(x, y, true);
        return tile ? this.tileIds.walls.indexOf(tile.index) : -1;
    }

    GameOver (isWin = false)
    {
        this.gameStarted = false;
        if (isWin) {
            this.gameOverText.setText('You Win!');
        }
        this.gameOverText.setVisible(true);
    }
}
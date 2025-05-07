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

        // —— 【新增】物理世界边界也要跟着新地图走 —— 
        this.physics.world.setBounds(
            this.mapX,
            this.mapY,
            this.mapWidth * this.tileSize,
            this.mapHeight * this.tileSize
        );
        // 确保玩家碰撞世界边界
        this.player.body.setCollideWorldBounds(true);

        this.initGameUi();
        
        //按F进入载具
        this.input.keyboard.on('keydown-F', this.handleVehicleToggle, this);
        // ↓↓↓ 在玩家实例位置上，创建一个“停放用”的车辆精灵 ↓↓↓
        this.parkedVehicle = this.add.sprite(
            this.player.x, this.player.y,
            ASSETS.spritesheet.vehicle.key,                   // 车辆所在的 spritesheet
        )
        .setDepth(50)
        .setVisible(false);    // ←—— 一定要隐藏

        this.addNPC(10, 3, 'Stranger Doctor', "Next, you'll be playing as a [Mad Apothecary], and you're an NPC in the game Doom RV: Desperate Escape. You have the same skills and effects as him. The skill is [High Healing], which will provide the player with a positive effect: [Health Value] +10 per minute. But you need to hide your identity and pretend you're [Doctor], another NPC. In your interactions with the player, you will need to [hide your identity], request to escape together in an RV, and answer the player's questions. However, you may also trigger the hidden event [Desperate Poisoner], which halves the player's health. So if you reveal your identity, players will refuse to travel with you. However, you will need to reveal some small breaks in the dialog, such as some test tubes in the medical kit in addition to medicines, to make it possible for the player to recognize you. Note that there is no action, demeanor or psychological description. Don't talk too much, and generate only dialogues.");
        this.addNPC(15, 5, 'Stranger Chef', "you'll be playing as a [Hannibal], and you're an NPC in the game Doom RV: Desperate Escape. You have the same skills and effects as him. The skill is [Mastery of Cooking], which will provide the player with a positive effect: [Stamina] +10 per minute. But you need to hide your identity and pretend you're [Chef], another NPC. However, you may also trigger the hidden event [Human Cuisine], which causes the player to lose a random companion NPC. so if you reveal your identity, the player will refuse to travel with you. In your interactions with the player, you will need to [hide your identity], request to escape together in an RV, and answer the player's questions. However, you need to reveal small cracks in the dialog, such as mentioning that you've found fresh ingredients, or that you can make a gourmet meal out of anything, to make it possible for the player to recognize you. Note that there is no action, demeanor or psychological description. Don't talk too much, and generate only conversations.");
    

        if (this.currentLevelIndex > 0) {
           this.startGame()
    }
    }

    update(time, delta) {
        // —— 始终刷新 UI —— 
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

        // 清理当前关卡
        this.clearCurrentLevel();

        // 更新当前关卡索引
        this.currentLevelIndex++;

        // 获取新的关卡配置
        const currentLevel = this.levels[this.currentLevelIndex];

        // 重新设置地图宽度、高度和起始位置
        this.mapWidth = currentLevel.mapWidth;
        this.mapHeight = currentLevel.mapHeight;
        this.playerStart = currentLevel.playerStart;
        this.enemyStart = currentLevel.enemyStart;

        this.tileIds = currentLevel.tileIds;

        // 重新设置地图偏移量
        this.mapX = this.centreX - (this.mapWidth * this.tileSize * 0.5);
        this.mapY = this.centreY - (this.mapHeight * this.tileSize * 0.5);

        // 重新初始化地图
        this.initMap();

        // 将玩家传送到新地图的起始位置
        this.player.setPosition(
            this.playerStart.x * this.tileSize + this.mapX,
            this.playerStart.y * this.tileSize + this.mapY
        );

        // 重置玩家的目标位置
        this.player.target.x = this.player.x;
        this.player.target.y = this.player.y;

        // 重置输入状态（假设cursors是Phaser的键盘输入对象）
        const cursors = this.input.keyboard.createCursorKeys();
        cursors.left.isDown = false;
        cursors.right.isDown = false;
        cursors.up.isDown = false;
        cursors.down.isDown = false;

        // 重置相机跟随
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
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
                playerStart: { x: 1, y: 16 },
                enemyStart: { x: 12, y: 4 }
            },
            {
                tilemapKey: 'level3-map',  // 关卡 3
                tileIds: {
                    walls: [16, 17, 45, 46, 47, 48, 53, 54, 55, 56],
                },
                mapWidth: 40,
                mapHeight: 20,
                playerStart: { x: 0, y: 6 },
                enemyStart: { x: 12, y: 4 }
            }
        ];


        this.randomEvents = [
            { text: 'Attacked by zombies, Health -20',        effect: { health: -20 } },
            { text: 'Met a kind survivor, Health +10',        effect: { health: +10 } },
            { text: 'Ambushed by raiders, Health -10',        effect: { health: -10 } },
            { text: 'Found food supplies, Hunger +20',        effect: { hunger: +20 } },
            { text: 'Found fuel supplies, Fuel +20',          effect: { fuel:   +20 } }
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

        
        // 创建属性心形条
        const rows = [ H / 2 + 117, H / 2 + 135, H / 2 + 153 ];
        const stats = [ 'health', 'hunger', 'fuel' ];
        this.heartGroups = {};

        stats.forEach((stat, i) => {
            // 为每个属性新建一个数组，用来保存这一行所有的心形精灵
            this.heartGroups[stat] = [];
            this.add.image(
                W / 2,    // 居中显示，你也可以改成 W/2 - 100 等靠左
                H / 2+135,        // 垂直对齐到心形所在行
                'hp' // 你 preload 里给它的 key
                )
                .setScrollFactor(0) // 固定在屏幕上
                .setDepth(90)    // 深度要比文字和心形(100)低
                .setDisplaySize(350, 140);


            // 循环生成 10 个心形图标
            for (let j = 0; j < 10; j++) {
                const img = this.add.image(
                    W / 2+ 1 + j * 16.1,
                    rows[i],
                    'blood'
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
    showRoomEnterPopup (door) {
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
            this.popupElems.forEach(o=>o.destroy());
            this.popupElems = null;

            // 隐藏主场景
            this.scene.pause('Game');
            this.scene.setVisible(false, 'Game');

            // door 是函数参数，里面挂了 roomType / targetScene 等信息
            const roomType = door.roomType || 'default';     // ← 你的门上写的是 door.roomType
            this.scene.launch('RoomScene', { gameScene: this, roomType });
        });


        no.once('pointerdown', () => {
            // 先判断是否存在
            if (this.popupElems) {
                this.popupElems.forEach(o => o.destroy());
                this.popupElems = null;
            }
            // 让门可以再次触发
            door.prompted = false;
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

        this.add.image(
                W / 2,    // 居中显示，你也可以改成 W/2 - 100 等靠左
                H / 2+135,        // 垂直对齐到心形所在行
                'tips' // 你 preload 里给它的 key
                )
                .setScrollFactor(0) // 固定在屏幕上
                .setDepth(90)    // 深度要比文字和心形(100)低
                .setDisplaySize(350, 140);
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
            const mapOffset = this.mapX; 
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
            // —— 新增：让玩家跟 building/sidebuilding 碰撞 —— 
        if (this.blockLayerList) {
           this.blockLayerList.forEach(layer => {
             this.physics.add.collider(this.player, layer);
           });
         }
        

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
        // —— 新增：清掉上一次关卡遗留的 block 层 —— 
        this.blockLayerList = [];

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
        if (!this.map.layers.some(l => l.name === name)) return;

        const layer = this.map.createLayer(name, tilesets, this.mapX, this.mapY);
        if (!layer) return;
        this.levelLayerGroup.add(layer);

        // 把“墙”瓦片设为碰撞
        if (this.tileIds?.walls) {
            layer.setCollision(this.tileIds.walls);
        }

        // —— 新增：building / sidebuilding 碰撞 —— 
        if (name === 'building' || name === 'sidebuilding') {
            layer.setCollisionByExclusion([0]);
            if (!this.blockLayerList) this.blockLayerList = [];
            this.blockLayerList.push(layer);
        }  // ← 结束 building/sidebuilding 的 if

        const door711 = new Door(this, 14, 13);
        door711.roomType = 'indoor1';            // 写入房间类型
        this.doorGroup.add(door711);

        // 第 2 扇门：Hospital，地图格子 (6,5)
        const doorHos = new Door(this, 33, 13);
        doorHos.roomType = 'indoor2';
        this.doorGroup.add(doorHos);

        // “光标”层 → Door 逻辑
        if (name === '\u5149\u6807') {
            for (let y = 0; y < this.mapHeight; y++) {
                for (let x = 0; x < this.mapWidth; x++) {
                    const tile = layer.getTileAt(x, y);
                    if (tile && tile.index !== 0) {
                        tile.index = -1;
                        this.addDoor(x, y);
                    }
                }
            }
        }  // ← 结束 光标 的 if

    });  // ← 结束 forEach 回调



        this.levelLayer = this.levelLayerGroup.getChildren()
            .find(l => l.layer.name === 'building');

        if (!this.levelLayer) {
        console.error(
            `第${this.currentLevelIndex+1}关找不到 "building" 图层，地图里实际有：`,
            this.map.layers.map(l => l.name)
        );
        return;
        }

        /* ───────── 4. 遍历格子 → 生成动态元素 ───────── */
        for (let y = 0; y < this.mapHeight; y++) {
        for (let x = 0; x < this.mapWidth; x++) {
            const tile = this.levelLayer.getTileAt(x, y);
            if (!tile) continue;
        }
    }
    }


    startGame ()
    {
        this.gameStarted = true;
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

    // 在Game类中修改addNPC方法
    addNPC(x, y, name, dialoguePrompt) {
        const npc = new NPC(this, x, y, name, dialoguePrompt);
        this.npcGroup.add(npc);
        
        // 不再在这里创建对话系统
        return npc;
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
    getMapOffset() {
        return {
            x: this.mapX + this.halfTileSize,
            y: this.mapY + this.halfTileSize,
            tileSize: this.tileSize,
            width: this.mapWidth,
            height: this.mapHeight
        };
        }
    getTileAt(worldX, worldY) {
        const tile = this.levelLayer.getTileAtWorldXY(worldX, worldY, true);
        // tile.index 在 this.tileIds.walls 数组里，返回它的下标；否则返回 -1
        return tile ? this.tileIds.walls.indexOf(tile.index) : -1;
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
        // 清理敌人、物品、门、NPC
        this.enemyGroup.clear(true, true);
        this.itemGroup.clear(true, true);
        this.doorGroup.clear(true, true);
        this.npcGroup.clear(true, true);

        // —— 新增：彻底清理上一次生成的所有 tilemap layer —— 
        if (this.levelLayerGroup) {
            // 销毁所有子 layer
            this.levelLayerGroup.getChildren().forEach(layer => layer.destroy());
            // 清空并销毁 group 本身
            this.levelLayerGroup.clear(true, true);
            this.levelLayerGroup.destroy(true);
            this.levelLayerGroup = null;
        }

        // —— 新增：移除上一次注册的所有 building/sidebuilding 碰撞 —— 
        this.physics.world.colliders.getActive().forEach(collider => {
            // 找出那些碰撞体里有 tilemap layer 的
            if (collider.object2 && collider.object2 instanceof Phaser.Tilemaps.TilemapLayer) {
                this.physics.world.removeCollider(collider);
            }
        });

        // 清空 blockLayerList，避免后续复用
        this.blockLayerList = [];
    }


      GameOver(isWin = false) {
        this.gameStarted = false;
        
        if (isWin) {
            // 根据帮助的NPC数量决定结局
            const totalHelped = this.player.helpedNPCs?.length || 0;
            let endingText = '';
            let endingColor = '#FFFFFF';
            
            if (totalHelped >= 3) {
                endingText = 'You saved all people!';
                endingColor = '#FFD700'; // 金色
            } else if (totalHelped >= 1) {
                endingText = 'The RV stalls at an abandoned airstrip, fuel exhausted.\nAs the undead horde fades behind you, hope turns to dread: Hannibal awaits in the back, cleaning a bone-handled knife under his bloodied apron. "The pharmacist’s liver complemented black garlic... like the investigator’s,"\n he muses innocently.The blade mirrors your terror as wet chewing echoes in the dark.';
                endingColor = '#00FF00'; // 绿色
            } else {
                endingText = 'Normal Ending: You escape, one and alone...';
                endingColor = '#FFFFFF'; // 白色
            }
            
            // 显示统计信息
            const statsText = `Survival: ${totalHelped}\nKindness: ${this.player.reputation}`;
            
            this.gameOverText
                .setFont('Zombie')      // ★ 统一设置字体
                .setText([
                    '',
                    endingText,
                    '',
                    statsText
                ])
                .setColor(endingColor)
                .setFontSize(20);
            
        } else {
            this.gameOverText.setText('Game Over')
                .setColor('#FF0000').setFont('Zombie').setFontSize('30pt');
        }
        
        this.gameOverText.setVisible(true);
    }
}
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
        
        if (this.currentLevelIndex > 0) {
           this.startGame()
           return;
        }

        //按F进入载具
        this.input.keyboard.on('keydown-F', this.handleVehicleToggle, this);
        // ↓↓↓ 在玩家实例位置上，创建一个“停放用”的车辆精灵 ↓↓↓
        this.parkedVehicle = this.add.sprite(
            this.player.x, this.player.y,
            ASSETS.spritesheet.vehicle.key,                   // 车辆所在的 spritesheet
        )
        .setDepth(50)
        .setVisible(false);    // ←—— 一定要隐藏

        this.addNPC(10, 3, 'doctor', "Next, you'll be playing as a [Mad Apothecary], and you're an NPC in the game Doom RV: Desperate Escape. You have the same skills and effects as him. The skill is [High Healing], which will provide the player with a positive effect: [Health Value] +10 per minute. But you need to hide your identity and pretend you're [Doctor], another NPC. In your interactions with the player, you will need to [hide your identity], request to escape together in an RV, and answer the player's questions. However, you may also trigger the hidden event [Desperate Poisoner], which halves the player's health. So if you reveal your identity, players will refuse to travel with you. However, you will need to reveal some small breaks in the dialog, such as some test tubes in the medical kit in addition to medicines, to make it possible for the player to recognize you. Note that there is no action, demeanor or psychological description. Don't talk too much, and generate only dialogues.");
        this.addNPC(15, 5, 'chef', "you'll be playing as a [Hannibal], and you're an NPC in the game Doom RV: Desperate Escape. You have the same skills and effects as him. The skill is [Mastery of Cooking], which will provide the player with a positive effect: [Stamina] +10 per minute. But you need to hide your identity and pretend you're [Chef], another NPC. However, you may also trigger the hidden event [Human Cuisine], which causes the player to lose a random companion NPC. so if you reveal your identity, the player will refuse to travel with you. In your interactions with the player, you will need to [hide your identity], request to escape together in an RV, and answer the player's questions. However, you need to reveal small cracks in the dialog, such as mentioning that you've found fresh ingredients, or that you can make a gourmet meal out of anything, to make it possible for the player to recognize you. Note that there is no action, demeanor or psychological description. Don't talk too much, and generate only conversations.");
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
        
        // —— 玩家撞到世界右边界就切关 —— 
        // 只有当身体右侧与 worldBounds.right 重合（±1px）才切关
        const worldRight = this.physics.world.bounds.right;
        if (
            this.player.body.blocked.right &&
            Math.abs(this.player.body.right - worldRight) < 1
        ) {
            this.loadNextLevel();
        }



        this.npcGroup.getChildren().forEach(npc => {
            npc.update(delta, this.player);
        });

        this.doorGroup.getChildren().forEach(door => {
        if (door.prompted && !this.physics.overlap(this.player, door)) {
            door.prompted = false;
        }
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

        const savedHelpedNPCs = this.player.helpedNPCs;
        const savedReputation = this.player.reputation;

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

        // 重新同步物理世界边界到新地图
        this.physics.world.setBounds(
            this.mapX,
            this.mapY,
            this.mapWidth  * this.tileSize,
            this.mapHeight * this.tileSize
        );


        // 重新初始化地图
        this.initMap();
        /* —— 新增：换图后重新为新 blockLayers 建 collider —— */
        this.setupBlockColliders();

        this.pathfinder = new EasyStar.js();
        this.pathfinder.setGrid(this.navGrid);
        this.pathfinder.setAcceptableTiles([0]);
        this.pathfinder.enableDiagonals();

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

        this.player.helpedNPCs = savedHelpedNPCs || [];
        this.player.reputation = savedReputation || 0;

        // 重置相机跟随
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        this.generateNPCsForLevel();
    }


    initVariables ()
    {
        this.gameStarted = false;
        this.score = 0;
        this.centreX = this.scale.width * 0.5;
        this.centreY = this.scale.height * 0.5;

        this.spawnCounterEnemy = 0;
        this.spawnRateEnemy = 3 * 60;

        this.blockLayers   = [];   // 每关创建后装进所有 building / sidebuilding 图层
        this.blockColliders = [];  // 存放“玩家 ↔︎ blockLayer” 的 Collider 引用

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
                enemyStart: { x: 12, y: 4 },
                doors: [
                    { x: 11, y: 13, roomType: 'restaurant'},
                    { x: 33, y: 13, roomType: 'bar' }
                ]
            },
            {
                tilemapKey: 'level2-map',  // 关卡 2
                tileIds: {
                    walls: [16, 17, 45, 46, 47, 48, 53, 54, 55, 56],
                },
                mapWidth: 40,
                mapHeight: 20,
                playerStart: { x: 1, y: 16 },
                enemyStart: { x: 12, y: 4 },
                doors: [
                    { x: 22, y: 13, roomType: 'library' },
                    { x: 25, y: 2, roomType: 'gasstation' }
                ]
            },
            {
                tilemapKey: 'level3-map',  // 关卡 3
                tileIds: {
                    walls: [16, 17, 45, 46, 47, 48, 53, 54, 55, 56],
                },
                mapWidth: 40,
                mapHeight: 20,
                playerStart: { x: 0, y: 6 },
                enemyStart: { x: 12, y: 4 },
                doors: [
                    { x: 25, y: 2, roomType: 'hospital' },
                    { x: 33, y: 13 }
                ]
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

        this.popupContainer = null;   // 当前是否有弹窗；null 表示没有

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

        const screenCenterX = this.cameras.main.width / 2;
        const screenCenterY = this.cameras.main.height / 2;

        // Create tutorial text
        this.tutorialText = this.add.text(screenCenterX, screenCenterY, 'Use the arrow ←↑↓→ keys to move.\nClick "F" to get in or out of the vehicle.\nClick on NPCs to engage in conversation.\nMove around and collect necessary supplies.\nMove to the highlighted spots to interact with items/buildings.\nThe game will end when your health runs out.\nBe cautious of zombies that may appear at any time.\nIf you are ready, press "SPACE" to start the game.', {
            fontFamily: 'Arial Black', fontSize: 16, color: '#f2f2f2',
            stroke: '#000000', strokeThickness: 5,
            align: 'center'
        })
            .setOrigin(0.5)
            .setScrollFactor(0)  // 固定位置
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
        if (this.popupElems) return;       // 正在显示弹窗就别再弹

        this.gameStarted = false;          // 冻结世界逻辑
        this.player.moving = false;
        this.player.body.setVelocity(0, 0);
        this.player.target.set(this.player.x, this.player.y);
        this.input.keyboard.enabled = false;
        ['left','right','up','down'].forEach(k => this.cursors[k].reset());

        const W = this.scale.width;
        const H = this.scale.height;

        /* —— 单独创建四个精灵 —— */
        const bg  = this.add.image(W/2, H/2, 'yesno-panel')
                    .setDepth(200).setScrollFactor(0).setDisplaySize(400,240);

        const txt = this.add.text(W/2, H/2-20, 'Do you want to enter?',
                    { font:'26px Minecraft', fill:'#f6ecdc', align:'center' })
                    .setOrigin(0.5).setDepth(200).setScrollFactor(0);

        const yes = this.add.text(W/2-70, H/2+74, 'Yes',
                    { font:'16px Minecraft', fill:'#e5c6a4' })
                    .setOrigin(0.5).setDepth(210).setScrollFactor(0)
                    .setInteractive({ useHandCursor:true });

        const no  = this.add.text(W/2+70, H/2+74, 'No',
                    { font:'16px Minecraft', fill:'#e5c6a4' })
                    .setOrigin(0.5).setDepth(210).setScrollFactor(0)
                    .setInteractive({ useHandCursor:true });

        /* —— 用数组统一记录，便于销毁 —— */
        this.popupElems = [ bg, txt, yes, no ];

        /* ---- Yes：进房 ---- */
        yes.once('pointerdown', () => {
            this.closePopup();
            this.scene.setVisible(false, 'Game');
            this.scene.launch('RoomScene',
                { gameScene:this, roomType: door.roomType || 'default' });
        });

        /* ---- No：关闭弹窗 ---- */
        no.once('pointerdown', () => {
            this.closePopup();
            this.gameStarted = true;
            this.input.keyboard.enabled = true;
        });
    }


    closePopup () {
        if (this.popupElems) {
            this.popupElems.forEach(o => o.destroy());
            this.popupElems = null;
        }
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

            /* collideCallback —— 进入相邻格就弹窗一次 */
            (player, door) => {
                if (!door.prompted) {
                    door.prompted = true;
                    door.triggerEnterRoom();          // ← showRoomEnterPopup 在这里被调用
                }
            },

            /* processCallback —— 仅当玩家与门的曼哈顿距离 = 1 */
            (player, door) => {
                const tileSize = this.tileSize;
                const px = Math.round((player.x - this.mapX) / tileSize);
                const py = Math.round((player.y - this.mapY) / tileSize);
                const dx = Math.round((door.x   - this.mapX) / tileSize);
                const dy = Math.round((door.y   - this.mapY) / tileSize);
                return (Math.abs(px - dx) + Math.abs(py - dy)) === 1;
            },

            this                                      // context
        );
        this.setupBlockColliders(); 

        

    }

    initPlayer ()
    {
        this.player = new Player(this, this.playerStart.x, this.playerStart.y);
        this.player.gameScene = this;  // 传递当前场景引用
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
        this.blockLayers = [];
         this.blockColliders = []
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

                // ① 先把所有建筑瓦片设为可碰撞
                layer.setCollisionByExclusion([-1, 0]);

                // ② 再把“贴着空气”的外圈瓦片取消碰撞 → 等效向内缩 1 格
                const w = layer.layer.width;
                const h = layer.layer.height;
                for (let ty = 0; ty < h; ty++) {
                    for (let tx = 0; tx < w; tx++) {
                    const t = layer.getTileAt(tx, ty);
                    if (!t || t.index === -1 || t.index === 0) continue;      // 空格子跳过

                    const onEdge = [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{
                        const nt = layer.getTileAt(tx+dx, ty+dy);
                        return (!nt || nt.index === -1 || nt.index === 0);       // 旁边是空气
                    });

                    if (onEdge) t.setCollision(false,false,false,false);      // 边缘瓦片可通行
                    }
                }

                // 保存以便 Physics 添加 collider（车、人统一阻挡）
                this.blockLayers.push(layer);
                }

            const currentLevel = this.levels[this.currentLevelIndex];
            
            if (currentLevel.doors) {
                currentLevel.doors.forEach(doorConfig => {
                    // 直接传递瓦片坐标，让Door类自己转换
                    const door = new Door(this, doorConfig.x, doorConfig.y);
                    door.roomType = doorConfig.roomType;
                    this.doorGroup.add(door);
                    
                    // 调试输出
                    console.log(`创建门在 瓦片(${doorConfig.x},${doorConfig.y}) -> 世界(${door.x},${door.y})`);
                });
            }

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

        }
        
        );  // ← 结束 forEach 回调



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

            /* —— 为 A* 生成 walkability 网格 —— */
        this.navGrid = [];
        for (let ty = 0; ty < this.mapHeight; ty++) {
        this.navGrid[ty] = [];
        for (let tx = 0; tx < this.mapWidth; tx++) {
            // 如果任何阻挡层在该 (tx,ty) 有 collides，就记 1（不可走），否则 0
            let blocked = false;

            const tMain = this.levelLayer.getTileAt(tx, ty);
            if (tMain && tMain.collides) blocked = true;

            if (!blocked) {
            for (const bl of this.blockLayers) {
                const bt = bl.getTileAt(tx, ty);
                if (bt && bt.collides) { blocked = true; break; }
            }
            }
            this.navGrid[ty][tx] = blocked ? 1 : 0;
        }
        }

        /* 把网格挂到场景，Enemy 可以直接用 */
        this.pathfinder = new EasyStar.js();           // ⇠ 使用易上手的 A* 库
        this.pathfinder.setGrid(this.navGrid);
        this.pathfinder.setAcceptableTiles([0]);       // 0 = 可走
        this.pathfinder.enableDiagonals();             // 允许斜向（可选）

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

    // 在Game类中修改addNPC方法
    addNPC(x, y, name, dialoguePrompt) {
        // 将瓦片坐标转换为世界坐标
        const worldX = this.mapX + (x * this.tileSize) + (this.tileSize / 2);
        const worldY = this.mapY + (y * this.tileSize) + (this.tileSize / 2);
        
        const npc = new NPC(this, worldX, worldY, name, dialoguePrompt);
        this.npcGroup.add(npc);
        return npc;
    }
    

    // 新增方法：根据当前关卡生成NPC
    generateNPCsForLevel() {
        // 先清空现有的NPC
        this.npcGroup.clear(true, true);

        // 根据当前关卡生成NPC
        switch(this.currentLevelIndex) {
            case 1:
                this.addNPC(16, 6, 'technician', "Next, you will play the role of a Subway Technician, a skilled worker who used to maintain the underground train systems in Hong Kong. Calm, practical, and loyal, you have extensive knowledge of the city’s underground infrastructure. As the player interacts with the Subway Technician, you will help them navigate through the underground metro tunnels to avoid zombies and dangerous streets above. You will also help repair the player's vehicle and offer advice on how to conserve fuel and resources.");
                this.addNPC(8, 5, 'police', "Next, you will play the role of a Police Captain, a highly disciplined and strategic individual who once served in Hong Kong's police force. As the player interacts with you, you will provide leadership and tactical advice during attacks, ensuring the team’s safety. You are authoritative, level-headed, and always ready to make tough decisions. Guide the player through dangerous situations and help them stay organized in their journey toward safety.");
                break;
            case 2:
                this.addNPC(5, 3, 'merchant', "Next, you will play the role of a Traitor Merchant, a cunning and self-serving individual who once ran a small business in Hong Kong. You are opportunistic, deceitful, and will do whatever it takes to secure your survival. As the player interacts with you, you will offer goods in exchange for their resources, but the prices will always be unfair. You may also attempt to steal from the player or manipulate them into making decisions that benefit you. However, your knowledge of the world’s remaining resources could still prove useful if the player is careful.");
                this.addNPC(8, 8, 'gangster', "Next, you will play the role of a Violent Gangster, a brutal and ruthless figure who once ran with Hong Kong’s underground gangs. You are aggressive, untrustworthy, and use force to get what you want. As the player interacts with you, you may offer help in the form of protection or extra resources, but only at the cost of your violent demands. You will push the player to make morally questionable decisions, and your actions can lead to conflict within the group or even betrayal.");
                break; 
        }
        
        console.log(`Level ${this.currentLevelIndex+1} NPCs generated:`, this.npcGroup.getChildren().length);
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

        /** 返回 0 → 被阻挡；返回 -1 → 可通行 */
        getTileAt (worldX, worldY) {

        /* ① 主层 */
        const t = this.levelLayer.getTileAtWorldXY(worldX, worldY, true);
        if (t && t.collides) return 0;

        /* ② building / sidebuilding */
        for (const bl of this.blockLayers) {
            const tile = bl.getTileAtWorldXY(worldX, worldY, true);
            if (tile && tile.collides) return 0;
        }
        return -1;          // 没命中，说明格子可走
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
            // console.log('当前帮助的NPC列表:', this.player.helpedNPCs); // 调试输出
            // 获取救助的NPC信息
            const totalHelped = this.player.helpedNPCs.length;
            const helpedTypes = {
                doctor: this.player.helpedNPCs.filter(n => n === 'doctor').length,
                police: this.player.helpedNPCs.filter(n => n === 'police').length,
                merchant: this.player.helpedNPCs.filter(n => n === 'merchant').length,
                chef: this.player.helpedNPCs.filter(n => n === 'chef').length,
                technician: this.player.helpedNPCs.filter(n => n === 'technician').length,
                gangster: this.player.helpedNPCs.filter(n => n === 'gangster').length
            };

            // 判断结局类型
            let endingText = '';
            let endingColor = '#FFFFFF';
            let endingTitle = '';

            // 结局1: 救助所有NPC (完美结局)
            if (totalHelped >= 4 && helpedTypes.doctor && helpedTypes.police && helpedTypes.technician && !helpedTypes.merchant ) {
                endingTitle = 'Perfect Ending: The Dawn of Hope';
                endingText = "You and all the kind-hearted survivors successfully escaped the death city.\nThe doctor invented a potion at the shelter, restoring the city's health.\nYou built a new community, becoming a beacon of hope in the apocalypse.";
                endingColor = '#FFD700'; // 金色
            }
            // 结局2: 救助医生和警察 (好结局)
            else if (helpedTypes.doctor && helpedTypes.police) {
                endingTitle = 'Good Ending: Order and Healing';
                endingText = "With the help of the doctor and the police, you successfully escaped.\nThough the RV was slightly damaged, the doctor's medical knowledge and the police's tactical\ncommand kept you safe as you reached the shelter.";
                endingColor = '#00FF00'; // 绿色
            }
            // 结局3: 救助医生和技师 (技术结局)
            else if (helpedTypes.doctor && helpedTypes.technician) {
                endingTitle = 'Mechanics and Medicine';
                endingText = "The doctor's medical knowledge and the technician's technical skills helped you\nbarely keep the RV running. Though a lack of protection led to some loss of supplies,\nthe power of technology guided you to a safe refuge.";
                endingColor = '#ADD8E6'; // 浅蓝色
            }
            // 结局4: 只救助警察 (军事结局)
            else if (helpedTypes.police) {
                endingTitle = 'Two Lonly Wolves';
                endingText = "Despite the lack of medical support, which left you battered, the police's assistance\nand the combat skills they taught you turned you into a lone wolf survivor\nin the apocalypse.";
                endingColor = '#808080'; // 灰色
            }
            // 结局5: 救助了危险NPC (背叛结局)
            else if (helpedTypes.chef && !helpedTypes.police) {
                endingTitle = 'Betrayal: A Fatal Mistake';
                endingText = 'You horrifiedly discover that, aside from the chef, everyone else is bloodied and\nlying on the RV, while the chef stands motionless, staring at you\nwith a kitchen knife in hand...';
                endingColor = '#FF0000'; // 红色
            }
            // 结局6: 救助了厨师和警察 (平安结局)
            else if (helpedTypes.chef && helpedTypes.police) {
                endingTitle = 'Safe Ending: Protection and Balance';
                endingText = 'With the protection of the police,\nyou successfully left the death city.\nNothing happened on the road...';
                endingColor = '#00BFFF'; // 深天蓝色
            }
            // 结局7: 救助医生但没有商人 (药剂结局)
            else if (helpedTypes.doctor && !helpedTypes.merchant) {
                endingTitle = 'Potion Ending: Saving the World';
                endingText = "The doctor's medical knowledge allowed you to invent a potion that saved the world,\nhelping survivors regain their health. Ultimately,\nyou established a new order at the shelter.";
                endingColor = '#32CD32'; // 石榴红
            }
            // 结局8: 救助医生和商人 (背叛结局)
            else if (helpedTypes.doctor && helpedTypes.merchant) {
                endingTitle = 'Betrayal: No Hope';
                endingText = "The merchant made off with all the money from the RV,\npreventing the doctor from creating the potion. Your hopes were shattered,\nand the merchant's greed plunged you into despair.";
                endingColor = '#FF4500'; // 橙红色
            }
            // 结局9: 独自逃生 (孤独结局)
            else {
                endingTitle = 'Lonely Ending: One Survivor';
                endingText = "You chose not to trust anyone and drove the RV away on your own.\nAfter running out of fuel, you were stranded on an abandoned highway.\nSolitude and despair slowly consumed your sanity...\nAt least, you’re still alive.";
                endingColor = '#FFFFFF'; // 白色
            }
            // 显示统计信息
            const statsText = `救助人数: ${totalHelped}\n声誉值: ${this.player.reputation}\n\n医生: ${helpedTypes.doctor}\n警察: ${helpedTypes.police}\n技师: ${helpedTypes.technician}\n危险人物: ${helpedTypes.chef + helpedTypes.gangster}`;
            
            this.gameOverText
                .setFont('Zombie')
                .setText([
                    endingTitle,
                    '',
                    endingText,
                    '',
                    statsText
                ])
                .setColor(endingColor)
                .setFontSize(12)
                .setStroke('#222222', 3);
            
        } else {
            this.gameOverText.setText('Game Over')
                .setColor('#FF0000').setFont('Zombie').setFontSize('30pt');
        }
        
    this.gameOverText.setVisible(true);
        }

        /** 重新为 blockLayers 和玩家建立碰撞；先移除旧的，再添加新的 */
        setupBlockColliders () {

            /* 1. 清掉上一关 / 上一次重建留下的 collider */
            this.blockColliders.forEach(c => this.physics.world.removeCollider(c));
            this.blockColliders.length = 0;

            /* 2. 给当前关卡的每个 blockLayer 建 collider */
            this.blockLayers.forEach(layer => {
                const col = this.physics.add.collider(this.player, layer);
                this.blockColliders.push(col);

                if (this.enemyGroup) {
                    const ec = this.physics.add.collider(this.enemyGroup, layer);
                    this.blockColliders.push(ec);
                }
                if (this.npcGroup) {
                    const nc = this.physics.add.collider(this.npcGroup, layer);
                    this.blockColliders.push(nc);
                }
            });
    }
}
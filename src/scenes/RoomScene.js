import ASSETS from '../assets.js';
import Player from '../gameObjects/Player.js';
import Enemy  from '../gameObjects/Enemy.js'; 
import Coin   from '../gameObjects/Coin.js'; 

export class RoomScene extends Phaser.Scene {
    constructor() {
        super('RoomScene');
        this.blockLayers = [];   // 存储所有阻挡层
        this.blockColliders = []; // 存储碰撞器引用
    }
        // 新增：接收参数
    init(data) {
        // data.gameScene 就是我们刚才从 GameScene 传过来的实例
        this.gameScene = data.gameScene;
        this.roomType = data.roomType || 'default'; // 接收房间类型
    }
    create() {
                // 根据房间类型设置不同配置
        switch(this.roomType) {
            case 'restaurant':
                this.initRestaurant();
                break;
            case 'hospital':
                this.initHospital();
                break;
            case 'gasstation':
                this.initGasstation();
                break;
            case 'bar':
                this.initBar();
                break;
            case 'library':
                this.initLibrary();
                break;
            default:
                this.initDefaultRoom();
        }
        this.initVariables();
        this.initAnimations();
        this.initInput();
        this.initMap();
        this.initPlayer();
        this.zombieGroup = this.add.group(); 
        this.supplyGroup = this.add.group();
        this.initPhysics();
        this.initCamera();
        this.initGameUi();
        this.spawnZombies();
        this.spawnSupplies();

            // 播放背景音乐（如果有）
        if(this.backgroundMusic) {
            this.sound.play(this.backgroundMusic, { loop: true });
        }

        //触发随机事件然后更新属性
        this.triggerRandomEvent();
        this.refreshHearts();

        this.setupBlockColliders(); // 初始化碰撞系统
    }

    update(time, delta) {
        if (!this.gameStarted) return;

        this.player.update(delta);
        this.cameras.main.centerOnX(this.player.x);
    }

    initVariables() {
        this.gameStarted = true;
        this.centreX = this.scale.width * 0.5;
        this.centreY = this.scale.height * 0.5;

        this.tileIds = {
            player: 96,
            walls: [97, 98, 99],  // 根据实际情况调整墙壁的 tile ID
            door: 90  // 根据实际情况调整门的 tile ID
        };

        this.tileSize = 32;
        this.halfTileSize = this.tileSize * 0.5;

        // 假设室内地图的尺寸，根据实际情况调整
        this.mapHeight = 10;
        this.mapWidth = 20;

        this.mapX = this.centreX - (this.mapWidth * this.tileSize * 0.5);
        this.mapY = this.centreY - (this.mapHeight * this.tileSize * 0.5);

        this.health = this.gameScene.health;
        this.hunger = this.gameScene.hunger;
        this.fuel   = this.gameScene.fuel;

        this.map;
        this.groundLayer;
        this.levelLayer;
    }

    initAnimations() {
        // 如果室内场景有特定动画，在这里添加
        // 目前先保留空，可参考 Game 场景的 initAnimations 方法添加
    }

    initInput() {
        // 继续让玩家能用光标键走动
        this.cursors = this.input.keyboard.createCursorKeys();

        // 按 ESC 退出房间
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.stop('RoomScene');
            const game = this.scene.get('Game');
            
            game.closePopup();

            this.scene.setVisible(true, 'Game');
            this.scene.resume('Game');
            game.input.keyboard.enabled = true;
            game.gameStarted = true;
        });
    }

    initMap() {
        /* ---- 1. 创建 tilemap ---- */
        this.blockLayers = []; // 清空旧数据
        this.map = this.make.tilemap({ key: this.mapKey });

        /* ---- 2. 依据 tilemap 动态设置尺寸与偏移 ---- */
        this.mapWidth = this.map.width;     // tile 数
        this.mapHeight = this.map.height;
        this.mapX = this.centreX - (this.mapWidth * this.tileSize * 0.5);
        this.mapY = this.centreY - (this.mapHeight * this.tileSize * 0.5);

        /* ---- 3. 自动加载第一张 tileset ---- */
        const ts = this.map.tilesets[0];
        const tileset = this.map.addTilesetImage(ts.name, ts.name);

        /* ---- 4. 创建图层 ---- */
        this.groundLayer = this.map.createLayer('Other', tileset, this.mapX, this.mapY);
        
        // 初始化墙体碰撞层
        if (this.map.layers.some(l => l.name === 'Wall')) {
            const wallLayer = this.map.createLayer('Wall', tileset, this.mapX, this.mapY);
            wallLayer.setCollisionByExclusion([-1, 0]); // 排除空白瓦片
            this.blockLayers.push(wallLayer);
        }

        // 初始化边缘碰撞层
        if (this.map.layers.some(l => l.name === 'bianyuan')) {
            const borderLayer = this.map.createLayer('bianyuan', tileset, this.mapX, this.mapY);
            borderLayer.setCollisionByExclusion([-1, 0]); // 排除空白瓦片
            this.blockLayers.push(borderLayer);
        }

        /* ---- 6. 用墙层遍历，替代原 levelLayer ---- */
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tile = this.wallLayer?.getTileAt(x, y);
                if (!tile) continue;

                if (tile.index === this.tileIds.player) {
                    tile.index = -1;           // 玩家起点
                } else if (tile.index === this.tileIds.door) {
                    tile.index = -1;           // 门格子
                }
            }
        }
    }

    setupBlockColliders() {
        // 1. 清除现有碰撞器
        this.blockColliders.forEach(c => this.physics.world.removeCollider(c));
        this.blockColliders.length = 0;

        // 2. 为每个阻挡层创建碰撞器
        this.blockLayers.forEach(layer => {
            // 玩家碰撞
            const playerCol = this.physics.add.collider(this.player, layer);
            this.blockColliders.push(playerCol);

            // 丧尸碰撞
            if (this.zombieGroup) {
                const zombieCol = this.physics.add.collider(this.zombieGroup, layer);
                this.blockColliders.push(zombieCol);
            }

            // 物资碰撞（如果需要）
            if (this.supplyGroup) {
                const supplyCol = this.physics.add.collider(this.supplyGroup, layer);
                this.blockColliders.push(supplyCol);
            }
        });

        console.log(`已建立 ${this.blockColliders.length} 个碰撞器`);
    }

    initRestaurant() {
        this.mapKey = ASSETS.tilemapTiledJSON.restaurant.key; // 餐厅地图
        this.supplyTypes = [
            { name: "The restaurant's refrigerator suddenly loses power, causing food to spoil.\nHealth - 10", stat: "health", delta: -10 },
            { name: " A hot meal is available.\nVitality + 20", stat: "hunger", delta: 20 },
            { name: " You find a spare gas canister.\nfuel + 10", stat: "fuel", delta: 10 }
        ];
        // this.backgroundMusic = 'restaurant-bgm';
        this.playerStart = { x: 15, y: 16 }; // 初始位置
    }

    initLibrary() {
        this.mapKey = ASSETS.tilemapTiledJSON.library.key; // 医院地图
        this.supplyTypes = [
            { name: "You find a first-aid manual on a shelf.\nHealth + 10", stat: "health", delta: 10 },
            { name: "You spent some time but found nothing...\nVitality - 5", stat: "hunger", delta: -5 }
        ];
        // this.backgroundMusic = 'hospital-bgm';
        this.playerStart = { x: 12, y: 8 }; // 初始位置
    }

    initGasstation() {
        this.mapKey = ASSETS.tilemapTiledJSON.gasstation.key;
        this.supplyTypes = [
            { name: "Found fuel can.\nFuel + 10", stat: "fuel", delta: 10 },
            { name: "The fuel pump malfunctions, spilling gasoline.\nHealth - 10", stat: "health", delta: -10 },
            { name: "The convenience store offers ready-to-eat meals.\nVitality + 10", stat: "hunger", delta: 10 }

        ];
        // this.backgroundMusic = 'gasstation-bgm';
        this.playerStart = { x: 12, y: 8 }; // 初始位置
    }

    initBar() {
        this.mapKey = ASSETS.tilemapTiledJSON.bar.key;
        this.supplyTypes = [
            { name: "Ouch! The liquor cabinet falls over, spilling glass bottles.\nHealth - 10", stat: "health", delta: -10 },
            { name: "Snacks are available.\nVitality + 5", stat: "hunger", delta: 5 },
            { name: "You find fuel for the bar's backup generator.\nFuel + 5", stat: "fuel", delta: 5 },
        ];
        // this.backgroundMusic = 'gasstation-bgm';
        this.playerStart = { x: 20, y: 4 }; // 初始位置
    }

    initHospital() {
        this.mapKey = ASSETS.tilemapTiledJSON.hospital.key;
        this.supplyTypes = [
            { name: "You find a medicine storage room.\nHealth + 15", stat: "health", delta: 15 },
            { name: "The hospital cafeteria provides meals.\nVitality + 15", stat: "hunger", delta: 5 },
            { name: "You find backup fuel.\nFuel + 5", stat: "fuel", delta: 5 },
        ];
        // this.backgroundMusic = 'gasstation-bgm';
        this.playerStart = { x: 12, y: 8 }; // 初始位置
    }

    initDefaultRoom() {
        this.mapKey = ASSETS.tilemapTiledJSON.room711.key;
        this.supplyTypes = [
            { name: "You discover an expired bottle of disinfectant behind the counter.\nHealth + 10", stat: "health", delta: 10 },
            { name: "A packet of instant rice is found on the shelf.\nVitality + 15", stat: "hunger", delta: 15 },
            { name: "There's a backup generator in the store.\nFuel + 10", stat: "fuel", delta: 10 }
        ];
        // this.backgroundMusic = 'default-bgm';
        this.playerStart = { x: 6, y: 8 }; // 初始位置
    }


    initPlayer() {
        const startX = this.playerStart?.x || 4;
        const startY = this.playerStart?.y || 7;

        const worldX = this.mapX + (startX * this.tileSize);
        const worldY = this.mapY + (startY * this.tileSize);

        this.player = new Player(this, startX, startY);
        this.player.enterCharacterMode();
    }

    initPhysics() {
        // 玩家 与 丧尸 碰撞：调用 onZombieCollision
        this.physics.add.overlap(
            this.player,
            this.zombieGroup,
            (player, zombie) => {
                // 更精确的距离检测
                const distance = Phaser.Math.Distance.Between(
                    player.x, player.y,
                    zombie.x, zombie.y
                );
                
                // 只有当距离小于阈值时才触发碰撞
                if (distance < 20) { // 20像素的碰撞距离
                    this.onZombieCollision(player, zombie);
                }
            },
            null,
            this
        );

        // 玩家 与 物资点 碰撞：调用 onSupplyCollision
        this.physics.add.overlap(
        this.player,
        this.supplyGroup,
        this.onSupplyCollision,
        null,
        this
        );
    }

    initCamera() {
        this.cameras.main.setZoom(3);
        this.cameras.main.setBounds(this.mapX, this.mapY, this.mapWidth * this.tileSize, this.mapHeight * this.tileSize);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    }

    initDefault () {
    this.mapKey = ASSETS.tilemapTiledJSON.indoor1.key; // 默认室内地图
    this.supplyTypes = [
        { name:'You found a sandwich in 711 \n but unfortunately it is expired. ', stat:'health', delta:-15 }
    ];
    }

    initGameUi() {
        // 获取摄像头视图中心坐标
        const zoomFactor = this.cameras.main.zoom;
        const W = this.scale.width;
        const H = this.scale.height;

        const rows = [ H/2 + 130, H/2 + 150, H/2 + 170 ];
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
    }
    // 在 RoomScene 里新增这个方法：
    triggerRandomEvent() {
        // 随机选一条
        const evt = Phaser.Math.RND.pick(this.gameScene.randomEvents);
        // 应用到 gameScene.player 上
        Object.entries(evt.effect).forEach(([stat, delta]) => {
            const old = this.gameScene.player[stat];
            this.gameScene.player[stat] = Phaser.Math.Clamp(old + delta, 0, 100);
            // 也记录到玩家身上
            if (!this.gameScene.player.eventHistory) this.gameScene.player.eventHistory = [];
            this.gameScene.player.eventHistory.push({ stat, delta, ts: Date.now() });
        });
        // 用 RoomScene 的 this.add.text 弹窗
        const msg = this.add.text(
            this.scale.width/2, this.scale.height/2,
            evt.text,
            { font:'24px Arial', fill:'#ffffff', backgroundColor:'#000000' }
        )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(500);
        this.time.delayedCall(1500, () => msg.destroy());
    }
        /** 碰到丧尸，掉血并销毁丧尸 */
    onZombieCollision(player, zombie) {
    this.gameScene.player.hit(); 
    this.refreshHearts();
    zombie.destroy();
    }

    /** 碰到物资点，调整对应属性、弹窗提示并销毁物资 */
    onSupplyCollision(player, supply) {
        const { name, stat, delta } = supply.supplyInfo;
        // 更新全局玩家属性（RoomScene UI 用 gameScene.player 渲染）
        this.gameScene.player.adjustStat(stat, delta);
        // 弹文字提示
        const msg = this.add.text(
            this.scale.width/2, this.scale.height/2,
            `${name}health${delta>0?'+':''}${delta}`,
            { font:'24px Arial', fill:'#ffffff', backgroundColor:'#000000' }
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(500);
        this.time.delayedCall(1500, () => msg.destroy());
        supply.destroy();
        this.refreshHearts();  // 刷新心形条 :contentReference[oaicite:14]{index=14}:contentReference[oaicite:15]{index=15}
    }


    refreshHearts() {
    ['health','hunger','fuel'].forEach(stat => {
        const val = Math.ceil(this.gameScene.player[stat] / 10);
        this.heartGroups[stat].forEach((spr, i) => {
        spr.setVisible(i < val);
        });
    });
    }

    spawnZombies() {
        const count = Phaser.Math.Between(1, 3);
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(1, this.mapWidth - 2);
            const y = Phaser.Math.Between(1, this.mapHeight - 2);
            const zombie = new Enemy(this, x, y); 
            this.zombieGroup.add(zombie);
        }
        }

    spawnSupplies() {
        const count = Phaser.Math.Between(1, 3);
        for (let i = 0; i < count; i++) {
        const x = Phaser.Math.Between(1, this.mapWidth - 2);
        const y = Phaser.Math.Between(1, this.mapHeight - 2);
        const info = Phaser.Math.RND.pick(this.supplyTypes);
        const supply = new Coin(this, x, y);
        supply.supplyInfo = info;
        this.supplyGroup.add(supply);
        }
    }

    getMapOffset() 
    {
        return {
            x: this.mapX + this.halfTileSize,
            y: this.mapY + this.halfTileSize,
            width: this.mapWidth,
            height: this.mapHeight,
            tileSize: this.tileSize
        };
    }
    getTileAt (worldX, worldY)
{   
    if (!this.wallLayer) return -1;      // 保险

    // false 表示若取不到 tile 则返回 null 而不创建
    const tile = this.wallLayer.getTileAtWorldXY(worldX, worldY, false);

    // 无瓦片视为可走通道，用 -1 与 Enemy 原逻辑保持一致
    return tile ? tile.index : -1;
}

}
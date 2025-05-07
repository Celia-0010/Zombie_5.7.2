import ASSETS from '../assets.js';
import Player from '../gameObjects/Player.js';
import Enemy  from '../gameObjects/Enemy.js'; 
import Coin   from '../gameObjects/Coin.js'; 

export class RoomScene extends Phaser.Scene {
    constructor() {
        super('RoomScene');
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
            case 'medical':
                this.initMedicalRoom();
                break;
            case 'Restaurant':
                this.initRestaurant();
                break;
            case 'GasStation':
                this.initGasStation();
                break;
            default:
                this.initDefault();
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


        //触发随机事件然后更新属性
        this.triggerRandomEvent();
        this.refreshHearts();
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

    initMedicalRoom() {
        // 医疗室特有设置
        this.mapKey = ASSETS.tilemapTiledJSON.indoor2.key
        this.supplyTypes = [
            { name: 'A doctor takes care of you, restoring 30 health and reducing hunger by 10.', stat: 'health', delta: +20 },
            { name: 'The hospital is out of supplies, and you can’t find proper treatment, losing 10 health.', stat: 'health', delta: -10 },
            { name: 'You find a discarded car at the hospital, gaining 15 fuel.', stat: 'fuel', delta: +15 }
        ];
        // 可以添加医疗室特有逻辑
    }
    
    initRestaurant() {
        // 厨房特有设置
        this.mapKey = ASSETS.tilemapTiledJSON.indoor1.key;
        this.supplyTypes = [
            { name: 'You find a hearty meal at the restaurant, restoring 10 health and reducing hunger by 15.', stat: 'hunger', delta: +15 },
            { name: 'The kitchen has issues, and you accidentally eat unhygienic food, losing 10 health.', stat: 'health', delta: -10 }
        ];
    }

    initGasStation() {
        this.mapKey = 'indoor1-map';
        this.supplyTypes = [
            { name: 'You find fuel at the gas station, increasing fuel by 30.', stat: 'fuel', delta: +30},
            { name: 'The fuel pump at the gas station is broken, and you only get half the fuel, gaining 10 fuel and losing 5 gold.', stat: 'fuel', delta: +10}
        ]
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
            if (game.popupElems) {
                game.popupElems.forEach(o => o.destroy());
                game.popupElems = null;
            }
            this.scene.setVisible(true, 'Game');
            this.scene.resume('Game');
        });
    }

   initMap () {

    /* ---- 1. 创建 tilemap ---- */
    this.map = this.make.tilemap({ key: this.mapKey });

    /* ---- 2. 依据 tilemap 动态设置尺寸与偏移 ---- */
    this.mapWidth  = this.map.width;     // tile 数
    this.mapHeight = this.map.height;
    this.mapX = this.centreX - (this.mapWidth  * this.tileSize * 0.5);
    this.mapY = this.centreY - (this.mapHeight * this.tileSize * 0.5);

    /* ---- 3. 自动加载第一张 tileset ---- */
    const ts = this.map.tilesets[0];
    const tileset = this.map.addTilesetImage(ts.name, ts.name);

    /* ---- 4. 创建图层（JSON 里实际叫 Other / Wall / bianyuan） ---- */
    this.groundLayer = this.map.createLayer('Other',    tileset, this.mapX, this.mapY);
    this.wallLayer   = this.map.createLayer('Wall',     tileset, this.mapX, this.mapY);
    this.borderLayer = this.map.createLayer('bianyuan', tileset, this.mapX, this.mapY);


    /* ---- 6. 用墙层遍历，替代原 levelLayer ---- */
    for (let y = 0; y < this.mapHeight; y++) {
        for (let x = 0; x < this.mapWidth; x++) {
            const tile = this.wallLayer.getTileAt(x, y);
            if (!tile) continue;

            if (tile.index === this.tileIds.player) {
                tile.index = -1;           // 玩家起点，如需可记录
            } else if (tile.index === this.tileIds.door) {
                tile.index = -1;           // 门格子，如需可在此生成 Door
            }
        }
    }
}


    initPlayer() {
        const startX = 4;
        const startY = 7;
        this.player = new Player(this, startX, startY);
        this.player.enterCharacterMode();
    }

    initPhysics() {
        // 玩家 与 丧尸 碰撞：调用 onZombieCollision
        this.physics.add.overlap(
        this.player,
        this.zombieGroup,
        this.onZombieCollision,
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
        { name:'随机物资', stat:'fuel', delta:+15 }
    ];
    }

    initGameUi() {
        // 获取摄像头视图中心坐标
        const zoomFactor = this.cameras.main.zoom;
        const W = this.scale.width;
        const H = this.scale.height;

        const rows = [ H/2 + 130, H/2 + 150, H/2 + 170 ];
        const stats = ['health','hunger','fuel'];
        this.heartGroups = {};

        stats.forEach((stat,i) => {
            this.add.text(
                W/2 - 310, rows[i] - 13,
                stat.charAt(0).toUpperCase() + stat.slice(1),
                { font:'16px Arial', fill:'#ffffff',
                stroke:'#000000', strokeThickness:4 }
            )
            .setScrollFactor(0)
            .setDepth(100);
              // 心形
              this.add.image(
                W / 2,
                H / 2 + 135,
                'hp'
            )
            .setScrollFactor(0)
            .setDepth(90)          // 要低于心形(100) 高于地图
            .setDisplaySize(350, 140);
            this.heartGroups[stat] = [];
                for (let j = 0; j < 10; j++) {
                    const img = this.add.image(
                    W/2 - 250 + j*30, rows[i], 'heart'
                    )
                    .setScrollFactor(0)
                    .setDepth(100)
                    .setVisible(false);

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
        `获得物资：${name}，属性值${delta>0?'+':''}${delta}`,
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

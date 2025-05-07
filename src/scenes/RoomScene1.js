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
    }
    create() {
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
        this.supplyTypes = [
            { name: '修理包',   stat: 'health', delta: +20 },
            { name: '食物补给', stat: 'hunger', delta: +20 },
            { name: '燃料补给', stat: 'fuel',   delta: +20 }
            ];
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

    // 根据JSON地图调整tileIds
    this.tileIds = {
        player: 96,
        walls: [211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 
                226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238], // Wall层的tile IDs
        door: 90  // 根据实际情况调整门的tile ID
    };

    this.tileSize = 32;
    this.halfTileSize = this.tileSize * 0.5;

    // 根据JSON地图调整尺寸
    this.mapHeight = 20;  // JSON中height为20
    this.mapWidth = 40;   // JSON中width为40

    this.mapX = this.centreX - (this.mapWidth * this.tileSize * 0.5);
    this.mapY = this.centreY - (this.mapHeight * this.tileSize * 0.5);

    this.health = this.gameScene.health;
    this.hunger = this.gameScene.hunger;
    this.fuel   = this.gameScene.fuel;

    this.map;
    this.groundLayer;
    this.wallLayer;
    this.borderLayer;
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

initMap() {
    // 加载室内地图
    this.map = this.make.tilemap({ key: ASSETS.tilemapTiledJSON.indoor.key });
    
    // 设置碰撞 - 使用Wall层的tile IDs
    this.map.setCollision(this.tileIds.walls);
    
    const tileset = this.map.addTilesetImage(ASSETS.spritesheet.tiles.key);

    // 创建背景层（Other层）
    this.groundLayer = this.map.createLayer('Other', tileset, this.mapX, this.mapY);
    
    // 创建墙壁层（Wall层）
    this.wallLayer = this.map.createLayer('Wall', tileset, this.mapX, this.mapY);
    
    // 创建边缘层（bianyuan层）
    this.borderLayer = this.map.createLayer('bianyuan', tileset, this.mapX, this.mapY);

    // 确保Wall层有碰撞
    if (this.wallLayer) {
        this.wallLayer.setCollisionByProperty({ collides: true });
    }

    // 调整图层深度
    if (this.groundLayer) this.groundLayer.setDepth(0);
    if (this.wallLayer) this.wallLayer.setDepth(1);
    if (this.borderLayer) this.borderLayer.setDepth(2);
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

    getTileAt(x, y) 
    {
        const tile = this.wallLayer.getTileAtWorldXY(x, y, true);
        return tile ? this.tileIds.walls.indexOf(tile.index) : -1;
    }
}

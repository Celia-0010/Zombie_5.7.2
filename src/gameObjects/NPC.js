import ASSETS from '../assets.js';
import ANIMATION from '../animation.js';
import DialogueSystem from '../gameObjects/DialogueSystem.js';

export default class NPC extends Phaser.Physics.Arcade.Sprite {
    moveSpeed = 1; // NPC 移动的速度
    isRejecting = false; // 用于表示是否正在远离玩家
    frameDuration = 0;
    accumulator = 0;
    target = { x: 0, y: 0 }; // NPC的目标位置
    path      = [];   // A* 规划出的格子序列
    pathIndex = 0;    // 当前走到 path 的第几个节点
    repathCD  = 0;    // 路径重算冷却 (ms)
    chaseStep = 1;    // 一帧移动多少像素，可调
    moveAwayEvent = null; // 新增：存储移动事件的引用


    constructor(scene, x, y, name, dialoguePrompt) {
        super(scene, x, y, ASSETS.spritesheet.characters.key, 13); // 假设 NPC 使用 characters 的贴图

        // NPC 基础信息
        this.name = name; 
        this.dialoguePrompt = dialoguePrompt;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.target = { x: x, y: y };
        this.setPosition(x, y);
        this.setCollideWorldBounds(true);
        this.setDepth(100);
        this.scene = scene;

        // 设置 NPC 可交互
        this.setInteractive();

        // 监听点击事件以进行交互
        this.on('pointerdown', () => {
            this.handleInteraction();  // 调用新的交互方法
        });
    }

    // 新增：销毁NPC时的清理方法
    destroy() {
        // 清除移动事件
        if (this.moveAwayEvent) {
            this.moveAwayEvent.remove();
            this.moveAwayEvent = null;
        }
        
        // 调用父类的destroy方法
        super.destroy();
    }

    update (delta, player) {
        if (this.isRejecting) {
            // 如果 NPC 正在远离玩家，则跳过靠近玩家的逻辑
            return; // 不再执行接近玩家的逻辑
        }
        this.moveTowardsPlayer(player, delta); // 如果不在拒绝状态，执行靠近玩家的逻辑
    }

    // 将靠近玩家的逻辑提取为一个单独的方法
    moveTowardsPlayer(player, delta) {
        /* -------- 1 计算/更新 A* 路径 -------- */
        this.repathCD -= delta;
        if (this.repathCD <= 0 || this.path.length === 0) {
            this.computePathToPlayer(player);
            this.repathCD = 600;   // 每 0.6 秒重新寻路
        }

        /* -------- 2 按路径逐格移动 -------- */
        if (this.path.length) {
            const next = this.path[this.pathIndex];
            const tileSize = this.scene.tileSize;
            const targetX = this.scene.mapX + next.x * tileSize + this.scene.halfTileSize;
            const targetY = this.scene.mapY + next.y * tileSize + this.scene.halfTileSize;

            // 计算移动方向
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            
            // 根据移动方向播放对应动画
            if (Math.abs(dx) > Math.abs(dy)) {
                // 水平移动为主
                if (dx > 0) {
                    this.anims.play('npc-right', true); // 向右移动
                } else {
                    this.anims.play('npc-left', true);  // 向左移动
                }
            } else {
                // 垂直移动为主
                if (dy > 0) {
                    this.anims.play('npc-down', true);  // 向下移动
                } else {
                    this.anims.play('npc-up', true);    // 向上移动
                }
            }

            const step = this.chaseStep;
            this.x = this.MoveTowards(this.x, targetX, step);
            this.y = this.MoveTowards(this.y, targetY, step);

            // 走到节点中心后继续下一个
            if (Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY) < 1) {
                this.pathIndex++;
                if (this.pathIndex >= this.path.length) {
                    this.path.length = 0;
                    this.anims.stop(); // 到达目的地后停止动画
                }
            }
        } else {
            // 没有路径时停止动画
            this.anims.stop();
        }
    }


    // NPC 被点击时触发的交互逻辑
    handleInteraction() {
        // 确保场景中有玩家引用
        if (!this.scene.player) {
            console.error('Player reference not found in scene');
            return;
        }

        // 销毁现有的对话系统（如果有）
        if (this.scene.dialogueSystem) {
            this.scene.dialogueSystem.closeDialogue();
            this.scene.dialogueSystem = null;
        }

        // 创建新的对话系统实例
        try {
            this.scene.dialogueSystem = new DialogueSystem(this.scene, this);
            this.scene.dialogueSystem.createDialogueBox();
            this.scene.dialogueSystem.showDialogue();
            
            // 添加调试信息
            console.log(`Dialogue with ${this.name} started`);
        } catch (error) {
            console.error('Failed to create dialogue:', error);
        }
    }

    rejectAndMoveAway() {
        if (this.isRejecting) return;

        // 播放拒绝音效
        if (this.scene.sound.get('reject-sound')) {
            this.scene.sound.play('reject-sound'); // 确保在preload中加载了这个音效
        } else {
            console.error('拒绝音效未加载');
        }

        this.isRejecting = true;

        // 清除之前的移动事件（如果有）
        if (this.moveAwayEvent) {
            this.moveAwayEvent.remove();
        }

        // 设置目标位置为地图左边，假设向左移动200像素
        const mapOffset = this.scene.getMapOffset();
        this.target.x = this.x - 3000; // 向左移动3000像素
        this.target.y = this.y;

        console.log('目标位置:', this.target);

        // 增加移动速度
        this.moveSpeed = 1; // 比平常移动更快

        // 立即开始移动
        this.moveAwayEvent = this.scene.time.addEvent({
            delay: 10, // 每10ms更新一次
            callback: () => {
                // 如果NPC还没到达目标位置，继续移动
                let moving = false; // 用于判断是否有移动

                // 向左移动
                if (this.x > this.target.x) {
                    this.x -= this.moveSpeed; // 向左移动
                    this.anims.play(ANIMATION.npc.left.key, true); // 播放向左移动的动画
                    moving = true;
                }

                // 如果 NPC 到达目标位置，停止移动
                if (!moving) {
                    this.isRejecting = false; // 停止移动
                }
            },
            loop: true // 持续循环
        });
    }
    MoveTowards(current, target, maxDelta) {
        if (Math.abs(target - current) <= maxDelta) return target;
        return current + Math.sign(target - current) * maxDelta;
        }
    
    computePathToPlayer(player) {
        // 场景里若没 pathfinder，直接返回
        if (!this.scene.pathfinder) return;

        const ts = this.scene.tileSize;
        const gridWidth = this.scene.navGrid[0].length;
        const gridHeight = this.scene.navGrid.length;

        // 计算NPC的网格坐标
        let sx = Math.floor((this.x - this.scene.mapX) / ts);
        let sy = Math.floor((this.y - this.scene.mapY) / ts);
        
        // 计算玩家的网格坐标
        let gx = Math.floor((player.x - this.scene.mapX) / ts);
        let gy = Math.floor((player.y - this.scene.mapY) / ts);

        // 边界检查 - 确保坐标在网格范围内
        sx = Phaser.Math.Clamp(sx, 0, gridWidth - 1);
        sy = Phaser.Math.Clamp(sy, 0, gridHeight - 1);
        gx = Phaser.Math.Clamp(gx, 0, gridWidth - 1);
        gy = Phaser.Math.Clamp(gy, 0, gridHeight - 1);

        this.scene.pathfinder.findPath(sx, sy, gx, gy, path => {
            if (path && path.length > 1) {
                // 舍弃起点格
                this.path = path.slice(1);
                this.pathIndex = 0;
            } else {
                this.path.length = 0;
                console.warn("找不到路径或路径无效");
            }
        });
        this.scene.pathfinder.calculate();
    }

}

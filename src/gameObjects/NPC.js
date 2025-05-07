import ASSETS from '../assets.js';
import ANIMATION from '../animation.js';
import DialogueSystem from '../gameObjects/DialogueSystem.js';

export default class NPC extends Phaser.Physics.Arcade.Sprite {
    moveSpeed = 1; // NPC 移动的速度
    isRejecting = false; // 用于表示是否正在远离玩家
    frameDuration = 0;
    accumulator = 0;
    target = { x: 0, y: 0 }; // NPC的目标位置

    constructor(scene, x, y, name, portrait, personality, background) {
        super(scene, x, y, ASSETS.spritesheet.characters.key, 13); // 假设 NPC 使用 characters 的贴图

        // NPC 基础信息
        this.name = name; 
        this.portrait = portrait; 
        this.personality = personality; 
        this.background = background; 

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.mapOffset = scene.getMapOffset();
        this.target.x = this.mapOffset.x + (x * this.mapOffset.tileSize);
        this.target.y = this.mapOffset.y + (y * this.mapOffset.tileSize);
        this.setPosition(this.target.x, this.target.y);
        this.setCollideWorldBounds(true);
        this.setDepth(100);
        this.scene = scene;
        this.frameDuration = this.moveSpeed / this.mapOffset.tileSize;

        // 设置 NPC 可交互
        this.setInteractive();

        // 监听点击事件以进行交互
        this.on('pointerdown', () => {
            this.handleInteraction();  // 调用新的交互方法
        });
    }

    update (delta, player) {
        if (this.isRejecting) {
            // 如果 NPC 正在远离玩家，则跳过靠近玩家的逻辑
            return; // 不再执行接近玩家的逻辑
        }else{
            this.moveTowardsPlayer(player); // 如果不在拒绝状态，执行靠近玩家的逻辑
        }
    }

    // 将靠近玩家的逻辑提取为一个单独的方法
    moveTowardsPlayer(player) {
        // 获取NPC与玩家之间的距离
        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        // 如果距离小于一定阈值，NPC停止移动
        if (distance > 60 && distance < 400) {
            // 计算 NPC 朝向玩家的方向
            this.target.x = player.x;
            this.target.y = player.y;
        }

        // 计算到目标位置的距离
        const targetDistance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        if (targetDistance > 2) {
            // 计算玩家的偏移位置，稍微右下方
            this.target.x = this.target.x + 2; // 玩家位置右移50
            this.target.y = this.target.y + 2; // 玩家位置下移50

            // 计算 NPC 向目标方向的单位向量
            const direction = new Phaser.Math.Vector2(this.target.x - this.x, this.target.y - this.y).normalize();

            // 根据单位向量移动 NPC
            this.x += direction.x * this.moveSpeed;
            this.y += direction.y * this.moveSpeed;

            // 根据移动方向播放动画
            if (Math.abs(direction.x) > Math.abs(direction.y)) {
                if (direction.x > 0) {
                    this.anims.play(ANIMATION.npc.right.key, true); // 向右移动
                } else {
                    this.anims.play(ANIMATION.npc.left.key, true); // 向左移动
                }
            } else {
                if (direction.y > 0) {
                    this.anims.play(ANIMATION.npc.down.key, true); // 向下移动
                } else {
                    this.anims.play(ANIMATION.npc.up.key, true); // 向上移动
                }
            }
        }

    }

    // NPC 被点击时触发的交互逻辑
    handleInteraction() {
        // 如果对话系统不存在则创建
        if (!this.scene.dialogueSystem) {
            this.scene.dialogueSystem = new DialogueSystem(this.scene, this);
            this.scene.dialogueSystem.createDialogueBox();
        }
        
        // 切换对话框显示状态
        if (this.scene.dialogueSystem.dialogueBox.visible) {
            this.scene.dialogueSystem.closeDialogue();
        } else {
            this.scene.dialogueSystem.showDialogue();
        }
    }

    // NPC 向玩家展示对话内容
    async getDialogue(userInput) {
        const response = await this.callLLM(userInput); // 调用 LLM 系统返回对话内容
        return response;
    }

    // LLM接入：将NPC的背景、性格和玩家输入传递给后端并返回对话
    async callLLM(userInput) {
        const response = await fetch('/api/llm-dialogue', {
            method: 'POST',
            body: JSON.stringify({ npc: this, input: userInput }),
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        return data.dialogue;  // LLM返回的对话内容
    }

    rejectAndMoveAway() {
        // 播放拒绝音效
        if (this.scene.sound.get('reject-sound')) {
            this.scene.sound.play('reject-sound'); // 确保在preload中加载了这个音效
        } else {
            console.error('拒绝音效未加载');
        }

        this.isRejecting = true;

        // 设置目标位置为地图左边，假设向左移动200像素
        const mapOffset = this.scene.getMapOffset();
        this.target.x = this.x - 3000; // 向左移动3000像素
        this.target.y = this.y;

        console.log('目标位置:', this.target);

        // 增加移动速度
        this.moveSpeed = 1; // 比平常移动更快

        // 立即开始移动
        this.scene.time.addEvent({
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

}

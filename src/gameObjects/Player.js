import ASSETS from '../assets.js';
import ANIMATION from '../animation.js';

export default class Player extends Phaser.Physics.Arcade.Sprite
{
    frameDuration = 0;
    target = { x: 0, y: 0 };
    

    constructor(scene, x, y)
    {
        super(scene, x, y, ASSETS.spritesheet.vehicle.key,0,);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.mapOffset = scene.getMapOffset();
        this.target.x = this.mapOffset.x + (x * this.mapOffset.tileSize);
        this.target.y = this.mapOffset.y + (y * this.mapOffset.tileSize);
        this.setPosition(this.target.x, this.target.y);
        this.setCollideWorldBounds(true);
        this.setDepth(60);
        this.scene = scene;
        this.frameDuration = this.moveSpeed / this.mapOffset.tileSize;

        // —— 新增三项属性 & 事件历史 —— 
        this.health       = 100;
        this.fuel         = 100;
        this.hunger       = 100;
        this.eventHistory = [];

        // 是否在车内
        this.inVehicle = true;
        // 行走控制…
        this.moving = false;
        this.target = new Phaser.Math.Vector2(this.x, this.y);

        this.speed = 200;               // 像素/秒，可根据需求调速
        this.distanceAccumulator = 0; 
        this.body.setCollideWorldBounds(true);

        this.hitCooldown = 3000; // 冷却时间，单位为毫秒
        this.lastHitTime = 0;

        // set map boundaries
        this.mapLeft = this.mapOffset.x - (this.mapOffset.tileSize * 0.5);
        this.mapRight = this.mapOffset.x + (this.mapOffset.width * this.mapOffset.tileSize) - (this.mapOffset.tileSize * 0.5);

        this.helpedNPCs = []; // 记录帮助过的NPC名字
        this.reputation = 0;  // 声誉值（可选）
    }

    update(time, delta) {
      // 1) 读键盘
      const cursors = this.scene.cursors;
      let vx = 0, vy = 0;
      if (cursors.left.isDown)       vx = -this.speed;
      else if (cursors.right.isDown) vx =  this.speed;
      if (cursors.up.isDown)         vy = -this.speed;
      else if (cursors.down.isDown)  vy =  this.speed;

      // 2) 应用物理速度
      this.body.setVelocity(vx, vy);

      // 3) 切换动画（人物或车辆）
      const set = this.inVehicle ? ANIMATION.vehicle : ANIMATION.player;
      if      (vx < 0)  this.anims.play(set.left.key,  true);
      else if (vx > 0)  this.anims.play(set.right.key, true);
      else if (vy < 0)  this.anims.play(set.up.key,    true);
      else if (vy > 0)  this.anims.play(set.down.key,  true);
      else              this.anims.stop();

      // 车内移动时消耗属性
      if (this.inVehicle && (vx !== 0 || vy !== 0)) {
        // 走过的本帧距离 = 速度（px/s）×(delta/1000)
        const distThisFrame = Math.sqrt(vx*vx + vy*vy) * (delta / 1000);
        this.distanceAccumulator += distThisFrame;

        // 只要累计距离≥一个格子，就扣一次属性、并减掉 tileSize
        const tileSize = this.mapOffset.tileSize;
        while (this.distanceAccumulator >= tileSize) {
          this.adjustStat('hunger', -0.4);
          this.adjustStat('fuel',   -0.6);
          this.distanceAccumulator -= tileSize;
        }
      }
    }


  /** 调整属性 & 记录日志 **/
  adjustStat(stat, delta) {
    if (!['fuel','health','hunger'].includes(stat)) return;
    const old = this[stat];
    this[stat] = Phaser.Math.Clamp(old + delta, 0, 100);
    this.eventHistory.push({ stat, delta, timestamp: Date.now() });
  }
    // 切换为人物模式
  enterCharacterMode() {
    this.scene.sound.play('street');
    this.inVehicle = false;
    this.setTexture(ASSETS.spritesheet.characters.key );
    const snappedX = Math.round((this.x - this.mapOffset.x) / this.mapOffset.tileSize) * this.mapOffset.tileSize + this.mapOffset.x;
    const snappedY = Math.round((this.y - this.mapOffset.y) / this.mapOffset.tileSize) * this.mapOffset.tileSize + this.mapOffset.y;

    this.setPosition(snappedX, snappedY);
    this.target.set(snappedX, snappedY);
  }

  // 切换为房车模式
  enterVehicleMode() {
      this.scene.sound.stopByKey('street');
      this.scene.sound.play('bgm', { loop: true });
      this.scene.sound.play('engineon');
      this.inVehicle = true;
      this.setTexture(ASSETS.spritesheet.vehicle.key); // 房车贴图 frame
      const snappedX = Math.round((this.x - this.mapOffset.x) / this.mapOffset.tileSize) * this.mapOffset.tileSize + this.mapOffset.x;
      const snappedY = Math.round((this.y - this.mapOffset.y) / this.mapOffset.tileSize) * this.mapOffset.tileSize + this.mapOffset.y;

      this.setPosition(snappedX, snappedY);
      this.target.set(snappedX, snappedY);
  }


  hit() {
    const now = Date.now();
    if (now - this.lastHitTime < this.hitCooldown) return;
    this.lastHitTime = now;

    // —— 如果还在车里，免疫伤害 —— 
    if (this.inVehicle) return;

    // —— 只有下车后才掉血 —— 
    this.adjustStat('health', -10);
    this.scene.sound.play('attack');
    if (this.health <= 0) {
      // this.scene 是 RoomScene，我们要调用真正的 GameScene
      this.gameScene.GameOver(); 
    }
    }
}
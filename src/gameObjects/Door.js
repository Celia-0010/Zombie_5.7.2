// Door.js
export default class Door extends Phaser.GameObjects.Zone {
  constructor(scene, tileX, tileY) {
    // 计算世界坐标 + 区域大小
    const { x: offsetX, y: offsetY, tileSize } = scene.getMapOffset();
    const worldX = offsetX + tileX * tileSize;
    const worldY = offsetY + tileY * tileSize;
    // Zone 的位置是它的中心，所以加上 tileSize/2
    super(scene, worldX + tileSize/2, worldY + tileSize/2, tileSize, tileSize);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 只要当成不可移动的碰撞体
    this.body.setImmovable(true);
    this.body.setAllowGravity(false);
    // （Zone 默认就是不渲染任何东西）
  }
  
  triggerEnterRoom() {
    this.scene.sound.play('shutter');
    this.scene.showRoomEnterPopup(this);
  }
}

export default class Door extends Phaser.GameObjects.Zone {
  constructor(scene, tileX, tileY) {
    // 直接使用场景的mapX/Y和tileSize计算世界坐标
    const worldX = scene.mapX + tileX * scene.tileSize + scene.tileSize/2;
    const worldY = scene.mapY + tileY * scene.tileSize + scene.tileSize/2;
    
    super(scene, worldX, worldY, scene.tileSize, scene.tileSize);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setImmovable(true);
    this.body.setAllowGravity(false);
    
    // 保存原始瓦片坐标供调试
    this.tileX = tileX;
    this.tileY = tileY;
  }
  
  triggerEnterRoom() {
    this.scene.sound.play('shutter');
    this.scene.showRoomEnterPopup(this);
  }
}
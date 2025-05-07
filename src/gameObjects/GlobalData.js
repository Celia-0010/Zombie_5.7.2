// src/global/GlobalData.js
export default class GlobalData {
    constructor() {
        this.coinCount = 0;  // 玩家金币数量
        this.playerPosition = { x: 1, y: 6 };  // 玩家在主地图上的位置
    }

    // 获取和设置金币数量
    setCoinCount(count) {
        this.coinCount = count;
    }

    getCoinCount() {
        return this.coinCount;
    }

    // 设置玩家位置
    setPlayerPosition(x, y) {
        this.playerPosition = { x, y };
    }

    getPlayerPosition() {
        return this.playerPosition;
    }
}

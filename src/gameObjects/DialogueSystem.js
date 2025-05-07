import ASSETS from '../assets.js';

export default class DialogueSystem {
    constructor(scene, npc) {
        this.scene = scene;
        this.npc = npc;
        this.dialogueBox = null;
        this.dialogueText = null;
        this.inputField = null;
        this.isWaitingForAI = false;
        this.dialogueHistory = [];
    }

    createDialogueBox() {
        try {
            const x = this.scene.cameras.main.worldView.centerX;
            const y = this.scene.cameras.main.worldView.centerY;

            // 先销毁旧的对话框（如果存在）
            if (this.dialogueBox) {
                this.dialogueBox.destroy(true);
            }

            // 对话框容器
            this.dialogueBox = this.scene.add.container(x, y).setDepth(1000); // 提高深度值

            // 背景
            const bg = this.scene.add.rectangle(0, 0, 600, 350, 0x222222, 0.9)
                .setStrokeStyle(2, 0xffffff)
                .setOrigin(0.5);
            this.dialogueBox.add(bg);

            // 对话历史显示区域
            this.dialogueText = this.scene.add.text(-250, -100, '', {
                font: '16px Arial',
                fill: '#ffffff',
                wordWrap: { width: 500 },
                lineSpacing: 8,
                padding: { x: 0, y: 100 }
            }).setDepth(1001); // 比背景高一级
            this.dialogueBox.add(this.dialogueText);

            // 玩家输入框
            this.createInputField();
            
            // 控制按钮
            this.createControlButtons();
            this.createButtons();

            // 初始隐藏对话框
            this.dialogueBox.setVisible(false);

        } catch (error) {
            console.error('Failed to create dialogue box:', error);
            throw error;
        }
    }

    createInputField() {
        // 先销毁旧的输入框（如果存在）
        if (this.inputField) {
            this.inputField.destroy();
        }

        // 实际输入框（使用DOM元素）
        const style = {
            font: '16px Arial',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: '8px',
            width: '480px',
            border: '2px solid #666666',
            outline: 'none'
        };

        this.inputField = this.scene.add.dom(0, 120)
            .createElement('input', style)
            .setOrigin(0.5)
            .setDepth(1001); // 确保在正确层级

        // 为DOM元素绑定事件
        this.inputField.node.addEventListener('keydown', (event) => {
            event.stopPropagation(); // 阻止事件冒泡
            if (event.key === 'Enter' && !this.isWaitingForAI) {
                this.handlePlayerInput();
            }
        });

        this.dialogueBox.add(this.inputField);
    }

    // 获取输入框中的值
    getTextValue(elName) {
            var el = document.getElementById(elName);
            return el.value; // 返回文本框的内容
    }
    

    createControlButtons() {
        // 发送按钮
        const sendButton = this.scene.add.image(220, 120, 'button')
    .setOrigin(0.5)
    .setInteractive()
    .setDisplaySize(100, 60); // 设置按钮大小
        this.dialogueBox.add(sendButton);

        const sendText = this.scene.add.text(220, 120, 'Send', {
            font: '18px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        this.dialogueBox.add(sendText);

        sendButton.on('pointerdown', () => {
            if (!this.isWaitingForAI) {
                this.handlePlayerInput();
            }
        });

        // 关闭按钮
        const closeButton = this.scene.add.rectangle(250, -170, 30, 30, 0xff0000)
            .setOrigin(0.5)
            .setInteractive();
        this.dialogueBox.add(closeButton);

        const closeText = this.scene.add.text(250, -170, 'X', {
            font: '18px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        this.dialogueBox.add(closeText);

        closeButton.on('pointerdown', () => {
            this.closeDialogue();
        });
    }

    // 创建帮助和取消按钮
createButtons() {
    // Help button
    const helpButton = this.scene.add.image(-180, 80, 'button') // Using 'button' key for help button
        .setOrigin(0.5)
        .setInteractive()
        .setDisplaySize(80, 40);
    this.dialogueBox.add(helpButton);

    const helpText = this.scene.add.text(-180, 80, 'Help', {
        font: '18px Arial',
        fill: '#ffffff'
    }).setOrigin(0.5);
    this.dialogueBox.add(helpText);

    helpButton.on('pointerdown', () => {
        this.handleHelp();
    });

    // Reject button
    const cancelButton = this.scene.add.image(-100, 80, 'button') // Using 'button' key for reject button
        .setOrigin(0.5)
        .setInteractive()
        .setDisplaySize(80, 40);
    this.dialogueBox.add(cancelButton);

    const cancelText = this.scene.add.text(-100, 80, 'Reject', {
        font: '18px Arial',
        fill: '#ffffff'
    }).setOrigin(0.5);
    this.dialogueBox.add(cancelText);

    cancelButton.on('pointerdown', () => {
        this.handleCancel();
    });
}


    // 处理“帮助”按钮的点击
    handleHelp() {
        // 播放帮助音效
        // this.scene.sound.play('help-sound');
        
        // 1. 记录玩家帮助了该NPC
        this.recordNPCHelp();
        
        // 2. 销毁NPC
        this.destroyNPC();
        
        // 3. 关闭对话框
        this.closeDialogue();
        
        // 4. 显示帮助成功的提示
        this.showHelpSuccessMessage();
    }

    // 记录玩家帮助了该NPC
    recordNPCHelp() {
        if (!this.scene.player.helpedNPCs) {
            this.scene.player.helpedNPCs = [];
        }
        
        // 避免重复记录
        if (!this.scene.player.helpedNPCs.includes(this.npc.name)) {
            this.scene.player.helpedNPCs.push(this.npc.name);
            this.scene.player.reputation += 10; // 每次帮助增加10点声誉
            console.log(`帮助记录: ${this.npc.name}`);
        }
    }

    // 销毁NPC
    destroyNPC() {
        // 从NPC组中移除
        if (this.scene.npcGroup) {
            this.scene.npcGroup.remove(this.npc, true, true);
        }
        
        // 销毁NPC对象
        if (this.npc.destroy) {
            this.npc.destroy();
        }
        
        // 显示消失效果
        this.showNPCDisappearEffect();
    }
    
    // 显示NPC消失效果
    showNPCDisappearEffect() {
        const effect = this.scene.add.particles(this.npc.x, this.npc.y, 'help-effect', {
            frame: [0, 1, 2, 3],
            lifespan: 1000,
            speed: { min: 20, max: 50 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            quantity: 10,
            blendMode: 'ADD'
        });
        
        this.scene.time.delayedCall(1000, () => effect.destroy());
    }

    // 显示NPC消失效果
    showNPCDisappearEffect() {
        const effect = this.scene.add.particles(this.npc.x, this.npc.y, 'help-effect', {
            frame: [0, 1, 2, 3],
            lifespan: 1000,
            speed: { min: 20, max: 50 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            quantity: 10,
            blendMode: 'ADD'
        });
        
        this.scene.time.delayedCall(1000, () => effect.destroy());
    }

    // 处理“取消”按钮的点击
    handleCancel() {
        // 播放关闭对话框的音效
        this.scene.sound.play('reject-sound');
        
        // 关闭对话框
        this.closeDialogue();
        
        // 获取玩家引用
        const player = this.scene.player;
        
        // 让NPC远离玩家
        this.npc.rejectAndMoveAway(player);
    }

    async handlePlayerInput() {
        // 获取用户输入的文本
        const inputText = this.getTextValue('utext').trim();  // 这里的 'utext' 是输入框的 ID
        if (!inputText) return;

        // 添加玩家对话到历史
        this.addToDialogueHistory(`You: ${inputText}`);
        this.inputField.node.value = '';  // 清空输入框
        this.isWaitingForAI = true;

        try {
            // 获取AI响应
            const aiResponse = await this.fetchNPCResponse(inputText);
            this.addToDialogueHistory(`${this.npc.name}: ${aiResponse}`);
        } catch (error) {
            console.error('AI对话出错:', error);
            this.addToDialogueHistory(`${this.npc.name}: 抱歉，我现在无法回答...`);
        }

        this.isWaitingForAI = false;
    }


    async addToDialogueHistory(text) {
        // 添加到对话历史
        this.dialogueHistory.push(text);
        if (this.dialogueHistory.length > 10) { // 如果对话历史超过10行，移除最旧的对话
            this.dialogueHistory.shift();
        }

        // 生成完整的对话文本，保留历史记录
        let fullText = '';
        for (const line of this.dialogueHistory) {
            fullText += line + '\n\n'; // 每个对话行后加上换行符
        }
        
        // 更新对话框文本，不清空现有内容，直接追加
        this.dialogueText.setText(fullText);
        
        // 自动滚动到底部
        this.scrollPosition = Math.min(0, 200 - this.dialogueText.height);
        this.dialogueText.y = this.scrollPosition;
        
        // 打字机效果
        await this.typewriterEffect(fullText);
    }


    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fetchNPCResponse(userInput) {
        const userprompt = this.inputField.node.value; // 直接获取输入框值
        const systemprompt = this.npc.dialoguePrompt; // 使用当前NPC的提示
        
        const options = {
            method: 'POST',
            headers: {
                Authorization: 'Bearer sk-ouqdktoouhhiixgepwyfqzrkidsxawwvtpmmaqtnhpdjixco',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "Qwen/Qwen3-14B",
                stream: false,
                max_tokens: 200,
                enable_thinking: false,
                thinking_budget: 1,
                temperature: 0.2,
                top_p: 0.7,
                top_k: 50,
                frequency_penalty: 0.5,
                n: 1,
                stop: [],
                messages: [
                    { role: "system", content: systemprompt },
                    { role: "user", content: userprompt }
                ]
            })
        };
        
        const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', options);
        const data = await response.json();
        return data.choices?.[0]?.message?.content;
    }

    showDialogue() {
        const dialogueBox = document.getElementById('dialogue-box');
        dialogueBox.style.display = 'block'; // 设置为可见
        if (!this.dialogueBox) {
            this.createDialogueBox(); // 如果不存在则重新创建
        }
        this.dialogueBox.setVisible(true);
        this.inputField.node.focus();
    }


    closeDialogue() {
        const dialogueBox = document.getElementById('dialogue-box');
        dialogueBox.style.display = 'none';  // 隐藏对话框
        if (this.dialogueBox) {
            this.dialogueBox.setVisible(false);
        }
    }

}
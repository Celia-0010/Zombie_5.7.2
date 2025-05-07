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
        const x = this.scene.cameras.main.worldView.centerX;
        const y = this.scene.cameras.main.worldView.centerY;

        // 对话框容器
        this.dialogueBox = this.scene.add.container(x, y).setDepth(150);

        // 背景
        const bg = this.scene.add.rectangle(0, 0, 600, 400, 0x222222, 0.9)
            .setStrokeStyle(2, 0xffffff)
            .setOrigin(0.5);
        this.dialogueBox.add(bg);

        // NPC头像
        const portrait = this.scene.add.image(-250, -120, this.npc.portrait)
            .setOrigin(0.5)
            .setDisplaySize(100, 100);
        this.dialogueBox.add(portrait);

        // NPC名称
        const nameText = this.scene.add.text(-150, -150, this.npc.name, {
            font: '20px Arial',
            fill: '#ffffff'
        });
        this.dialogueBox.add(nameText);

        // 对话历史显示区域
        this.dialogueText = this.scene.add.text(-250, -100, '', {
            font: '16px Arial',
            fill: '#ffffff',
            wordWrap: { width: 500 },
            lineSpacing: 10
        });
        this.dialogueBox.add(this.dialogueText);

        // 玩家输入框
        this.createInputField();
        
        // 控制按钮
        this.createControlButtons();
        this.createButtons();
    }

    createInputField() {
        /* 输入框背景
        const inputBg = this.scene.add.rectangle(0, 120, 500, 40, 0x444444)
            .setOrigin(0.5);
        this.dialogueBox.add(inputBg);
        */

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
            .setOrigin(0.5);

        // 为DOM元素绑定事件
        this.inputField.node.addEventListener('keydown', (event) => {
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
        const sendButton = this.scene.add.rectangle(220, 120, 60, 30, 0x4CAF50)
            .setOrigin(0.5)
            .setInteractive();
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
        const helpButton = this.scene.add.text(-160, 80, 'Help', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#00ff00',
            backgroundColor: '#000000',
        }).setOrigin(0.5).setInteractive().setDepth(101);
        this.dialogueBox.add(helpButton);

        helpButton.on('pointerdown', () => {
            this.handleHelp();
        });

        const cancelButton = this.scene.add.text(-100, 80, 'Reject', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ff0000',
            backgroundColor: '#000000',
        }).setOrigin(0.5).setInteractive().setDepth(101);
        this.dialogueBox.add(cancelButton);

        cancelButton.on('pointerdown', () => {
            this.handleCancel();
        });
    }

    // 处理“帮助”按钮的点击
    handleHelp() {
        console.log('Help button clicked!');
        // 可以在这里添加帮助功能的逻辑
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
        this.dialogueHistory.push(text);
        if (this.dialogueHistory.length > 10) {
            this.dialogueHistory.shift();
        }

        // 清空现有文本
        this.dialogueText.setText('');

        // 打字机效果显示历史
        for (const line of this.dialogueHistory) {
            this.dialogueText.setText(this.dialogueText.text + line + '\n\n');
            await this.delay(50);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fetchNPCResponse(inputText) {
        // 模拟API调用延迟
        await this.delay(1000 + Math.random() * 2000);
        
        // 这里替换为实际的API调用
        /*
        const response = await fetch('YOUR_AI_API_ENDPOINT', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                npc: this.npc,
                playerInput: inputText
            })
        });
        const data = await response.json();
        return data.response;
        */
        
        // 模拟AI回复（实际使用时删除）
        const responses = [
            "这是个有趣的问题...",
            "让我想想...",
            "根据我的经验...",
            "我不确定，但也许...",
            "这是个复杂的话题..."
        ];
        return responses[Math.floor(Math.random() * responses.length)];
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
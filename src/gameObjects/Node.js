// Express服务器后端代码
const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// LLM API接口（假设用OpenAI GPT-3）
app.post('/api/llm-dialogue', async (req, res) => {
    const { npc, input } = req.body;
    
    // 基于NPC的性格和输入生成对话内容
    const prompt = `NPC Name: ${npc.name}\nPersonality: ${npc.personality}\nBackground: ${npc.background}\nPlayer: ${input}\nNPC:`;

    const apiResponse = await fetch('https://api.openai.com/v1/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer YOUR_API_KEY`
        },
        body: JSON.stringify({
            model: 'text-davinci-003',
            prompt: prompt,
            max_tokens: 150,
            temperature: 0.7,
        })
    });

    const data = await apiResponse.json();
    res.json({ dialogue: data.choices[0].text.trim() });  // 返回LLM生成的对话
});

// 启动服务器
app.listen(3000, () => console.log('Server is running on http://localhost:3000'));
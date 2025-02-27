// server.js
const express = require('express');
const fetch = require('node-fetch');
const app = express();
import fetch from 'node-fetch';



app.use(express.json());

app.post('/api/proxy/deepseek-routing', async (req, res) => {
  try {
    const response = await fetch('https://api.deepseek.com/v1/routing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_DEEPSEEK_API_KEY',
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Ошибка прокси:', error);
    res.status(500).json({ error: 'Ошибка при обращении к DeepSeek API' });
  }
});

app.listen(5000, () => {
  console.log('Proxy сервер запущен на http://localhost:5000');
});

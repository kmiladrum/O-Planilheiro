const https = require('https');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { messages, system } = req.body;

    const payload = JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: messages,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
    });

    const apiKey = process.env.GEMINI_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    const data = await response.json();
    console.log('Status Gemini:', response.status);
    console.log('Resposta:', JSON.stringify(data).slice(0, 300));

    if (!response.ok) {
      return res.status(500).json({ error: data });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.';
    res.status(200).json({ text });

  } catch(err) {
    console.error('Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
}

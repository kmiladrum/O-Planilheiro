export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { messages, system } = body;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: messages,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
      })
    });

    const data = await response.json();
    console.log('Gemini status:', response.status);
    console.log('Gemini data:', JSON.stringify(data).slice(0, 500));

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.';
    res.status(200).json({ text });

  } catch(err) {
    console.error('Erro completo:', err.message);
    res.status(500).json({ error: err.message });
  }
}

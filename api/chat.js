export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    console.log('Body recebido:', JSON.stringify(req.body));

    const system = req.body?.system || '';
    const messages = req.body?.messages || [];

    console.log('System:', system.slice(0, 50));
    console.log('Messages count:', messages.length);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_KEY}`;

    const payload = {
      system_instruction: { parts: [{ text: system }] },
      contents: messages,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
    };

    console.log('Payload enviado:', JSON.stringify(payload).slice(0, 200));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Gemini status:', response.status);
    console.log('Gemini resposta:', JSON.stringify(data).slice(0, 300));

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.';
    res.status(200).json({ text });

  } catch(err) {
    console.error('ERRO:', err.message);
    res.status(500).json({ error: err.message });
  }
}

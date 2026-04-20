export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    const system = body.system || '';
    const messages = body.messages || [];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: messages[messages.length-1]?.parts?.[0]?.text || 'oi' }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
      })
    });
    const data = await response.json();
    console.log('FULL RESPONSE:', JSON.stringify(data));
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data);
    res.status(200).json({ text });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
}
export const config = { api: { bodyParser: true } };

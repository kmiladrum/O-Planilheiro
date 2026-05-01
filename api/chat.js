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

    // Converte formato do histórico para o Claude
    const claudeMessages = messages.map(m => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.parts?.[0]?.text || m.content || ''
    })).filter(m => m.content);

    // Garante que começa com mensagem do usuário
    const filtered = [];
    for (const m of claudeMessages) {
      if (filtered.length === 0 && m.role !== 'user') continue;
      filtered.push(m);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: system,
        messages: filtered
      })
    });

    const data = await response.json();
    console.log('Status:', response.status, 'Data:', JSON.stringify(data).slice(0, 300));

    const text = data.content?.[0]?.text || 'Sem resposta.';
    res.status(200).json({ text });

  } catch(err) {
    console.error('ERRO:', err.message);
    res.status(500).json({ error: err.message });
  }
}

export const config = { api: { bodyParser: true } };

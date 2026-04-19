import { useState, useRef, useEffect } from "react";

// ============================================================
// ⚠️ SENHAS — ALTERE AQUI ANTES DE PUBLICAR
// ============================================================
const SENHAS = {
  // Plano Básico — 50 perguntas/dia, sem gerador
  basico: ["BASICO2025", "PLAN123", "EXCEL001"],
  // Plano Pro — ilimitado, com gerador
  pro: ["PRO2025", "PLANPRO1", "POWERBI01"],
};
// Dica: gere senhas únicas por cliente na Kiwify (webhook)
// ou use senhas genéricas por plano para começar
// ============================================================

const LIMITE_BASICO = 50;

const SYSTEM_CHAT = `Você é o Planilheiro, especialista em Excel e Power BI.

Você resolve:
- Fórmulas (PROCV, ÍNDICE/CORRESP, SOMASES, CONT.SES, matriciais, etc.)
- Erros (#VALOR!, #REF!, #N/D, #DIV/0!, etc.)
- Medidas DAX para Power BI
- Tabelas dinâmicas, formatação condicional, macros VBA básicas
- Qualquer dúvida sobre planilhas e dashboards

Ao dar fórmulas ou DAX, use blocos de código e explique cada parte.
Seja direto, prático e didático. Responda sempre em português do Brasil e use linguagem fácil para leigos.`;

const SYSTEM_GERADOR = `Você é o Planilheiro, especialista em criar planilhas avançadas e dashboards profissionais.

O usuário vai te passar dados e o tipo de planilha ou dashboard que quer. Você deve:

**SEMPRE começar perguntando:**
1. Qual o objetivo principal da planilha ou dashboard?
2. Quais dados ele já tem ou vai inserir?
3. Quantas pessoas vão usar? É pessoal ou para empresa?
4. Tem alguma preferência de visual ou organização?

Só após entender bem o objetivo, entregue:

## Para PLANILHAS EXCEL:
1. Estrutura completa com todas as abas necessárias
2. Cabeçalhos e colunas de cada aba
3. Todas as fórmulas prontas para copiar (em blocos de código)
4. Formatação condicional sugerida (regras e cores)
5. Tabela dinâmica se aplicável
6. Validações de dados sugeridas

## Para DASHBOARDS POWER BI:
1. Estrutura do modelo de dados (tabelas fato e dimensão)
2. Relacionamentos sugeridos entre tabelas
3. Todas as medidas DAX necessárias (em blocos de código)
4. Visuais sugeridos para o dashboard
5. Filtros e segmentações recomendadas
6. Dicas de formatação e layout

**Ao final de cada resposta, SEMPRE pergunte:**
"Quer que eu gere um arquivo modelo pronto com essas configurações?"

Seja extremamente detalhado. Responda sempre em português do Brasil.`;

const CHIPS_CHAT = [
  "Como fazer PROCV entre duas abas?",
  "Erro #N/D no PROCV, como corrigir?",
  "Fórmula para somar por mês automaticamente",
  "Como travar célula com F4?",
  "Medida DAX de % crescimento mês a mês",
  "Como criar coluna calculada no Power BI?",
];

const CHIPS_GERADOR = [
  "Planilha de controle financeiro pessoal",
  "Controle de estoque com alertas",
  "Dashboard de vendas por vendedor",
  "Fluxo de caixa empresarial",
  "Dashboard RH com headcount e turnover",
  "Relatório de metas vs resultado Power BI",
];

// ── helpers ──────────────────────────────────────────────────
function verificaSenha(senha) {
  const s = senha.trim().toUpperCase();
  if (SENHAS.pro.map(x => x.toUpperCase()).includes(s)) return "pro";
  if (SENHAS.basico.map(x => x.toUpperCase()).includes(s)) return "basico";
  return null;
}

function getUsos() {
  const hoje = new Date().toDateString();
  const salvo = localStorage.getItem("pl_usos");
  if (!salvo) return { data: hoje, count: 0 };
  const parsed = JSON.parse(salvo);
  if (parsed.data !== hoje) return { data: hoje, count: 0 };
  return parsed;
}

function incrementaUso() {
  const usos = getUsos();
  usos.count += 1;
  localStorage.setItem("pl_usos", JSON.stringify(usos));
  return usos.count;
}

// ── sub-components ────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display:"flex", gap:5, padding:"10px 14px", alignItems:"center" }}>
      {[0,1,2].map(i=>(
        <div key={i} style={{
          width:7, height:7, borderRadius:"50%", background:"#f59e0b",
          animation:"bounce 1.2s infinite", animationDelay:`${i*0.2}s`
        }}/>
      ))}
    </div>
  );
}

function renderContent(text) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const code = part.slice(3,-3).replace(/^\w+\n/,"");
      return (
        <div key={i} style={{
          background:"#0c0a00", border:"1px solid #2a1f00", borderRadius:8,
          padding:"12px 14px", margin:"8px 0",
          fontFamily:"'JetBrains Mono','Fira Code',monospace",
          fontSize:12.5, color:"#fcd34d", overflowX:"auto",
          lineHeight:1.7, whiteSpace:"pre-wrap"
        }}>{code}</div>
      );
    }
    return part.split("\n").map((line, j) => {
      const isH2 = line.startsWith("## ");
      const isH3 = line.startsWith("### ");
      const clean = line.replace(/^#{1,3} /,"").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>");
      if (isH2) return <div key={j} style={{color:"#f59e0b",fontWeight:700,fontSize:13,marginTop:12,marginBottom:4}} dangerouslySetInnerHTML={{__html:clean}}/>;
      if (isH3) return <div key={j} style={{color:"#fcd34d",fontWeight:700,fontSize:13,marginTop:8,marginBottom:2}} dangerouslySetInnerHTML={{__html:clean}}/>;
      return <span key={j} dangerouslySetInnerHTML={{__html:clean+(j<part.split("\n").length-1?"<br/>":"")}}/>;
    });
  });
}

function Message({ msg }) {
  const isUser = msg.role==="user";
  return (
    <div style={{display:"flex",justifyContent:isUser?"flex-end":"flex-start",marginBottom:16,animation:"fadeUp 0.3s ease"}}>
      {!isUser && (
        <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#d97706,#b45309)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,marginRight:10,flexShrink:0,boxShadow:"0 0 12px rgba(245,158,11,0.3)"}}>📊</div>
      )}
      <div style={{maxWidth:"78%",padding:"11px 15px",fontSize:14,lineHeight:1.75,borderRadius:isUser?"16px 16px 4px 16px":"16px 16px 16px 4px",background:isUser?"linear-gradient(135deg,#d97706,#b45309)":"#1a1200",border:isUser?"none":"1px solid #2a1f00",color:"#fef3c7",boxShadow:isUser?"0 4px 15px rgba(217,119,6,0.25)":"0 2px 8px rgba(0,0,0,0.3)"}}>
        {renderContent(msg.content)}
      </div>
    </div>
  );
}

// ── TELA DE LOGIN ─────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [show, setShow] = useState(false);

  const tentar = () => {
    const plano = verificaSenha(senha);
    if (plano) {
      onLogin(plano);
    } else {
      setErro("Senha incorreta. Verifique o e-mail de acesso.");
      setSenha("");
    }
  };

  return (
    <div style={{minHeight:"100vh",background:"#060400",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'DM Sans','Segoe UI',sans-serif",position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Syne:wght@700;800&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes glow{0%,100%{box-shadow:0 0 15px rgba(245,158,11,0.2)}50%{box-shadow:0 0 35px rgba(245,158,11,0.5)}}
        *{box-sizing:border-box;margin:0;padding:0}
        input:focus{outline:none}
      `}</style>

      {/* grid bg */}
      <div style={{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(245,158,11,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.025) 1px,transparent 1px)",backgroundSize:"48px 48px",pointerEvents:"none"}}/>

      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:420,animation:"fadeUp 0.5s ease both"}}>
        {/* Card */}
        <div style={{background:"#0d0900",border:"1px solid #261800",borderRadius:22,padding:"44px 38px",boxShadow:"0 40px 100px rgba(0,0,0,0.6),0 0 60px rgba(217,119,6,0.06)"}}>

          {/* Logo */}
          <div style={{textAlign:"center",marginBottom:34}}>
            <div style={{width:60,height:60,borderRadius:17,background:"linear-gradient(135deg,#d97706,#92400e)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:28,marginBottom:14,animation:"glow 3s infinite"}}>📊</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:24,color:"white",letterSpacing:"-0.5px"}}>O Planilheiro</div>
            <div style={{fontSize:13,color:"#78450a",marginTop:5}}>Digite sua senha de acesso</div>
          </div>

          {/* Erro */}
          {erro && (
            <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",color:"#fca5a5",borderRadius:10,padding:"11px 14px",fontSize:13,marginBottom:18,textAlign:"center"}}>
              ❌ {erro}
            </div>
          )}

          {/* Input senha */}
          <div style={{marginBottom:20}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:"#78450a",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Senha de acesso</label>
            <div style={{position:"relative"}}>
              <input
                type={show ? "text" : "password"}
                value={senha}
                onChange={e=>{ setSenha(e.target.value); setErro(""); }}
                onKeyDown={e=>{ if(e.key==="Enter") tentar(); }}
                placeholder="••••••••••"
                style={{width:"100%",background:"#140c00",border:"1px solid #261800",borderRadius:11,padding:"13px 46px 13px 16px",color:"#fef3c7",fontFamily:"'DM Mono',monospace",fontSize:15,letterSpacing:"0.12em",transition:"border-color 0.2s"}}
                onFocus={e=>e.target.style.borderColor="#d97706"}
                onBlur={e=>e.target.style.borderColor="#261800"}
              />
              <button onClick={()=>setShow(!show)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#78450a",fontSize:16,padding:0}}>
                {show ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Botão entrar */}
          <button onClick={tentar} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#d97706,#b45309)",color:"white",border:"none",borderRadius:11,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer",transition:"all 0.2s",boxShadow:"0 0 25px rgba(217,119,6,0.25)"}}>
            Entrar →
          </button>

          {/* Divider */}
          <div style={{borderTop:"1px solid #261800",margin:"24px 0"}}/>

          {/* Sem acesso */}
          <div style={{textAlign:"center",fontSize:13,color:"#78450a"}}>
            Ainda não tem acesso?{" "}
            <a href="planilheiro-landing.html" style={{color:"#f59e0b",textDecoration:"none",fontWeight:700}}>
              Ver planos →
            </a>
          </div>

          {/* Info planos */}
          <div style={{marginTop:20,background:"rgba(217,119,6,0.05)",border:"1px solid rgba(217,119,6,0.12)",borderRadius:10,padding:"12px 14px",fontSize:12,color:"#78450a",textAlign:"center",lineHeight:1.6}}>
            🔒 Sua senha chega por e-mail após o pagamento.<br/>
            Dúvidas? <a href="mailto:contato@oplanilheiro.com.br" style={{color:"#f59e0b",textDecoration:"none"}}>contato@oplanilheiro.com.br</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AGENTE PRINCIPAL ──────────────────────────────────────────
function Agente({ plano, onLogout }) {
  const [mode, setMode] = useState("chat");
  const [chatMsgs, setChatMsgs] = useState([{
    role:"assistant",
    content:`Fala! 👋 Sou o **Planilheiro** — pode me mandar qualquer dúvida sobre **fórmulas**, **erros** ou **DAX**. Explico tudo de forma simples!\n\n${plano==="pro" ? "✨ Você está no **Plano Pro** — acesso completo, ilimitado." : "⚡ Você está no **Plano Básico** — 50 perguntas por dia."}`
  }]);
  const [geradorMsgs, setGeradorMsgs] = useState([{
    role:"assistant",
    content:"Fala! 🚀 Sou o **Planilheiro** — me conta o que você precisa montar. Pode ser planilha Excel ou dashboard Power BI. Faço as perguntas certas e monto tudo personalizado pra você!"
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [usos, setUsos] = useState(getUsos().count);
  const [bloqueado, setBloqueado] = useState(false);
  const bottomRef = useRef(null);
  const taRef = useRef(null);

  const msgs = mode==="chat" ? chatMsgs : geradorMsgs;
  const setMsgs = mode==="chat" ? setChatMsgs : setGeradorMsgs;
  const systemPrompt = mode==="chat" ? SYSTEM_CHAT : SYSTEM_GERADOR;
  const chips = mode==="chat" ? CHIPS_CHAT : CHIPS_GERADOR;

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs,loading]);

  // Bloqueia modo gerador no plano básico
  const modoPermitido = (m) => {
    if (m==="gerador" && plano==="basico") return false;
    return true;
  };

  const send = async (text) => {
    const txt = text || input.trim();
    if (!txt || loading) return;

    // Limite básico
    if (plano==="basico") {
      const total = incrementaUso();
      setUsos(total);
      if (total > LIMITE_BASICO) { setBloqueado(true); return; }
    }

    const newMsgs = [...msgs, {role:"user", content:txt}];
    setMsgs(newMsgs);
    setInput("");
    if (taRef.current) taRef.current.style.height="auto";
    setLoading(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system: systemPrompt,
          messages: newMsgs.map(m=>({role:m.role,content:m.content}))
        })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Desculpe, tive um problema. Tente novamente.";
      setMsgs([...newMsgs, {role:"assistant", content:reply}]);
    } catch {
      setMsgs([...newMsgs, {role:"assistant", content:"Erro de conexão. Tente novamente."}]);
    } finally { setLoading(false); }
  };

  const handleKey = (e) => {
    if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const restantes = LIMITE_BASICO - usos;
  const aviso = plano==="basico" && restantes <= 10;

  return (
    <div style={{minHeight:"100vh",background:"#080600",display:"flex",flexDirection:"column",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&family=JetBrains+Mono&display=swap');
        @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes glow{0%,100%{box-shadow:0 0 15px rgba(245,158,11,0.25)}50%{box-shadow:0 0 30px rgba(245,158,11,0.5)}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#2a1f00;border-radius:10px}
        textarea{resize:none;background:transparent;border:none;color:#fef3c7;font-size:14px;font-family:inherit;line-height:1.6;width:100%}
        textarea:focus{outline:none}
        textarea::placeholder{color:#3a2f00}
        .chip-btn:hover{background:#d97706!important;color:white!important;border-color:#d97706!important}
        .tab-btn{transition:all 0.25s;cursor:pointer}
        .tab-btn:disabled{cursor:not-allowed;opacity:0.4}
      `}</style>

      {/* HEADER */}
      <div style={{padding:"13px 18px",borderBottom:"1px solid #1a1200",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(8,6,0,0.95)",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:38,height:38,borderRadius:11,background:"linear-gradient(135deg,#d97706,#92400e)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,animation:"glow 3s infinite"}}>📊</div>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#fef3c7",letterSpacing:"-0.3px"}}>O Planilheiro</div>
            <div style={{fontSize:11,color:"#f59e0b",display:"flex",alignItems:"center",gap:4}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:"#f59e0b",display:"inline-block",animation:"pulse 2s infinite"}}/>
              {plano==="pro" ? "✨ Plano Pro — Ilimitado" : `⚡ Plano Básico — ${Math.max(0,restantes)} perguntas restantes hoje`}
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {plano==="basico" && (
            <a href="planilheiro-landing.html" style={{background:"linear-gradient(135deg,#d97706,#b45309)",color:"white",border:"none",padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:700,fontFamily:"inherit",cursor:"pointer",textDecoration:"none"}}>
              ↑ Upgrade Pro
            </a>
          )}
          <button onClick={onLogout} style={{background:"transparent",border:"1px solid #261800",color:"#78450a",padding:"6px 14px",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}
            onMouseOver={e=>{e.target.style.borderColor="#ef4444";e.target.style.color="#fca5a5";}}
            onMouseOut={e=>{e.target.style.borderColor="#261800";e.target.style.color="#78450a";}}>
            Sair
          </button>
        </div>
      </div>

      {/* TOGGLE MODO */}
      <div style={{maxWidth:720,width:"100%",margin:"10px auto 0",padding:"0 16px"}}>
        <div style={{display:"flex",gap:4,background:"#120d00",border:"1px solid #2a1f00",borderRadius:12,padding:4,width:"fit-content"}}>
          {[
            {id:"chat", icon:"💬", label:"Fórmulas & Erros"},
            {id:"gerador", icon:"⚡", label:"Gerar Planilha", proOnly:true},
          ].map(tab=>(
            <button key={tab.id} className="tab-btn"
              onClick={()=>{ if(modoPermitido(tab.id)) setMode(tab.id); }}
              disabled={!modoPermitido(tab.id)}
              title={!modoPermitido(tab.id) ? "Disponível no Plano Pro" : ""}
              style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:9,border:"none",fontFamily:"inherit",fontSize:13,fontWeight:600,background:mode===tab.id?"linear-gradient(135deg,#d97706,#b45309)":"transparent",color:mode===tab.id?"white":modoPermitido(tab.id)?"#78450a":"#3a2a00",boxShadow:mode===tab.id?"0 2px 12px rgba(217,119,6,0.35)":"none"}}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.proOnly && plano==="basico" && <span style={{fontSize:9,background:"rgba(217,119,6,0.2)",color:"#f59e0b",padding:"2px 6px",borderRadius:6,fontWeight:700}}>PRO</span>}
            </button>
          ))}
        </div>
      </div>

      {/* BANNER BLOQUEADO */}
      {bloqueado && (
        <div style={{maxWidth:720,width:"100%",margin:"12px auto 0",padding:"0 16px"}}>
          <div style={{background:"linear-gradient(135deg,#1a0e00,#120d00)",border:"1px solid rgba(217,119,6,0.4)",borderRadius:12,padding:"16px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div style={{fontSize:13,color:"#fef3c7"}}>🚫 Você atingiu o limite de <strong style={{color:"#f59e0b"}}>50 perguntas</strong> de hoje. Renova amanhã ou faça upgrade.</div>
            <a href="planilheiro-landing.html" style={{background:"linear-gradient(135deg,#d97706,#b45309)",color:"white",border:"none",padding:"9px 18px",borderRadius:8,fontSize:13,fontWeight:700,fontFamily:"inherit",cursor:"pointer",textDecoration:"none",whiteSpace:"nowrap"}}>Upgrade Pro →</a>
          </div>
        </div>
      )}

      {/* BANNER AVISO LIMITE */}
      {aviso && !bloqueado && (
        <div style={{maxWidth:720,width:"100%",margin:"8px auto 0",padding:"0 16px"}}>
          <div style={{background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#fbbf24",textAlign:"center"}}>
            ⚠️ Você tem apenas <strong>{restantes} perguntas</strong> restantes hoje.{" "}
            <a href="planilheiro-landing.html" style={{color:"#f59e0b",fontWeight:700,textDecoration:"none"}}>Fazer upgrade →</a>
          </div>
        </div>
      )}

      {/* CHAT */}
      <div style={{flex:1,overflowY:"auto",padding:"20px 16px",maxWidth:720,width:"100%",margin:"0 auto"}}>
        {msgs.map((msg,i)=><Message key={`${mode}-${i}`} msg={msg}/>)}
        {loading && (
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#d97706,#b45309)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>📊</div>
            <div style={{background:"#1a1200",border:"1px solid #2a1f00",borderRadius:"16px 16px 16px 4px"}}><TypingDots/></div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* CHIPS */}
      {msgs.length<=2 && (
        <div style={{maxWidth:720,width:"100%",margin:"0 auto",padding:"0 16px 12px"}}>
          <div style={{fontSize:11,color:"#3a2f00",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>
            {mode==="chat" ? "Perguntas frequentes" : "Exemplos para começar"}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {chips.map((c,i)=>(
              <button key={i} className="chip-btn" onClick={()=>send(c)} style={{background:"#120d00",border:"1px solid #2a1f00",color:"#78450a",padding:"6px 13px",borderRadius:20,fontSize:12,fontFamily:"inherit",cursor:"pointer",transition:"all 0.2s"}}>{c}</button>
            ))}
          </div>
        </div>
      )}

      {/* INPUT */}
      <div style={{maxWidth:720,width:"100%",margin:"0 auto",padding:"0 16px 20px"}}>
        <div style={{background:"#120d00",border:"1px solid #2a1f00",borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"flex-end",gap:10}}>
          <textarea
            ref={taRef} rows={1} value={input}
            disabled={bloqueado}
            onChange={e=>{ setInput(e.target.value); e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,130)+"px"; }}
            onKeyDown={handleKey}
            placeholder={bloqueado ? "Limite diário atingido. Renova amanhã ou faça upgrade." : mode==="chat" ? "Cole sua fórmula, descreva o erro ou faça uma pergunta..." : "Ex: quero um controle financeiro com gastos por categoria..."}
            style={{maxHeight:130,opacity:bloqueado?0.4:1}}
          />
          <button onClick={()=>send()} disabled={!input.trim()||loading||bloqueado} style={{width:36,height:36,borderRadius:10,border:"none",background:input.trim()&&!loading&&!bloqueado?"linear-gradient(135deg,#d97706,#b45309)":"#1a1200",color:input.trim()&&!loading&&!bloqueado?"white":"#3a2f00",display:"flex",alignItems:"center",justifyContent:"center",cursor:input.trim()&&!loading&&!bloqueado?"pointer":"not-allowed",flexShrink:0,transition:"all 0.2s",fontSize:16}}>↑</button>
        </div>
        <div style={{textAlign:"right",marginTop:8,fontSize:11,color:"#2a1f00"}}>O Planilheiro · Powered by Claude</div>
      </div>
    </div>
  );
}

// ── APP PRINCIPAL ─────────────────────────────────────────────
export default function App() {
  const [plano, setPlano] = useState(null);

  const handleLogin = (p) => setPlano(p);
  const handleLogout = () => setPlano(null);

  if (!plano) return <LoginScreen onLogin={handleLogin}/>;
  return <Agente plano={plano} onLogout={handleLogout}/>;
}

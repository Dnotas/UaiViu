const express = require("express");
const wppconnect = require("@wppconnect-team/wppconnect");

const app = express();
app.use(express.json());

// Sandbox de teste isolado — prova de conceito pra ver se o WPPConnect
// (controla o WhatsApp Web de verdade via navegador) consegue parear onde
// o Baileys falha. Nao mexe em nada da producao do UaiViu.
const sessions = {};

app.post("/connections/:token/start", async (req, res) => {
  const { token } = req.params;

  if (sessions[token]) {
    return res.json({ status: sessions[token].status, hasQr: !!sessions[token].qr });
  }

  sessions[token] = { status: "starting", qr: null, client: null, error: null };

  wppconnect
    .create({
      session: token,
      catchQR: (base64Qr, asciiQR, attempts) => {
        sessions[token].qr = base64Qr;
        sessions[token].status = "qrcode";
        console.log(`[${token}] QR gerado (tentativa ${attempts})`);
      },
      statusFind: (statusSession, session) => {
        console.log(`[${session}] status: ${statusSession}`);
        sessions[token].status = statusSession;
      },
      headless: true,
      useChrome: false,
      autoClose: 0,
      puppeteerOptions: {
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      }
    })
    .then(client => {
      sessions[token].client = client;
      sessions[token].status = "connected";
      console.log(`[${token}] Conectado!`);
    })
    .catch(err => {
      sessions[token].status = "error";
      sessions[token].error = err?.message;
      console.error(`[${token}] Erro:`, err);
    });

  res.json({ status: "starting" });
});

app.get("/connections/:token/status", (req, res) => {
  const s = sessions[req.params.token];
  if (!s) return res.status(404).json({ error: "not found" });
  res.json({ status: s.status, hasQr: !!s.qr, error: s.error });
});

app.get("/connections/:token/qr", (req, res) => {
  const s = sessions[req.params.token];
  if (!s || !s.qr) return res.status(404).json({ error: "no qr yet" });
  res.json({ qr: s.qr });
});

// Pagina simples que atualiza sozinha — pra escanear direto do navegador
// sem precisar de print manual (o QR do WhatsApp muda a cada ~20s).
app.get("/connections/:token/page", (req, res) => {
  const { token } = req.params;
  res.send(`<!doctype html>
<html><head><meta charset="utf-8"><title>QR ${token}</title>
<style>body{font-family:sans-serif;text-align:center;padding-top:40px;background:#111;color:#eee}
img{width:280px;height:280px;background:#fff;padding:10px;border-radius:8px}
#status{margin-top:16px;font-size:18px}</style></head>
<body>
<h2>Escaneie com o WhatsApp (Aparelhos conectados)</h2>
<div id="status">carregando...</div>
<div><img id="qr" src="" style="display:none"></div>
<script>
async function tick() {
  try {
    const st = await fetch('status').then(r => r.json());
    document.getElementById('status').textContent = 'status: ' + st.status;
    if (st.status === 'connected') {
      document.getElementById('status').textContent = '✅ CONECTADO!';
      return;
    }
    const qrRes = await fetch('qr');
    if (qrRes.ok) {
      const data = await qrRes.json();
      const img = document.getElementById('qr');
      img.src = data.qr;
      img.style.display = 'block';
    }
  } catch (e) {}
  setTimeout(tick, 2000);
}
tick();
</script>
</body></html>`);
});

app.post("/connections/:token/send-text", async (req, res) => {
  const s = sessions[req.params.token];
  if (!s || !s.client) return res.status(400).json({ error: "not connected" });
  const { number, message } = req.body;
  try {
    const result = await s.client.sendText(`${number}@c.us`, message);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`WPPConnect test server rodando na porta ${PORT}`));

import "dotenv/config";
import http from "http";
import app from "./app";
import { initDB } from "./database";
import { initSocket } from "./libs/socket";
import { initWbotFood } from "./libs/wbotFood";

const PORT = process.env.PORT || 3003;

const server = http.createServer(app);

initSocket(server);

(async () => {
  try {
    await initDB();
    console.log("✅ [Food] Banco de dados conectado");

    server.listen(PORT, () => {
      console.log(`🍽️  UaiViu Food Backend rodando na porta ${PORT}`);
    });

    // Inicializa sessões WhatsApp dos restaurantes
    await initWbotFood();
    console.log("✅ [Food] Sessões WhatsApp dos restaurantes iniciadas");
  } catch (err) {
    console.error("❌ Erro ao iniciar UaiViu Food:", err);
    process.exit(1);
  }
})();

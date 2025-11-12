import axios from "axios";
import AppError from "../../errors/AppError";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_KEY_FALLBACK = process.env.GEMINI_API_KEY_FALLBACK || "";
// Flash-Lite: 2-3x mais rápido que Flash, ideal para textos curtos
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

interface Request {
  text: string;
}

/**
 * Função auxiliar para melhorar texto com fallback automático
 */
const makeImproveRequest = async (text: string, apiKey: string, isFallback = false): Promise<any> => {
  const keyLabel = isFallback ? "FALLBACK" : "PRIMARY";
  console.log(`🤖 [ImproveText] Usando chave ${keyLabel}...`);

  const prompt = `Corrija a ortografia e gramática deste texto, mantendo o significado original. Responda APENAS com o texto corrigido:

"${text}"`;

  return axios.post(
    `${GEMINI_API_URL}?key=${apiKey}`,
    {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,          // Mais determinístico = mais rápido
        topK: 10,                  // Menos opções = mais rápido
        topP: 0.7,                 // Mais focado = mais rápido
        maxOutputTokens: 512,      // Suficiente para textos curtos
        candidateCount: 1,
      }
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 8000,  // 8 segundos suficiente para flash-lite
    }
  );
};

/**
 * Serviço para melhorar e corrigir textos usando Google Gemini AI
 */
const ImproveTextService = async ({ text }: Request): Promise<string> => {
  if (!GEMINI_API_KEY) {
    throw new AppError("GEMINI_API_KEY não configurada no .env", 500);
  }

  if (!text || text.trim().length === 0) {
    throw new AppError("Texto não pode estar vazio", 400);
  }

  try {
    console.log("🤖 [ImproveText] Enviando requisição para Gemini API...");
    console.log("🤖 [ImproveText] Texto original:", text);

    // Envia para o Gemini com fallback automático
    let response;
    try {
      response = await makeImproveRequest(text, GEMINI_API_KEY, false);
    } catch (primaryError: any) {
      // Se der erro 429 e existir chave fallback, tenta com ela
      if (primaryError.response?.status === 429 && GEMINI_API_KEY_FALLBACK) {
        console.log("⚠️ [ImproveText] Limite atingido na chave principal. Tentando com chave fallback...");
        response = await makeImproveRequest(text, GEMINI_API_KEY_FALLBACK, true);
      } else {
        throw primaryError;
      }
    }

    console.log("🤖 [ImproveText] Resposta recebida:");
    console.log(JSON.stringify(response.data, null, 2));

    // Extrai o texto melhorado da resposta
    const improvedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log("🤖 [ImproveText] Texto extraído:", improvedText);

    if (!improvedText) {
      console.error("🤖 [ImproveText] Estrutura da resposta:", JSON.stringify(response.data, null, 2));
      throw new AppError("Resposta inválida da API Gemini", 500);
    }

    // Remove aspas extras se houver
    const finalText = improvedText.trim().replace(/^["']|["']$/g, '');

    return finalText;
  } catch (error: any) {
    console.error("Erro ao melhorar texto com Gemini:", error);

    // Mensagens de erro específicas
    if (error.response?.status === 429) {
      throw new AppError("Limite de requisições atingido. Tente novamente em alguns segundos.", 429);
    } else if (error.response?.status === 403) {
      throw new AppError("Chave de API inválida ou sem permissão.", 403);
    } else if (error.response?.status === 503) {
      throw new AppError("Serviço temporariamente indisponível. Tente novamente.", 503);
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new AppError("Tempo limite excedido. Tente com um texto menor.", 408);
    } else if (error.message?.includes('GEMINI_API_KEY')) {
      throw error;
    } else {
      throw new AppError("Não foi possível melhorar o texto: " + (error.message || "Erro desconhecido"), 500);
    }
  }
};

export default ImproveTextService;

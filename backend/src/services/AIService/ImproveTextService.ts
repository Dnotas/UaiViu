import axios from "axios";
import AppError from "../../errors/AppError";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

interface Request {
  text: string;
}

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
    const prompt = `Você é um assistente de correção e melhoria de textos profissionais para atendimento ao cliente.

Seu trabalho é:
1. Corrigir todos os erros de ortografia e gramática
2. Melhorar a clareza e profissionalismo do texto
3. Manter o tom cordial e respeitoso
4. Preservar a intenção e significado original
5. Retornar APENAS o texto melhorado, sem explicações adicionais

Texto original:
"${text}"

Texto melhorado:`;

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
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
          temperature: 0.3,        // Mais direto e rápido
          topK: 20,                // Resposta mais rápida
          topP: 0.8,               // Mais focado
          maxOutputTokens: 256,    // Texto curto
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 3000,  // Timeout de 3 segundos
      }
    );

    // Extrai o texto melhorado da resposta
    const improvedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!improvedText) {
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
      throw new AppError("Tempo limite excedido (3s). Tente com um texto menor.", 408);
    } else if (error.message?.includes('GEMINI_API_KEY')) {
      throw error;
    } else {
      throw new AppError("Não foi possível melhorar o texto: " + (error.message || "Erro desconhecido"), 500);
    }
  }
};

export default ImproveTextService;

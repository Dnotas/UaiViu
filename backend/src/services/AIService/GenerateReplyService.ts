import axios from "axios";
import AppError from "../../errors/AppError";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

interface Message {
  body: string;
  fromMe: boolean;
  contactName?: string;
  timestamp: string;
}

interface Request {
  targetMessage: Message;
  contextMessages: Message[];
  contactName: string;
}

/**
 * Serviço para gerar respostas automáticas baseadas no contexto da conversa usando Google Gemini AI
 */
const GenerateReplyService = async ({ targetMessage, contextMessages, contactName }: Request): Promise<string> => {
  if (!GEMINI_API_KEY) {
    throw new AppError("GEMINI_API_KEY não configurada no .env", 500);
  }

  if (!targetMessage || !targetMessage.body || targetMessage.body.trim().length === 0) {
    throw new AppError("Mensagem alvo não pode estar vazia", 400);
  }

  try {
    // Monta o contexto da conversa
    let conversationContext = "";

    if (contextMessages && contextMessages.length > 0) {
      conversationContext = "\n\nContexto da conversa anterior:\n";
      contextMessages.forEach((msg) => {
        const sender = msg.fromMe ? "Atendente" : (msg.contactName || contactName || "Cliente");
        conversationContext += `${sender}: ${msg.body}\n`;
      });
    }

    // Prompt otimizado para gerar resposta apropriada
    const prompt = `Você é um assistente de atendimento ao cliente profissional e cordial.
${conversationContext}

Mensagem do cliente que precisa ser respondida:
${contactName || "Cliente"}: ${targetMessage.body}

Gere uma resposta profissional, cordial e contextualizada para esta mensagem.
Responda APENAS com o texto da resposta, sem explicações adicionais:`;

    console.log("🤖 [GenerateReply] Enviando requisição para Gemini API...");
    console.log("🤖 [GenerateReply] Mensagem alvo:", targetMessage.body);

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
          temperature: 0.7,          // Mais criativo para respostas variadas
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 512,
          candidateCount: 1,
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,  // 10 segundos para geração de resposta
      }
    );

    console.log("🤖 [GenerateReply] Resposta recebida:");
    console.log(JSON.stringify(response.data, null, 2));

    // Extrai a resposta gerada
    const generatedReply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log("🤖 [GenerateReply] Resposta extraída:", generatedReply);

    if (!generatedReply) {
      console.error("🤖 [GenerateReply] Estrutura da resposta:", JSON.stringify(response.data, null, 2));
      throw new AppError("Resposta inválida da API Gemini", 500);
    }

    // Remove aspas extras e limpa o texto
    const finalReply = generatedReply.trim().replace(/^["']|["']$/g, '');

    return finalReply;
  } catch (error: any) {
    console.error("Erro ao gerar resposta com Gemini:", error);

    // Mensagens de erro específicas
    if (error.response?.status === 429) {
      throw new AppError("Limite de requisições atingido. Tente novamente em alguns segundos.", 429);
    } else if (error.response?.status === 403) {
      throw new AppError("Chave de API inválida ou sem permissão.", 403);
    } else if (error.response?.status === 503) {
      throw new AppError("Serviço temporariamente indisponível. Tente novamente.", 503);
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new AppError("Tempo limite excedido. Tente novamente.", 408);
    } else if (error.message?.includes('GEMINI_API_KEY')) {
      throw error;
    } else {
      throw new AppError("Não foi possível gerar resposta: " + (error.message || "Erro desconhecido"), 500);
    }
  }
};

export default GenerateReplyService;

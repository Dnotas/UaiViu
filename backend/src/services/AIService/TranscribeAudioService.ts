import axios from "axios";
import fs from "fs";
import path from "path";
import AppError from "../../errors/AppError";
import Message from "../../models/Message";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

interface Request {
  messageId: string;
}

/**
 * Serviço para transcrever áudios usando Google Gemini AI
 */
const TranscribeAudioService = async ({ messageId }: Request): Promise<string> => {
  if (!GEMINI_API_KEY) {
    throw new AppError("GEMINI_API_KEY não configurada no .env", 500);
  }

  try {
    // Busca a mensagem no banco
    const message = await Message.findByPk(messageId);

    if (!message) {
      throw new AppError("Mensagem não encontrada", 404);
    }

    // Verifica se é um áudio
    if (!message.mediaType || !message.mediaType.includes("audio")) {
      throw new AppError("Mensagem não é um áudio", 400);
    }

    // Se já tem transcrição, retorna
    if (message.transcription) {
      return message.transcription;
    }

    // Verifica se o arquivo de áudio existe
    if (!message.mediaUrl) {
      throw new AppError("Áudio não encontrado", 404);
    }

    // Extrai o caminho do arquivo da URL
    const mediaUrl = message.getDataValue("mediaUrl"); // Pega o valor sem o transform
    const audioFilePath = path.join(process.cwd(), "public", mediaUrl);

    if (!fs.existsSync(audioFilePath)) {
      throw new AppError("Arquivo de áudio não encontrado no servidor", 404);
    }

    // Lê o arquivo de áudio e converte para base64
    const audioBuffer = fs.readFileSync(audioFilePath);
    const audioBase64 = audioBuffer.toString("base64");

    // Detecta o mime type do áudio
    const audioExt = path.extname(audioFilePath).toLowerCase();
    let mimeType = "audio/ogg"; // Default para WhatsApp
    if (audioExt === ".mp3") mimeType = "audio/mp3";
    else if (audioExt === ".wav") mimeType = "audio/wav";
    else if (audioExt === ".m4a") mimeType = "audio/mp4";

    console.log("🎤 [TranscribeAudio] Enviando requisição para Gemini API...");
    console.log("🎤 [TranscribeAudio] Message ID:", messageId);
    console.log("🎤 [TranscribeAudio] Audio path:", audioFilePath);
    console.log("🎤 [TranscribeAudio] MIME type:", mimeType);

    // Envia para o Gemini para transcrição
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: "Transcreva este áudio em português. Retorne APENAS o texto transcrito, sem explicações adicionais."
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: audioBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 10,
          topP: 0.7,
          maxOutputTokens: 2048,
          candidateCount: 1,
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 60000,  // 60 segundos para áudios longos
      }
    );

    console.log("🎤 [TranscribeAudio] Resposta recebida");

    // Extrai a transcrição
    const transcription = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!transcription) {
      console.error("🎤 [TranscribeAudio] Estrutura da resposta:", JSON.stringify(response.data, null, 2));
      throw new AppError("Resposta inválida da API Gemini", 500);
    }

    // Limpa e salva a transcrição
    const cleanTranscription = transcription.trim().replace(/^["']|["']$/g, '');

    console.log("🎤 [TranscribeAudio] Transcrição:", cleanTranscription);

    // Atualiza a mensagem com a transcrição
    await message.update({ transcription: cleanTranscription });

    return cleanTranscription;
  } catch (error: any) {
    console.error("Erro ao transcrever áudio com Gemini:", error);

    // Mensagens de erro específicas
    if (error.response?.status === 429) {
      throw new AppError("Limite de requisições atingido. Tente novamente em alguns segundos.", 429);
    } else if (error.response?.status === 403) {
      throw new AppError("Chave de API inválida ou sem permissão.", 403);
    } else if (error.response?.status === 503) {
      throw new AppError("Serviço temporariamente indisponível. Tente novamente.", 503);
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new AppError("Tempo limite excedido. Áudio muito longo.", 408);
    } else if (error.message?.includes('GEMINI_API_KEY')) {
      throw error;
    } else if (error.statusCode) {
      throw error; // AppError já formatado
    } else {
      throw new AppError("Não foi possível transcrever o áudio: " + (error.message || "Erro desconhecido"), 500);
    }
  }
};

export default TranscribeAudioService;

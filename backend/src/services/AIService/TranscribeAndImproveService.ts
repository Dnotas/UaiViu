import axios from "axios";
import AppError from "../../errors/AppError";
import path from "path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_TRANSCRIBE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";
const GEMINI_IMPROVE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

interface Request {
  audioBuffer: Buffer;
  audioFileName: string;
}

/**
 * Serviço para transcrever áudio e melhorar o texto com tom profissional e formal
 * usando Google Gemini AI
 */
const TranscribeAndImproveService = async ({ audioBuffer, audioFileName }: Request): Promise<string> => {
  if (!GEMINI_API_KEY) {
    throw new AppError("GEMINI_API_KEY não configurada no .env", 500);
  }

  try {
    // ETAPA 1: TRANSCREVER ÁUDIO
    // ===========================
    console.log("🎤 [TranscribeAndImprove] ETAPA 1: Transcrevendo áudio...");
    console.log("🎤 [TranscribeAndImprove] Arquivo:", audioFileName);
    console.log("🎤 [TranscribeAndImprove] Tamanho:", audioBuffer.length, "bytes");

    // Converte buffer para base64
    const audioBase64 = audioBuffer.toString("base64");

    // Detecta o mime type do áudio
    const audioExt = path.extname(audioFileName).toLowerCase();
    let mimeType = "audio/ogg"; // Default para WhatsApp
    if (audioExt === ".mp3") mimeType = "audio/mp3";
    else if (audioExt === ".wav") mimeType = "audio/wav";
    else if (audioExt === ".m4a") mimeType = "audio/mp4";

    console.log("🎤 [TranscribeAndImprove] MIME type:", mimeType);

    // Envia para o Gemini para transcrição
    const transcribeResponse = await axios.post(
      `${GEMINI_TRANSCRIBE_URL}?key=${GEMINI_API_KEY}`,
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

    // Extrai a transcrição
    const transcription = transcribeResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!transcription) {
      console.error("🎤 [TranscribeAndImprove] Estrutura da resposta:", JSON.stringify(transcribeResponse.data, null, 2));
      throw new AppError("Resposta inválida da API Gemini na transcrição", 500);
    }

    const cleanTranscription = transcription.trim().replace(/^["']|["']$/g, '');
    console.log("🎤 [TranscribeAndImprove] Transcrição:", cleanTranscription);

    // ETAPA 2: MELHORAR TEXTO COM TOM PROFISSIONAL E FORMAL
    // ======================================================
    console.log("✨ [TranscribeAndImprove] ETAPA 2: Melhorando texto...");

    const improvePrompt = `Você é um assistente de comunicação profissional.

Reescreva o texto abaixo seguindo estas diretrizes:
1. Corrija erros de ortografia e gramática
2. Use tom profissional e formal
3. Seja cordial e respeitoso
4. Mantenha o significado original
5. Não adicione informações que não estão no texto original
6. Retorne APENAS o texto reescrito, sem explicações

Texto original:
"${cleanTranscription}"`;

    const improveResponse = await axios.post(
      `${GEMINI_IMPROVE_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: improvePrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,          // Um pouco mais criativo para melhorar o tom
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 1024,
          candidateCount: 1,
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15000,  // 15 segundos
      }
    );

    // Extrai o texto melhorado
    const improvedText = improveResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!improvedText) {
      console.error("✨ [TranscribeAndImprove] Estrutura da resposta:", JSON.stringify(improveResponse.data, null, 2));
      throw new AppError("Resposta inválida da API Gemini na melhoria", 500);
    }

    const finalText = improvedText.trim().replace(/^["']|["']$/g, '');
    console.log("✨ [TranscribeAndImprove] Texto melhorado:", finalText);

    return finalText;

  } catch (error: any) {
    console.error("❌ [TranscribeAndImprove] Erro:", error);

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
      throw new AppError("Não foi possível processar o áudio: " + (error.message || "Erro desconhecido"), 500);
    }
  }
};

export default TranscribeAndImproveService;

import axios from "axios";
import AppError from "../../errors/AppError";
import path from "path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_KEY_FALLBACK = process.env.GEMINI_API_KEY_FALLBACK || "";
const GEMINI_TRANSCRIBE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
const GEMINI_IMPROVE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

interface Request {
  audioBuffer: Buffer;
  audioFileName: string;
}

/**
 * Função auxiliar para transcrever áudio com fallback automático
 */
const makeTranscribeRequest = async (audioBase64: string, mimeType: string, apiKey: string, isFallback = false): Promise<any> => {
  const keyLabel = isFallback ? "FALLBACK" : "PRIMARY";
  console.log(`🎤 [TranscribeAndImprove] Transcrevendo com chave ${keyLabel}...`);

  return axios.post(
    `${GEMINI_TRANSCRIBE_URL}?key=${apiKey}`,
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
};

/**
 * Função auxiliar para melhorar texto com fallback automático
 */
const makeImproveRequest = async (text: string, apiKey: string, isFallback = false): Promise<any> => {
  const keyLabel = isFallback ? "FALLBACK" : "PRIMARY";
  console.log(`✨ [TranscribeAndImprove] Melhorando com chave ${keyLabel}...`);

  const improvePrompt = `Você é um assistente de comunicação profissional.

Reescreva o texto abaixo seguindo estas diretrizes:
1. Corrija erros de ortografia e gramática
2. Use tom profissional e formal
3. Seja cordial e respeitoso
4. Mantenha o significado original
5. Não adicione informações que não estão no texto original
6. Retorne APENAS o texto reescrito, sem explicações

Texto original:
"${text}"`;

  return axios.post(
    `${GEMINI_IMPROVE_URL}?key=${apiKey}`,
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
};

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

    // Envia para o Gemini para transcrição com fallback automático
    let transcribeResponse;
    try {
      transcribeResponse = await makeTranscribeRequest(audioBase64, mimeType, GEMINI_API_KEY, false);
    } catch (primaryError: any) {
      // Se der erro 429 e existir chave fallback, tenta com ela
      if (primaryError.response?.status === 429 && GEMINI_API_KEY_FALLBACK) {
        console.log("⚠️ [TranscribeAndImprove] Limite atingido na chave principal. Tentando com chave fallback...");
        transcribeResponse = await makeTranscribeRequest(audioBase64, mimeType, GEMINI_API_KEY_FALLBACK, true);
      } else {
        throw primaryError;
      }
    }

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

    // Envia para o Gemini para melhorar com fallback automático
    let improveResponse;
    try {
      improveResponse = await makeImproveRequest(cleanTranscription, GEMINI_API_KEY, false);
    } catch (primaryError: any) {
      // Se der erro 429 e existir chave fallback, tenta com ela
      if (primaryError.response?.status === 429 && GEMINI_API_KEY_FALLBACK) {
        console.log("⚠️ [TranscribeAndImprove] Limite atingido na chave principal (improve). Tentando com chave fallback...");
        improveResponse = await makeImproveRequest(cleanTranscription, GEMINI_API_KEY_FALLBACK, true);
      } else {
        throw primaryError;
      }
    }

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

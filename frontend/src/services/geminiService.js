import axios from "axios";

const GEMINI_API_KEY = "AIzaSyDDH2CMELlWqf2RRY5LkrHoY-QyZoYOEDs";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/**
 * Serviço para melhorar e corrigir textos usando Google Gemini AI
 */
class GeminiService {
  /**
   * Melhora e corrige ortografia de um texto
   * @param {string} text - Texto original a ser melhorado
   * @returns {Promise<string>} - Texto melhorado e corrigido
   */
  async improveText(text) {
    console.log("🤖 Iniciando melhoria de texto:", text);

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

      console.log("🤖 Enviando requisição para Gemini API...");

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
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("🤖 Resposta da API:", response.data);

      // Extrai o texto melhorado da resposta
      const improvedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!improvedText) {
        console.error("🤖 Resposta inválida da API:", response.data);
        throw new Error("Resposta inválida da API");
      }

      // Remove aspas extras se houver
      const finalText = improvedText.trim().replace(/^["']|["']$/g, '');
      console.log("🤖 Texto melhorado:", finalText);

      return finalText;
    } catch (error) {
      console.error("🤖 Erro ao melhorar texto com Gemini:", error);
      console.error("🤖 Detalhes do erro:", error.response?.data);

      // Mensagens de erro mais amigáveis
      if (error.response?.status === 429) {
        throw new Error("Limite de requisições atingido. Tente novamente em alguns segundos.");
      } else if (error.response?.status === 403) {
        throw new Error("Chave de API inválida ou sem permissão.");
      } else if (error.response?.status === 400) {
        throw new Error("Erro na requisição: " + (error.response?.data?.error?.message || "Dados inválidos"));
      } else if (!navigator.onLine) {
        throw new Error("Sem conexão com a internet.");
      } else {
        throw new Error("Não foi possível melhorar o texto. " + (error.message || "Tente novamente."));
      }
    }
  }

  /**
   * Verifica se a API está configurada corretamente
   * @returns {boolean}
   */
  isConfigured() {
    return !!GEMINI_API_KEY;
  }
}

export default new GeminiService();

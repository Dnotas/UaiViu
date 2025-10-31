import api from "./api";

/**
 * Serviço para melhorar e corrigir textos usando Google Gemini AI através do backend
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
      console.log("🤖 Enviando requisição para o backend...");

      const response = await api.post("/ai/improve-text", {
        text: text
      });

      console.log("🤖 Resposta do backend:", response.data);

      const improvedText = response.data?.improvedText;

      if (!improvedText) {
        console.error("🤖 Resposta inválida do backend:", response.data);
        throw new Error("Resposta inválida do servidor");
      }

      console.log("🤖 Texto melhorado:", improvedText);

      return improvedText;
    } catch (error) {
      console.error("🤖 Erro ao melhorar texto:", error);
      console.error("🤖 Detalhes do erro:", error.response?.data);

      // Mensagens de erro mais amigáveis
      if (error.response?.status === 429) {
        throw new Error("Limite de requisições atingido. Tente novamente em alguns segundos.");
      } else if (error.response?.status === 403) {
        throw new Error("Chave de API inválida ou sem permissão.");
      } else if (error.response?.status === 503) {
        throw new Error("Serviço temporariamente indisponível. Tente novamente.");
      } else if (error.response?.status === 408) {
        throw new Error("Tempo limite excedido (3s). Tente com um texto menor.");
      } else if (error.response?.status === 400) {
        throw new Error(error.response?.data?.error || "Texto não pode estar vazio.");
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error("Tempo limite excedido. Tente com um texto menor.");
      } else if (!navigator.onLine) {
        throw new Error("Sem conexão com a internet.");
      } else {
        throw new Error(error.response?.data?.error || "Não foi possível melhorar o texto. Tente novamente.");
      }
    }
  }

  /**
   * Gera uma resposta automática baseada em uma mensagem e contexto
   * @param {Object} targetMessage - Mensagem que precisa ser respondida
   * @param {Array} contextMessages - Mensagens anteriores para contexto
   * @param {string} contactName - Nome do contato
   * @returns {Promise<string>} - Resposta gerada pela IA
   */
  async generateReply(targetMessage, contextMessages = [], contactName = "Cliente") {
    console.log("🤖 Gerando resposta para mensagem:", targetMessage);
    console.log("🤖 Contexto:", contextMessages);

    try {
      console.log("🤖 Enviando requisição para o backend...");

      const response = await api.post("/ai/generate-reply", {
        targetMessage,
        contextMessages,
        contactName
      });

      console.log("🤖 Resposta do backend:", response.data);

      const generatedReply = response.data?.generatedReply;

      if (!generatedReply) {
        console.error("🤖 Resposta inválida do backend:", response.data);
        throw new Error("Resposta inválida do servidor");
      }

      console.log("🤖 Resposta gerada:", generatedReply);

      return generatedReply;
    } catch (error) {
      console.error("🤖 Erro ao gerar resposta:", error);
      console.error("🤖 Detalhes do erro:", error.response?.data);

      // Mensagens de erro mais amigáveis
      if (error.response?.status === 429) {
        throw new Error("Limite de requisições atingido. Tente novamente em alguns segundos.");
      } else if (error.response?.status === 403) {
        throw new Error("Chave de API inválida ou sem permissão.");
      } else if (error.response?.status === 503) {
        throw new Error("Serviço temporariamente indisponível. Tente novamente.");
      } else if (error.response?.status === 408) {
        throw new Error("Tempo limite excedido. Tente novamente.");
      } else if (error.response?.status === 400) {
        throw new Error(error.response?.data?.error || "Mensagem inválida.");
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error("Tempo limite excedido. Tente novamente.");
      } else if (!navigator.onLine) {
        throw new Error("Sem conexão com a internet.");
      } else {
        throw new Error(error.response?.data?.error || "Não foi possível gerar resposta. Tente novamente.");
      }
    }
  }

  /**
   * Transcreve um áudio e melhora o texto com tom profissional e formal
   * @param {File|Blob} audioFile - Arquivo de áudio (MP3, OGG, WAV, M4A)
   * @returns {Promise<string>} - Texto transcrito e melhorado
   */
  async transcribeAndImprove(audioFile) {
    console.log("🎤 Iniciando transcrição e melhoria de áudio:", audioFile.name);

    try {
      console.log("🎤 Criando FormData...");

      const formData = new FormData();
      formData.append("audio", audioFile);

      console.log("🎤 Enviando requisição para o backend...");

      const response = await api.post("/ai/transcribe-and-improve", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        },
        timeout: 90000 // 90 segundos para transcrição + melhoria
      });

      console.log("🎤 Resposta do backend:", response.data);

      const improvedText = response.data?.improvedText;

      if (!improvedText) {
        console.error("🎤 Resposta inválida do backend:", response.data);
        throw new Error("Resposta inválida do servidor");
      }

      console.log("🎤 Texto transcrito e melhorado:", improvedText);

      return improvedText;
    } catch (error) {
      console.error("🎤 Erro ao transcrever e melhorar áudio:", error);
      console.error("🎤 Detalhes do erro:", error.response?.data);

      // Mensagens de erro mais amigáveis
      if (error.response?.status === 429) {
        throw new Error("Limite de requisições atingido. Tente novamente em alguns segundos.");
      } else if (error.response?.status === 403) {
        throw new Error("Chave de API inválida ou sem permissão.");
      } else if (error.response?.status === 503) {
        throw new Error("Serviço temporariamente indisponível. Tente novamente.");
      } else if (error.response?.status === 408) {
        throw new Error("Tempo limite excedido. Áudio muito longo.");
      } else if (error.response?.status === 400) {
        throw new Error(error.response?.data?.error || "Arquivo de áudio inválido.");
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error("Tempo limite excedido. Áudio muito longo.");
      } else if (!navigator.onLine) {
        throw new Error("Sem conexão com a internet.");
      } else {
        throw new Error(error.response?.data?.error || "Não foi possível processar o áudio. Tente novamente.");
      }
    }
  }

  /**
   * Verifica se a API está configurada corretamente
   * @returns {boolean}
   */
  isConfigured() {
    return true; // Sempre configurado pois a chave está no backend
  }
}

export default new GeminiService();

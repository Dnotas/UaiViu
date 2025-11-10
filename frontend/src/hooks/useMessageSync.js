import { useState } from "react";
import { toast } from "react-toastify";
import api from "../services/api";

const useMessageSync = () => {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const checkSync = async (contactId, whatsappId) => {
    setSyncing(true);
    try {
      const { data } = await api.get(
        `/sync/messages/check/${contactId}/${whatsappId}`
      );
      setSyncResult(data);
      return data;
    } catch (error) {
      console.error("Erro ao verificar sincronização:", error);
      toast.error("Erro ao verificar sincronização de mensagens");
      return null;
    } finally {
      setSyncing(false);
    }
  };

  const syncMessages = async (contactId, whatsappId, limit = 50) => {
    setSyncing(true);
    try {
      const { data } = await api.post(
        `/sync/messages/${contactId}/${whatsappId}`,
        { limit }
      );

      setSyncResult(data);

      if (data.success) {
        if (data.syncedMessages > 0) {
          toast.success(
            `${data.syncedMessages} mensagem(ns) sincronizada(s) com sucesso!`
          );
        } else if (data.missingMessages === 0) {
          toast.info("Nenhuma mensagem ausente encontrada. Tudo sincronizado!");
        } else {
          toast.warning(
            `${data.missingMessages} mensagem(ns) ausente(s), mas ${data.syncedMessages} sincronizada(s).`
          );
        }
      } else {
        toast.error("Erro ao sincronizar mensagens");
      }

      return data;
    } catch (error) {
      console.error("Erro ao sincronizar mensagens:", error);
      toast.error("Erro ao sincronizar mensagens");
      return null;
    } finally {
      setSyncing(false);
    }
  };

  const syncTicketMessages = async (ticketId, limit = 50) => {
    setSyncing(true);
    try {
      const { data } = await api.post(
        `/sync/messages/ticket/${ticketId}`,
        { limit }
      );

      setSyncResult(data);

      if (data.success) {
        if (data.syncedMessages > 0) {
          toast.success(
            `${data.syncedMessages} mensagem(ns) sincronizada(s) com sucesso!`
          );
        } else if (data.missingMessages === 0) {
          toast.info("Nenhuma mensagem ausente encontrada. Tudo sincronizado!");
        } else {
          toast.warning(
            `${data.missingMessages} mensagem(ns) ausente(s), mas ${data.syncedMessages} sincronizada(s).`
          );
        }
      } else {
        toast.error("Erro ao sincronizar mensagens");
      }

      return data;
    } catch (error) {
      console.error("Erro ao sincronizar mensagens:", error);
      toast.error("Erro ao sincronizar mensagens");
      return null;
    } finally {
      setSyncing(false);
    }
  };

  return {
    syncing,
    syncResult,
    checkSync,
    syncMessages,
    syncTicketMessages
  };
};

export default useMessageSync;

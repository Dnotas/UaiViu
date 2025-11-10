import React from "react";
import { IconButton, Tooltip, CircularProgress } from "@material-ui/core";
import { Sync as SyncIcon } from "@material-ui/icons";
import useMessageSync from "../../hooks/useMessageSync";

/**
 * Botão para sincronizar mensagens que podem ter sido perdidas
 * Útil para recuperar mensagens que não foram processadas adequadamente
 *
 * Props:
 * - ticketId: ID do ticket (obrigatório)
 * - contactId: ID do contato (opcional, alternativa ao ticketId)
 * - whatsappId: ID do WhatsApp (opcional, necessário se usar contactId)
 * - limit: Número máximo de mensagens para sincronizar (padrão: 50)
 * - onSuccess: Callback executado após sincronização bem-sucedida
 */
const MessageSyncButton = ({
  ticketId,
  contactId,
  whatsappId,
  limit = 50,
  onSuccess
}) => {
  const { syncing, syncTicketMessages, syncMessages } = useMessageSync();

  const handleSync = async () => {
    let result;

    if (ticketId) {
      result = await syncTicketMessages(ticketId, limit);
    } else if (contactId && whatsappId) {
      result = await syncMessages(contactId, whatsappId, limit);
    } else {
      console.error("É necessário fornecer ticketId ou (contactId + whatsappId)");
      return;
    }

    if (result && result.success && onSuccess) {
      onSuccess(result);
    }
  };

  return (
    <Tooltip title="Sincronizar mensagens do WhatsApp">
      <IconButton
        onClick={handleSync}
        disabled={syncing}
        size="small"
        color="primary"
      >
        {syncing ? (
          <CircularProgress size={20} color="inherit" />
        ) : (
          <SyncIcon />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default MessageSyncButton;

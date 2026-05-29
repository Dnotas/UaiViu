import React, { useEffect, useRef, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Avatar from "@material-ui/core/Avatar";
import Badge from "@material-ui/core/Badge";
import TextField from "@material-ui/core/TextField";
import IconButton from "@material-ui/core/IconButton";
import SendIcon from "@material-ui/icons/Send";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";
import ChatBubbleOutlineIcon from "@material-ui/icons/ChatBubbleOutline";
import io from "socket.io-client";
import api from "../../services/api";

const FOOD_API = process.env.REACT_APP_BACKEND_FOOD_URL || "http://localhost:3003";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    height: "calc(100vh - 120px)",
    gap: theme.spacing(2),
  },
  sidebar: {
    width: 320,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  sidebarHeader: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  conversationList: {
    flex: 1,
    overflowY: "auto",
  },
  conversationItem: {
    cursor: "pointer",
    "&:hover": { backgroundColor: theme.palette.action.hover },
    borderRadius: 4,
  },
  activeConversation: {
    backgroundColor: theme.palette.action.selected,
  },
  chatPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  chatHeader: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
  },
  messageBubble: {
    maxWidth: "70%",
    padding: theme.spacing(1, 1.5),
    borderRadius: 12,
    wordBreak: "break-word",
  },
  messageFromMe: {
    alignSelf: "flex-end",
    backgroundColor: "#DCF8C6",
    borderBottomRightRadius: 4,
  },
  messageFromThem: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    border: `1px solid ${theme.palette.divider}`,
    borderBottomLeftRadius: 4,
  },
  messageTime: {
    fontSize: 11,
    color: theme.palette.text.secondary,
    marginTop: 2,
    textAlign: "right",
  },
  inputArea: {
    padding: theme.spacing(1.5),
    borderTop: `1px solid ${theme.palette.divider}`,
    display: "flex",
    gap: theme.spacing(1),
    alignItems: "flex-end",
  },
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: theme.palette.text.secondary,
  },
}));

const formatTime = (ts) => {
  const d = new Date(ts);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const formatLastMessage = (conv) => {
  if (!conv.lastMessage) return "";
  const maxLen = 35;
  return conv.lastMessage.length > maxLen
    ? conv.lastMessage.slice(0, maxLen) + "..."
    : conv.lastMessage;
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
};

const ConversationsPage = () => {
  const classes = useStyles();
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendText, setSendText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const companyId = localStorage.getItem("food_companyId");

  // Carrega lista de conversas
  const loadConversations = () => {
    api.get("/api/food/conversations")
      .then(({ data }) => setConversations(data))
      .catch(console.error);
  };

  useEffect(() => {
    loadConversations();

    // Socket
    const socket = io(FOOD_API, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.emit("joinCompany", companyId);

    socket.on("food:conversation:message", ({ conversationId, message, conversation }) => {
      // Atualiza lista de conversas
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conversationId);
        if (idx === -1) {
          if (conversation) return [conversation, ...prev];
          return prev;
        }
        const updated = [...prev];
        const existing = { ...updated[idx] };
        if (conversation) {
          updated[idx] = conversation;
        } else {
          existing.lastMessage = message.body;
          existing.lastMessageAt = message.timestamp;
          existing.unreadCount = (existing.unreadCount || 0) + (message.fromMe ? 0 : 1);
          updated[idx] = existing;
        }
        // Move to top
        const item = updated.splice(idx, 1)[0];
        return [item, ...updated];
      });

      // Adiciona mensagem no chat aberto
      setSelectedId((currentId) => {
        if (currentId === conversationId) {
          setMessages((prev) => {
            if (prev.find((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
        }
        return currentId;
      });
    });

    return () => socket.disconnect();
  }, []); // eslint-disable-line

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openConversation = async (conv) => {
    setSelectedId(conv.id);
    setActiveConv(conv);
    setMessages([]);
    setLoadingMessages(true);
    try {
      const { data } = await api.get(`/api/food/conversations/${conv.id}/messages`);
      setMessages(data.messages);
      setActiveConv(data.conversation);
      // Marca como lida
      if (conv.unreadCount > 0) {
        await api.patch(`/api/food/conversations/${conv.id}/read`);
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async () => {
    const text = sendText.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    try {
      await api.post(`/api/food/conversations/${selectedId}/messages`, { body: text });
      setSendText("");
    } catch (err) {
      alert(err?.response?.data?.error || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Conversas{totalUnread > 0 ? ` (${totalUnread} não lida${totalUnread > 1 ? "s" : ""})` : ""}
      </Typography>

      <Box className={classes.root}>
        {/* ── Sidebar ── */}
        <Paper className={classes.sidebar}>
          <Box className={classes.sidebarHeader}>
            <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
              Clientes
            </Typography>
          </Box>
          <List disablePadding className={classes.conversationList}>
            {conversations.length === 0 && (
              <Box p={2}>
                <Typography variant="body2" color="textSecondary">
                  Nenhuma conversa ainda
                </Typography>
              </Box>
            )}
            {conversations.map((conv) => (
              <React.Fragment key={conv.id}>
                <ListItem
                  className={`${classes.conversationItem} ${selectedId === conv.id ? classes.activeConversation : ""}`}
                  onClick={() => openConversation(conv)}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={conv.unreadCount || 0}
                      color="error"
                      max={99}
                      invisible={!conv.unreadCount}
                    >
                      <Avatar style={{ backgroundColor: "#e53935" }}>
                        {getInitials(conv.customerName)}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        style={{ fontWeight: conv.unreadCount ? 700 : 400 }}
                        noWrap
                      >
                        {conv.customerName || conv.customerPhone || conv.customerJid}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="textSecondary" noWrap>
                        {formatLastMessage(conv)}
                      </Typography>
                    }
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        </Paper>

        {/* ── Chat Panel ── */}
        <Paper className={classes.chatPanel}>
          {!selectedId ? (
            <Box className={classes.emptyState}>
              <ChatBubbleOutlineIcon style={{ fontSize: 64, opacity: 0.3, marginBottom: 16 }} />
              <Typography variant="body1">Selecione uma conversa para ver as mensagens</Typography>
            </Box>
          ) : (
            <>
              {/* Header */}
              <Box className={classes.chatHeader}>
                <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                  {activeConv?.customerName || activeConv?.customerPhone || "Cliente"}
                </Typography>
                {activeConv?.customerPhone && (
                  <Typography variant="caption" color="textSecondary">
                    {activeConv.customerPhone}
                  </Typography>
                )}
              </Box>

              {/* Messages */}
              <Box className={classes.messagesContainer}>
                {loadingMessages ? (
                  <Box display="flex" justifyContent="center" mt={4}>
                    <CircularProgress />
                  </Box>
                ) : messages.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" align="center">
                    Nenhuma mensagem
                  </Typography>
                ) : (
                  messages.map((msg) => (
                    <Box
                      key={msg.id}
                      className={`${classes.messageBubble} ${msg.fromMe ? classes.messageFromMe : classes.messageFromThem}`}
                    >
                      <Typography variant="body2">{msg.body}</Typography>
                      <Typography className={classes.messageTime}>
                        {formatTime(msg.timestamp)}
                      </Typography>
                    </Box>
                  ))
                )}
                <div ref={messagesEndRef} />
              </Box>

              {/* Input */}
              <Box className={classes.inputArea}>
                <TextField
                  fullWidth
                  multiline
                  rowsMax={4}
                  variant="outlined"
                  size="small"
                  placeholder="Digite uma mensagem..."
                  value={sendText}
                  onChange={(e) => setSendText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                />
                <IconButton
                  color="primary"
                  onClick={handleSend}
                  disabled={!sendText.trim() || sending}
                >
                  {sending ? <CircularProgress size={20} /> : <SendIcon />}
                </IconButton>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default ConversationsPage;

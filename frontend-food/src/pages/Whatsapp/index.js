import React, { useEffect, useState } from "react";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import Chip from "@material-ui/core/Chip";
import CircularProgress from "@material-ui/core/CircularProgress";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import QRCode from "qrcode.react";
import io from "socket.io-client";
import api from "../../services/api";

const STATUS_LABEL = {
  CONNECTED: { label: "Conectado", color: "primary" },
  QRCODE: { label: "Aguardando QR", color: "default" },
  DISCONNECTED: { label: "Desconectado", color: "default" },
  OPENING: { label: "Iniciando...", color: "default" },
  TIMEOUT: { label: "Timeout", color: "default" },
};

const useStyles = makeStyles((theme) => ({
  paper: { padding: theme.spacing(3), maxWidth: 400 },
  qrBox: { display: "flex", justifyContent: "center", margin: theme.spacing(2, 0) },
  danger: { color: theme.palette.error.main, borderColor: theme.palette.error.main },
}));

const WhatsappPage = () => {
  const classes = useStyles();
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/api/food/whatsapp");
        setConnection(data[0] || null);
      } catch {
        toast.error("Erro ao carregar conexão");
      } finally {
        setLoading(false);
      }
    };
    load();

    const companyId = localStorage.getItem("food_companyId");
    const socket = io(process.env.REACT_APP_BACKEND_FOOD_URL || "http://localhost:3003");
    socket.emit("joinCompany", companyId);
    socket.on("food-whatsapp-update", (data) => {
      if (data.action === "update") {
        setConnection(prev => prev ? { ...prev, ...data.whatsapp } : data.whatsapp);
      }
    });

    return () => socket.disconnect();
  }, []);

  const handleConnect = async () => {
    try {
      const { data } = await api.post("/api/food/whatsapp");
      setConnection(data);
      toast.info("Iniciando conexão... aguarde o QR code");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao criar conexão");
    }
  };

  const handleReconnect = async () => {
    try {
      await api.post(`/api/food/whatsapp/${connection.id}/reconnect`);
      setConnection(prev => ({ ...prev, status: "OPENING", qrcode: null }));
      toast.info("Reconectando... aguarde o QR code");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao reconectar");
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Desconectar o WhatsApp?")) return;
    try {
      await api.post(`/api/food/whatsapp/${connection.id}/disconnect`);
      setConnection(prev => ({ ...prev, status: "DISCONNECTED", qrcode: null }));
      toast.success("Desconectado");
    } catch {
      toast.error("Erro ao desconectar");
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Remover esta conexão? Você poderá conectar um novo número depois.")) return;
    try {
      await api.delete(`/api/food/whatsapp/${connection.id}`);
      setConnection(null);
      toast.success("Conexão removida. Clique em Conectar para usar outro número.");
    } catch {
      toast.error("Erro ao remover conexão");
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  const statusInfo = STATUS_LABEL[connection?.status] || STATUS_LABEL.DISCONNECTED;

  return (
    <div>
      <Typography variant="h5" gutterBottom>Conexão WhatsApp</Typography>
      <Paper className={classes.paper}>
        {!connection ? (
          <>
            <Typography variant="body1" gutterBottom>
              Nenhuma conexão configurada. Clique abaixo para conectar.
            </Typography>
            <Button variant="contained" color="primary" onClick={handleConnect}>
              Conectar WhatsApp
            </Button>
          </>
        ) : (
          <>
            <Box display="flex" alignItems="center" style={{ gap: 12, marginBottom: 16 }}>
              <Typography variant="h6">{connection.name}</Typography>
              <Chip label={statusInfo.label} color={statusInfo.color} size="small" />
            </Box>

            {connection.phone && (
              <Typography variant="body2" gutterBottom>Número: {connection.phone}</Typography>
            )}

            {connection.status === "QRCODE" && connection.qrcode && (
              <div className={classes.qrBox}>
                <QRCode value={connection.qrcode} size={220} />
              </div>
            )}

            {connection.status === "QRCODE" && (
              <Typography variant="caption" color="textSecondary" display="block" align="center">
                Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo
              </Typography>
            )}

            <Box mt={2} display="flex" style={{ gap: 8, flexWrap: "wrap" }}>
              {connection.status === "CONNECTED" && (
                <Button variant="outlined" color="secondary" onClick={handleDisconnect}>
                  Desconectar
                </Button>
              )}

              {(connection.status === "DISCONNECTED" || connection.status === "TIMEOUT") && (
                <Button variant="contained" color="primary" onClick={handleReconnect}>
                  Reconectar
                </Button>
              )}

              {connection.status !== "QRCODE" && connection.status !== "OPENING" && (
                <Button variant="outlined" className={classes.danger} onClick={handleRemove}>
                  Trocar número
                </Button>
              )}
            </Box>
          </>
        )}
      </Paper>
    </div>
  );
};

export default WhatsappPage;

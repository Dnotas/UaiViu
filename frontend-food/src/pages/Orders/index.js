import React, { useEffect, useState, useCallback } from "react";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Box from "@material-ui/core/Box";
import Chip from "@material-ui/core/Chip";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import io from "socket.io-client";
import api from "../../services/api";

const STATUS_COLUMNS = [
  { key: "confirmed", label: "Confirmados", color: "#1976d2" },
  { key: "preparing", label: "Em Preparo", color: "#f57c00" },
  { key: "on_the_way", label: "Saiu p/ Entrega", color: "#7b1fa2" },
  { key: "delivered", label: "Entregues", color: "#388e3c" },
];

const NEXT_STATUS = {
  confirmed: "preparing",
  preparing: "on_the_way",
  on_the_way: "delivered",
};

const NEXT_LABEL = {
  confirmed: "Iniciar Preparo",
  preparing: "Saiu para Entrega",
  on_the_way: "Marcar Entregue",
};

const PAYMENT_LABEL = { cash: "Pagar na entrega", pix: "PIX", credit: "Cartão Crédito", debit: "Cartão Débito" };

const useStyles = makeStyles((theme) => ({
  column: { minHeight: 200 },
  columnHeader: { padding: theme.spacing(1, 2), borderRadius: "8px 8px 0 0", color: "white" },
  orderCard: { padding: theme.spacing(2), marginBottom: theme.spacing(1), cursor: "default" },
  orderId: { fontWeight: "bold", fontSize: 12, color: theme.palette.text.secondary },
}));

const OrdersPage = () => {
  const classes = useStyles();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get("/api/food/orders");
      setOrders(data);
    } catch (err) {
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const companyId = localStorage.getItem("food_companyId");
    const socket = io(process.env.REACT_APP_BACKEND_FOOD_URL || "http://localhost:3003");
    socket.emit("joinCompany", companyId);
    socket.on("food-order-update", (data) => {
      if (data.action === "new") {
        setOrders(prev => [data.order, ...prev]);
        toast.info(`🆕 Novo pedido de ${data.order.customerName || "cliente"}!`);
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          [0, 0.2, 0.4].forEach(t => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.3, ctx.currentTime + t);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);
            osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.15);
          });
        } catch(e) {}
      } else if (data.action === "update") {
        setOrders(prev => prev.map(o => o.id === data.order.id ? { ...o, ...data.order } : o));
      }
    });

    return () => socket.disconnect();
  }, [fetchOrders]);

  const advance = async (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      await api.patch(`/api/food/orders/${order.id}/status`, { status: next });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o));
      toast.success("Status atualizado");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const cancel = async (order) => {
    if (!window.confirm("Cancelar este pedido?")) return;
    try {
      await api.patch(`/api/food/orders/${order.id}/status`, { status: "cancelled" });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "cancelled" } : o));
    } catch {
      toast.error("Erro ao cancelar pedido");
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  return (
    <div>
      <Typography variant="h5" gutterBottom>Pedidos</Typography>
      <Grid container spacing={2}>
        {STATUS_COLUMNS.map((col) => {
          const colOrders = orders.filter(o => o.status === col.key);
          return (
            <Grid item xs={12} sm={6} md={3} key={col.key}>
              <div className={classes.columnHeader} style={{ backgroundColor: col.color }}>
                <Typography variant="subtitle1">{col.label} ({colOrders.length})</Typography>
              </div>
              <Paper className={classes.column} style={{ borderRadius: "0 0 8px 8px", padding: 8 }}>
                {colOrders.map(order => (
                  <Paper key={order.id} className={classes.orderCard} elevation={2}>
                    <Typography className={classes.orderId}>#{order.id}</Typography>
                    <Typography variant="body2"><strong>{order.customerName}</strong></Typography>
                    <Typography variant="caption">{order.customerPhone}</Typography>
                    <Typography variant="body2">R$ {parseFloat(order.total).toFixed(2)}</Typography>
                    <Typography variant="caption">{PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}</Typography>
                    {order.items && (
                      <Box mt={0.5}>
                        {order.items.map(item => (
                          <Typography key={item.id} variant="caption" display="block">
                            {item.quantity}x {item.name}
                          </Typography>
                        ))}
                      </Box>
                    )}
                    {NEXT_STATUS[order.status] && (
                      <Box mt={1} display="flex" style={{ gap: 4 }}>
                        <Button size="small" variant="contained" color="primary" onClick={() => advance(order)}>
                          {NEXT_LABEL[order.status]}
                        </Button>
                        <Button size="small" variant="outlined" color="secondary" onClick={() => cancel(order)}>
                          Cancelar
                        </Button>
                      </Box>
                    )}
                  </Paper>
                ))}
                {colOrders.length === 0 && (
                  <Typography variant="caption" color="textSecondary" style={{ padding: 8, display: "block" }}>
                    Nenhum pedido
                  </Typography>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </div>
  );
};

export default OrdersPage;

import React, { useEffect, useState, useCallback } from "react";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Box from "@material-ui/core/Box";
import Chip from "@material-ui/core/Chip";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Divider from "@material-ui/core/Divider";
import TextField from "@material-ui/core/TextField";
import CircularProgress from "@material-ui/core/CircularProgress";
import Switch from "@material-ui/core/Switch";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import VisibilityIcon from "@material-ui/icons/Visibility";
import PrintIcon from "@material-ui/icons/Print";
import CancelIcon from "@material-ui/icons/Cancel";
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

const getNextLabel = (order) => {
  if (order.status === "preparing" && order.orderType === "pickup") return "Pronto p/ Retirada";
  return NEXT_LABEL[order.status];
};

const PAYMENT_LABEL = {
  cash: "Pagar na entrega", cash_money: "Dinheiro na entrega",
  cash_pix: "PIX na entrega", cash_card: "Cartão na entrega",
  pix: "PIX", credit: "Cartão Crédito", debit: "Cartão Débito",
};

const useStyles = makeStyles((theme) => ({
  column: { minHeight: 200 },
  columnHeader: { padding: theme.spacing(1, 2), borderRadius: "8px 8px 0 0", color: "white" },
  orderCard: { padding: theme.spacing(2), marginBottom: theme.spacing(1), cursor: "default" },
  orderId: { fontWeight: "bold", fontSize: 12, color: theme.palette.text.secondary },
}));

const PAYMENT_LABEL_FULL = { cash: "Dinheiro / Pagar na entrega", cash_money: "Dinheiro na entrega", cash_pix: "PIX na entrega", cash_card: "Cartão na entrega", pix: "PIX", credit: "Cartão de Crédito", debit: "Cartão de Débito" };

// Formata telefone BR: (xx) xxxxx-xxxx (celular, 11 dígitos) ou (xx) xxxx-xxxx (fixo, 10 dígitos)
const formatPhone = (phone) => {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "").replace(/^55/, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
};

const printOrder = (order) => {
  const address = order.orderType === "pickup"
    ? "Retirada no local"
    : [
        order.customerAddress,
        order.customerAddressNumber && `Nº ${order.customerAddressNumber}`,
        order.customerAddressComplement,
        order.customerNeighborhood,
      ].filter(Boolean).join(", ");

  const itemsHtml = (order.items || []).map(i => `
    <tr>
      <td style="padding:4px 4px">${i.quantity}x ${i.name}</td>
      <td style="padding:4px 2px;text-align:right;white-space:nowrap">R$&nbsp;${parseFloat(i.unitPrice || i.total / i.quantity).toFixed(2)}</td>
      <td style="padding:4px 4px;text-align:right;white-space:nowrap"><strong>R$&nbsp;${parseFloat(i.total || i.unitPrice * i.quantity).toFixed(2)}</strong></td>
    </tr>
    ${i.complementsText ? `<tr><td colspan="3" style="padding:0 8px">Acréscimos: ${i.complementsText}</td></tr>` : ""}
    ${i.notes ? `<tr><td colspan="3" style="padding:0 8px 6px 8px"><strong style="font-size:14px">Obs: ${i.notes}</strong></td></tr>` : ""}`
  ).join("");

  const deliveryFee = parseFloat(order.deliveryFee || 0);
  const subtotal = parseFloat(order.subtotal || order.total - deliveryFee);

  const win = window.open("", "_blank", "width=400,height=600");
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>Pedido #${order.id}</title>
    <style>
      @page { size: 80mm auto; margin: 0; }
      body { font-family: monospace; font-size: 13px; margin: 0; padding: 3mm; color: #000; }
      h2 { text-align: center; margin: 4px 0; }
      .center { text-align: center; }
      .divider { border-top: 1px dashed #000; margin: 8px 0; }
      table { width: 100%; border-collapse: collapse; }
      td { vertical-align: top; }
      .total-row td { font-size: 15px; font-weight: bold; padding-top: 8px; }
    </style>
  </head><body>
    <h2>${order.restaurantName || "Pedido"}</h2>
    <p class="center">Pedido #${order.id} — ${new Date(order.createdAt).toLocaleString("pt-BR")}</p>
    <div class="divider"></div>
    <p><strong>Cliente:</strong> ${order.customerName || "—"}</p>
    <p><strong>Telefone:</strong> ${formatPhone(order.customerPhone)}</p>
    <p><strong>Endereco:</strong> ${address || "—"}</p>
    <p><strong>Pagamento:</strong> ${PAYMENT_LABEL_FULL[order.paymentMethod] || order.paymentMethod}</p>
    <div class="divider"></div>
    <table>
      <thead>
        <tr>
          <td><strong>Item</strong></td>
          <td style="text-align:right"><strong>Unit.</strong></td>
          <td style="text-align:right"><strong>Total</strong></td>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="divider"></div>
    <table>
      <tr><td>Subtotal</td><td style="text-align:right;white-space:nowrap">R$&nbsp;${subtotal.toFixed(2)}</td></tr>
      ${deliveryFee > 0 ? `<tr><td>Taxa de entrega</td><td style="text-align:right;white-space:nowrap">R$&nbsp;${deliveryFee.toFixed(2)}</td></tr>` : ""}
      <tr class="total-row"><td>TOTAL</td><td style="text-align:right;white-space:nowrap">R$&nbsp;${parseFloat(order.total).toFixed(2)}</td></tr>
    </table>
    ${order.notes ? `<div class="divider"></div><p><strong>Obs:</strong> ${order.notes}</p>` : ""}
    <div class="divider"></div>
    <p class="center">Obrigado pela preferencia!</p>
  </body></html>`);
  win.document.close();
  win.focus();
  win.addEventListener("afterprint", () => win.close());
  win.print();
};

const OrdersPage = () => {
  const classes = useStyles();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addressDialog, setAddressDialog] = useState({ open: false, order: null });
  const [cancelDialog, setCancelDialog] = useState({ open: false, order: null, reason: "" });
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem("food_autoPrint") === "true");

  const handleAutoPrintToggle = (e) => {
    const val = e.target.checked;
    setAutoPrint(val);
    localStorage.setItem("food_autoPrint", String(val));
  };

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
    // Rejunta a sala após reconexão (ex: backend reiniciou)
    socket.on("connect", () => socket.emit("joinCompany", companyId));
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

    // Polling de segurança: recarrega pedidos a cada 30s para não perder nada
    const poll = setInterval(fetchOrders, 30000);

    return () => { socket.disconnect(); clearInterval(poll); };
  }, [fetchOrders]);

  const advance = async (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      await api.patch(`/api/food/orders/${order.id}/status`, { status: next });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o));
      toast.success("Status atualizado");
      if (autoPrint && order.status === "confirmed") {
        printOrder(order);
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao atualizar status");
    }
  };

  const cancel = async () => {
    const { order, reason } = cancelDialog;
    if (!reason.trim()) { toast.error("Informe o motivo do cancelamento"); return; }
    try {
      await api.patch(`/api/food/orders/${order.id}/status`, { status: "cancelled", reason: reason.trim() });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "cancelled" } : o));
      setCancelDialog({ open: false, order: null, reason: "" });
      toast.success("Pedido cancelado — cliente notificado pelo WhatsApp");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao cancelar pedido");
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  return (
    <div>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="h5">Pedidos</Typography>
        <Tooltip title="Quando ativo, imprime o pedido automaticamente ao clicar em 'Iniciar Preparo'">
          <FormControlLabel
            control={<Switch checked={autoPrint} onChange={handleAutoPrintToggle} color="primary" size="small" />}
            label={<Typography variant="body2">Auto-impressao ao aceitar</Typography>}
            style={{ margin: 0 }}
          />
        </Tooltip>
      </Box>
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
                    <Typography variant="caption">{formatPhone(order.customerPhone)}</Typography>
                    <Typography variant="body2">R$ {parseFloat(order.total).toFixed(2)}</Typography>
                    <Typography variant="caption">{PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}</Typography>
                    {order.items && (
                      <Box mt={0.5}>
                        {order.items.map(item => (
                          <React.Fragment key={item.id}>
                            <Typography variant="caption" display="block">
                              {item.quantity}x {item.name}
                            </Typography>
                            {item.complementsText && (
                              <Typography variant="caption" display="block" style={{ marginLeft: 8 }}>
                                Acréscimos: {item.complementsText}
                              </Typography>
                            )}
                            {item.notes && (
                              <Typography variant="caption" display="block" style={{ color: "#795548", fontWeight: "bold", marginLeft: 8, fontSize: 13 }}>
                                Obs: {item.notes}
                              </Typography>
                            )}
                          </React.Fragment>
                        ))}
                      </Box>
                    )}
                    {order.notes && (
                      <Box mt={0.5} p={0.5} style={{ background: "#fff8e1", borderRadius: 4, borderLeft: "3px solid #ffc107" }}>
                        <Typography variant="caption" display="block" style={{ color: "#795548" }}>
                          📝 {order.notes}
                        </Typography>
                      </Box>
                    )}
                    <Box mt={1} display="flex" alignItems="center" style={{ gap: 4 }}>
                      <Tooltip title="Ver endereço">
                        <IconButton size="small" onClick={() => setAddressDialog({ open: true, order })}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Imprimir pedido">
                        <IconButton size="small" onClick={() => printOrder(order)}>
                          <PrintIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    {NEXT_STATUS[order.status] && (
                      <Box mt={1} display="flex" style={{ gap: 4 }}>
                        <Button size="small" variant="contained" color="primary" onClick={() => advance(order)}>
                          {getNextLabel(order)}
                        </Button>
                        <Button size="small" variant="outlined" color="secondary"
                          onClick={() => setCancelDialog({ open: true, order, reason: "" })}>
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
      {/* Dialog cancelamento */}
      <Dialog open={cancelDialog.open} onClose={() => setCancelDialog({ open: false, order: null, reason: "" })} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" style={{ gap: 8 }}>
            <CancelIcon style={{ color: "#d32f2f" }} />
            Cancelar Pedido #{cancelDialog.order?.id}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Informe o motivo do cancelamento. O cliente sera notificado pelo WhatsApp.
          </Typography>
          <TextField
            autoFocus fullWidth multiline rows={3}
            label="Motivo do cancelamento"
            placeholder="Ex: Produto esgotado, fora da area de entrega..."
            value={cancelDialog.reason}
            onChange={e => setCancelDialog(d => ({ ...d, reason: e.target.value }))}
            variant="outlined"
            style={{ marginTop: 8 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog({ open: false, order: null, reason: "" })}>Voltar</Button>
          <Button onClick={cancel} variant="contained" style={{ backgroundColor: "#d32f2f", color: "white" }}>
            Confirmar cancelamento
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog endereço */}
      <Dialog open={addressDialog.open} onClose={() => setAddressDialog({ open: false, order: null })} maxWidth="xs" fullWidth>
        <DialogTitle>Endereço — Pedido #{addressDialog.order?.id}</DialogTitle>
        <DialogContent>
          {addressDialog.order?.orderType === "pickup" ? (
            <Typography variant="body1"><strong>Retirada no local</strong></Typography>
          ) : (
            <Box>
              <Typography variant="body2"><strong>Cliente:</strong> {addressDialog.order?.customerName || "—"}</Typography>
              <Typography variant="body2"><strong>Telefone:</strong> {formatPhone(addressDialog.order?.customerPhone)}</Typography>
              <Divider style={{ margin: "8px 0" }} />
              <Typography variant="body2"><strong>Rua:</strong> {addressDialog.order?.customerAddress || "—"}</Typography>
              <Typography variant="body2"><strong>Número:</strong> {addressDialog.order?.customerAddressNumber || "—"}</Typography>
              {addressDialog.order?.customerAddressComplement && (
                <Typography variant="body2"><strong>Complemento:</strong> {addressDialog.order.customerAddressComplement}</Typography>
              )}
              <Typography variant="body2"><strong>Bairro:</strong> {addressDialog.order?.customerNeighborhood || "—"}</Typography>
            </Box>
          )}
          {addressDialog.order?.notes && (
            <Box mt={1} p={1} style={{ background: "#fff8e1", borderRadius: 4, borderLeft: "3px solid #ffc107" }}>
              <Typography variant="body2"><strong>📝 Observações:</strong> {addressDialog.order.notes}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddressDialog({ open: false, order: null })} color="primary">Fechar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default OrdersPage;

import React, { useEffect, useState, useCallback } from "react";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import TextField from "@material-ui/core/TextField";
import Divider from "@material-ui/core/Divider";
import CircularProgress from "@material-ui/core/CircularProgress";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  metricCard: {
    padding: theme.spacing(2, 3),
    textAlign: "center",
    borderRadius: 12,
    height: "100%",
  },
  metricValue: { fontSize: 36, fontWeight: "bold", lineHeight: 1.2 },
  metricLabel: { color: theme.palette.text.secondary, marginTop: 4, fontSize: 13 },
  menuLink: {
    padding: theme.spacing(2),
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    wordBreak: "break-all",
    marginBottom: theme.spacing(3),
  },
  filterBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    borderRadius: 10,
  },
  sectionTitle: { fontWeight: "bold", marginBottom: theme.spacing(1), marginTop: theme.spacing(3) },
  rankRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing(0.75, 0),
    borderBottom: "1px solid #f0f0f0",
  },
  payRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: theme.spacing(0.5, 0),
  },
}));

const PRESETS = [
  { label: "Hoje",       days: 0 },
  { label: "Ontem",      days: 1 },
  { label: "7 dias",     days: 7 },
  { label: "30 dias",    days: 30 },
  { label: "Este mês",   days: -1 }, // especial
];

const PAYMENT_LABEL = {
  cash: "Dinheiro (entrega)", cash_money: "Dinheiro (entrega)",
  cash_pix: "PIX (entrega)", cash_card: "Cartão (entrega)",
  pix: "PIX", credit: "Crédito", debit: "Débito",
};
const STATUS_LABEL   = { confirmed: "Confirmados", preparing: "Em Preparo", on_the_way: "Saiu p/ Entrega", delivered: "Entregues", cancelled: "Cancelados" };
const STATUS_COLOR   = { confirmed: "#1976d2", preparing: "#f57c00", on_the_way: "#7b1fa2", delivered: "#388e3c", cancelled: "#d32f2f" };

const fmt = (v) => `R$ ${parseFloat(v || 0).toFixed(2).replace(".", ",")}`;

const toDateInput = (d) => d.toISOString().slice(0, 10);

const Dashboard = () => {
  const classes = useStyles();

  const [orders, setOrders]   = useState([]);
  const [config, setConfig]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset]   = useState(0); // índice em PRESETS ou -1 = personalizado

  const today = new Date();
  const [dateFrom, setDateFrom] = useState(toDateInput(today));
  const [dateTo,   setDateTo]   = useState(toDateInput(today));

  const applyPreset = useCallback((idx) => {
    setPreset(idx);
    const p = PRESETS[idx];
    const now = new Date();
    if (p.days === 0) {
      setDateFrom(toDateInput(now));
      setDateTo(toDateInput(now));
    } else if (p.days === 1) {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      setDateFrom(toDateInput(y)); setDateTo(toDateInput(y));
    } else if (p.days === -1) {
      // Este mês
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(toDateInput(first)); setDateTo(toDateInput(now));
    } else {
      const from = new Date(now); from.setDate(from.getDate() - (p.days - 1));
      setDateFrom(toDateInput(from)); setDateTo(toDateInput(now));
    }
  }, []);

  const loadOrders = useCallback(async (from, to) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/food/orders?dateFrom=${from}&dateTo=${to}`);
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega config e preset inicial (hoje)
  useEffect(() => {
    api.get("/api/food/restaurant-config").then(r => setConfig(r.data)).catch(() => {});
    applyPreset(0);
  }, [applyPreset]);

  // Recarrega ao mudar datas
  useEffect(() => {
    loadOrders(dateFrom, dateTo);
  }, [dateFrom, dateTo, loadOrders]);

  // ── Métricas ──────────────────────────────────────────────────────────────
  const delivered  = orders.filter(o => o.status === "delivered");
  const cancelled  = orders.filter(o => o.status === "cancelled");
  const active     = orders.filter(o => !["cancelled"].includes(o.status));

  const faturamento   = delivered.reduce((s, o) => s + parseFloat(o.total || 0), 0);
  const taxaEntrega   = delivered.reduce((s, o) => s + parseFloat(o.deliveryFee || 0), 0);
  const ticketMedio   = delivered.length ? faturamento / delivered.length : 0;

  // Top produtos
  const prodMap = {};
  active.forEach(o => {
    (o.items || []).forEach(i => {
      const k = i.name;
      if (!prodMap[k]) prodMap[k] = { qty: 0, total: 0 };
      prodMap[k].qty   += i.quantity;
      prodMap[k].total += parseFloat(i.total || i.unitPrice * i.quantity || 0);
    });
  });
  const topProd = Object.entries(prodMap)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 8);

  // Por forma de pagamento
  const payMap = {};
  delivered.forEach(o => {
    const k = o.paymentMethod;
    if (!payMap[k]) payMap[k] = { count: 0, total: 0 };
    payMap[k].count++;
    payMap[k].total += parseFloat(o.total || 0);
  });

  // Por status
  const statusCount = {};
  orders.forEach(o => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });

  const menuUrl = config?.slug
    ? `${process.env.REACT_APP_PUBLIC_MENU_URL || window.location.origin + "/cardapio"}/${config.slug}`
    : null;

  return (
    <div>
      <Typography variant="h5" gutterBottom>Dashboard</Typography>

      {menuUrl && (
        <Paper className={classes.menuLink}>
          <Typography variant="body2" color="textSecondary">Link do seu cardápio (enviar para clientes):</Typography>
          <Typography variant="body1"><strong>{menuUrl}</strong></Typography>
        </Paper>
      )}

      {/* ── Filtro de período ── */}
      <Paper className={classes.filterBar} elevation={1}>
        <ButtonGroup size="small" variant="outlined">
          {PRESETS.map((p, idx) => (
            <Button
              key={p.label}
              variant={preset === idx ? "contained" : "outlined"}
              color={preset === idx ? "primary" : "default"}
              onClick={() => applyPreset(idx)}
            >
              {p.label}
            </Button>
          ))}
        </ButtonGroup>

        <Box display="flex" alignItems="center" style={{ gap: 8, marginLeft: 8 }}>
          <TextField
            type="date" size="small" label="De" variant="outlined"
            InputLabelProps={{ shrink: true }}
            value={dateFrom}
            onChange={e => { setPreset(-1); setDateFrom(e.target.value); }}
            style={{ width: 150 }}
          />
          <TextField
            type="date" size="small" label="Até" variant="outlined"
            InputLabelProps={{ shrink: true }}
            value={dateTo}
            onChange={e => { setPreset(-1); setDateTo(e.target.value); }}
            style={{ width: 150 }}
          />
        </Box>

        {loading && <CircularProgress size={20} style={{ marginLeft: 8 }} />}
      </Paper>

      {/* ── Cards principais ── */}
      <Grid container spacing={2}>
        {[
          { label: "Pedidos no período", value: orders.length,          color: "#1976d2", prefix: "" },
          { label: "Faturamento",        value: fmt(faturamento),       color: "#388e3c", prefix: "" },
          { label: "Ticket médio",       value: fmt(ticketMedio),       color: "#f57c00", prefix: "" },
          { label: "Entregues",          value: delivered.length,       color: "#388e3c", prefix: "" },
          { label: "Cancelados",         value: cancelled.length,       color: "#d32f2f", prefix: "" },
          { label: "Taxa de entrega",    value: fmt(taxaEntrega),       color: "#7b1fa2", prefix: "" },
        ].map(card => (
          <Grid item xs={6} sm={4} md={2} key={card.label}>
            <Paper className={classes.metricCard} elevation={2}>
              <Typography className={classes.metricValue} style={{ color: card.color }}>
                {card.value}
              </Typography>
              <Typography className={classes.metricLabel}>{card.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} style={{ marginTop: 8 }}>

        {/* ── Pedidos por status ── */}
        <Grid item xs={12} sm={6} md={4}>
          <Paper style={{ padding: 16, borderRadius: 12 }} elevation={2}>
            <Typography className={classes.sectionTitle} variant="subtitle1" style={{ marginTop: 0 }}>
              Pedidos por status
            </Typography>
            <Divider style={{ marginBottom: 8 }} />
            {Object.entries(STATUS_LABEL).map(([key, label]) => (
              <div key={key} className={classes.payRow}>
                <Typography variant="body2" style={{ color: STATUS_COLOR[key] }}>{label}</Typography>
                <Typography variant="body2"><strong>{statusCount[key] || 0}</strong></Typography>
              </div>
            ))}
          </Paper>
        </Grid>

        {/* ── Por forma de pagamento ── */}
        <Grid item xs={12} sm={6} md={4}>
          <Paper style={{ padding: 16, borderRadius: 12 }} elevation={2}>
            <Typography className={classes.sectionTitle} variant="subtitle1" style={{ marginTop: 0 }}>
              Faturamento por pagamento
            </Typography>
            <Divider style={{ marginBottom: 8 }} />
            {Object.entries(payMap).length === 0 ? (
              <Typography variant="caption" color="textSecondary">Nenhum pedido entregue no período</Typography>
            ) : Object.entries(payMap).sort((a, b) => b[1].total - a[1].total).map(([key, v]) => (
              <div key={key} className={classes.payRow}>
                <Typography variant="body2">{PAYMENT_LABEL[key] || key} ({v.count}x)</Typography>
                <Typography variant="body2"><strong>{fmt(v.total)}</strong></Typography>
              </div>
            ))}
          </Paper>
        </Grid>

        {/* ── Top produtos ── */}
        <Grid item xs={12} md={4}>
          <Paper style={{ padding: 16, borderRadius: 12 }} elevation={2}>
            <Typography className={classes.sectionTitle} variant="subtitle1" style={{ marginTop: 0 }}>
              Top produtos vendidos
            </Typography>
            <Divider style={{ marginBottom: 8 }} />
            {topProd.length === 0 ? (
              <Typography variant="caption" color="textSecondary">Nenhum pedido no período</Typography>
            ) : topProd.map(([name, v], idx) => (
              <div key={name} className={classes.rankRow}>
                <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                  <Typography variant="caption" style={{ color: "#999", minWidth: 18, fontWeight: "bold" }}>
                    {idx + 1}º
                  </Typography>
                  <Typography variant="body2" style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {name}
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="body2"><strong>{v.qty}x</strong></Typography>
                  <Typography variant="caption" color="textSecondary">{fmt(v.total)}</Typography>
                </Box>
              </div>
            ))}
          </Paper>
        </Grid>

      </Grid>
    </div>
  );
};

export default Dashboard;

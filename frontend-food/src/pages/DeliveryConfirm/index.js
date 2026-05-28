import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";

const FOOD_API = process.env.REACT_APP_BACKEND_FOOD_URL || "http://localhost:3003";

const PAYMENT_LABEL = { cash: "Pagar na entrega", pix: "PIX", credit: "Cartão Crédito", debit: "Cartão Débito" };

const useStyles = makeStyles((theme) => ({
  root: { minHeight: "100vh", backgroundColor: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", padding: theme.spacing(2) },
  paper: { padding: theme.spacing(3), maxWidth: 400, width: "100%" },
  success: { textAlign: "center", color: theme.palette.success.main },
}));

const DeliveryConfirmPage = () => {
  const { token } = useParams();
  const classes = useStyles();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    axios.get(`${FOOD_API}/api/food/delivery/${token}`)
      .then(({ data }) => setOrder(data))
      .catch(() => toast.error("Pedido não encontrado"))
      .finally(() => setLoading(false));
  }, [token]);

  const confirm = async () => {
    setConfirming(true);
    try {
      await axios.post(`${FOOD_API}/api/food/delivery/${token}/confirm`);
      setDone(true);
      toast.success("Entrega confirmada!");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao confirmar");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <div className={classes.root}>
      <Paper className={classes.paper}>
        {done ? (
          <div className={classes.success}>
            <CheckCircleIcon style={{ fontSize: 64 }} />
            <Typography variant="h5" gutterBottom>Entrega confirmada!</Typography>
            <Typography variant="body2" color="textSecondary">O cliente foi notificado pelo WhatsApp.</Typography>
          </div>
        ) : order ? (
          <>
            <Typography variant="h6" gutterBottom>Pedido #{order.id}</Typography>
            <Typography variant="body2"><strong>Cliente:</strong> {order.customerName}</Typography>
            <Typography variant="body2"><strong>Endereço:</strong> {order.customerAddress}</Typography>
            {order.customerNeighborhood && <Typography variant="body2">{order.customerNeighborhood}</Typography>}
            <Divider style={{ margin: "12px 0" }} />
            <Typography variant="subtitle2">Itens:</Typography>
            {(order.items || []).map(item => (
              <Typography key={item.id} variant="body2">{item.quantity}x {item.name}</Typography>
            ))}
            <Divider style={{ margin: "12px 0" }} />
            <Typography variant="body1"><strong>Total: R$ {parseFloat(order.total).toFixed(2)}</strong></Typography>
            <Typography variant="body2" color="textSecondary">Pagamento: {PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}</Typography>
            <Button fullWidth variant="contained" color="primary" size="large" style={{ marginTop: 24 }}
              onClick={confirm} disabled={confirming}>
              {confirming ? <CircularProgress size={24} color="inherit" /> : "✓ Confirmar Entrega"}
            </Button>
          </>
        ) : (
          <Typography color="error">Pedido não encontrado ou já entregue.</Typography>
        )}
      </Paper>
    </div>
  );
};

export default DeliveryConfirmPage;

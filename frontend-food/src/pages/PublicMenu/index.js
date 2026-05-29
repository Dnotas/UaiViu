import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardMedia from "@material-ui/core/CardMedia";
import CardContent from "@material-ui/core/CardContent";
import CardActions from "@material-ui/core/CardActions";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import Badge from "@material-ui/core/Badge";
import Drawer from "@material-ui/core/Drawer";
import TextField from "@material-ui/core/TextField";
import Divider from "@material-ui/core/Divider";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Radio from "@material-ui/core/Radio";
import CircularProgress from "@material-ui/core/CircularProgress";
import ShoppingCartIcon from "@material-ui/icons/ShoppingCart";
import AddIcon from "@material-ui/icons/Add";
import RemoveIcon from "@material-ui/icons/Remove";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const FOOD_API = process.env.REACT_APP_BACKEND_FOOD_URL || "http://localhost:3003";

const useStyles = makeStyles((theme) => ({
  header: {
    backgroundColor: theme.palette.primary.main,
    color: "white",
    padding: theme.spacing(2, 3),
    position: "sticky", top: 0, zIndex: 100,
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  groupTitle: {
    padding: theme.spacing(2, 2, 1),
    fontWeight: "bold",
    backgroundColor: "#f5f5f5",
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    margin: theme.spacing(2, 0, 1),
  },
  card: { display: "flex", marginBottom: theme.spacing(1) },
  cardInfo: { flex: 1 },
  cardImg: { width: 90, height: 90, objectFit: "cover", borderRadius: 8, margin: 8 },
  qty: { display: "flex", alignItems: "center", gap: 4 },
  cartDrawer: { width: 360, padding: theme.spacing(2), [theme.breakpoints.down("xs")]: { width: "100vw" } },
  cartItem: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing(1) },
  total: { fontWeight: "bold", fontSize: 18, color: theme.palette.primary.main },
  payOption: { border: "1px solid #ddd", borderRadius: 8, marginBottom: 4, padding: "4px 12px" },
}));

const PublicMenu = () => {
  const { slug } = useParams();
  const classes = useStyles();

  const [restaurant, setRestaurant] = useState(null);
  const [groups, setGroups] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderType, setOrderType] = useState("delivery");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [form, setForm] = useState({ customerName: "", customerPhone: "", cep: "", customerAddress: "", customerAddressNumber: "", customerAddressComplement: "", customerNeighborhood: "", notes: "" });
  const [ordering, setOrdering] = useState(false);
  const [orderDone, setOrderDone] = useState(null);
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [menuRes, payRes] = await Promise.all([
          axios.get(`${FOOD_API}/api/food/public/${slug}/menu`),
          axios.get(`${FOOD_API}/api/food/public/${slug}/payment-methods`),
        ]);
        setRestaurant(menuRes.data.restaurant);
        setGroups(menuRes.data.groups);
        setPaymentMethods(payRes.data.methods || []);
        if (payRes.data.methods?.length) setPaymentMethod(payRes.data.methods[0].type);
        if (!menuRes.data.restaurant.deliveryEnabled && menuRes.data.restaurant.pickupEnabled) setOrderType("pickup");
      } catch { toast.error("Restaurante não encontrado"); }
      finally { setLoading(false); }
    };
    load();
    // Tenta pegar o número do WhatsApp da URL (ex: aberto por link do WhatsApp)
    const phone = new URLSearchParams(window.location.search).get("phone");
    if (phone) setForm(f => ({ ...f, customerPhone: phone }));
  }, [slug]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.id, name: item.name, unitPrice: parseFloat(item.price), quantity: 1, notes: "" }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === itemId);
      if (existing?.quantity === 1) return prev.filter(c => c.menuItemId !== itemId);
      return prev.map(c => c.menuItemId === itemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const getQty = (itemId) => cart.find(c => c.menuItemId === itemId)?.quantity || 0;

  const handleCepChange = async (value) => {
    const cep = value.replace(/\D/g, "");
    setForm(f => ({ ...f, cep: value }));
    if (cep.length === 8) {
      setCepLoading(true);
      try {
        const res = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
        if (!res.data.erro) {
          setForm(f => ({ ...f, cep: value, customerAddress: res.data.logradouro || "", customerNeighborhood: res.data.bairro || "" }));
        } else {
          toast.error("CEP não encontrado");
        }
      } catch { toast.error("Erro ao buscar CEP"); }
      finally { setCepLoading(false); }
    }
  };

  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const deliveryFee = orderType === "delivery" ? parseFloat(restaurant?.deliveryFee || 0) : 0;
  const total = subtotal + deliveryFee;

  const submitOrder = async () => {
    if (!cart.length) return toast.error("Carrinho vazio");
    if (!form.customerPhone) return toast.error("Informe seu telefone");
    if (orderType === "delivery" && !form.customerAddress) return toast.error("Informe o endereço");
    setOrdering(true);
    try {
      const { data } = await axios.post(`${FOOD_API}/api/food/public/${slug}/orders`, {
        ...form,
        customerPhone: form.customerPhone.replace(/\D/g, ""),
        paymentMethod,
        orderType,
        items: cart,
      });
      setOrderDone(data);
      setCart([]);
      setCartOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao realizar pedido");
    } finally {
      setOrdering(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  if (orderDone) return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" p={3}>
      <Typography variant="h4" style={{ marginBottom: 16 }}>🎉</Typography>
      <Typography variant="h5" gutterBottom>Pedido realizado!</Typography>
      <Typography variant="body1">Pedido #{orderDone.orderId}</Typography>
      <Typography variant="body1">Total: <strong>R$ {parseFloat(orderDone.total).toFixed(2)}</strong></Typography>
      <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
        Tempo estimado: {orderDone.estimatedMinutes} minutos
      </Typography>
      <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
        Você receberá atualizações pelo WhatsApp.
      </Typography>
    </Box>
  );

  return (
    <div>
      <div className={classes.header}>
        <Typography variant="h6">🍽️ Cardápio</Typography>
        <IconButton color="inherit" onClick={() => setCartOpen(true)}>
          <Badge badgeContent={cart.reduce((s, i) => s + i.quantity, 0)} color="secondary">
            <ShoppingCartIcon />
          </Badge>
        </IconButton>
      </div>

      <Box px={2} pb={10}>
        {groups.map(group => (
          <div key={group.id}>
            <Typography className={classes.groupTitle}>{group.name}</Typography>
            {(group.items || []).map(item => (
              <Card key={item.id} className={classes.card} elevation={1}>
                <CardContent className={classes.cardInfo}>
                  <Typography variant="subtitle2">{item.name}</Typography>
                  {item.description && <Typography variant="caption" color="textSecondary">{item.description}</Typography>}
                  <Typography variant="body2" color="primary" style={{ fontWeight: "bold", marginTop: 4 }}>
                    R$ {parseFloat(item.price).toFixed(2)}
                  </Typography>
                  <div className={classes.qty}>
                    {getQty(item.id) > 0 ? (
                      <>
                        <IconButton size="small" onClick={() => removeFromCart(item.id)}><RemoveIcon fontSize="small" /></IconButton>
                        <Typography>{getQty(item.id)}</Typography>
                        <IconButton size="small" color="primary" onClick={() => addToCart(item)}><AddIcon fontSize="small" /></IconButton>
                      </>
                    ) : (
                      <Button size="small" variant="outlined" color="primary" startIcon={<AddIcon />} onClick={() => addToCart(item)}>
                        Adicionar
                      </Button>
                    )}
                  </div>
                </CardContent>
                {item.imageUrl && (
                  <img src={`${FOOD_API}${item.imageUrl}`} alt={item.name} className={classes.cardImg} />
                )}
              </Card>
            ))}
          </div>
        ))}
      </Box>

      {/* Botão flutuante do carrinho no mobile */}
      {cart.length > 0 && !cartOpen && (
        <Box position="fixed" bottom={16} left={0} right={0} display="flex" justifyContent="center" zIndex={200}>
          <Button variant="contained" color="primary" startIcon={<ShoppingCartIcon />}
            onClick={() => setCartOpen(true)} style={{ borderRadius: 24, padding: "12px 32px" }}>
            Ver carrinho · R$ {total.toFixed(2)}
          </Button>
        </Box>
      )}

      {/* Drawer do carrinho / checkout */}
      <Drawer anchor="right" open={cartOpen} onClose={() => setCartOpen(false)}>
        <div className={classes.cartDrawer}>
          <Typography variant="h6" gutterBottom>Seu Pedido</Typography>

          {cart.map(item => (
            <div key={item.menuItemId} className={classes.cartItem}>
              <div>
                <Typography variant="body2">{item.name}</Typography>
                <Typography variant="caption">{item.quantity}x R$ {item.unitPrice.toFixed(2)}</Typography>
              </div>
              <div className={classes.qty}>
                <IconButton size="small" onClick={() => removeFromCart(item.menuItemId)}><RemoveIcon fontSize="small" /></IconButton>
                <Typography>{item.quantity}</Typography>
                <IconButton size="small" color="primary" onClick={() => addToCart({ id: item.menuItemId, price: item.unitPrice, name: item.name })}><AddIcon fontSize="small" /></IconButton>
              </div>
            </div>
          ))}

          <Divider style={{ margin: "8px 0" }} />

          {/* Tipo de pedido */}
          {restaurant?.deliveryEnabled && restaurant?.pickupEnabled && (
            <RadioGroup row value={orderType} onChange={e => setOrderType(e.target.value)}>
              <FormControlLabel value="delivery" control={<Radio color="primary" size="small" />} label="Entrega" />
              <FormControlLabel value="pickup" control={<Radio color="primary" size="small" />} label="Retirada" />
            </RadioGroup>
          )}

          {/* Dados do cliente */}
          <TextField fullWidth size="small" margin="dense" label="Seu nome" value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} />
          <TextField fullWidth size="small" margin="dense" label="Telefone (WhatsApp)" value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} />

          {orderType === "delivery" && (
            <>
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={8}><TextField fullWidth size="small" margin="dense" label="CEP" value={form.cep} onChange={e => handleCepChange(e.target.value)} inputProps={{ maxLength: 9 }} /></Grid>
                <Grid item xs={4}>{cepLoading && <CircularProgress size={20} style={{ marginTop: 8 }} />}</Grid>
              </Grid>
              <TextField fullWidth size="small" margin="dense" label="Endereço" value={form.customerAddress} onChange={e => setForm(f => ({ ...f, customerAddress: e.target.value }))} />
              <Grid container spacing={1}>
                <Grid item xs={4}><TextField fullWidth size="small" margin="dense" label="Número" value={form.customerAddressNumber} onChange={e => setForm(f => ({ ...f, customerAddressNumber: e.target.value }))} /></Grid>
                <Grid item xs={8}><TextField fullWidth size="small" margin="dense" label="Complemento" value={form.customerAddressComplement} onChange={e => setForm(f => ({ ...f, customerAddressComplement: e.target.value }))} /></Grid>
              </Grid>
              <TextField fullWidth size="small" margin="dense" label="Bairro" value={form.customerNeighborhood} onChange={e => setForm(f => ({ ...f, customerNeighborhood: e.target.value }))} />
            </>
          )}

          {/* Forma de pagamento */}
          <Typography variant="subtitle2" style={{ marginTop: 8 }}>Forma de pagamento</Typography>
          <RadioGroup value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            {paymentMethods.map(m => (
              <FormControlLabel key={m.type} value={m.type} className={classes.payOption}
                control={<Radio color="primary" size="small" />} label={m.label} />
            ))}
          </RadioGroup>

          <TextField fullWidth size="small" margin="dense" label="Observações (opcional)" multiline rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

          <Divider style={{ margin: "8px 0" }} />

          {deliveryFee > 0 && (
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">Taxa de entrega:</Typography>
              <Typography variant="body2">R$ {deliveryFee.toFixed(2)}</Typography>
            </Box>
          )}
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography className={classes.total}>Total:</Typography>
            <Typography className={classes.total}>R$ {total.toFixed(2)}</Typography>
          </Box>

          <Button fullWidth variant="contained" color="primary" size="large"
            onClick={submitOrder} disabled={ordering || !cart.length}>
            {ordering ? <CircularProgress size={24} color="inherit" /> : "Confirmar Pedido"}
          </Button>
        </div>
      </Drawer>
    </div>
  );
};

export default PublicMenu;

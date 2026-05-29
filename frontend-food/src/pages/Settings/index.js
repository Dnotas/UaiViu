import React, { useEffect, useState } from "react";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import Switch from "@material-ui/core/Switch";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Divider from "@material-ui/core/Divider";
import CircularProgress from "@material-ui/core/CircularProgress";
import Box from "@material-ui/core/Box";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";
import FormControl from "@material-ui/core/FormControl";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import api from "../../services/api";

const FOOD_API = process.env.REACT_APP_BACKEND_FOOD_URL || "http://localhost:3003";

const useStyles = makeStyles((theme) => ({
  section: { padding: theme.spacing(3), marginBottom: theme.spacing(3) },
  title: { marginBottom: theme.spacing(2) },
}));

const SettingsPage = () => {
  const classes = useStyles();
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingPayment, setLoadingPayment] = useState(true);

  const [config, setConfig] = useState({
    slug: "", welcomeMessage: "", msgOrderConfirmed: "", msgOrderPreparing: "",
    msgOrderOnTheWay: "", msgOrderDelivered: "", deliveryEnabled: true,
    pickupEnabled: false, deliveryFee: 0, estimatedDeliveryMinutes: 30,
    restaurantName: "", primaryColor: "#FF5722", logoUrl: "", bannerImageUrl: "",
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [payment, setPayment] = useState({
    cashEnabled: true, pixEnabled: false, pixKey: "", pixKeyType: "random",
    pixReceiverName: "", cardEnabled: false, cardProvider: "mercadopago",
    cardPublicKey: "", cardAccessToken: "",
  });

  useEffect(() => {
    api.get("/api/food/restaurant-config").then(({ data }) => {
      if (data) setConfig(c => ({ ...c, ...data }));
      setLoadingConfig(false);
    }).catch(() => setLoadingConfig(false));

    api.get("/api/food/payment-config").then(({ data }) => {
      if (data) setPayment(p => ({ ...p, ...data }));
      setLoadingPayment(false);
    }).catch(() => setLoadingPayment(false));
  }, []);

  const saveConfig = async () => {
    try {
      await api.post("/api/food/restaurant-config", config);
      toast.success("Configurações salvas!");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao salvar");
    }
  };

  const uploadImage = async (file, field, setLoading) => {
    const form = new FormData();
    form.append("image", file);
    setLoading(true);
    try {
      const endpoint = field === "logoUrl" ? "/api/food/restaurant-config/upload-logo" : "/api/food/restaurant-config/upload-banner";
      const { data } = await api.post(endpoint, form, { headers: { "Content-Type": "multipart/form-data" } });
      setConfig(c => ({ ...c, [field]: data[field] }));
      toast.success("Imagem enviada!");
    } catch { toast.error("Erro ao enviar imagem"); }
    finally { setLoading(false); }
  };

  const savePayment = async () => {
    try {
      await api.post("/api/food/payment-config", payment);
      toast.success("Configurações de pagamento salvas!");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao salvar");
    }
  };

  if (loadingConfig || loadingPayment) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  return (
    <div>
      <Typography variant="h5" gutterBottom>Configurações</Typography>

      {/* ── Restaurante ── */}
      <Paper className={classes.section}>
        <Typography variant="h6" className={classes.title}>Dados do Restaurante</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Slug da URL (ex: meu-restaurante)" value={config.slug}
              onChange={e => setConfig(c => ({ ...c, slug: e.target.value }))} variant="outlined" size="small"
              helperText="Aparece na URL do cardápio. Só letras, números e hífen." />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Taxa de entrega (R$)" type="number" value={config.deliveryFee}
              onChange={e => setConfig(c => ({ ...c, deliveryFee: e.target.value }))} variant="outlined" size="small" />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Tempo estimado (min)" type="number" value={config.estimatedDeliveryMinutes}
              onChange={e => setConfig(c => ({ ...c, estimatedDeliveryMinutes: e.target.value }))} variant="outlined" size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel control={<Switch checked={config.deliveryEnabled} onChange={e => setConfig(c => ({ ...c, deliveryEnabled: e.target.checked }))} color="primary" />} label="Entrega habilitada" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel control={<Switch checked={config.pickupEnabled} onChange={e => setConfig(c => ({ ...c, pickupEnabled: e.target.checked }))} color="primary" />} label="Retirada no local habilitada" />
          </Grid>
        </Grid>

        <Divider style={{ margin: "16px 0" }} />
        <Typography variant="subtitle1" className={classes.title}>Mensagens Automáticas (WhatsApp)</Typography>
        <Grid container spacing={2}>
          {[
            { key: "welcomeMessage", label: "Boas-vindas (com link do cardápio)" },
            { key: "msgOrderConfirmed", label: "Pedido confirmado" },
            { key: "msgOrderPreparing", label: "Em preparo" },
            { key: "msgOrderOnTheWay", label: "Saiu para entrega" },
            { key: "msgOrderDelivered", label: "Pedido entregue" },
          ].map(f => (
            <Grid item xs={12} key={f.key}>
              <TextField fullWidth multiline rows={2} label={f.label} value={config[f.key] || ""}
                onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))} variant="outlined" size="small" />
            </Grid>
          ))}
        </Grid>
        <Box mt={2}><Button variant="contained" color="primary" onClick={saveConfig}>Salvar</Button></Box>
      </Paper>

      {/* ── Personalização Visual ── */}
      <Paper className={classes.section}>
        <Typography variant="h6" className={classes.title}>Personalização Visual do Cardápio</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Nome do restaurante (exibido no cardápio)" value={config.restaurantName || ""}
              onChange={e => setConfig(c => ({ ...c, restaurantName: e.target.value }))} variant="outlined" size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center" style={{ gap: 12, height: "100%" }}>
              <Typography variant="body2">Cor principal:</Typography>
              <input type="color" value={config.primaryColor || "#FF5722"}
                onChange={e => setConfig(c => ({ ...c, primaryColor: e.target.value }))}
                style={{ width: 48, height: 36, border: "1px solid #ccc", borderRadius: 4, cursor: "pointer", padding: 2 }} />
              <Typography variant="caption" color="textSecondary">{config.primaryColor}</Typography>
            </Box>
          </Grid>

          {/* Logo */}
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>Logo</Typography>
            {config.logoUrl && (
              <img src={`${FOOD_API}${config.logoUrl}`} alt="logo" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: "50%", marginBottom: 8, border: "2px solid #eee" }} />
            )}
            <Box>
              <Button variant="outlined" component="label" size="small" disabled={uploadingLogo}>
                {uploadingLogo ? <CircularProgress size={16} /> : (config.logoUrl ? "Trocar logo" : "Enviar logo")}
                <input type="file" accept="image/*" hidden onChange={e => uploadImage(e.target.files[0], "logoUrl", setUploadingLogo)} />
              </Button>
            </Box>
          </Grid>

          {/* Banner */}
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>Imagem de fundo (banner)</Typography>
            {config.bannerImageUrl && (
              <img src={`${FOOD_API}${config.bannerImageUrl}`} alt="banner" style={{ width: "100%", maxWidth: 280, height: 90, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />
            )}
            <Box>
              <Button variant="outlined" component="label" size="small" disabled={uploadingBanner}>
                {uploadingBanner ? <CircularProgress size={16} /> : (config.bannerImageUrl ? "Trocar banner" : "Enviar banner")}
                <input type="file" accept="image/*" hidden onChange={e => uploadImage(e.target.files[0], "bannerImageUrl", setUploadingBanner)} />
              </Button>
            </Box>
          </Grid>
        </Grid>
        <Box mt={2}><Button variant="contained" color="primary" onClick={saveConfig}>Salvar</Button></Box>
      </Paper>

      {/* ── Pagamentos ── */}
      <Paper className={classes.section}>
        <Typography variant="h6" className={classes.title}>Formas de Pagamento</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel control={<Switch checked={payment.cashEnabled} onChange={e => setPayment(p => ({ ...p, cashEnabled: e.target.checked }))} color="primary" />} label="Pagar na entrega (sempre disponível)" />
          </Grid>

          <Grid item xs={12}><Divider /></Grid>

          <Grid item xs={12}>
            <FormControlLabel control={<Switch checked={payment.pixEnabled} onChange={e => setPayment(p => ({ ...p, pixEnabled: e.target.checked }))} color="primary" />} label="PIX" />
          </Grid>
          {payment.pixEnabled && (
            <>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small" variant="outlined">
                  <InputLabel>Tipo da chave PIX</InputLabel>
                  <Select label="Tipo da chave PIX" value={payment.pixKeyType} onChange={e => setPayment(p => ({ ...p, pixKeyType: e.target.value }))}>
                    <MenuItem value="cpf">CPF</MenuItem>
                    <MenuItem value="cnpj">CNPJ</MenuItem>
                    <MenuItem value="email">E-mail</MenuItem>
                    <MenuItem value="phone">Telefone</MenuItem>
                    <MenuItem value="random">Chave aleatória</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Chave PIX" value={payment.pixKey} onChange={e => setPayment(p => ({ ...p, pixKey: e.target.value }))} variant="outlined" size="small" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Nome do recebedor" value={payment.pixReceiverName} onChange={e => setPayment(p => ({ ...p, pixReceiverName: e.target.value }))} variant="outlined" size="small" />
              </Grid>
            </>
          )}

          <Grid item xs={12}><Divider /></Grid>

          <Grid item xs={12}>
            <FormControlLabel control={<Switch checked={payment.cardEnabled} onChange={e => setPayment(p => ({ ...p, cardEnabled: e.target.checked }))} color="primary" />} label="Cartão (online)" />
          </Grid>
          {payment.cardEnabled && (
            <>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small" variant="outlined">
                  <InputLabel>Gateway</InputLabel>
                  <Select label="Gateway" value={payment.cardProvider} onChange={e => setPayment(p => ({ ...p, cardProvider: e.target.value }))}>
                    <MenuItem value="mercadopago">Mercado Pago</MenuItem>
                    <MenuItem value="pagseguro">PagSeguro</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Chave pública (Public Key)" value={payment.cardPublicKey} onChange={e => setPayment(p => ({ ...p, cardPublicKey: e.target.value }))} variant="outlined" size="small" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Access Token (privado)" type="password" value={payment.cardAccessToken} onChange={e => setPayment(p => ({ ...p, cardAccessToken: e.target.value }))} variant="outlined" size="small" helperText="Nunca compartilhe este token." />
              </Grid>
            </>
          )}
        </Grid>
        <Box mt={2}><Button variant="contained" color="primary" onClick={savePayment}>Salvar Pagamentos</Button></Box>
      </Paper>
    </div>
  );
};

export default SettingsPage;

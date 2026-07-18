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
import Tooltip from "@material-ui/core/Tooltip";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import LinkIcon from "@material-ui/icons/Link";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";
import FormControl from "@material-ui/core/FormControl";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import IconButton from "@material-ui/core/IconButton";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import MyLocationIcon from "@material-ui/icons/MyLocation";
import InputAdornment from "@material-ui/core/InputAdornment";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import axios from "axios";
import api from "../../services/api";
import LocationPicker from "../../components/LocationPicker";

const FOOD_API = process.env.REACT_APP_BACKEND_FOOD_URL || "http://localhost:3003";

const toDateInput = (d) => d.toISOString().slice(0, 10);

const useStyles = makeStyles((theme) => ({
  section: { padding: theme.spacing(3), marginBottom: theme.spacing(3) },
  title: { marginBottom: theme.spacing(2) },
  rateRow: { "& td": { padding: "4px 8px" } },
}));

const SettingsPage = () => {
  const classes = useStyles();
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingPayment, setLoadingPayment] = useState(true);

  // Cupons
  const [coupons, setCoupons] = useState([]);
  const [couponDialog, setCouponDialog] = useState(false);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "", discountType: "percent", discountValue: "", minOrderValue: "", usageLimit: "", expiresAt: "",
  });

  const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const DEFAULT_BUSINESS_HOURS = DAY_NAMES.map((_, i) => ({
    dayOfWeek: i, enabled: true, open: "08:00", close: "22:00",
  }));

  const [config, setConfig] = useState({
    slug: "", welcomeMessage: "", msgOrderConfirmed: "", msgOrderPreparing: "",
    msgOrderOnTheWay: "", msgOrderReadyForPickup: "", msgOrderDelivered: "",
    deliveryEnabled: true, pickupEnabled: false, deliveryFee: 0, estimatedDeliveryMinutes: 30,
    restaurantName: "", primaryColor: "#FF5722", logoUrl: "", bannerImageUrl: "",
    restaurantAddress: "", restaurantLat: null, restaurantLng: null,
    deliveryByDistance: false, deliveryRates: [], deliveryRatesByLocation: [],
    busyMode: false,
    storeStatus: "open",
    closedMessage: "Olá! No momento estamos fechados. Em breve voltamos. 😊",
    divulgationMessage: "",
    businessHours: null,
    whatsappSilentMode: false,
    whatsappSilentMessage: "Olá! 😊 Não respondemos mensagens por aqui. Para fazer seu pedido, acesse nosso cardápio pelo link que enviamos.",
  });
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  // CEP helper (não salvo no BD — só para auto-preencher o endereço)
  const [cepRest, setCepRest] = useState("");
  const [cepRestLoading, setCepRestLoading] = useState(false);
  // Separados para usar na busca estruturada do Nominatim
  const [restStreet, setRestStreet] = useState("");
  const [restCity, setRestCity] = useState("");
  const [restUf, setRestUf] = useState("");
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  const today = toDateInput(new Date());
  const [clearDateFrom, setClearDateFrom] = useState(today);
  const [clearDateTo, setClearDateTo]   = useState(today);
  const [clearDialog, setClearDialog]   = useState(false);
  const [clearing, setClearing]         = useState(false);

  const [payment, setPayment] = useState({
    cashEnabled: true, pixEnabled: false, pixKey: "", pixKeyType: "random",
    pixReceiverName: "", cardEnabled: false, cardProvider: "mercadopago",
    cardPublicKey: "", cardAccessToken: "",
  });

  useEffect(() => {
    api.get("/api/food/restaurant-config").then(({ data }) => {
      if (data) setConfig(c => ({ ...c, ...data, deliveryRates: data.deliveryRates || [], deliveryRatesByLocation: data.deliveryRatesByLocation || [] }));
      setLoadingConfig(false);
    }).catch(() => setLoadingConfig(false));

    api.get("/api/food/payment-config").then(({ data }) => {
      if (data) setPayment(p => ({ ...p, ...data }));
      setLoadingPayment(false);
    }).catch(() => setLoadingPayment(false));

    api.get("/api/food/coupons").then(({ data }) => setCoupons(data || [])).catch(() => {});

    api.get("/api/food/whatsapp").then(({ data }) => {
      const connected = (data || []).find(w => w.status === "CONNECTED" && w.phone);
      if (connected) setWhatsappPhone(connected.phone);
    }).catch(() => {});
  }, []);

  const saveConfig = async () => {
    try {
      await api.post("/api/food/restaurant-config", config);
      toast.success("Configurações salvas!");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao salvar");
    }
  };

  const geocodeAddress = async () => {
    if (!config.restaurantAddress) {
      toast.error("Informe o endereço do restaurante primeiro");
      return;
    }
    setGeocoding(true);
    try {
      let result = null;

      // Estratégia 1: busca estruturada (rua + cidade + estado) — mais precisa
      if (restStreet && restCity && restUf) {
        const params = new URLSearchParams({
          street: config.restaurantAddress.split(",")[0], // só a rua do campo editado
          city: restCity,
          state: restUf,
          country: "Brasil",
          format: "json",
          limit: "1",
        });
        const r1 = await axios.get(
          `https://nominatim.openstreetmap.org/search?${params}`,
          { headers: { "Accept-Language": "pt-BR" } }
        );
        if (r1.data?.length) result = r1.data[0];
      }

      // Estratégia 2: texto livre com o campo completo
      if (!result) {
        const q = encodeURIComponent(config.restaurantAddress + ", Brasil");
        const r2 = await axios.get(
          `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
          { headers: { "Accept-Language": "pt-BR" } }
        );
        if (r2.data?.length) result = r2.data[0];
      }

      // Estratégia 3: fallback — só cidade + estado (localização aproximada)
      if (!result && restCity && restUf) {
        const q = encodeURIComponent(`${restCity}, ${restUf}, Brasil`);
        const r3 = await axios.get(
          `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
          { headers: { "Accept-Language": "pt-BR" } }
        );
        if (r3.data?.length) {
          result = r3.data[0];
          toast.info("Rua não encontrada — pino posicionado no centro da cidade. Ajuste no mapa.");
        }
      }

      if (result) {
        const { lat, lon } = result;
        setConfig(c => ({ ...c, restaurantLat: parseFloat(lat), restaurantLng: parseFloat(lon) }));
        toast.success("Localização encontrada! Ajuste o pino no mapa se necessário.");
      } else {
        toast.error("Não foi possível localizar o endereço. Verifique os dados.");
      }
    } catch {
      toast.error("Erro ao geocodificar endereço");
    } finally {
      setGeocoding(false);
    }
  };

  // Chamado quando o usuário arrasta/clica no mapa para mover o pino
  const handleMapPinChange = async (lat, lng) => {
    setConfig(c => ({ ...c, restaurantLat: lat, restaurantLng: lng }));
    // Reverse geocoding: atualiza o campo de endereço com o nome da rua
    setReverseGeocoding(true);
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "pt-BR" } }
      );
      if (res.data?.address) {
        const a = res.data.address;
        const parts = [
          a.road || a.pedestrian || a.path || a.street,
          a.house_number,
          a.suburb || a.neighbourhood || a.quarter || a.city_district,
          a.city || a.town || a.village || a.municipality,
          a.state,
        ].filter(Boolean);
        if (parts.length) setConfig(c => ({ ...c, restaurantAddress: parts.join(", ") }));
        if (a.postcode) setCepRest(a.postcode.replace(/\D/g, ""));
      }
    } catch { }
    finally { setReverseGeocoding(false); }
  };

  const handleCepRestaurante = async (value) => {
    const cep = value.replace(/\D/g, "");
    setCepRest(value);
    if (cep.length === 8) {
      setCepRestLoading(true);
      try {
        const res = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
        if (!res.data.erro) {
          const street = res.data.logradouro || "";
          const city = res.data.localidade || "";
          const uf = res.data.uf || "";
          setRestStreet(street);
          setRestCity(city);
          setRestUf(uf);
          const parts = [street, res.data.bairro, city, uf].filter(Boolean);
          setConfig(c => ({ ...c, restaurantAddress: parts.join(", ") }));
          // Não auto-geocoda aqui — o usuário ainda precisa adicionar o número
        } else {
          toast.error("CEP não encontrado");
        }
      } catch { toast.error("Erro ao buscar CEP"); }
      finally { setCepRestLoading(false); }
    }
  };

  // ── Tabela de taxas por distância ──
  const addRate = () => {
    setConfig(c => ({
      ...c,
      deliveryRates: [...(c.deliveryRates || []), { maxKm: "", fee: "", prepMinutes: "" }],
    }));
  };

  const updateRate = (idx, field, value) => {
    setConfig(c => {
      const updated = [...(c.deliveryRates || [])];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...c, deliveryRates: updated };
    });
  };

  const removeRate = (idx) => {
    setConfig(c => ({ ...c, deliveryRates: (c.deliveryRates || []).filter((_, i) => i !== idx) }));
  };

  // ── Tabela de taxas fixas por cidade/bairro (prioridade sobre a de distância) ──
  const addLocationRate = () => {
    setConfig(c => ({
      ...c,
      deliveryRatesByLocation: [...(c.deliveryRatesByLocation || []), { city: "", neighborhood: "", fee: "", prepMinutes: "" }],
    }));
  };

  const updateLocationRate = (idx, field, value) => {
    setConfig(c => {
      const updated = [...(c.deliveryRatesByLocation || [])];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...c, deliveryRatesByLocation: updated };
    });
  };

  const removeLocationRate = (idx) => {
    setConfig(c => ({ ...c, deliveryRatesByLocation: (c.deliveryRatesByLocation || []).filter((_, i) => i !== idx) }));
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

  const saveCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discountValue) {
      toast.error("Informe o código e o valor do desconto");
      return;
    }
    setSavingCoupon(true);
    try {
      const { data } = await api.post("/api/food/coupons", newCoupon);
      setCoupons(c => [data, ...c]);
      setCouponDialog(false);
      setNewCoupon({ code: "", discountType: "percent", discountValue: "", minOrderValue: "", usageLimit: "", expiresAt: "" });
      toast.success("Cupom criado!");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao criar cupom");
    } finally {
      setSavingCoupon(false);
    }
  };

  const toggleCoupon = async (coupon) => {
    try {
      const { data } = await api.put(`/api/food/coupons/${coupon.id}`, { active: !coupon.active });
      setCoupons(c => c.map(x => x.id === data.id ? data : x));
    } catch { toast.error("Erro ao atualizar cupom"); }
  };

  const deleteCoupon = async (id) => {
    try {
      await api.delete(`/api/food/coupons/${id}`);
      setCoupons(c => c.filter(x => x.id !== id));
      toast.success("Cupom removido!");
    } catch { toast.error("Erro ao remover cupom"); }
  };

  const clearOrders = async () => {
    setClearing(true);
    try {
      const { data } = await api.delete(`/api/food/orders?dateFrom=${clearDateFrom}&dateTo=${clearDateTo}`);
      setClearDialog(false);
      toast.success(`${data.deleted} pedido(s) apagado(s) com sucesso!`);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao limpar pedidos");
    } finally {
      setClearing(false);
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
            <TextField fullWidth label="Tempo estimado (min)" type="number" value={config.estimatedDeliveryMinutes}
              onChange={e => setConfig(c => ({ ...c, estimatedDeliveryMinutes: e.target.value }))} variant="outlined" size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel control={<Switch checked={config.deliveryEnabled} onChange={e => setConfig(c => ({ ...c, deliveryEnabled: e.target.checked }))} color="primary" />} label="Entrega habilitada" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel control={<Switch checked={config.pickupEnabled} onChange={e => setConfig(c => ({ ...c, pickupEnabled: e.target.checked }))} color="primary" />} label="Retirada no local habilitada" />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={config.busyMode} onChange={e => setConfig(c => ({ ...c, busyMode: e.target.checked }))} color="secondary" />}
              label="Modo alta demanda — exibe aviso de demora no cardápio"
            />
          </Grid>

          {/* ── Status da loja ── */}
          <Grid item xs={12}>
            <FormControl variant="outlined" size="small" fullWidth>
              <InputLabel>Status da loja</InputLabel>
              <Select
                value={config.storeStatus}
                onChange={e => setConfig(c => ({ ...c, storeStatus: e.target.value }))}
                label="Status da loja"
              >
                <MenuItem value="open">🟢 Aberta — envia cardápio normalmente</MenuItem>
                <MenuItem value="closed_silent">🔴 Fechada — sem resposta automática</MenuItem>
                <MenuItem value="closed_notice">🔴 Fechada — avisa o cliente com mensagem</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {config.storeStatus === "closed_notice" && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mensagem de loja fechada"
                multiline
                rows={2}
                value={config.closedMessage || ""}
                onChange={e => setConfig(c => ({ ...c, closedMessage: e.target.value }))}
                variant="outlined"
                size="small"
                helperText="Enviada uma vez ao cliente quando mandar mensagem fora do horário"
              />
            </Grid>
          )}

          <Grid item xs={12}><Divider /></Grid>

          {/* ── Taxa de entrega ── */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: 4 }}>Taxa de Entrega</Typography>
          </Grid>

          {/* CEP helper */}
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth label="CEP do restaurante"
              value={cepRest}
              onChange={e => handleCepRestaurante(e.target.value)}
              inputProps={{ maxLength: 9 }}
              variant="outlined" size="small"
              helperText="Preenche o endereço automaticamente"
              InputProps={{
                endAdornment: cepRestLoading
                  ? <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment>
                  : null,
              }}
            />
          </Grid>

          {/* Endereço completo */}
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth label="Endereço completo do restaurante"
              value={config.restaurantAddress || ""}
              onChange={e => setConfig(c => ({ ...c, restaurantAddress: e.target.value }))}
              variant="outlined" size="small"
              helperText="Inclua o número. Ex: Rua das Flores, 100, Centro, Bom Despacho, MG"
            />
          </Grid>

          {/* Botão geocodificar */}
          <Grid item xs={12}>
            <Button
              variant="outlined" size="small"
              startIcon={geocoding ? <CircularProgress size={14} /> : <MyLocationIcon />}
              onClick={() => geocodeAddress()}
              disabled={geocoding || !config.restaurantAddress}
            >
              {geocoding ? "Localizando..." : "Geocodificar endereço"}
            </Button>
          </Grid>

          {/* Mini mapa */}
          {config.restaurantLat && config.restaurantLng && (
            <Grid item xs={12}>
              <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 4 }}>
                Arraste o pino ou clique no mapa para ajustar a localização exata do restaurante
              </Typography>
              <LocationPicker
                lat={parseFloat(config.restaurantLat)}
                lng={parseFloat(config.restaurantLng)}
                onChange={handleMapPinChange}
              />
              {/* Info abaixo do mapa */}
              <Box display="flex" alignItems="center" justifyContent="space-between" mt={1} flexWrap="wrap" style={{ gap: 8 }}>
                <Box>
                  {reverseGeocoding ? (
                    <Typography variant="caption" color="textSecondary">
                      <CircularProgress size={10} style={{ marginRight: 4 }} />Identificando endereco...
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="textSecondary">
                      Coordenadas: {parseFloat(config.restaurantLat).toFixed(5)}, {parseFloat(config.restaurantLng).toFixed(5)}
                    </Typography>
                  )}
                </Box>
                <Button variant="contained" color="primary" size="small" onClick={saveConfig}>
                  Salvar localização
                </Button>
              </Box>
            </Grid>
          )}

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.deliveryByDistance}
                  onChange={e => setConfig(c => ({ ...c, deliveryByDistance: e.target.checked }))}
                  color="primary"
                />
              }
              label="Calcular taxa de entrega por distância (km)"
            />
          </Grid>

          {!config.deliveryByDistance ? (
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Taxa de entrega fixa (R$)" type="number" value={config.deliveryFee}
                onChange={e => setConfig(c => ({ ...c, deliveryFee: e.target.value }))} variant="outlined" size="small" />
            </Grid>
          ) : (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Tabela de frete por distância
              </Typography>
              <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 8 }}>
                Insira as faixas em ordem crescente de distância. O sistema usa a primeira faixa em que a distância do cliente for menor ou igual ao limite.
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Distância máx. (km)</TableCell>
                    <TableCell>Tempo de preparo (min)</TableCell>
                    <TableCell>Taxa (R$)</TableCell>
                    <TableCell style={{ width: 40 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(config.deliveryRates || []).map((rate, idx) => (
                    <TableRow key={idx} className={classes.rateRow}>
                      <TableCell>
                        <TextField
                          size="small" type="number"
                          value={rate.maxKm}
                          onChange={e => updateRate(idx, "maxKm", e.target.value)}
                          inputProps={{ min: 0, step: 1 }}
                          style={{ width: 90 }}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small" type="number"
                          value={rate.prepMinutes}
                          onChange={e => updateRate(idx, "prepMinutes", e.target.value)}
                          inputProps={{ min: 0, step: 5 }}
                          style={{ width: 90 }}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small" type="number"
                          value={rate.fee}
                          onChange={e => updateRate(idx, "fee", e.target.value)}
                          inputProps={{ min: 0, step: 0.5 }}
                          style={{ width: 90 }}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => removeRate(idx)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button size="small" startIcon={<AddIcon />} onClick={addRate} style={{ marginTop: 8 }}>
                Adicionar faixa
              </Button>
            </Grid>
          )}

          <Grid item xs={12}>
            <Divider style={{ margin: "8px 0" }} />
            <Typography variant="subtitle2" gutterBottom>
              Tabela de frete por cidade/bairro
            </Typography>
            <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 8 }}>
              Taxa fixa por cidade e bairro — tem prioridade sobre a tabela por distância acima. Deixe o bairro em branco pra aplicar em qualquer bairro dessa cidade. Ordem de prioridade: cidade+bairro exato, depois cidade, depois cai pra tabela por distância (km).
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Cidade</TableCell>
                  <TableCell>Bairro (opcional)</TableCell>
                  <TableCell>Tempo de preparo (min)</TableCell>
                  <TableCell>Taxa (R$)</TableCell>
                  <TableCell style={{ width: 40 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(config.deliveryRatesByLocation || []).map((rate, idx) => (
                  <TableRow key={idx} className={classes.rateRow}>
                    <TableCell>
                      <TextField
                        size="small"
                        value={rate.city}
                        onChange={e => updateLocationRate(idx, "city", e.target.value)}
                        placeholder="Ex: Vespasiano"
                        style={{ width: 140 }}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={rate.neighborhood}
                        onChange={e => updateLocationRate(idx, "neighborhood", e.target.value)}
                        placeholder="Qualquer bairro"
                        style={{ width: 140 }}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small" type="number"
                        value={rate.prepMinutes}
                        onChange={e => updateLocationRate(idx, "prepMinutes", e.target.value)}
                        inputProps={{ min: 0, step: 5 }}
                        style={{ width: 90 }}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small" type="number"
                        value={rate.fee}
                        onChange={e => updateLocationRate(idx, "fee", e.target.value)}
                        inputProps={{ min: 0, step: 0.5 }}
                        style={{ width: 90 }}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => removeLocationRate(idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button size="small" startIcon={<AddIcon />} onClick={addLocationRate} style={{ marginTop: 8 }}>
              Adicionar cidade/bairro
            </Button>
          </Grid>
        </Grid>

        <Divider style={{ margin: "16px 0" }} />
        <Typography variant="subtitle1" className={classes.title}>Mensagens Automáticas (WhatsApp)</Typography>
        <Grid container spacing={2}>
          {[
            { key: "welcomeMessage", label: "Boas-vindas (com link do cardápio)" },
            { key: "msgOrderConfirmed", label: "Pedido confirmado" },
            { key: "msgOrderPreparing", label: "Em preparo" },
            { key: "msgOrderOnTheWay", label: "Saiu para entrega (delivery)" },
            { key: "msgOrderReadyForPickup", label: "Pronto para retirada (retirada no local)" },
            { key: "msgOrderDelivered", label: "Pedido entregue" },
          ].map(f => (
            <Grid item xs={12} key={f.key}>
              <TextField fullWidth multiline rows={2} label={f.label} value={config[f.key] || ""}
                onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))} variant="outlined" size="small" />
            </Grid>
          ))}
        </Grid>
        <Divider style={{ margin: "16px 0" }} />
        <Typography variant="subtitle1" className={classes.title}>Modo Silencioso (WhatsApp)</Typography>
        <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
          Quando ativado, se o cliente enviar uma mensagem após receber o link do cardápio, o bot responde automaticamente com a mensagem abaixo — avisando que não atendemos por WhatsApp. As mensagens automáticas de pedido (confirmado, em preparo, etc.) continuam sendo enviadas normalmente.
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={!!config.whatsappSilentMode}
              onChange={e => setConfig(c => ({ ...c, whatsappSilentMode: e.target.checked }))}
              color="primary"
            />
          }
          label="Ativar modo silencioso"
        />
        {config.whatsappSilentMode && (
          <TextField
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            size="small"
            style={{ marginTop: 12 }}
            label="Mensagem enviada ao cliente"
            value={config.whatsappSilentMessage || ""}
            onChange={e => setConfig(c => ({ ...c, whatsappSilentMessage: e.target.value }))}
            helperText="Enviada toda vez que o cliente mandar uma mensagem avulsa pelo WhatsApp."
          />
        )}
        <Box mt={2}><Button variant="contained" color="primary" onClick={saveConfig}>Salvar</Button></Box>
      </Paper>

      {/* ── Horário de Funcionamento ── */}
      <Paper className={classes.section}>
        <Typography variant="h6" className={classes.title}>Horário de Funcionamento</Typography>
        <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
          Fora do horário configurado, o cardápio exibe "Loja fechada" e novos pedidos são bloqueados.
          Deixe todos os dias desabilitados para não usar restrição de horário.
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={!!(config.businessHours && config.businessHours.length > 0)}
              onChange={e => setConfig(c => ({
                ...c,
                businessHours: e.target.checked ? DEFAULT_BUSINESS_HOURS : null,
              }))}
              color="primary"
            />
          }
          label="Usar horário de funcionamento"
        />
        {config.businessHours && config.businessHours.length > 0 && (
          <Table size="small" style={{ marginTop: 12 }}>
            <TableHead>
              <TableRow>
                <TableCell>Dia</TableCell>
                <TableCell>Aberto</TableCell>
                <TableCell>Abertura</TableCell>
                <TableCell>Fechamento</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(config.businessHours || []).map((h, idx) => (
                <TableRow key={h.dayOfWeek}>
                  <TableCell>{DAY_NAMES[h.dayOfWeek]}</TableCell>
                  <TableCell>
                    <Switch
                      size="small"
                      checked={h.enabled}
                      color="primary"
                      onChange={e => {
                        const updated = [...config.businessHours];
                        updated[idx] = { ...h, enabled: e.target.checked };
                        setConfig(c => ({ ...c, businessHours: updated }));
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="time"
                      value={h.open}
                      disabled={!h.enabled}
                      size="small"
                      inputProps={{ step: 300 }}
                      onChange={e => {
                        const updated = [...config.businessHours];
                        updated[idx] = { ...h, open: e.target.value };
                        setConfig(c => ({ ...c, businessHours: updated }));
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="time"
                      value={h.close}
                      disabled={!h.enabled}
                      size="small"
                      inputProps={{ step: 300 }}
                      onChange={e => {
                        const updated = [...config.businessHours];
                        updated[idx] = { ...h, close: e.target.value };
                        setConfig(c => ({ ...c, businessHours: updated }));
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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

      {/* ── Cupons de desconto ── */}
      <Paper className={classes.section}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Cupons de Desconto</Typography>
          <Button variant="contained" color="primary" size="small" startIcon={<AddIcon />} onClick={() => setCouponDialog(true)}>
            Novo Cupom
          </Button>
        </Box>
        {coupons.length === 0 ? (
          <Typography variant="body2" color="textSecondary">Nenhum cupom cadastrado.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Desconto</TableCell>
                <TableCell>Pedido mín.</TableCell>
                <TableCell>Usos</TableCell>
                <TableCell>Validade</TableCell>
                <TableCell>Status</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {coupons.map(c => (
                <TableRow key={c.id} className={classes.rateRow}>
                  <TableCell><strong>{c.code}</strong></TableCell>
                  <TableCell>
                    {c.discountType === "percent"
                      ? `${parseFloat(c.discountValue)}%`
                      : `R$ ${parseFloat(c.discountValue).toFixed(2)}`}
                  </TableCell>
                  <TableCell>{c.minOrderValue ? `R$ ${parseFloat(c.minOrderValue).toFixed(2)}` : "—"}</TableCell>
                  <TableCell>{c.usageCount}{c.usageLimit ? `/${c.usageLimit}` : ""}</TableCell>
                  <TableCell>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined"
                      style={{ color: c.active ? "green" : "#aaa", borderColor: c.active ? "green" : "#ccc" }}
                      onClick={() => toggleCoupon(c)}>
                      {c.active ? "Ativo" : "Inativo"}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => deleteCoupon(c.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Dialog novo cupom */}
      <Dialog open={couponDialog} onClose={() => setCouponDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Novo Cupom de Desconto</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} style={{ marginTop: 4 }}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Código do cupom" value={newCoupon.code}
                onChange={e => setNewCoupon(n => ({ ...n, code: e.target.value.toUpperCase() }))}
                helperText="Ex: PROMO10, BEMVINDO20" />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de desconto</InputLabel>
                <Select value={newCoupon.discountType} onChange={e => setNewCoupon(n => ({ ...n, discountType: e.target.value }))}>
                  <MenuItem value="percent">Porcentagem (%)</MenuItem>
                  <MenuItem value="fixed">Valor fixo (R$)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label={newCoupon.discountType === "percent" ? "Desconto (%)" : "Desconto (R$)"}
                value={newCoupon.discountValue} onChange={e => setNewCoupon(n => ({ ...n, discountValue: e.target.value }))}
                inputProps={{ min: 0, step: "0.01" }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label="Pedido mínimo (R$)"
                value={newCoupon.minOrderValue} onChange={e => setNewCoupon(n => ({ ...n, minOrderValue: e.target.value }))}
                helperText="Opcional" inputProps={{ min: 0, step: "0.01" }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label="Limite de usos"
                value={newCoupon.usageLimit} onChange={e => setNewCoupon(n => ({ ...n, usageLimit: e.target.value }))}
                helperText="Vazio = ilimitado" inputProps={{ min: 1 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" type="date" label="Validade"
                InputLabelProps={{ shrink: true }}
                value={newCoupon.expiresAt} onChange={e => setNewCoupon(n => ({ ...n, expiresAt: e.target.value }))}
                helperText="Opcional" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCouponDialog(false)} disabled={savingCoupon}>Cancelar</Button>
          <Button onClick={saveCoupon} variant="contained" color="primary" disabled={savingCoupon}>
            {savingCoupon ? <CircularProgress size={18} /> : "Criar Cupom"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Link de Divulgação ── */}
      <Paper className={classes.section}>
        <Box display="flex" alignItems="center" style={{ gap: 8, marginBottom: 8 }}>
          <LinkIcon color="primary" />
          <Typography variant="h6">Link de Divulgação</Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
          Compartilhe este link nas redes sociais. Quando a pessoa clicar, o WhatsApp abre já com a mensagem configurada.
          Ao enviar, ela recebe automaticamente o link do cardápio.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="Mensagem de divulgação (palavra-chave)"
              value={config.divulgationMessage || ""}
              onChange={e => setConfig(c => ({ ...c, divulgationMessage: e.target.value }))}
              variant="outlined"
              size="small"
              placeholder="Ex: Quero pedir meu lanche"
              helperText="Quando o cliente enviar exatamente essa mensagem, o bot responde com o link do cardápio."
            />
          </Grid>
          <Grid item xs={12}>
            {whatsappPhone && config.divulgationMessage ? (
              <Box
                display="flex"
                alignItems="center"
                style={{
                  gap: 8,
                  background: "#f5f5f5",
                  borderRadius: 8,
                  padding: "10px 14px",
                  border: "1px solid #ddd",
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  variant="body2"
                  style={{ flex: 1, wordBreak: "break-all", fontFamily: "monospace", fontSize: 13 }}
                >
                  {`https://wa.me/55${whatsappPhone}?text=${encodeURIComponent(config.divulgationMessage)}`}
                </Typography>
                <Tooltip title="Copiar link">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<FileCopyIcon fontSize="small" />}
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `https://wa.me/55${whatsappPhone}?text=${encodeURIComponent(config.divulgationMessage)}`
                      );
                      const { toast: t } = require("react-toastify");
                      t.success("Link copiado!");
                    }}
                  >
                    Copiar
                  </Button>
                </Tooltip>
              </Box>
            ) : (
              <Typography variant="caption" color="textSecondary">
                {!whatsappPhone
                  ? "Conecte o WhatsApp para gerar o link."
                  : "Preencha a mensagem acima para gerar o link."}
              </Typography>
            )}
          </Grid>
        </Grid>
        <Box mt={2}><Button variant="contained" color="primary" onClick={saveConfig}>Salvar</Button></Box>
      </Paper>

      {/* ── Limpar histórico de pedidos ── */}
      <Paper className={classes.section} style={{ borderLeft: "4px solid #d32f2f" }}>
        <Typography variant="h6" className={classes.title} style={{ color: "#d32f2f" }}>
          Limpar Histórico de Pedidos
        </Typography>
        <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
          Apaga permanentemente todos os pedidos do período selecionado. Esta ação não pode ser desfeita.
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <TextField
              type="date" size="small" label="De" variant="outlined"
              InputLabelProps={{ shrink: true }}
              value={clearDateFrom}
              onChange={e => setClearDateFrom(e.target.value)}
              style={{ width: 160 }}
            />
          </Grid>
          <Grid item>
            <TextField
              type="date" size="small" label="Até" variant="outlined"
              InputLabelProps={{ shrink: true }}
              value={clearDateTo}
              onChange={e => setClearDateTo(e.target.value)}
              style={{ width: 160 }}
            />
          </Grid>
          <Grid item>
            <Button size="small" variant="outlined" onClick={() => { setClearDateFrom(today); setClearDateTo(today); }}>
              Hoje
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              style={{ backgroundColor: "#d32f2f", color: "white" }}
              startIcon={<DeleteIcon />}
              onClick={() => setClearDialog(true)}
              disabled={!clearDateFrom || !clearDateTo}
            >
              Limpar pedidos
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Dialog confirmação */}
      <Dialog open={clearDialog} onClose={() => setClearDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle style={{ color: "#d32f2f" }}>Confirmar limpeza</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Tem certeza que deseja apagar <strong>todos os pedidos</strong> de{" "}
            <strong>{clearDateFrom}</strong> até <strong>{clearDateTo}</strong>?
          </Typography>
          <Typography variant="body2" color="error" style={{ marginTop: 8 }}>
            Esta ação é irreversível. O dashboard ficará zerado para este período.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialog(false)} disabled={clearing}>Cancelar</Button>
          <Button
            onClick={clearOrders}
            variant="contained"
            style={{ backgroundColor: "#d32f2f", color: "white" }}
            disabled={clearing}
          >
            {clearing ? <CircularProgress size={18} style={{ color: "white" }} /> : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default SettingsPage;

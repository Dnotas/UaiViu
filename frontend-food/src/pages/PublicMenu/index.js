import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
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
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Checkbox from "@material-ui/core/Checkbox";
import ShoppingCartIcon from "@material-ui/icons/ShoppingCart";
import AddIcon from "@material-ui/icons/Add";
import RemoveIcon from "@material-ui/icons/Remove";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import InputAdornment from "@material-ui/core/InputAdornment";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const FOOD_API = process.env.REACT_APP_BACKEND_FOOD_URL || "http://localhost:3003";

const useStyles = makeStyles((theme) => ({
  qty: { display: "flex", alignItems: "center", gap: 4 },
  cartDrawer: { width: 360, padding: theme.spacing(2), [theme.breakpoints.down("xs")]: { width: "100vw" } },
  cartItem: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing(1) },
  total: { fontWeight: "bold", fontSize: 18 },
  payOption: { border: "1px solid #ddd", borderRadius: 8, marginBottom: 4, padding: "4px 12px" },
  itemCard: { display: "flex", marginBottom: theme.spacing(1), borderRadius: 12, overflow: "hidden" },
  itemImg: { width: 90, height: 90, objectFit: "cover", flexShrink: 0 },
  complementRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "4px 0",
    borderBottom: "1px solid #f0f0f0",
  },
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
  const [cashSubMethod, setCashSubMethod] = useState("cash_money"); // cash_money | cash_pix | cash_card
  const [trocoAmount, setTrocoAmount] = useState("");
  const [form, setForm] = useState({ customerName: "", customerPhone: "", cep: "", customerAddress: "", customerAddressNumber: "", customerAddressComplement: "", customerNeighborhood: "", notes: "" });
  const [ordering, setOrdering] = useState(false);
  const [orderDone, setOrderDone] = useState(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [sessionToken, setSessionToken] = useState("");

  // Taxa por distância
  const [calculatedFee, setCalculatedFee] = useState(null);   // null = ainda não calculou
  const [calculatedPrepMinutes, setCalculatedPrepMinutes] = useState(null);
  const [deliveryCalcLoading, setDeliveryCalcLoading] = useState(false);
  const [deliveryCalcError, setDeliveryCalcError] = useState(false);
  const [deliveryOutOfRange, setDeliveryOutOfRange] = useState(false);
  const [deliveryDistance, setDeliveryDistance] = useState(null);
  // Coordenadas geocodificadas do cliente (enviadas ao backend para cálculo de frete server-side)
  const [customerCoords, setCustomerCoords] = useState(null); // { lat, lng }
  // cidade/UF do CEP — usados na geocodificação do endereço do cliente
  const [addressCity, setAddressCity] = useState("");
  const [addressUf, setAddressUf] = useState("");

  // Cupom de desconto
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discountType, discountValue }

  // Idempotency key — gerado uma vez por checkout, evita pedido duplicado em retry/duplo clique
  const [checkoutKey, setCheckoutKey] = useState(() => (crypto.randomUUID ? crypto.randomUUID() : null));

  // Complement picker dialog
  const [complementDialog, setComplementDialog] = useState({ open: false, item: null, selected: [] });

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
      } catch { toast.error("Restaurante nao encontrado"); }
      finally { setLoading(false); }
    };
    load();

    const params = new URLSearchParams(window.location.search);
    const session = params.get("session");
    if (session) {
      setSessionToken(session);
      axios.get(`${FOOD_API}/api/food/public/session/${session}`)
        .then(({ data }) => {
          if (data.phone) setForm(f => ({ ...f, customerPhone: data.phone }));
        })
        .catch(() => {});
    }

    const phone = params.get("phone");
    if (phone) {
      const digits = phone.replace(/\D/g, "");
      if (digits.length >= 10 && digits.length <= 13) {
        setForm(f => ({ ...f, customerPhone: digits }));
      }
    }
  }, [slug]);

  // Opens complement picker or adds directly
  const handleAddItem = (item) => {
    const complements = item.food_item_complements || item.complements || [];
    const activeComplements = complements.filter(c => c.active !== false);
    if (item.hasComplements && activeComplements.length > 0) {
      setComplementDialog({ open: true, item, selected: [] });
    } else {
      addToCart(item, []);
    }
  };

  // Calcula o extra dos complementos considerando limite de grátis e quantidade
  // Os N mais baratos (expandindo por qty) são grátis, o restante paga o preço cheio
  const calcComplementsExtra = (selectedComplements, freeLimit) => {
    const flat = selectedComplements.flatMap(c => Array(c.qty || 1).fill(parseFloat(c.price || 0)));
    if (!freeLimit || freeLimit <= 0) {
      return flat.reduce((sum, p) => sum + p, 0);
    }
    const sorted = [...flat].sort((a, b) => a - b);
    return sorted.slice(freeLimit).reduce((sum, p) => sum + p, 0);
  };

  const addToCart = (item, selectedComplements) => {
    const freeLimit = item.freeComplementsLimit || 0;
    const complementsExtra = calcComplementsExtra(selectedComplements, freeLimit);
    const unitPrice = parseFloat(item.price) + complementsExtra;
    const cartKey = item.id + (selectedComplements.length ? "_" + selectedComplements.map(c => `${c.id}x${c.qty || 1}`).sort().join("-") : "");

    setCart(prev => {
      const existing = prev.find(c => c.cartKey === cartKey);
      if (existing) return prev.map(c => c.cartKey === cartKey ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, {
        cartKey,
        menuItemId: item.id,
        name: item.name,
        unitPrice,
        quantity: 1,
        notes: "",
        complements: selectedComplements,
      }];
    });
  };

  const confirmComplements = () => {
    addToCart(complementDialog.item, complementDialog.selected);
    setComplementDialog({ open: false, item: null, selected: [] });
  };

  const addComplement = (complement) => {
    setComplementDialog(d => {
      const existing = d.selected.find(c => c.id === complement.id);
      if (existing) {
        return { ...d, selected: d.selected.map(c => c.id === complement.id ? { ...c, qty: (c.qty || 1) + 1 } : c) };
      }
      return { ...d, selected: [...d.selected, { ...complement, qty: 1 }] };
    });
  };

  const removeComplement = (complement) => {
    setComplementDialog(d => {
      const existing = d.selected.find(c => c.id === complement.id);
      if (!existing) return d;
      if ((existing.qty || 1) === 1) {
        return { ...d, selected: d.selected.filter(c => c.id !== complement.id) };
      }
      return { ...d, selected: d.selected.map(c => c.id === complement.id ? { ...c, qty: c.qty - 1 } : c) };
    });
  };

  const removeFromCart = (cartKey) => {
    setCart(prev => {
      const existing = prev.find(c => c.cartKey === cartKey);
      if (existing?.quantity === 1) return prev.filter(c => c.cartKey !== cartKey);
      return prev.map(c => c.cartKey === cartKey ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const getQtyByItemId = (itemId) => cart.filter(c => c.menuItemId === itemId).reduce((s, c) => s + c.quantity, 0);

  const handlePhoneChange = async (value) => {
    setForm(f => ({ ...f, customerPhone: value }));
    setCustomerFound(false);
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 11) {
      try {
        const { data } = await axios.get(`${FOOD_API}/api/food/public/${slug}/customer/${digits}`);
        if (data) {
          setForm(f => ({
            ...f,
            customerPhone: value,
            customerName: data.customerName || f.customerName,
            cep: data.cep || f.cep,
            customerAddress: data.customerAddress || f.customerAddress,
            customerAddressNumber: data.customerAddressNumber || f.customerAddressNumber,
            customerAddressComplement: data.customerAddressComplement || f.customerAddressComplement,
            customerNeighborhood: data.customerNeighborhood || f.customerNeighborhood,
          }));
          setCustomerFound(true);
          // Calcula frete automaticamente quando endereço é preenchido via cache
          if (data.cep) {
            const cepDigits = data.cep.replace(/\D/g, "");
            if (cepDigits.length === 8) {
              try {
                const cepRes = await axios.get(`https://viacep.com.br/ws/${cepDigits}/json/`);
                if (!cepRes.data.erro) {
                  const city = cepRes.data.localidade || "";
                  const uf = cepRes.data.uf || "";
                  setAddressCity(city);
                  setAddressUf(uf);
                  const street = data.customerAddress || cepRes.data.logradouro || "";
                  if (street) calculateDeliveryFee(street, city, uf);
                }
              } catch {}
            }
          }
        }
      } catch { }
    }
  };

  const handleCepChange = async (value) => {
    const cep = value.replace(/\D/g, "");
    setForm(f => ({ ...f, cep: value }));
    if (cep.length === 8) {
      setCepLoading(true);
      try {
        const res = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
        if (!res.data.erro) {
          const street = res.data.logradouro || "";
          const city = res.data.localidade || "";
          const uf = res.data.uf || "";
          setForm(f => ({ ...f, cep: value, customerAddress: street, customerNeighborhood: res.data.bairro || "" }));
          setAddressCity(city);
          setAddressUf(uf);
          setCalculatedFee(null);
          setDeliveryOutOfRange(false);
          setDeliveryCalcError(false);
          setDeliveryDistance(null);
          // Auto-calcula frete assim que o CEP preenche o endereço
          if (street) {
            calculateDeliveryFee(street, city, uf);
          }
        } else {
          toast.error("CEP nao encontrado");
        }
      } catch { toast.error("Erro ao buscar CEP"); }
      finally { setCepLoading(false); }
    }
  };

  // Haversine em km
  const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Tenta geocodificar usando múltiplos provedores em cascata
  const geocodeAddress = async (addressLine) => {
    // Provedor 1: Nominatim (OpenStreetMap)
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressLine)}&format=json&limit=1`,
        { headers: { "Accept-Language": "pt-BR" }, timeout: 8000 }
      );
      if (res.data?.length) {
        return { lat: parseFloat(res.data[0].lat), lng: parseFloat(res.data[0].lon) };
      }
    } catch {}

    // Provedor 2: Photon (Komoot) — fallback gratuito sem chave
    try {
      const res = await axios.get(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(addressLine)}&limit=1&lang=pt`,
        { timeout: 8000 }
      );
      const feat = res.data?.features?.[0];
      if (feat) {
        const [lon, lat] = feat.geometry.coordinates;
        return { lat: parseFloat(lat), lng: parseFloat(lon) };
      }
    } catch {}

    // Provedor 3: geocode.xyz — fallback gratuito sem chave
    try {
      const res = await axios.get(
        `https://geocode.xyz/${encodeURIComponent(addressLine)}?json=1`,
        { timeout: 8000 }
      );
      if (res.data?.latt && res.data?.longt && !res.data?.error) {
        return { lat: parseFloat(res.data.latt), lng: parseFloat(res.data.longt) };
      }
    } catch {}

    return null;
  };

  // Aceita overrides para quando chamado diretamente do CEP (setState ainda não atualizou)
  const calculateDeliveryFee = async (overrideStreet = null, overrideCity = null, overrideUf = null) => {
    if (!restaurant?.deliveryByDistance) return;
    if (!restaurant.restaurantLat || !restaurant.restaurantLng) return;

    const street = overrideStreet ?? form.customerAddress;
    const city = overrideCity ?? addressCity;
    const uf = overrideUf ?? addressUf;

    if (!street) return;

    const addressLine = [street, form.customerAddressNumber, form.customerNeighborhood, city, uf, "Brasil"]
      .filter(Boolean).join(", ");

    setDeliveryCalcLoading(true);
    setDeliveryCalcError(false);
    try {
      const coords = await geocodeAddress(addressLine);
      if (!coords) {
        setDeliveryCalcError(true);
        setDeliveryCalcLoading(false);
        return null;
      }
      const distKm = haversineKm(
        coords.lat, coords.lng,
        parseFloat(restaurant.restaurantLat), parseFloat(restaurant.restaurantLng)
      );
      setDeliveryDistance(distKm);
      setCustomerCoords(coords);

      const rates = [...(restaurant.deliveryRates || [])].sort((a, b) => a.maxKm - b.maxKm);
      const rate = rates.find(r => distKm <= parseFloat(r.maxKm));
      if (!rate) {
        setDeliveryOutOfRange(true);
        setCalculatedFee(null);
        setCalculatedPrepMinutes(null);
        setCustomerCoords(null);
        toast.error(`Seu endereço (${distKm.toFixed(1)} km) está fora da área de entrega.`);
        return null;
      } else {
        setDeliveryOutOfRange(false);
        setCalculatedFee(parseFloat(rate.fee));
        setCalculatedPrepMinutes(parseInt(rate.prepMinutes, 10));
        return { fee: parseFloat(rate.fee), coords };
      }
    } catch {
      setDeliveryCalcError(true);
      return null;
    } finally {
      setDeliveryCalcLoading(false);
    }
  };

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    const currentSubtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const currentDeliveryFee = orderType === "delivery"
      ? (restaurant?.deliveryByDistance ? (calculatedFee ?? 0) : parseFloat(restaurant?.deliveryFee || 0))
      : 0;
    setCouponLoading(true);
    try {
      const { data } = await axios.post(`${FOOD_API}/api/food/public/${slug}/coupons/validate`, {
        code: couponInput.trim(),
        orderValue: currentSubtotal + currentDeliveryFee,
      });
      if (data.valid) {
        setAppliedCoupon(data);
        toast.success(`Cupom ${data.code} aplicado!`);
      } else {
        setAppliedCoupon(null);
        toast.error(data.message || "Cupom inválido");
      }
    } catch {
      toast.error("Erro ao validar cupom");
    } finally {
      setCouponLoading(false);
    }
  };

  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const deliveryFee = orderType === "delivery"
    ? (restaurant?.deliveryByDistance ? (calculatedFee ?? 0) : parseFloat(restaurant?.deliveryFee || 0))
    : 0;
  const discountAmount = appliedCoupon
    ? (appliedCoupon.discountType === "percent"
        ? Math.min(subtotal * (appliedCoupon.discountValue / 100), subtotal)
        : Math.min(appliedCoupon.discountValue, subtotal))
    : 0;
  const total = subtotal + deliveryFee - discountAmount;

  const submitOrder = async () => {
    if (!cart.length) return toast.error("Carrinho vazio");
    if (!form.customerPhone) return toast.error("Informe seu telefone");
    if (orderType === "delivery" && !form.customerAddress) return toast.error("Informe o endereco");
    // Se frete por distância ainda não calculado, tenta calcular agora e prossegue direto
    let resolvedCoords = customerCoords;
    if (orderType === "delivery" && restaurant?.deliveryByDistance && calculatedFee === null) {
      const result = await calculateDeliveryFee();
      if (!result) {
        return; // erro já exibido dentro de calculateDeliveryFee
      }
      resolvedCoords = result.coords;
    }
    if (orderType === "delivery" && restaurant?.deliveryByDistance && deliveryOutOfRange) {
      return toast.error("Seu endereço está fora da área de entrega.");
    }

    // Resolve método de pagamento final
    const finalPayment = paymentMethod === "cash" ? cashSubMethod : paymentMethod;
    // Monta nota de troco se necessário
    let notesWithTroco = form.notes || "";
    if (paymentMethod === "cash" && cashSubMethod === "cash_money" && trocoAmount) {
      const trocoNote = `Troco para R$ ${trocoAmount}`;
      notesWithTroco = notesWithTroco ? `${notesWithTroco} | ${trocoNote}` : trocoNote;
    }

    setOrdering(true);
    try {
      const { data } = await axios.post(`${FOOD_API}/api/food/public/${slug}/orders`, {
        ...form,
        notes: notesWithTroco,
        customerPhone: form.customerPhone.replace(/\D/g, ""),
        paymentMethod: finalPayment,
        orderType,
        items: cart.map(i => ({
          menuItemId: i.menuItemId,
          name: i.name + (i.complements?.length ? " (" + i.complements.map(c => (c.qty || 1) > 1 ? `${c.qty}x ${c.name}` : c.name).join(", ") + ")" : ""),
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          notes: i.notes,
        })),
        session: sessionToken || undefined,
        // Coordenadas para cálculo de frete server-side (quando deliveryByDistance ativo)
        customerLat: (orderType === "delivery" && restaurant?.deliveryByDistance && resolvedCoords) ? resolvedCoords.lat : undefined,
        customerLng: (orderType === "delivery" && restaurant?.deliveryByDistance && resolvedCoords) ? resolvedCoords.lng : undefined,
        couponCode: appliedCoupon?.code || undefined,
        // Token de idempotência — estável por checkout, evita duplicação em retry
        idempotencyKey: checkoutKey || undefined,
      });
      setOrderDone(data);
      setCart([]);
      setCartOpen(false);
      // Gera nova chave para o próximo pedido
      if (crypto.randomUUID) setCheckoutKey(crypto.randomUUID());
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao realizar pedido");
    } finally {
      setOrdering(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  if (orderDone) return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" p={3} style={{ textAlign: "center" }}>
      <Typography variant="h3" style={{ marginBottom: 8 }}>🎉</Typography>
      <Typography variant="h5" gutterBottom style={{ fontWeight: "bold" }}>Pedido realizado!</Typography>
      <Typography variant="body1">Pedido #{orderDone.orderId}</Typography>
      <Typography variant="body1">Total: <strong>R$ {parseFloat(orderDone.total).toFixed(2)}</strong></Typography>
      <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
        Tempo estimado: {orderDone.estimatedMinutes} minutos
      </Typography>
      <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
        Voce recebera atualizacoes pelo WhatsApp.
      </Typography>
      <Box mt={3}>
        <Button
          variant="contained"
          size="large"
          style={{ backgroundColor: "#25D366", color: "white", borderRadius: 24, padding: "12px 32px", fontSize: 16 }}
          component="a"
          href="whatsapp://"
        >
          ← Voltar ao WhatsApp
        </Button>
      </Box>
    </Box>
  );

  const primaryColor = restaurant?.primaryColor || "#FF5722";
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const ItemCard = ({ item }) => {
    const qty = getQtyByItemId(item.id);
    const unavailable = item.available === false;
    return (
      <Card className={classes.itemCard} elevation={1} style={{ opacity: unavailable ? 0.6 : 1 }}>
        <CardContent style={{ flex: 1, padding: "12px 12px 8px" }}>
          <Typography variant="subtitle2" style={{ fontWeight: 600 }}>{item.name}</Typography>
          {unavailable && (
            <Typography variant="caption" style={{ color: "#f44336", fontWeight: 600, display: "block" }}>
              Indisponível no momento
            </Typography>
          )}
          {item.description && (
            <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 4 }}>
              {item.description}
            </Typography>
          )}
          <Typography variant="body2" style={{ fontWeight: "bold", color: unavailable ? "#aaa" : primaryColor }}>
            R$ {parseFloat(item.price).toFixed(2)}
          </Typography>
          {item.hasComplements && !unavailable && (
            <Typography variant="caption" color="textSecondary" display="block">
              {item.freeComplementsLimit > 0
                ? `+ adicionais (${item.freeComplementsLimit} grátis)`
                : "+ complementos"
              }
            </Typography>
          )}
          <div className={classes.qty} style={{ marginTop: 6 }}>
            {unavailable ? (
              <Button size="small" variant="outlined" disabled style={{ borderRadius: 20 }}>
                Indisponível
              </Button>
            ) : qty > 0 && !item.hasComplements ? (
              <>
                <IconButton size="small" onClick={() => {
                  const cartEntry = cart.find(c => c.menuItemId === item.id);
                  if (cartEntry) removeFromCart(cartEntry.cartKey);
                }}><RemoveIcon fontSize="small" /></IconButton>
                <Typography style={{ minWidth: 20, textAlign: "center" }}>{qty}</Typography>
                <IconButton size="small" onClick={() => handleAddItem(item)} style={{ color: primaryColor }}><AddIcon fontSize="small" /></IconButton>
              </>
            ) : (
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => handleAddItem(item)}
                style={{ borderColor: primaryColor, color: primaryColor, borderRadius: 20 }}>
                {qty > 0 ? `Adicionar (${qty})` : "Adicionar"}
              </Button>
            )}
          </div>
        </CardContent>
        {item.imageUrl && (
          <img src={`${FOOD_API}${item.imageUrl}`} alt={item.name} className={classes.itemImg} />
        )}
      </Card>
    );
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f8f8" }}>

      {/* Banner / Header */}
      <div style={{
        position: "relative", height: 170, overflow: "hidden",
        background: restaurant?.bannerImageUrl
          ? `url(${FOOD_API}${restaurant.bannerImageUrl}) center/cover no-repeat`
          : primaryColor,
      }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 30%, rgba(0,0,0,0.55))" }} />
        <div style={{ position: "absolute", bottom: 14, left: 16, display: "flex", alignItems: "center", gap: 10 }}>
          {restaurant?.logoUrl && (
            <img src={`${FOOD_API}${restaurant.logoUrl}`} alt="logo"
              style={{ width: 54, height: 54, borderRadius: "50%", objectFit: "cover", border: "2px solid white" }} />
          )}
          <div>
            <Typography variant="h6" style={{ color: "white", fontWeight: "bold", lineHeight: 1.2, textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
              {restaurant?.restaurantName || "Cardapio"}
            </Typography>
            {restaurant?.deliveryByDistance ? (
              (restaurant.deliveryRates || []).length > 0 && (
                <Typography variant="caption" style={{ color: "rgba(255,255,255,0.9)" }}>
                  Frete a partir de R$ {Math.min(...restaurant.deliveryRates.map(r => parseFloat(r.fee))).toFixed(2)}
                </Typography>
              )
            ) : (
              parseFloat(restaurant?.deliveryFee || 0) > 0 && (
                <Typography variant="caption" style={{ color: "rgba(255,255,255,0.9)" }}>
                  Taxa de entrega: R$ {parseFloat(restaurant.deliveryFee).toFixed(2)}
                </Typography>
              )
            )}
          </div>
        </div>
        <IconButton onClick={() => setCartOpen(true)}
          style={{ position: "absolute", top: 10, right: 10, color: "white", background: "rgba(0,0,0,0.25)", padding: 8 }}>
          <Badge badgeContent={cartCount} color="secondary">
            <ShoppingCartIcon />
          </Badge>
        </IconButton>
      </div>

      {/* Banner de status da loja */}
      {restaurant?.storeStatus === "closed_silent" && (
        <Box px={2} py={1} style={{ background: "#e53935", color: "white", display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <span>🔴</span>
          <span>Loja fechada no momento. Pedidos não estão sendo aceitos.</span>
        </Box>
      )}
      {restaurant?.storeStatus === "closed_notice" && (
        <Box px={2} py={1} style={{ background: "#e53935", color: "white", display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <span>🔴</span>
          <span>{restaurant.closedMessage || "Loja fechada no momento. Pedidos não estão sendo aceitos."}</span>
        </Box>
      )}
      {restaurant?.storeStatus === "open" && restaurant?.busyMode && (
        <Box px={2} py={1} style={{ background: "#FF9800", color: "white", display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <span>⏳</span>
          <span>Alta demanda no momento — pedidos podem demorar mais que o habitual. Agradecemos sua paciência!</span>
        </Box>
      )}

      {/* Conteudo */}
      <Box px={2} pb={12} pt={2}>
        {selectedGroup ? (
          <>
            <Box display="flex" alignItems="center" mb={2}>
              <IconButton size="small" onClick={() => setSelectedGroup(null)} style={{ marginRight: 8 }}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h6" style={{ fontWeight: "bold" }}>{selectedGroup.name}</Typography>
            </Box>
            {(selectedGroup.items || []).length === 0 ? (
              <Typography color="textSecondary">Nenhum item nesta categoria.</Typography>
            ) : (
              (selectedGroup.items || []).map(item => <ItemCard key={item.id} item={item} />)
            )}
          </>
        ) : (
          <>
            <Typography variant="subtitle1" style={{ fontWeight: "bold", marginBottom: 12 }}>Categorias</Typography>
            <Grid container spacing={2}>
              {groups.map(group => (
                <Grid item xs={4} sm={3} key={group.id}>
                  <div onClick={() => setSelectedGroup(group)} style={{ cursor: "pointer", textAlign: "center" }}>
                    <div style={{
                      width: "100%", paddingTop: "100%", position: "relative",
                      borderRadius: 12, overflow: "hidden",
                      background: group.imageUrl ? "transparent" : primaryColor,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                    }}>
                      {group.imageUrl ? (
                        <img src={`${FOOD_API}${group.imageUrl}`} alt={group.name}
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                          🍽️
                        </div>
                      )}
                      {group.imageUrl && (
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 40%, rgba(0,0,0,0.45))" }} />
                      )}
                    </div>
                    <Typography variant="caption" style={{ fontWeight: 600, display: "block", marginTop: 4, lineHeight: 1.2 }}>
                      {group.name}
                    </Typography>
                  </div>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Box>

      {/* Botao flutuante */}
      {cartCount > 0 && !cartOpen && (
        <Box position="fixed" bottom={16} left={0} right={0} display="flex" justifyContent="center" zIndex={200}>
          <Button variant="contained" startIcon={<ShoppingCartIcon />}
            onClick={() => setCartOpen(true)}
            style={{ borderRadius: 24, padding: "12px 32px", backgroundColor: primaryColor, color: "white" }}>
            Ver carrinho · R$ {total.toFixed(2)}
          </Button>
        </Box>
      )}

      {/* Drawer carrinho */}
      <Drawer anchor="right" open={cartOpen} onClose={() => setCartOpen(false)}>
        <div className={classes.cartDrawer}>
          <Typography variant="h6" gutterBottom>Seu Pedido</Typography>

          {cart.map(item => (
            <div key={item.cartKey} className={classes.cartItem}>
              <div>
                <Typography variant="body2">{item.name}</Typography>
                {item.complements?.length > 0 && (
                  <Typography variant="caption" color="textSecondary">
                    + {item.complements.map(c => (c.qty || 1) > 1 ? `${c.qty}x ${c.name}` : c.name).join(", ")}
                  </Typography>
                )}
                <Typography variant="caption" display="block">{item.quantity}x R$ {item.unitPrice.toFixed(2)}</Typography>
              </div>
              <div className={classes.qty}>
                <IconButton size="small" onClick={() => removeFromCart(item.cartKey)}><RemoveIcon fontSize="small" /></IconButton>
                <Typography>{item.quantity}</Typography>
                <IconButton size="small" color="primary" onClick={() => {
                  const origItem = (selectedGroup?.items || groups.flatMap(g => g.items || [])).find(i => i.id === item.menuItemId);
                  if (origItem) handleAddItem(origItem);
                  else setCart(prev => prev.map(c => c.cartKey === item.cartKey ? { ...c, quantity: c.quantity + 1 } : c));
                }}><AddIcon fontSize="small" /></IconButton>
              </div>
            </div>
          ))}

          <Divider style={{ margin: "8px 0" }} />

          {restaurant?.deliveryEnabled && restaurant?.pickupEnabled && (
            <RadioGroup row value={orderType} onChange={e => setOrderType(e.target.value)}>
              <FormControlLabel value="delivery" control={<Radio color="primary" size="small" />} label="Entrega" />
              <FormControlLabel value="pickup" control={<Radio color="primary" size="small" />} label="Retirada" />
            </RadioGroup>
          )}

          <TextField
            fullWidth size="small" margin="dense"
            label="Telefone (WhatsApp) com DDD"
            value={form.customerPhone}
            onChange={e => handlePhoneChange(e.target.value)}
            helperText={customerFound ? "✓ Dados preenchidos automaticamente" : ""}
            FormHelperTextProps={{ style: { color: "green" } }}
          />
          <TextField fullWidth size="small" margin="dense" label="Seu nome" value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} />

          {orderType === "delivery" && (
            <>
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={8}><TextField fullWidth size="small" margin="dense" label="CEP" value={form.cep} onChange={e => handleCepChange(e.target.value)} inputProps={{ maxLength: 9 }} /></Grid>
                <Grid item xs={4}>{cepLoading && <CircularProgress size={20} style={{ marginTop: 8 }} />}</Grid>
              </Grid>
              <TextField fullWidth size="small" margin="dense" label="Endereco" value={form.customerAddress} onChange={e => { setForm(f => ({ ...f, customerAddress: e.target.value })); setCalculatedFee(null); setDeliveryOutOfRange(false); setDeliveryCalcError(false); }} onBlur={() => calculateDeliveryFee()} />
              <Grid container spacing={1}>
                <Grid item xs={4}><TextField fullWidth size="small" margin="dense" label="Numero" value={form.customerAddressNumber} onChange={e => { setForm(f => ({ ...f, customerAddressNumber: e.target.value })); setCalculatedFee(null); setDeliveryOutOfRange(false); setDeliveryCalcError(false); }} onBlur={() => calculateDeliveryFee()} /></Grid>
                <Grid item xs={8}><TextField fullWidth size="small" margin="dense" label="Complemento" value={form.customerAddressComplement} onChange={e => setForm(f => ({ ...f, customerAddressComplement: e.target.value }))} /></Grid>
              </Grid>
              <TextField fullWidth size="small" margin="dense" label="Bairro" value={form.customerNeighborhood} onChange={e => setForm(f => ({ ...f, customerNeighborhood: e.target.value }))} onBlur={() => calculateDeliveryFee()} />

              {restaurant?.deliveryByDistance && (
                <Box mt={0.5} mb={0.5} minHeight={20}>
                  {deliveryCalcLoading && (
                    <Typography variant="caption" color="textSecondary">
                      <CircularProgress size={10} style={{ marginRight: 4 }} />Calculando frete...
                    </Typography>
                  )}
                  {!deliveryCalcLoading && deliveryOutOfRange && (
                    <Typography variant="caption" color="error" display="block">
                      Fora da área de entrega ({deliveryDistance?.toFixed(1)} km)
                    </Typography>
                  )}
                  {!deliveryCalcLoading && calculatedFee !== null && !deliveryOutOfRange && (
                    <Typography variant="caption" style={{ color: "green", display: "block" }}>
                      {deliveryDistance?.toFixed(1)} km — Frete: R$ {calculatedFee.toFixed(2)}
                      {calculatedPrepMinutes ? ` — aprox. ${calculatedPrepMinutes} min` : ""}
                    </Typography>
                  )}
                  {!deliveryCalcLoading && deliveryCalcError && calculatedFee === null && !deliveryOutOfRange && (
                    <Box display="flex" alignItems="center" mt={0.5}>
                      <Typography variant="caption" color="error" style={{ marginRight: 8 }}>
                        Não foi possível calcular o frete.
                      </Typography>
                      <Button size="small" variant="outlined" color="primary" onClick={() => calculateDeliveryFee()} style={{ fontSize: 11, padding: "2px 8px", minWidth: 0 }}>
                        Calcular frete
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </>
          )}

          <Typography variant="subtitle2" style={{ marginTop: 8 }}>Forma de pagamento</Typography>
          <RadioGroup value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            {paymentMethods.map(m => (
              <FormControlLabel key={m.type} value={m.type} className={classes.payOption}
                control={<Radio color="primary" size="small" />} label={m.label} />
            ))}
          </RadioGroup>

          {/* Sub-opções quando selecionar "Pagar na entrega" */}
          {paymentMethod === "cash" && (
            <Box style={{ background: "#f9f9f9", borderRadius: 8, padding: "8px 12px", marginTop: 4 }}>
              <Typography variant="caption" color="textSecondary">Como vai pagar na entrega?</Typography>
              <RadioGroup value={cashSubMethod} onChange={e => { setCashSubMethod(e.target.value); setTrocoAmount(""); }}>
                <FormControlLabel value="cash_money" control={<Radio color="primary" size="small" />} label="Dinheiro" />
                <FormControlLabel value="cash_pix"   control={<Radio color="primary" size="small" />} label="PIX na entrega" />
                <FormControlLabel value="cash_card"  control={<Radio color="primary" size="small" />} label="Cartão na entrega" />
              </RadioGroup>
              {cashSubMethod === "cash_money" && (
                <TextField
                  size="small" fullWidth variant="outlined"
                  label="Troco para quanto? (vazio = sem troco)"
                  type="number"
                  value={trocoAmount}
                  onChange={e => setTrocoAmount(e.target.value)}
                  style={{ marginTop: 4 }}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: "0.50" }}
                />
              )}
            </Box>
          )}

          <TextField fullWidth size="small" margin="dense" label="Observacoes (opcional)" multiline rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

          <Divider style={{ margin: "8px 0" }} />

          {/* Campo de cupom */}
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <TextField
              size="small"
              label="Cupom de desconto"
              value={couponInput}
              onChange={e => { setCouponInput(e.target.value.toUpperCase()); setAppliedCoupon(null); }}
              style={{ flex: 1 }}
              disabled={!!appliedCoupon}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={applyCoupon}
              disabled={couponLoading || !couponInput.trim() || !!appliedCoupon}
              style={{ whiteSpace: "nowrap", height: 38 }}
            >
              {couponLoading ? <CircularProgress size={14} /> : appliedCoupon ? "Aplicado" : "Aplicar"}
            </Button>
          </Box>
          {appliedCoupon && (
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}
              style={{ background: "#e8f5e9", borderRadius: 6, padding: "4px 8px" }}>
              <Typography variant="caption" style={{ color: "green" }}>
                Cupom <strong>{appliedCoupon.code}</strong>:{" "}
                {appliedCoupon.discountType === "percent"
                  ? `${appliedCoupon.discountValue}% de desconto`
                  : `R$ ${appliedCoupon.discountValue.toFixed(2)} de desconto`}
              </Typography>
              <Button size="small" style={{ minWidth: 0, padding: "0 4px", color: "#888" }}
                onClick={() => { setAppliedCoupon(null); setCouponInput(""); }}>
                ✕
              </Button>
            </Box>
          )}

          <Divider style={{ margin: "8px 0" }} />

          {deliveryFee > 0 && (
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">Taxa de entrega:</Typography>
              <Typography variant="body2">R$ {deliveryFee.toFixed(2)}</Typography>
            </Box>
          )}
          {discountAmount > 0 && (
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" style={{ color: "green" }}>Desconto ({appliedCoupon?.code}):</Typography>
              <Typography variant="body2" style={{ color: "green" }}>- R$ {discountAmount.toFixed(2)}</Typography>
            </Box>
          )}
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography className={classes.total}>Total:</Typography>
            <Typography className={classes.total}>R$ {total.toFixed(2)}</Typography>
          </Box>

          {(restaurant?.storeStatus === "closed_silent" || restaurant?.storeStatus === "closed_notice") ? (
            <Button fullWidth variant="contained" size="large" disabled
              style={{ background: "#ccc", color: "#666" }}>
              🔴 Loja fechada
            </Button>
          ) : (
            <Button fullWidth variant="contained" color="primary" size="large"
              onClick={submitOrder} disabled={ordering || !cart.length}>
              {ordering ? <CircularProgress size={24} color="inherit" /> : "Confirmar Pedido"}
            </Button>
          )}
        </div>
      </Drawer>

      {/* Complement picker dialog */}
      <Dialog
        open={complementDialog.open}
        onClose={() => setComplementDialog({ open: false, item: null, selected: [] })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {complementDialog.item?.name}
          {(() => {
            const freeLimit = complementDialog.item?.freeComplementsLimit || 0;
            const totalUnits = complementDialog.selected.reduce((sum, c) => sum + (c.qty || 1), 0);
            if (freeLimit > 0) {
              const freeUsed = Math.min(totalUnits, freeLimit);
              return (
                <Typography variant="caption" display="block" style={{ color: "#4caf50", fontWeight: 600 }}>
                  {totalUnits === 0
                    ? `Escolha até ${freeLimit} adicional${freeLimit > 1 ? "is" : ""} grátis`
                    : totalUnits <= freeLimit
                      ? `${freeUsed} de ${freeLimit} grátis selecionado${freeUsed > 1 ? "s" : ""}`
                      : `${freeLimit} grátis + ${totalUnits - freeLimit} pago${totalUnits - freeLimit > 1 ? "s" : ""}`
                  }
                </Typography>
              );
            }
            return (
              <Typography variant="caption" display="block" color="textSecondary">
                Selecione os complementos desejados
              </Typography>
            );
          })()}
        </DialogTitle>
        <DialogContent>
          {(() => {
            const freeLimit = complementDialog.item?.freeComplementsLimit || 0;
            const selected = complementDialog.selected;
            // Expande todos selecionados por qty, ordena por preço para calcular quais são grátis
            const flatSorted = selected
              .flatMap(c => Array(c.qty || 1).fill(c))
              .sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
            const freeCountPer = {};
            flatSorted.slice(0, freeLimit).forEach(c => {
              freeCountPer[c.id] = (freeCountPer[c.id] || 0) + 1;
            });

            return (complementDialog.item?.food_item_complements || complementDialog.item?.complements || [])
              .filter(c => c.active !== false)
              .map(c => {
                const sel = selected.find(s => s.id === c.id);
                const qty = sel?.qty || 0;
                const freeQty = freeCountPer[c.id] || 0;
                const paidQty = Math.max(0, qty - freeQty);
                const unitPrice = parseFloat(c.price || 0);

                let priceLabel;
                if (qty === 0) {
                  priceLabel = unitPrice > 0
                    ? <span>+ R$ {unitPrice.toFixed(2)}</span>
                    : <span>Grátis</span>;
                } else if (freeLimit > 0 && freeQty > 0 && paidQty === 0) {
                  priceLabel = <span style={{ color: "#4caf50", fontWeight: "bold" }}>Grátis</span>;
                } else if (freeLimit > 0 && freeQty > 0 && paidQty > 0) {
                  priceLabel = (
                    <span>
                      <span style={{ color: "#4caf50", fontWeight: "bold" }}>{freeQty}x grátis</span>
                      {" + "}
                      <span>{paidQty}x R$ {unitPrice.toFixed(2)}</span>
                    </span>
                  );
                } else {
                  priceLabel = unitPrice > 0
                    ? <span>+ R$ {unitPrice.toFixed(2)}</span>
                    : <span>Grátis</span>;
                }

                return (
                  <div key={c.id} className={classes.complementRow}>
                    <Typography variant="body2">{c.name}</Typography>
                    <Box display="flex" alignItems="center" style={{ gap: 6 }}>
                      <Typography variant="body2" style={{ fontWeight: "bold" }}>
                        {priceLabel}
                      </Typography>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {qty > 0 && (
                          <IconButton size="small" onClick={() => removeComplement(c)}>
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                        )}
                        {qty > 0 && (
                          <Typography variant="body2" style={{ minWidth: 18, textAlign: "center" }}>{qty}</Typography>
                        )}
                        <IconButton size="small" onClick={() => addComplement(c)} style={{ color: primaryColor }}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </Box>
                  </div>
                );
              });
          })()}
          {complementDialog.selected.length > 0 && (
            <Box mt={1}>
              <Typography variant="caption" color="textSecondary">
                Total com complementos: R$ {(
                  parseFloat(complementDialog.item?.price || 0) +
                  calcComplementsExtra(complementDialog.selected, complementDialog.item?.freeComplementsLimit || 0)
                ).toFixed(2)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComplementDialog({ open: false, item: null, selected: [] })}>
            Cancelar
          </Button>
          <Button
            onClick={confirmComplements}
            variant="contained"
            color="primary"
            style={{ backgroundColor: restaurant?.primaryColor }}
          >
            Adicionar ao carrinho
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PublicMenu;

import React from "react";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Container from "@material-ui/core/Container";
import Divider from "@material-ui/core/Divider";

// ─── Ícones
import RestaurantMenuIcon from "@material-ui/icons/RestaurantMenu";
import PhoneAndroidIcon from "@material-ui/icons/PhoneAndroid";
import LocalShippingIcon from "@material-ui/icons/LocalShipping";
import LocalOfferIcon from "@material-ui/icons/LocalOffer";
import DashboardIcon from "@material-ui/icons/Dashboard";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import ShareIcon from "@material-ui/icons/Share";
import SettingsIcon from "@material-ui/icons/Settings";
import NotificationsActiveIcon from "@material-ui/icons/NotificationsActive";
import HourglassEmptyIcon from "@material-ui/icons/HourglassEmpty";
import FlashOnIcon from "@material-ui/icons/FlashOn";

const PRIMARY = "#e53935";
const SECONDARY = "#ff7043";
const DARK = "#1a1a1a";

const FeatureCard = ({ icon, title, desc }) => (
  <Paper elevation={0} style={{
    border: "1.5px solid #f0f0f0",
    borderRadius: 16,
    padding: "28px 24px",
    height: "100%",
    transition: "box-shadow 0.2s",
  }}>
    <Box mb={1.5} style={{ color: PRIMARY, fontSize: 36 }}>{icon}</Box>
    <Typography variant="subtitle1" style={{ fontWeight: 700, marginBottom: 6 }}>{title}</Typography>
    <Typography variant="body2" color="textSecondary" style={{ lineHeight: 1.6 }}>{desc}</Typography>
  </Paper>
);

const StepCard = ({ num, icon, title, desc }) => (
  <Box textAlign="center" px={2}>
    <Box
      mb={2}
      style={{
        width: 64, height: 64, borderRadius: "50%",
        background: `linear-gradient(135deg, ${PRIMARY}, ${SECONDARY})`,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "white", fontSize: 28, boxShadow: "0 4px 16px rgba(229,57,53,0.3)",
      }}
    >
      {icon}
    </Box>
    <Typography variant="h6" style={{ fontWeight: 700, marginBottom: 6 }}>{num}. {title}</Typography>
    <Typography variant="body2" color="textSecondary" style={{ lineHeight: 1.7 }}>{desc}</Typography>
  </Box>
);

const CheckItem = ({ text }) => (
  <Box display="flex" alignItems="flex-start" mb={1.5}>
    <CheckCircleIcon style={{ color: PRIMARY, marginRight: 10, marginTop: 2, fontSize: 20 }} />
    <Typography variant="body1" style={{ lineHeight: 1.5 }}>{text}</Typography>
  </Box>
);

const LandingPage = () => {
  return (
    <div style={{ fontFamily: "Roboto, sans-serif", color: DARK, overflowX: "hidden" }}>

      {/* ── Navbar ── */}
      <Box
        style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #f0f0f0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        <Container maxWidth="lg">
          <Box display="flex" alignItems="center" justifyContent="space-between" py={1.5}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: `linear-gradient(135deg, ${PRIMARY}, ${SECONDARY})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginRight: 8,
                }}
              >
                <RestaurantMenuIcon style={{ color: "white", fontSize: 20 }} />
              </Box>
              <Typography variant="h6" style={{ fontWeight: 800, color: DARK, letterSpacing: -0.5 }}>
                UaiViu <span style={{ color: PRIMARY }}>Food</span>
              </Typography>
            </Box>
            <Button
              variant="contained"
              href="/login"
              size="small"
              style={{
                background: `linear-gradient(135deg, ${PRIMARY}, ${SECONDARY})`,
                color: "white", borderRadius: 20,
                padding: "6px 20px", fontWeight: 600,
                boxShadow: "0 2px 8px rgba(229,57,53,0.3)",
                textTransform: "none",
              }}
            >
              Entrar no painel
            </Button>
          </Box>
        </Container>
      </Box>

      {/* ── Hero ── */}
      <Box
        style={{
          background: `linear-gradient(135deg, #1a1a1a 0%, #2d1f1f 50%, #3d1a1a 100%)`,
          minHeight: "92vh",
          display: "flex",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Efeitos de fundo */}
        <div style={{
          position: "absolute", top: -100, right: -100,
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(229,57,53,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -80, left: -80,
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,112,67,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <Container maxWidth="lg" style={{ position: "relative", zIndex: 1 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box
                style={{
                  display: "inline-block",
                  background: "rgba(229,57,53,0.15)",
                  border: "1px solid rgba(229,57,53,0.3)",
                  borderRadius: 20, padding: "4px 14px", marginBottom: 20,
                }}
              >
                <Typography variant="caption" style={{ color: "#ff8a80", fontWeight: 600, letterSpacing: 1 }}>
                  CARDÁPIO DIGITAL PELO WHATSAPP
                </Typography>
              </Box>

              <Typography
                variant="h2"
                style={{
                  color: "white", fontWeight: 900,
                  lineHeight: 1.1, marginBottom: 20,
                  fontSize: "clamp(2rem, 5vw, 3.2rem)",
                }}
              >
                Venda mais pelo{" "}
                <span style={{
                  background: `linear-gradient(90deg, ${PRIMARY}, ${SECONDARY})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  WhatsApp
                </span>{" "}
                com cardápio digital
              </Typography>

              <Typography
                variant="h6"
                style={{ color: "rgba(255,255,255,0.65)", fontWeight: 400, lineHeight: 1.7, marginBottom: 36 }}
              >
                Seu restaurante online em minutos. Cardápio bonito, pedidos organizados,
                entrega com taxa por distância e muito mais — tudo integrado ao WhatsApp.
              </Typography>

              <Box display="flex" flexWrap="wrap" style={{ gap: 12 }}>
                <Button
                  variant="contained"
                  size="large"
                  href="/login"
                  style={{
                    background: `linear-gradient(135deg, ${PRIMARY}, ${SECONDARY})`,
                    color: "white", borderRadius: 28,
                    padding: "14px 32px", fontWeight: 700,
                    fontSize: 16, textTransform: "none",
                    boxShadow: "0 6px 24px rgba(229,57,53,0.45)",
                  }}
                >
                  Começar agora — é grátis
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  href="#funcionalidades"
                  style={{
                    borderColor: "rgba(255,255,255,0.3)", color: "white",
                    borderRadius: 28, padding: "14px 28px",
                    fontWeight: 600, fontSize: 16, textTransform: "none",
                  }}
                >
                  Ver funcionalidades
                </Button>
              </Box>

              <Box mt={4} display="flex" flexWrap="wrap" style={{ gap: 24 }}>
                {[
                  "Sem taxa por pedido",
                  "Integrado ao WhatsApp",
                  "Configuração em minutos",
                ].map(t => (
                  <Box key={t} display="flex" alignItems="center" style={{ gap: 6 }}>
                    <CheckCircleIcon style={{ color: "#4caf50", fontSize: 18 }} />
                    <Typography variant="body2" style={{ color: "rgba(255,255,255,0.7)" }}>{t}</Typography>
                  </Box>
                ))}
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box
                style={{
                  background: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 24,
                  padding: 8,
                  boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
                }}
              >
                {/* Mockup do cardápio */}
                <Box style={{ background: "#f8f8f8", borderRadius: 18, overflow: "hidden" }}>
                  {/* Header mockup */}
                  <Box style={{ background: "#e53935", height: 120, position: "relative", display: "flex", alignItems: "flex-end", padding: "12px 16px" }}>
                    <Box style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Box style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <RestaurantMenuIcon style={{ color: "white", fontSize: 22 }} />
                      </Box>
                      <Box>
                        <Typography style={{ color: "white", fontWeight: 700, fontSize: 14 }}>Seu Restaurante</Typography>
                        <Typography style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>Frete a partir de R$ 3,00</Typography>
                      </Box>
                    </Box>
                  </Box>
                  {/* Categorias mockup */}
                  <Box p={1.5}>
                    <Typography style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: "#333" }}>Categorias</Typography>
                    <Grid container spacing={1}>
                      {["Lanches", "Bebidas", "Sobremesas", "Combos"].map((cat, i) => (
                        <Grid item xs={3} key={cat}>
                          <Box style={{
                            background: i === 0 ? "#e53935" : "#f0f0f0",
                            borderRadius: 10, padding: "10px 4px",
                            textAlign: "center",
                          }}>
                            <Typography style={{ fontSize: 10, fontWeight: 600, color: i === 0 ? "white" : "#555" }}>{cat}</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>

                    {/* Item mockup */}
                    <Box mt={1.5} style={{ background: "white", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}>
                      <Box style={{ width: 56, height: 56, borderRadius: 8, background: "#ffccbc", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🍔</Box>
                      <Box flex={1}>
                        <Typography style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>X-Burguer Especial</Typography>
                        <Typography style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>Pão brioche, 180g, queijo, bacon</Typography>
                        <Typography style={{ fontWeight: 700, fontSize: 13, color: "#e53935" }}>R$ 28,90</Typography>
                      </Box>
                      <Box style={{ background: "#e53935", borderRadius: 20, padding: "4px 12px" }}>
                        <Typography style={{ color: "white", fontWeight: 700, fontSize: 12 }}>+ Add</Typography>
                      </Box>
                    </Box>

                    <Box mt={1} style={{ background: "white", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}>
                      <Box style={{ width: 56, height: 56, borderRadius: 8, background: "#c8e6c9", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🍕</Box>
                      <Box flex={1}>
                        <Typography style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>Pizza Margherita</Typography>
                        <Typography style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>Molho de tomate, mussarela, manjericão</Typography>
                        <Typography style={{ fontWeight: 700, fontSize: 13, color: "#e53935" }}>R$ 45,00</Typography>
                      </Box>
                      <Box style={{ background: "#e53935", borderRadius: 20, padding: "4px 12px" }}>
                        <Typography style={{ color: "white", fontWeight: 700, fontSize: 12 }}>+ Add</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Números ── */}
      <Box style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${SECONDARY})`, py: 0 }} py={5}>
        <Container maxWidth="md">
          <Grid container spacing={2} justifyContent="center">
            {[
              { value: "100%", label: "Integrado ao WhatsApp" },
              { value: "0%", label: "Taxa por pedido" },
              { value: "< 5min", label: "Para configurar" },
              { value: "24/7", label: "Cardápio online" },
            ].map(item => (
              <Grid item xs={6} sm={3} key={item.label}>
                <Box textAlign="center" py={1}>
                  <Typography variant="h4" style={{ color: "white", fontWeight: 900 }}>{item.value}</Typography>
                  <Typography variant="caption" style={{ color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{item.label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Funcionalidades ── */}
      <Box id="funcionalidades" py={10} style={{ background: "#fafafa" }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={7}>
            <Typography variant="overline" style={{ color: PRIMARY, fontWeight: 700, letterSpacing: 2 }}>
              FUNCIONALIDADES
            </Typography>
            <Typography variant="h3" style={{ fontWeight: 900, marginTop: 8, marginBottom: 16 }}>
              Tudo que seu restaurante precisa
            </Typography>
            <Typography variant="h6" color="textSecondary" style={{ maxWidth: 520, margin: "0 auto", fontWeight: 400 }}>
              Uma plataforma completa para gerenciar seu cardápio e pedidos pelo WhatsApp.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {[
              {
                icon: <RestaurantMenuIcon fontSize="inherit" />,
                title: "Cardápio Digital Bonito",
                desc: "Monte seu cardápio com fotos, descrições, grupos e itens. Seus clientes acessam direto no WhatsApp, sem precisar de app.",
              },
              {
                icon: <PhoneAndroidIcon fontSize="inherit" />,
                title: "Pedidos pelo WhatsApp",
                desc: "O cliente faz o pedido pelo link no WhatsApp. Você recebe no painel e uma mensagem automática confirma na hora.",
              },
              {
                icon: <LocalShippingIcon fontSize="inherit" />,
                title: "Taxa por Distância",
                desc: "Configure tabelas de frete por km. O sistema calcula automaticamente a taxa de entrega pelo endereço do cliente.",
              },
              {
                icon: <LocalOfferIcon fontSize="inherit" />,
                title: "Cupons de Desconto",
                desc: "Crie cupons com % ou valor fixo, limite de usos, pedido mínimo e validade. Seus clientes aplicam na hora do pedido.",
              },
              {
                icon: <AddCircleOutlineIcon fontSize="inherit" />,
                title: "Complementos e Adicionais",
                desc: "Configure adicionais por item com preços individuais. Defina quantos são grátis e o resto é cobrado automaticamente.",
              },
              {
                icon: <DashboardIcon fontSize="inherit" />,
                title: "Dashboard de Pedidos",
                desc: "Acompanhe pedidos em tempo real, atualize status, envie mensagens automáticas e veja relatórios de vendas.",
              },
              {
                icon: <HourglassEmptyIcon fontSize="inherit" />,
                title: "Redução de Filas",
                desc: "O cliente monta e envia o próprio pedido pelo celular, sem precisar esperar atendimento. Seu estabelecimento atende mais gente com mais agilidade.",
              },
              {
                icon: <NotificationsActiveIcon fontSize="inherit" />,
                title: "Notificação de Pedido Pronto",
                desc: "Quando o pedido fica pronto pra retirada no balcão, o cliente recebe um aviso automático no celular — sem precisar de monitor ou painel de chamada.",
              },
              {
                icon: <FlashOnIcon fontSize="inherit" />,
                title: "Sem Token, Sem Integração",
                desc: "Tudo já vem integrado. Não precisa gerar token nem configurar API externa — os pedidos caem direto no seu painel administrativo.",
              },
            ].map(f => (
              <Grid item xs={12} sm={6} md={4} key={f.title}>
                <FeatureCard {...f} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Como funciona ── */}
      <Box py={10} style={{ background: "white" }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={7}>
            <Typography variant="overline" style={{ color: PRIMARY, fontWeight: 700, letterSpacing: 2 }}>
              COMO FUNCIONA
            </Typography>
            <Typography variant="h3" style={{ fontWeight: 900, marginTop: 8 }}>
              Configure em 3 passos
            </Typography>
          </Box>

          <Grid container spacing={4} justifyContent="center">
            <Grid item xs={12} sm={4}>
              <StepCard
                num={1} icon={<SettingsIcon fontSize="inherit" />}
                title="Configure o cardápio"
                desc="Cadastre seus produtos com fotos, preços e complementos. Defina horários, taxa de entrega e formas de pagamento."
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StepCard
                num={2} icon={<ShareIcon fontSize="inherit" />}
                title="Compartilhe o link"
                desc="Envie o link do seu cardápio no WhatsApp, Instagram ou onde quiser. Seus clientes acessam e fazem o pedido."
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StepCard
                num={3} icon={<PhoneAndroidIcon fontSize="inherit" />}
                title="Receba os pedidos"
                desc="Cada pedido chega no painel e o cliente recebe confirmação automática pelo WhatsApp com o resumo do pedido."
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── O que está incluído ── */}
      <Box py={10} style={{ background: "#fafafa" }}>
        <Container maxWidth="md">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="overline" style={{ color: PRIMARY, fontWeight: 700, letterSpacing: 2 }}>
                TUDO INCLUSO
              </Typography>
              <Typography variant="h4" style={{ fontWeight: 900, marginTop: 8, marginBottom: 24 }}>
                Sem surpresas, sem taxas escondidas
              </Typography>
              {[
                "Cardápio digital com fotos e categorias",
                "Integração com WhatsApp",
                "Pedidos em tempo real no painel",
                "Mensagens automáticas de status",
                "Taxa de entrega por distância (km)",
                "Cupons de desconto personalizados",
                "Complementos e adicionais por item",
                "Link de confirmação para o motoboy",
                "Histórico e relatório de pedidos",
                "Notificação automática quando o pedido fica pronto",
                "Redução de filas no atendimento",
                "Sem token ou integração via API para começar a usar",
              ].map(item => <CheckItem key={item} text={item} />)}
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                style={{
                  background: `linear-gradient(135deg, #1a1a1a, #2d1f1f)`,
                  borderRadius: 24, padding: 32,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
                }}
              >
                <Typography variant="h5" style={{ color: "white", fontWeight: 800, marginBottom: 8 }}>
                  Pronto para começar?
                </Typography>
                <Typography variant="body1" style={{ color: "rgba(255,255,255,0.65)", marginBottom: 28, lineHeight: 1.7 }}>
                  Entre em contato e tenha seu cardápio digital funcionando no WhatsApp ainda hoje.
                </Typography>

                <Button
                  fullWidth variant="contained" size="large"
                  href="/login"
                  style={{
                    background: `linear-gradient(135deg, ${PRIMARY}, ${SECONDARY})`,
                    color: "white", borderRadius: 28,
                    padding: "14px", fontWeight: 700,
                    fontSize: 16, textTransform: "none",
                    marginBottom: 12,
                    boxShadow: "0 6px 20px rgba(229,57,53,0.4)",
                  }}
                >
                  Acessar o painel
                </Button>

                <Button
                  fullWidth variant="outlined" size="large"
                  href="https://wa.me/5531915552222"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    borderColor: "rgba(255,255,255,0.25)",
                    color: "rgba(255,255,255,0.85)",
                    borderRadius: 28, padding: "14px",
                    fontWeight: 600, fontSize: 16, textTransform: "none",
                  }}
                >
                  Falar no WhatsApp
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Footer ── */}
      <Box style={{ background: DARK }} py={5}>
        <Container maxWidth="lg">
          <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="center" style={{ gap: 16 }}>
            <Box display="flex" alignItems="center">
              <Box
                style={{
                  width: 30, height: 30, borderRadius: 7,
                  background: `linear-gradient(135deg, ${PRIMARY}, ${SECONDARY})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginRight: 8,
                }}
              >
                <RestaurantMenuIcon style={{ color: "white", fontSize: 17 }} />
              </Box>
              <Typography style={{ color: "white", fontWeight: 800 }}>
                UaiViu <span style={{ color: PRIMARY }}>Food</span>
              </Typography>
            </Box>
            <Typography variant="caption" style={{ color: "rgba(255,255,255,0.4)" }}>
              © {new Date().getFullYear()} UaiViu Food. Todos os direitos reservados.
            </Typography>
          </Box>
        </Container>
      </Box>

    </div>
  );
};

export default LandingPage;

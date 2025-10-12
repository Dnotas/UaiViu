// src/pages/Financeiro/index.js
import React, { useState, useEffect, useMemo } from "react";
import {
  TextField,
  Button,
  Paper,
  Typography,
  MenuItem,
  Grid,
  IconButton,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tooltip,
  Tabs,
  Tab,
  TableContainer,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { v4 as uuidv4 } from "uuid";
import DeleteIcon from "@material-ui/icons/Delete";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import PrintIcon from "@material-ui/icons/Print";
import EditIcon from "@material-ui/icons/Edit";
import SearchIcon from "@material-ui/icons/Search";
import InputAdornment from "@material-ui/core/InputAdornment";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    maxWidth: 1100,
    margin: "auto",
    marginTop: theme.spacing(5),
    borderRadius: 16,
    backgroundColor: theme.palette.background.paper,
  },
  title: {
    marginBottom: theme.spacing(2),
    fontWeight: 700,
    color: theme.palette.text.primary,
  },
  sectionTitle: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(1),
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  field: {
    marginBottom: theme.spacing(2),
  },
  box: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 12,
    backgroundColor: theme.palette.background.default,
  },
  tablePaper: {
    borderRadius: 12,
    overflow: "hidden",
  },
  totalRow: {
    fontWeight: 700,
  },
  listCard: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
  },
  actionsBar: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  tabsBar: {
    marginBottom: theme.spacing(2),
  },
}));

const planos = [
  { label: "Plano Básico", value: 49.9 },
  { label: "Plano Profissional", value: 99.9 },
  { label: "Plano Avançado", value: 199.9 },
];

// >>>>>>>>>> CORREÇÃO: moeda agora respeita a moeda escolhida <<<<<<<<<<
const localeByCurrency = (iso) => {
  const map = {
    EUR: "pt-PT",
    BRL: "pt-BR",
    USD: "en-US",
  };
  return map[iso] || "pt-PT";
};

const moeda = (n, iso = "EUR") =>
  new Intl.NumberFormat(localeByCurrency(iso), {
    style: "currency",
    currency: iso,
  }).format(Number(n || 0));

export default function Financeiro() {
  const classes = useStyles();

  // ---- Abas ----
  const [tab, setTab] = useState(0); // 0 = Faturação, 1 = Clientes
  const handleTabChange = (_e, v) => setTab(v);

  // ---- Clientes ------------------------------------
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState(""); // selecionar existente
  const [clienteNovo, setClienteNovo] = useState({
    nome: "",
    documento: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    distrito: "",
    cep: "",
    pais: "Portugal",
  });
  const [buscaCliente, setBuscaCliente] = useState("");

  // ---- Plano/Serviço padrão (atalho rápido) --------
  const [plano, setPlano] = useState("");
  const [valorPlano, setValorPlano] = useState("");

  // ---- Fatura --------------------------------------
  const [nFatura, setNFatura] = useState("");
  const [emissao, setEmissao] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [condPagto, setCondPagto] = useState("Transferência");
  const [moedaISO, setMoedaISO] = useState("EUR");

  const [itens, setItens] = useState([
    { id: uuidv4(), descricao: "", qtd: 1, preco: 0, iva: 23, desconto: 0 },
  ]);

  const [faturas, setFaturas] = useState([]);

  // Carregar dados salvos
  useEffect(() => {
    try {
      const data = localStorage.getItem("clientes");
      if (data) setClientes(JSON.parse(data));
    } catch (_) {}
    try {
      const fs = localStorage.getItem("faturas");
      if (fs) setFaturas(JSON.parse(fs));
    } catch (_) {}
  }, []);

  // >>>>>>>>>> NOVO: persistência automática sempre que clientes/faturas mudarem
  useEffect(() => {
    try {
      localStorage.setItem("clientes", JSON.stringify(clientes));
    } catch (e) {
      console.error("Erro ao salvar clientes:", e);
    }
  }, [clientes]);

  useEffect(() => {
    try {
      localStorage.setItem("faturas", JSON.stringify(faturas));
    } catch (e) {
      console.error("Erro ao salvar faturas:", e);
    }
  }, [faturas]);

  // Helpers
  const clienteSelecionado = useMemo(
    () => clientes.find((c) => c.id === clienteId),
    [clientes, clienteId]
  );

  const handleNovoClienteChange = (field, value) => {
    setClienteNovo((prev) => ({ ...prev, [field]: value }));
  };

  const salvarCliente = () => {
    // Coleta dados de origem (selecionado ou novo)
    const fonte = clienteId ? clienteSelecionado || {} : clienteNovo || {};
    const nome = String(fonte.nome || "").trim();
    const documento = String(fonte.documento || "").trim();

    if (!nome || !documento) {
      alert("Preencha pelo menos Nome e Documento (NIF/CPF/CNPJ).");
      return;
    }

    if (clienteId && clienteSelecionado) {
      // EDITAR EXISTENTE: aplica merge (garante status, país, etc.)
      const dadosAtualizados = {
        ...clienteSelecionado,
        nome,
        documento,
        email: fonte.email || "",
        telefone: fonte.telefone || "",
        endereco: fonte.endereco || "",
        cidade: fonte.cidade || "",
        distrito: fonte.distrito || "",
        cep: fonte.cep || "",
        pais: fonte.pais || "Portugal",
        status: "Ativo",
      };

      setClientes((prev) =>
        prev.map((c) => (c.id === clienteId ? dadosAtualizados : c))
      );
      alert("Cliente atualizado com sucesso!");
    } else {
      // NOVO CLIENTE
      const novo = {
        id: uuidv4(),
        nome,
        documento,
        email: fonte.email || "",
        telefone: fonte.telefone || "",
        endereco: fonte.endereco || "",
        cidade: fonte.cidade || "",
        distrito: fonte.distrito || "",
        cep: fonte.cep || "",
        pais: fonte.pais || "Portugal",
        status: "Ativo",
      };
      setClientes((prev) => [novo, ...prev]);
      setClienteId(novo.id); // seleciona recém-criado
      // limpa formulário de novo cliente
      setClienteNovo({
        nome: "",
        documento: "",
        email: "",
        telefone: "",
        endereco: "",
        cidade: "",
        distrito: "",
        cep: "",
        pais: "Portugal",
      });
      alert("Cliente cadastrado com sucesso!");
    }

    // vai para a aba "Clientes"
    setTab(1);
  };

  // Atalho de plano → adiciona/atualiza 1º item
  const aplicarPlanoComoItem = () => {
    if (!plano || !valorPlano) return;
    if (itens.length === 0) {
      setItens([
        {
          id: uuidv4(),
          descricao: plano,
          qtd: 1,
          preco: Number(valorPlano),
          iva: 23,
          desconto: 0,
        },
      ]);
    } else {
      const first = { ...itens[0] };
      first.descricao = plano;
      first.preco = Number(valorPlano);
      const clone = [...itens];
      clone[0] = first;
      setItens(clone);
    }
  };

  const addItem = () =>
    setItens((prev) => [
      ...prev,
      { id: uuidv4(), descricao: "", qtd: 1, preco: 0, iva: 23, desconto: 0 },
    ]);

  const updateItem = (id, field, value) =>
    setItens((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );

  const removeItem = (id) =>
    setItens((prev) => prev.filter((it) => it.id !== id));

  // Totais
  const totals = useMemo(() => {
    let subtotal = 0;
    let impostos = 0;
    let descontos = 0;

    itens.forEach((it) => {
      const qty = Number(it.qtd || 0);
      const price = Number(it.preco || 0);
      const percIVA = Number(it.iva || 0) / 100;
      const percDesc = Number(it.desconto || 0) / 100;

      const linhaBase = qty * price;
      const descLinha = linhaBase * percDesc;
      const linhaAposDesc = linhaBase - descLinha;
      const impostoLinha = linhaAposDesc * percIVA;

      subtotal += linhaBase;
      descontos += descLinha;
      impostos += impostoLinha;
    });

    const total = subtotal - descontos + impostos;
    return { subtotal, descontos, impostos, total };
  }, [itens]);

  // Gerar Fatura
  const gerarFatura = () => {
    const cli =
      clienteSelecionado ||
      (clienteNovo.nome && clienteNovo.documento ? clienteNovo : null);

    if (!cli) {
      alert("Selecione um cliente existente ou preencha Nome e Documento.");
      return;
    }
    if (itens.length === 0) {
      alert("Adicione pelo menos um item.");
      return;
    }

    const now = new Date();
    const numero =
      nFatura?.trim() ||
      `FT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(now.getDate()).padStart(2, "0")}-${String(
        Math.floor(Math.random() * 9999)
      ).padStart(4, "0")}`;

    const fatura = {
      id: uuidv4(),
      numero,
      emissao: emissao || now.toISOString().substring(0, 10),
      vencimento: vencimento || "",
      moeda: moedaISO,
      condicaoPagamento: condPagto,
      cliente: clienteSelecionado ? clienteSelecionado : { id: uuidv4(), ...clienteNovo },
      itens: itens.map((i) => ({
        descricao: i.descricao,
        qtd: Number(i.qtd || 0),
        preco: Number(i.preco || 0),
        iva: Number(i.iva || 0),
        desconto: Number(i.desconto || 0),
      })),
      totais: totals,
      createdAt: now.toISOString(),
    };

    const novas = [fatura, ...faturas];
    setFaturas(novas);
    alert("Fatura gerada com sucesso!");
  };

  // Impressão/“PDF”
  const imprimirFatura = (fat) => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;

    const c = fat.cliente || {};
    const linhas = fat.itens
      .map(
        (l) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd">${l.descricao}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${l.qtd}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${moeda(
          l.preco,
          fat.moeda
        )}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${l.iva}%</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${
          l.desconto
        }%</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${moeda(
          l.qtd * l.preco,
          fat.moeda
        )}</td>
      </tr>`
      )
      .join("");

    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Fatura ${fat.numero}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111; padding: 24px; }
          h1, h3 { margin: 0; }
          .row { display: flex; justify-content: space-between; gap: 24px; }
          .box { padding: 12px; border: 1px solid #ddd; border-radius: 8px; }
          table { border-collapse: collapse; width: 100%; margin-top: 12px; }
          .totais td { padding: 6px 8px; }
        </style>
      </head>
      <body>
        <div class="row">
          <div>
            <h1>FATURA</h1>
            <div>Nº: <b>${fat.numero}</b></div>
            <div>Emissão: <b>${fat.emissao}</b></div>
            <div>Vencimento: <b>${fat.vencimento || "-"}</b></div>
            <div>Condição: <b>${fat.condicaoPagamento}</b></div>
            <div>Moeda: <b>${fat.moeda}</b></div>
          </div>
          <div class="box">
            <h3>Cliente</h3>
            <div><b>${c.nome || ""}</b></div>
            <div>${c.documento || ""}</div>
            <div>${c.email || ""}</div>
            <div>${c.telefone || ""}</div>
            <div>${c.endereco || ""}</div>
            <div>${[c.cidade, c.distrito].filter(Boolean).join(" - ")}</div>
            <div>${[c.cep, c.pais].filter(Boolean).join(" • ")}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="padding:8px;border:1px solid #ddd;text-align:left">Descrição</th>
              <th style="padding:8px;border:1px solid #ddd">Qtd</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right">Preço</th>
              <th style="padding:8px;border:1px solid #ddd">IVA</th>
              <th style="padding:8px;border:1px solid #ddd">Desc.</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right">Subtotal</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>

        <table style="margin-top: 8px; width: 300px; float: right;">
          <tbody class="totais">
            <tr><td>Subtotal</td><td style="text-align:right">${moeda(
              fat.totais.subtotal,
              fat.moeda
            )}</td></tr>
            <tr><td>Descontos</td><td style="text-align:right">-${moeda(
              fat.totais.descontos,
              fat.moeda
            )}</td></tr>
            <tr><td>Impostos</td><td style="text-align:right">${moeda(
              fat.totais.impostos,
              fat.moeda
            )}</td></tr>
            <tr><td><b>Total</b></td><td style="text-align:right"><b>${moeda(
              fat.totais.total,
              fat.moeda
            )}</b></td></tr>
          </tbody>
        </table>

        <div style="clear: both"></div>
        <p style="margin-top: 40px; font-size: 12px; color: #444;">
          Observações: sujeito a imposto à taxa legal em vigor. Esta impressão pode ser salva como PDF.
        </p>

        <script>
          window.onload = () => window.print();
        </script>
      </body>
      </html>
    `;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  // --- FILTRO DE CLIENTES (ABA 2)
  const clientesFiltrados = useMemo(() => {
    const q = buscaCliente.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) =>
      [c.nome, c.documento, c.email, c.telefone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [clientes, buscaCliente]);

  const excluirCliente = (id) => {
    const novos = clientes.filter((c) => c.id !== id);
    setClientes(novos);
    if (clienteId === id) setClienteId("");
  };

  const editarCliente = (id) => {
    setClienteId(id);
    setTab(0); // volta para aba de faturação com o cliente carregado
  };

  return (
    <Paper className={classes.root} elevation={3}>
      <Typography variant="h5" className={classes.title} align="center">
        Financeiro — Clientes & Faturas
      </Typography>

      <Tabs
        value={tab}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        className={classes.tabsBar}
      >
        <Tab label="Faturação" />
        <Tab label="Clientes" />
      </Tabs>

      {/* ====== ABA 0: FATURAÇÃO ====== */}
      {tab === 0 && (
        <>
          {/* Seleção ou Cadastro de Cliente */}
          <Typography className={classes.sectionTitle}>Cliente</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                variant="outlined"
                label="Selecionar cliente existente"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className={classes.field}
                helperText="Opcional: selecione para preencher automaticamente"
              >
                <MenuItem value="">— nenhum —</MenuItem>
                {clientes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.nome} • {c.documento}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <div className={classes.box}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nome/Razão Social"
                  variant="outlined"
                  value={clienteId ? clienteSelecionado?.nome || "" : clienteNovo.nome}
                  onChange={(e) =>
                    clienteId
                      ? setClientes((prev) =>
                          prev.map((c) =>
                            c.id === clienteId ? { ...c, nome: e.target.value } : c
                          )
                        )
                      : handleNovoClienteChange("nome", e.target.value)
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="NIF/CPF/CNPJ"
                  variant="outlined"
                  value={
                    clienteId ? clienteSelecionado?.documento || "" : clienteNovo.documento
                  }
                  onChange={(e) =>
                    clienteId
                      ? setClientes((prev) =>
                          prev.map((c) =>
                            c.id === clienteId ? { ...c, documento: e.target.value } : c
                          )
                        )
                      : handleNovoClienteChange("documento", e.target.value)
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="E-mail"
                  variant="outlined"
                  value={clienteId ? clienteSelecionado?.email || "" : clienteNovo.email}
                  onChange={(e) =>
                    clienteId
                      ? setClientes((prev) =>
                          prev.map((c) =>
                            c.id === clienteId ? { ...c, email: e.target.value } : c
                          )
                        )
                      : handleNovoClienteChange("email", e.target.value)
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telefone"
                  variant="outlined"
                  value={
                    clienteId ? clienteSelecionado?.telefone || "" : clienteNovo.telefone
                  }
                  onChange={(e) =>
                    clienteId
                      ? setClientes((prev) =>
                          prev.map((c) =>
                            c.id === clienteId ? { ...c, telefone: e.target.value } : c
                          )
                        )
                      : handleNovoClienteChange("telefone", e.target.value)
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Endereço"
                  variant="outlined"
                  value={
                    clienteId ? clienteSelecionado?.endereco || "" : clienteNovo.endereco
                  }
                  onChange={(e) =>
                    clienteId
                      ? setClientes((prev) =>
                          prev.map((c) =>
                            c.id === clienteId ? { ...c, endereco: e.target.value } : c
                          )
                        )
                      : handleNovoClienteChange("endereco", e.target.value)
                  }
                />
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  label="Cidade"
                  variant="outlined"
                  value={clienteId ? clienteSelecionado?.cidade || "" : clienteNovo.cidade}
                  onChange={(e) =>
                    clienteId
                      ? setClientes((prev) =>
                          prev.map((c) =>
                            c.id === clienteId ? { ...c, cidade: e.target.value } : c
                          )
                        )
                      : handleNovoClienteChange("cidade", e.target.value)
                  }
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Distrito/Estado"
                  variant="outlined"
                  value={
                    clienteId ? clienteSelecionado?.distrito || "" : clienteNovo.distrito
                  }
                  onChange={(e) =>
                    clienteId
                      ? setClientes((prev) =>
                          prev.map((c) =>
                            c.id === clienteId ? { ...c, distrito: e.target.value } : c
                          )
                        )
                      : handleNovoClienteChange("distrito", e.target.value)
                  }
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Código Postal (CEP)"
                  variant="outlined"
                  value={clienteId ? clienteSelecionado?.cep || "" : clienteNovo.cep}
                  onChange={(e) =>
                    clienteId
                      ? setClientes((prev) =>
                          prev.map((c) =>
                            c.id === clienteId ? { ...c, cep: e.target.value } : c
                          )
                        )
                      : handleNovoClienteChange("cep", e.target.value)
                  }
                />
              </Grid>
            </Grid>

            <div style={{ marginTop: 12 }} className={classes.actionsBar}>
              <Button variant="outlined" onClick={() => setClienteId("")}>
                Limpar seleção
              </Button>
              <Button color="primary" variant="contained" onClick={salvarCliente}>
                Salvar Cliente
              </Button>
            </div>
          </div>

          {/* Configuração rápida por Plano (opcional) */}
          <Typography className={classes.sectionTitle}>Atalho de Plano</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={7}>
              <TextField
                select
                fullWidth
                label="Plano"
                variant="outlined"
                value={plano}
                onChange={(e) => {
                  const selected = planos.find((p) => p.label === e.target.value);
                  setPlano(e.target.value);
                  setValorPlano(selected?.value || "");
                }}
              >
                <MenuItem value="">—</MenuItem>
                {planos.map((p) => (
                  <MenuItem key={p.label} value={p.label}>
                    {p.label} • {moeda(p.value, moedaISO)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Valor"
                type="number"
                variant="outlined"
                value={valorPlano}
                onChange={(e) => setValorPlano(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                onClick={aplicarPlanoComoItem}
              >
                Aplicar
              </Button>
            </Grid>
          </Grid>

          {/* Cabeçalho da Fatura */}
          <Typography className={classes.sectionTitle}>Fatura</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Número (opcional)"
                variant="outlined"
                value={nFatura}
                onChange={(e) => setNFatura(e.target.value)}
                placeholder="ex.: FT-2025-0001"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="Data de Emissão"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={emissao}
                onChange={(e) => setEmissao(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="Data de Vencimento"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Condição de Pagamento"
                variant="outlined"
                value={condPagto}
                onChange={(e) => setCondPagto(e.target.value)}
                placeholder="Transferência, 15 dias, etc."
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                select
                label="Moeda"
                variant="outlined"
                value={moedaISO}
                onChange={(e) => setMoedaISO(e.target.value)}
              >
                {["EUR", "BRL", "USD"].map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {/* Itens */}
          <Typography className={classes.sectionTitle}>Itens</Typography>
          <Paper className={classes.tablePaper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Descrição</TableCell>
                  <TableCell align="right">Qtd</TableCell>
                  <TableCell align="right">Preço</TableCell>
                  <TableCell align="right">IVA (%)</TableCell>
                  <TableCell align="right">Desc. (%)</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                  <TableCell align="center">#</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {itens.map((it) => {
                  const linha = Number(it.qtd || 0) * Number(it.preco || 0);
                  return (
                    <TableRow key={it.id}>
                      <TableCell style={{ minWidth: 220 }}>
                        <TextField
                          fullWidth
                          placeholder="Descrição do item/serviço"
                          variant="outlined"
                          value={it.descricao}
                          onChange={(e) =>
                            updateItem(it.id, "descricao", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell align="right" style={{ minWidth: 90 }}>
                        <TextField
                          type="number"
                          variant="outlined"
                          value={it.qtd}
                          onChange={(e) => updateItem(it.id, "qtd", e.target.value)}
                        />
                      </TableCell>
                      <TableCell align="right" style={{ minWidth: 120 }}>
                        <TextField
                          type="number"
                          variant="outlined"
                          value={it.preco}
                          onChange={(e) =>
                            updateItem(it.id, "preco", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell align="right" style={{ minWidth: 110 }}>
                        <TextField
                          type="number"
                          variant="outlined"
                          value={it.iva}
                          onChange={(e) => updateItem(it.id, "iva", e.target.value)}
                        />
                      </TableCell>
                      <TableCell align="right" style={{ minWidth: 110 }}>
                        <TextField
                          type="number"
                          variant="outlined"
                          value={it.desconto}
                          onChange={(e) =>
                            updateItem(it.id, "desconto", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell align="right">{moeda(linha, moedaISO)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Remover item">
                          <IconButton onClick={() => removeItem(it.id)} size="small">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell colSpan={7}>
                    <Button
                      startIcon={<AddCircleOutlineIcon />}
                      onClick={addItem}
                      color="primary"
                    >
                      Adicionar item
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Divider />
            <Grid container style={{ padding: 12 }}>
              <Grid item xs />
              <Grid item>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Subtotal</TableCell>
                      <TableCell align="right">{moeda(totals.subtotal, moedaISO)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Descontos</TableCell>
                      <TableCell align="right">-{moeda(totals.descontos, moedaISO)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Impostos</TableCell>
                      <TableCell align="right">{moeda(totals.impostos, moedaISO)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className={classes.totalRow}>Total</TableCell>
                      <TableCell align="right" className={classes.totalRow}>
                        {moeda(totals.total, moedaISO)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Grid>
            </Grid>
          </Paper>

          <div style={{ marginTop: 16 }} className={classes.actionsBar}>
            <Button
              variant="contained"
              color="primary"
              onClick={gerarFatura}
              disabled={
                (!clienteId && (!clienteNovo.nome || !clienteNovo.documento)) ||
                itens.length === 0
              }
            >
              Gerar Fatura
            </Button>
          </div>

          {/* Listagem de Faturas Geradas */}
          {faturas.length > 0 && (
            <>
              <Typography className={classes.sectionTitle}>Faturas Geradas</Typography>
              <div className={classes.listCard}>
                {faturas.map((f) => (
                  <Grid
                    key={f.id}
                    container
                    spacing={1}
                    alignItems="center"
                    style={{
                      borderBottom: "1px solid rgba(0,0,0,0.08)",
                      paddingBottom: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Grid item xs={12} sm={4}>
                      <b>{f.numero}</b> — {f.cliente?.nome}
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      Emissão: {f.emissao} {f.vencimento ? `• Venc.: ${f.vencimento}` : ""}
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      Total: <b>{moeda(f.totais?.total, f.moeda)}</b>
                    </Grid>
                    <Grid item xs={12} sm={2} style={{ textAlign: "right" }}>
                      <Tooltip title="Imprimir / Salvar PDF">
                        <IconButton onClick={() => imprimirFatura(f)}>
                          <PrintIcon />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                  </Grid>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ====== ABA 1: CLIENTES ====== */}
      {tab === 1 && (
        <>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography className={classes.sectionTitle}>Clientes</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Pesquisar clientes (nome, NIF/CPF, e-mail, telefone)"
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          <Paper className={classes.tablePaper} variant="outlined" style={{ marginTop: 12 }}>
            <TableContainer style={{ maxHeight: 420 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Documento</TableCell>
                    <TableCell>E-mail</TableCell>
                    <TableCell>Telefone</TableCell>
                    <TableCell>Endereço</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clientesFiltrados.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>{c.nome}</TableCell>
                      <TableCell>{c.documento}</TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell>{c.telefone}</TableCell>
                      <TableCell>
                        {[c.endereco, c.cidade, c.distrito, c.cep, c.pais]
                          .filter(Boolean)
                          .join(" • ")}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Editar">
                          <IconButton onClick={() => editarCliente(c.id)} size="small">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton onClick={() => excluirCliente(c.id)} size="small">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}

                  {clientesFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" style={{ padding: 24 }}>
                        Nenhum cliente encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Paper>
  );
}

import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Paper, Typography, Grid, TextField, Button, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, Select, MenuItem, FormControl, InputLabel, Divider,
} from "@material-ui/core";
import DeleteIcon from "@material-ui/icons/Delete";
import AddIcon from "@material-ui/icons/Add";
import { toast } from "react-toastify";
import axios from "axios";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { Field, Form, Formik } from "formik";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    paddingBottom: 100,
    marginLeft: 5,
  },
  section: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(2),
  },
  elementMargin: {
    padding: theme.spacing(2),
  },
  formContainer: {
    maxWidth: 600,
  },
  textRight: {
    textAlign: "right",
  },
  chip: {
    fontWeight: "bold",
  },
  tokenMask: {
    fontFamily: "monospace",
    fontSize: "0.75rem",
    color: "#666",
  },
  addForm: {
    display: "flex",
    gap: theme.spacing(2),
    alignItems: "flex-end",
    flexWrap: "wrap",
    marginTop: theme.spacing(2),
  },
}));

const AsaasPage = () => {
  const classes = useStyles();
  const [configs, setConfigs] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [newConfig, setNewConfig] = useState({ name: "", token: "", environment: "production" });
  const [saving, setSaving] = useState(false);

  const getEndpoint = () => process.env.REACT_APP_BACKEND_URL + "/api/asaas/send-boleto";

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoadingConfigs(true);
    try {
      const { data } = await api.get("/asaas/configs");
      setConfigs(data);
    } catch (err) {
      toastError(err);
    } finally {
      setLoadingConfigs(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!newConfig.name || !newConfig.token) {
      toast.error("Preencha o nome e o token.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/asaas/configs", newConfig);
      toast.success("Token Asaas salvo com sucesso!");
      setNewConfig({ name: "", token: "", environment: "production" });
      loadConfigs();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async (id) => {
    try {
      await api.delete(`/asaas/configs/${id}`);
      toast.success("Configuração removida.");
      loadConfigs();
    } catch (err) {
      toastError(err);
    }
  };

  const handleTest = async (values, actions) => {
    try {
      const { token, cpfCnpj, number, status, month } = values;
      const res = await axios.post(getEndpoint(), { cpfCnpj, number, status, month }, {
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      });
      toast.success(`✅ ${res.data.message}`);
    } catch (err) {
      toastError(err);
    } finally {
      actions.setSubmitting(false);
    }
  };

  return (
    <Paper className={classes.mainPaper} variant="outlined">
      <Typography variant="h5">Integração Asaas — Cobranças via WhatsApp</Typography>
      <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
        Configure seu token do Asaas e envie cobranças (boletos/PIX) por CPF/CNPJ diretamente pelo WhatsApp.
      </Typography>

      {/* ─── SEÇÃO 1: TOKENS ─────────────────────────────────────────────── */}
      <Divider className={classes.section} />
      <Typography variant="h6" color="primary">1. Configuração dos Tokens Asaas</Typography>
      <Typography variant="body2" color="textSecondary" style={{ marginBottom: 8 }}>
        Você pode adicionar múltiplos tokens (uma conta Asaas por token). O sistema usará o primeiro token ativo ao receber uma requisição.
      </Typography>

      {configs.length > 0 && (
        <TableContainer component={Paper} variant="outlined" style={{ marginBottom: 16 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome / Identificação</TableCell>
                <TableCell>Ambiente</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={c.environment === "production" ? "Produção" : "Sandbox"}
                      color={c.environment === "production" ? "primary" : "default"}
                      className={classes.chip}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={c.active ? "Ativo" : "Inativo"} style={{ backgroundColor: c.active ? "#e8f5e9" : "#ffebee", color: c.active ? "#2e7d32" : "#c62828" }} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleDeleteConfig(c.id)}>
                      <DeleteIcon fontSize="small" color="error" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <div className={classes.addForm}>
        <TextField
          label="Nome / Identificação"
          value={newConfig.name}
          onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
          variant="outlined"
          size="small"
          placeholder='Ex: "Conta Principal"'
          style={{ minWidth: 180 }}
        />
        <TextField
          label="Token Asaas"
          value={newConfig.token}
          onChange={(e) => setNewConfig({ ...newConfig, token: e.target.value })}
          variant="outlined"
          size="small"
          placeholder="$aact_prod_..."
          style={{ minWidth: 280 }}
        />
        <FormControl variant="outlined" size="small" style={{ minWidth: 130 }}>
          <InputLabel>Ambiente</InputLabel>
          <Select
            value={newConfig.environment}
            onChange={(e) => setNewConfig({ ...newConfig, environment: e.target.value })}
            label="Ambiente"
          >
            <MenuItem value="production">Produção</MenuItem>
            <MenuItem value="sandbox">Sandbox</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="contained"
          color="primary"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
          onClick={handleSaveConfig}
          disabled={saving}
        >
          Salvar Token
        </Button>
      </div>

      {/* ─── SEÇÃO 2: DOCUMENTAÇÃO ────────────────────────────────────────── */}
      <Divider className={classes.section} style={{ marginTop: 32 }} />
      <Typography variant="h6" color="primary">2. Como usar a API</Typography>

      <Grid container spacing={4} style={{ marginTop: 8 }}>
        <Grid item xs={12} sm={6}>
          <Typography component="div" className={classes.elementMargin}>
            <p>Envie cobranças Asaas via WhatsApp informando o CPF/CNPJ do cliente.</p>
            <b>Endpoint:</b> {getEndpoint()}<br />
            <b>Método:</b> POST<br />
            <b>Headers:</b> Authorization (Bearer token da conexão WhatsApp) e Content-Type (application/json)<br />
            <br />
            <b>Body:</b>
            <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, fontSize: "0.8rem", overflowX: "auto" }}>
{`{
  "cpfCnpj": "12345678000195",
  "number": "5511999999999",
  "status": "PENDING",
  "month": "2025-02"
}`}
            </pre>
            <b>Parâmetros:</b>
            <ul>
              <li><b>cpfCnpj</b> (obrigatório): CPF (11 dígitos) ou CNPJ (14 dígitos) — com ou sem máscara</li>
              <li><b>number</b> (obrigatório): número WhatsApp com DDI+DDD (ex: 5511999999999)</li>
              <li><b>status</b> (opcional): <code>PENDING</code>, <code>OVERDUE</code>, <code>RECEIVED</code>, <code>CONFIRMED</code>, <code>ALL</code> (padrão: ALL)</li>
              <li><b>month</b> (opcional): formato <code>YYYY-MM</code> — filtra por mês de vencimento</li>
            </ul>
            <b>Observações importantes:</b>
            <ul>
              <li>O token do Header é o <b>token da conexão WhatsApp</b> (o mesmo usado na API de mensagens)</li>
              <li>O <b>token Asaas</b> é configurado na Seção 1 acima e é usado automaticamente</li>
              <li>O sistema usa o <b>primeiro token Asaas ativo</b> da sua conta</li>
              <li>CPF/CNPJ deve estar cadastrado no seu Asaas para o cliente ser encontrado</li>
            </ul>
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography className={classes.elementMargin}>
            <b>Teste de Envio</b>
          </Typography>
          <Formik
            initialValues={{ token: "", cpfCnpj: "", number: "", status: "ALL", month: "" }}
            onSubmit={handleTest}
          >
            {({ isSubmitting, values, handleChange }) => (
              <Form style={{ padding: "0 16px" }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Token da conexão WhatsApp *"
                      name="token"
                      value={values.token}
                      onChange={handleChange}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="CPF ou CNPJ *"
                      name="cpfCnpj"
                      value={values.cpfCnpj}
                      onChange={handleChange}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      placeholder="12345678000195"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Número WhatsApp *"
                      name="number"
                      value={values.number}
                      onChange={handleChange}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      placeholder="5511999999999"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl variant="outlined" margin="dense" fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select name="status" value={values.status} onChange={handleChange} label="Status">
                        <MenuItem value="ALL">Todos</MenuItem>
                        <MenuItem value="PENDING">Pendentes</MenuItem>
                        <MenuItem value="OVERDUE">Vencidos</MenuItem>
                        <MenuItem value="RECEIVED">Recebidos</MenuItem>
                        <MenuItem value="CONFIRMED">Confirmados</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Mês (opcional)"
                      name="month"
                      value={values.month}
                      onChange={handleChange}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      placeholder="2025-02"
                      helperText="Formato: YYYY-MM"
                    />
                  </Grid>
                  <Grid item xs={12} className={classes.textRight}>
                    <Button type="submit" color="primary" variant="contained" disabled={isSubmitting}>
                      {isSubmitting ? <CircularProgress size={24} /> : "Enviar Cobranças"}
                    </Button>
                  </Grid>
                </Grid>
              </Form>
            )}
          </Formik>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default AsaasPage;

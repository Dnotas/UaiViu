import React, { useState, useEffect, useContext } from "react";
import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  IconButton,
  Tooltip,
  makeStyles,
  Typography,
  CircularProgress,
} from "@material-ui/core";
import EditIcon from "@material-ui/icons/Edit";
import PersonIcon from "@material-ui/icons/Person";
import moment from "moment";
import { toast } from "react-toastify";
import { head, isArray } from "lodash";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import toastError from "../../errors/toastError";
import useCompanies from "../../hooks/useCompanies";
import { AuthContext } from "../../context/Auth/AuthContext";
import ModalUsers from "../../components/ModalUsers";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  root: { padding: theme.spacing(2) },
  paper: { overflowX: "auto" },
  table: { minWidth: 700 },
  expired: { backgroundColor: "#ffbcbc9c" },
  active: {},
  chipPago: { backgroundColor: "#b9f6ca", color: "#1b5e20", fontWeight: "bold" },
  chipVencido: { backgroundColor: "#ffcdd2", color: "#b71c1c", fontWeight: "bold" },
  chipAtivo: { backgroundColor: "#bbdefb", color: "#0d47a1", fontWeight: "bold" },
}));

const CompaniesPage = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const { list, update } = useCompanies();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [dueDate, setDueDate] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [firstUserId, setFirstUserId] = useState(null);
  const [userCompanyId, setUserCompanyId] = useState(null);

  useEffect(() => {
    if (!user.super) return;
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const data = await list();
      setCompanies(data);
    } catch (e) {
      toastError(e);
    }
    setLoading(false);
  };

  const getStatus = (company) => {
    const hoje = moment().startOf("day");
    const venc = moment(company.dueDate).startOf("day");
    const diff = venc.diff(hoje, "days");
    if (!company.status) return "inativo";
    if (diff < 0) return "vencido";
    return "ativo";
  };

  const renderChip = (company) => {
    const status = getStatus(company);
    if (status === "vencido") return <Chip label="Vencido" className={classes.chipVencido} size="small" />;
    if (status === "ativo") return <Chip label="Ativo" className={classes.chipAtivo} size="small" />;
    return <Chip label="Inativo" size="small" />;
  };

  const handleEditOpen = (company) => {
    setSelected(company);
    setDueDate(company.dueDate ? moment(company.dueDate).format("YYYY-MM-DD") : "");
    setName(company.name || "");
    setEmail(company.email || "");
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setSelected(null);
  };

  const handleSave = async () => {
    try {
      await update({ ...selected, dueDate, name, email, status: true });
      toast.success("Empresa atualizada com sucesso!");
      handleEditClose();
      fetchCompanies();
    } catch (e) {
      toastError(e);
    }
  };

  const handleOpenUserModal = async (company) => {
    try {
      const { data } = await api.get("/users/list", {
        params: { companyId: company.id },
      });
      if (isArray(data) && data.length) {
        setFirstUserId(head(data).id);
        setUserCompanyId(company.id);
        setUserModalOpen(true);
      } else {
        toast.error("Nenhum usuário de login encontrado para essa empresa.");
      }
    } catch (e) {
      toastError(e);
    }
  };

  const handleCloseUserModal = () => {
    setUserModalOpen(false);
    setFirstUserId(null);
    setUserCompanyId(null);
    fetchCompanies();
  };

  if (!user.super) {
    return (
      <MainContainer>
        <Typography>Acesso restrito.</Typography>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      <MainHeader>
        <Title>Gestão de Empresas</Title>
        <MainHeaderButtonsWrapper>
          <Button variant="contained" color="primary" onClick={fetchCompanies}>
            Atualizar
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <Paper className={classes.paper}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <CircularProgress />
          </div>
        ) : (
          <Table className={classes.table} size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell align="center">Vencimento</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {companies.map((company) => {
                const status = getStatus(company);
                return (
                  <TableRow
                    key={company.id}
                    className={status === "vencido" ? classes.expired : classes.active}
                  >
                    <TableCell>{company.id}</TableCell>
                    <TableCell>{company.name}</TableCell>
                    <TableCell>{company.email || "-"}</TableCell>
                    <TableCell>{company.phone || "-"}</TableCell>
                    <TableCell align="center">
                      {company.dueDate
                        ? moment(company.dueDate).format("DD/MM/YYYY")
                        : "-"}
                    </TableCell>
                    <TableCell align="center">{renderChip(company)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar empresa">
                        <IconButton size="small" onClick={() => handleEditOpen(company)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar usuário de login">
                        <IconButton size="small" onClick={() => handleOpenUserModal(company)}>
                          <PersonIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={editOpen} onClose={handleEditClose} maxWidth="xs" fullWidth>
        <DialogTitle>
          Editar Empresa — {selected?.name}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Nome"
            fullWidth
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginTop: 8 }}
          />
          <TextField
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ marginTop: 16 }}
          />
          <TextField
            label="Nova data de vencimento"
            type="date"
            fullWidth
            variant="outlined"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            style={{ marginTop: 16 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose} color="default">
            Cancelar
          </Button>
          <Button onClick={handleSave} color="primary" variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <ModalUsers
        userId={firstUserId}
        companyId={userCompanyId}
        open={userModalOpen}
        onClose={handleCloseUserModal}
      />
    </MainContainer>
  );
};

export default CompaniesPage;

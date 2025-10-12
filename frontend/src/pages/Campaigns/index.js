// /src/pages/Campaigns/index.js
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import {
  makeStyles,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  InputAdornment,
  Grid,
  Tooltip,
} from "@material-ui/core";

import SearchIcon from "@material-ui/icons/Search";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import DescriptionIcon from "@material-ui/icons/Description";
import PauseCircleOutlineIcon from "@material-ui/icons/PauseCircleOutline";
import PlayCircleOutlineIcon from "@material-ui/icons/PlayCircleOutline";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import CampaignModal from "../../components/CampaignModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { isArray } from "lodash";
import { useDate } from "../../hooks/useDate";
import { SocketContext } from "../../context/Socket/SocketContext";

const reducer = (state, action) => {
  switch (action.type) {
    case "LOAD_CAMPAIGNS":
      const campaigns = action.payload;
      const newCampaigns = [];
      if (isArray(campaigns)) {
        campaigns.forEach((campaign) => {
          const idx = state.findIndex((u) => u.id === campaign.id);
          if (idx !== -1) state[idx] = campaign;
          else newCampaigns.push(campaign);
        });
      }
      return [...state, ...newCampaigns];

    case "UPDATE_CAMPAIGNS":
      const campaign = action.payload;
      const index = state.findIndex((u) => u.id === campaign.id);
      if (index !== -1) {
        state[index] = campaign;
        return [...state];
      } else return [campaign, ...state];

    case "DELETE_CAMPAIGN":
      return state.filter((u) => u.id !== action.payload);

    case "RESET":
      return [];

    default:
      return state;
  }
};

const useStyles = makeStyles((theme) => ({
  container: {
    backgroundColor: "#F3F3F3",
    minHeight: "100vh",
    padding: theme.spacing(3),
  },

  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    overflowY: "auto",
    backgroundColor: "#FFFFFF",
    color: "#333",
    borderRadius: 10,
    border: "1px solid #E0E0E0",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    ...theme.scrollbarStyles,
  },

  tableHead: {
    backgroundColor: "#F8F8F8",
  },

  headCell: {
    color: "#C18E49",
    fontWeight: "bold",
    fontSize: "0.95rem",
  },

  tableRow: {
    transition: "all 0.25s ease",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "rgba(193,142,73,0.05)",
      transform: "scale(1.01)",
      boxShadow: "0 4px 12px rgba(193,142,73,0.25)",
    },
  },

  tableCell: {
    color: "#333",
    borderBottom: "1px solid #EEE",
  },

  actionButton: {
    color: "#C18E49",
    "&:hover": {
      color: "#a57336",
      backgroundColor: "rgba(193,142,73,0.08)",
    },
  },

  addButton: {
    backgroundColor: "#C18E49",
    color: "#FFF",
    fontWeight: "bold",
    "&:hover": {
      backgroundColor: "#b9823e",
    },
  },

  searchInput: {
    "& .MuiOutlinedInput-root": {
      "& fieldset": {
        borderColor: "#DDD",
      },
      "&:hover fieldset": {
        borderColor: "#C18E49",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#C18E49",
      },
    },
  },

  tooltipPreview: {
    maxWidth: 250,
    padding: 10,
    backgroundColor: "#fff",
    color: "#222",
    borderRadius: 6,
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  },
}));

const Campaigns = () => {
  const classes = useStyles();
  const history = useHistory();
  const { datetimeToClient } = useDate();
  const socketManager = useContext(SocketContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [deletingCampaign, setDeletingCampaign] = useState(null);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [campaigns, dispatch] = useReducer(reducer, []);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delay = setTimeout(fetchCampaigns, 400);
    return () => clearTimeout(delay);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const socket = socketManager.getSocket(companyId);

    socket.on(`company-${companyId}-campaign`, (data) => {
      if (["update", "create"].includes(data.action))
        dispatch({ type: "UPDATE_CAMPAIGNS", payload: data.record });
      if (data.action === "delete")
        dispatch({ type: "DELETE_CAMPAIGN", payload: +data.id });
    });
    return () => socket.disconnect();
  }, [socketManager]);

  const fetchCampaigns = async () => {
    try {
      const { data } = await api.get("/campaigns/", {
        params: { searchParam, pageNumber },
      });
      dispatch({ type: "LOAD_CAMPAIGNS", payload: data.records });
      setHasMore(data.hasMore);
      setLoading(false);
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenCampaignModal = () => {
    setSelectedCampaign(null);
    setCampaignModalOpen(true);
  };

  const handleCloseCampaignModal = () => {
    setSelectedCampaign(null);
    setCampaignModalOpen(false);
    fetchCampaigns();
  };

  const handleSearch = (event) => setSearchParam(event.target.value.toLowerCase());

  const handleEditCampaign = (c) => {
    setSelectedCampaign(c);
    setCampaignModalOpen(true);
  };

  const handleDeleteCampaign = async (id) => {
    try {
      await api.delete(`/campaigns/${id}`);
      toast.success(i18n.t("campaigns.toasts.deleted"));
      fetchCampaigns();
    } catch (err) {
      toastError(err);
    }
    setConfirmModalOpen(false);
    setDeletingCampaign(null);
  };

  const cancelCampaign = async (campaign) => {
    try {
      await api.post(`/campaigns/${campaign.id}/cancel`);
      toast.success(i18n.t("campaigns.toasts.cancel"));
      fetchCampaigns();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const restartCampaign = async (campaign) => {
    try {
      await api.post(`/campaigns/${campaign.id}/restart`);
      toast.success(i18n.t("campaigns.toasts.restart"));
      fetchCampaigns();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const formatStatus = (val) => {
    switch (val) {
      case "INATIVA":
        return i18n.t("campaigns.status.inactive");
      case "PROGRAMADA":
        return i18n.t("campaigns.status.programmed");
      case "EM_ANDAMENTO":
        return i18n.t("campaigns.status.inProgress");
      case "CANCELADA":
        return i18n.t("campaigns.status.canceled");
      case "FINALIZADA":
        return i18n.t("campaigns.status.finished");
      default:
        return val;
    }
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight)
      setPageNumber((prev) => prev + 1);
  };

  return (
    <div className={classes.container}>
      <MainContainer>
        <ConfirmationModal
          title={
            deletingCampaign &&
            `${i18n.t("campaigns.confirmationModal.deleteTitle")} ${deletingCampaign.name}?`
          }
          open={confirmModalOpen}
          onClose={setConfirmModalOpen}
          onConfirm={() => handleDeleteCampaign(deletingCampaign.id)}
        >
          {i18n.t("campaigns.confirmationModal.deleteMessage")}
        </ConfirmationModal>

        <CampaignModal
          resetPagination={() => {
            setPageNumber(1);
            fetchCampaigns();
          }}
          open={campaignModalOpen}
          onClose={handleCloseCampaignModal}
          campaignId={selectedCampaign?.id}
        />

        <MainHeader>
          <Grid style={{ width: "99.6%" }} container>
            <Grid xs={12} sm={8} item>
              <Title style={{ color: "#C18E49" }}>
                {i18n.t("campaigns.title")}
              </Title>
            </Grid>
            <Grid xs={12} sm={4} item>
              <Grid spacing={2} container>
                <Grid xs={6} item>
                  <TextField
                    fullWidth
                    placeholder={i18n.t("campaigns.searchPlaceholder")}
                    type="search"
                    value={searchParam}
                    onChange={handleSearch}
                    className={classes.searchInput}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon style={{ color: "#C18E49" }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid xs={6} item>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleOpenCampaignModal}
                    className={classes.addButton}
                  >
                    {i18n.t("campaigns.buttons.add")}
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </MainHeader>

        <Paper
          className={classes.mainPaper}
          variant="outlined"
          onScroll={handleScroll}
        >
          <Table size="small">
            <TableHead className={classes.tableHead}>
              <TableRow>
                {[
                  "name",
                  "status",
                  "contactList",
                  "whatsapp",
                  "scheduledAt",
                  "completedAt",
                  "actions",
                ].map((col) => (
                  <TableCell key={col} align="center" className={classes.headCell}>
                    {i18n.t(`campaigns.table.${col}`)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((campaign) => (
                <Tooltip
                  key={campaign.id}
                  title={
                    <div className={classes.tooltipPreview}>
                      <p style={{ margin: 0, fontSize: 13 }}>{campaign.message || "Sem mensagem associada"}</p>
                    </div>
                  }
                  placement="right"
                  arrow
                >
                  <TableRow className={classes.tableRow}>
                    <TableCell align="center" className={classes.tableCell}>
                      {campaign.name}
                    </TableCell>
                    <TableCell align="center" className={classes.tableCell}>
                      {formatStatus(campaign.status)}
                    </TableCell>
                    <TableCell align="center" className={classes.tableCell}>
                      {campaign.contactListId
                        ? campaign.contactList.name
                        : i18n.t("campaigns.table.notDefined")}
                    </TableCell>
                    <TableCell align="center" className={classes.tableCell}>
                      {campaign.whatsappId
                        ? campaign.whatsapp.name
                        : i18n.t("campaigns.table.notDefined2")}
                    </TableCell>
                    <TableCell align="center" className={classes.tableCell}>
                      {campaign.scheduledAt
                        ? datetimeToClient(campaign.scheduledAt)
                        : i18n.t("campaigns.table.notScheduled")}
                    </TableCell>
                    <TableCell align="center" className={classes.tableCell}>
                      {campaign.completedAt
                        ? datetimeToClient(campaign.completedAt)
                        : i18n.t("campaigns.table.notConcluded")}
                    </TableCell>
                    <TableCell align="center" className={classes.tableCell}>
                      {campaign.status === "EM_ANDAMENTO" && (
                        <IconButton
                          onClick={() => cancelCampaign(campaign)}
                          className={classes.actionButton}
                          size="small"
                        >
                          <PauseCircleOutlineIcon />
                        </IconButton>
                      )}
                      {campaign.status === "CANCELADA" && (
                        <IconButton
                          onClick={() => restartCampaign(campaign)}
                          className={classes.actionButton}
                          size="small"
                        >
                          <PlayCircleOutlineIcon />
                        </IconButton>
                      )}
                      <IconButton
                        onClick={() => history.push(`/campaign/${campaign.id}/report`)}
                        className={classes.actionButton}
                        size="small"
                      >
                        <DescriptionIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleEditCampaign(campaign)}
                        className={classes.actionButton}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => {
                          setDeletingCampaign(campaign);
                          setConfirmModalOpen(true);
                        }}
                        className={classes.actionButton}
                        size="small"
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                </Tooltip>
              ))}
              {loading && <TableRowSkeleton columns={8} />}
            </TableBody>
          </Table>
        </Paper>
      </MainContainer>
    </div>
  );
};

export default Campaigns;

// /src/pages/QuickMessages/index.js
import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
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

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import QuickMessageDialog from "../../components/QuickMessageDialog";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { isArray } from "lodash";
import { SocketContext } from "../../context/Socket/SocketContext";
import { AuthContext } from "../../context/Auth/AuthContext";

const reducer = (state, action) => {
  switch (action.type) {
    case "LOAD_QUICKMESSAGES":
      const quickmessages = action.payload;
      const newQuickmessages = [];
      if (isArray(quickmessages)) {
        quickmessages.forEach((msg) => {
          const index = state.findIndex((u) => u.id === msg.id);
          if (index !== -1) state[index] = msg;
          else newQuickmessages.push(msg);
        });
      }
      return [...state, ...newQuickmessages];

    case "UPDATE_QUICKMESSAGES":
      const msg = action.payload;
      const idx = state.findIndex((u) => u.id === msg.id);
      if (idx !== -1) {
        state[idx] = msg;
        return [...state];
      } else return [msg, ...state];

    case "DELETE_QUICKMESSAGE":
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

  tableCell: {
    color: "#333",
    borderBottom: "1px solid #EEE",
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

const QuickMessages = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedQuickMessage, setSelectedQuickMessage] = useState(null);
  const [deletingQuickMessage, setDeletingQuickMessage] = useState(null);
  const [quickMessageModalOpen, setQuickMessageDialogOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [quickMessages, dispatch] = useReducer(reducer, []);

  const { user } = useContext(AuthContext);
  const socketManager = useContext(SocketContext);

  const fetchQuickMessages = async () => {
    try {
      const { data } = await api.get("/quick-messages", {
        params: { searchParam, pageNumber, userId: user.id },
      });
      dispatch({ type: "LOAD_QUICKMESSAGES", payload: data.records });
      setHasMore(data.hasMore);
      setLoading(false);
    } catch (err) {
      toastError(err);
    }
  };

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delay = setTimeout(fetchQuickMessages, 400);
    return () => clearTimeout(delay);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const companyId = user.companyId;
    const socket = socketManager.getSocket(companyId);

    socket.on(`company${companyId}-quickemessage`, (data) => {
      if (data.action === "update" || data.action === "create")
        dispatch({ type: "UPDATE_QUICKMESSAGES", payload: data.record });
      if (data.action === "delete")
        dispatch({ type: "DELETE_QUICKMESSAGE", payload: +data.id });
    });
    return () => socket.disconnect();
  }, [socketManager, user.companyId]);

  const handleOpenQuickMessageDialog = () => {
    setSelectedQuickMessage(null);
    setQuickMessageDialogOpen(true);
  };

  const handleCloseQuickMessageDialog = () => {
    setSelectedQuickMessage(null);
    setQuickMessageDialogOpen(false);
    fetchQuickMessages();
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditQuickMessage = (msg) => {
    setSelectedQuickMessage(msg);
    setQuickMessageDialogOpen(true);
  };

  const handleDeleteQuickMessage = async (id) => {
    try {
      await api.delete(`/quick-messages/${id}`);
      toast.success(i18n.t("quickemessages.toasts.deleted"));
      fetchQuickMessages();
    } catch (err) {
      toastError(err);
    }
    setConfirmModalOpen(false);
    setDeletingQuickMessage(null);
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
            deletingQuickMessage &&
            `${i18n.t("quickMessages.confirmationModal.deleteTitle")} ${deletingQuickMessage.shortcode}?`
          }
          open={confirmModalOpen}
          onClose={setConfirmModalOpen}
          onConfirm={() => handleDeleteQuickMessage(deletingQuickMessage.id)}
        >
          {i18n.t("quickMessages.confirmationModal.deleteMessage")}
        </ConfirmationModal>

        <QuickMessageDialog
          resetPagination={() => {
            setPageNumber(1);
            fetchQuickMessages();
          }}
          open={quickMessageModalOpen}
          onClose={handleCloseQuickMessageDialog}
          quickemessageId={selectedQuickMessage?.id}
        />

        <MainHeader>
          <Grid style={{ width: "99.6%" }} container>
            <Grid xs={12} sm={8} item>
              <Title style={{ color: "#C18E49" }}>
                {i18n.t("quickMessages.title")}
              </Title>
            </Grid>
            <Grid xs={12} sm={4} item>
              <Grid spacing={2} container>
                <Grid xs={6} item>
                  <TextField
                    fullWidth
                    placeholder={i18n.t("quickMessages.searchPlaceholder")}
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
                    onClick={handleOpenQuickMessageDialog}
                    className={classes.addButton}
                  >
                    {i18n.t("quickMessages.buttons.add")}
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
                <TableCell align="center" className={classes.headCell}>
                  {i18n.t("quickMessages.table.shortcode")}
                </TableCell>
                <TableCell align="center" className={classes.headCell}>
                  {i18n.t("quickMessages.table.mediaName")}
                </TableCell>
                <TableCell align="center" className={classes.headCell}>
                  {i18n.t("quickMessages.table.actions")}
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {quickMessages.map((msg) => (
                <Tooltip
                  key={msg.id}
                  title={
                    <div className={classes.tooltipPreview}>
                      <p style={{ margin: 0, fontSize: 13 }}>{msg.message}</p>
                      {msg.mediaUrl && (
                        msg.mediaUrl.endsWith(".mp4") ? (
                          <video
                            src={msg.mediaUrl}
                            style={{
                              width: "100%",
                              borderRadius: 6,
                              marginTop: 6,
                            }}
                            muted
                            autoPlay
                            loop
                          />
                        ) : (
                          <img
                            src={msg.mediaUrl}
                            alt="preview"
                            style={{
                              width: "100%",
                              borderRadius: 6,
                              marginTop: 6,
                            }}
                          />
                        )
                      )}
                    </div>
                  }
                  placement="right"
                  arrow
                >
                  <TableRow className={classes.tableRow}>
                    <TableCell align="center" className={classes.tableCell}>
                      {msg.shortcode}
                    </TableCell>
                    <TableCell align="center" className={classes.tableCell}>
                      {msg.mediaName ?? i18n.t("quickMessages.noAttachment")}
                    </TableCell>
                    <TableCell align="center" className={classes.tableCell}>
                      <IconButton
                        size="small"
                        className={classes.actionButton}
                        onClick={() => handleEditQuickMessage(msg)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        className={classes.actionButton}
                        onClick={() => {
                          setDeletingQuickMessage(msg);
                          setConfirmModalOpen(true);
                        }}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                </Tooltip>
              ))}
              {loading && <TableRowSkeleton columns={5} />}
            </TableBody>
          </Table>
        </Paper>
      </MainContainer>
    </div>
  );
};

export default QuickMessages;

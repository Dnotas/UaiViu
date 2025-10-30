import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import IconButton from "@material-ui/core/IconButton";
import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import TokenModal from "../../components/TokenModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { Chip } from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";

const reducer = (state, action) => {
  if (action.type === "LOAD_TOKENS") {
    const tokens = action.payload;
    const newTokens = [];

    tokens.forEach((token) => {
      const tokenIndex = state.findIndex((s) => s.id === token.id);
      if (tokenIndex !== -1) {
        state[tokenIndex] = token;
      } else {
        newTokens.push(token);
      }
    });

    return [...state, ...newTokens];
  }

  if (action.type === "UPDATE_TOKENS") {
    const token = action.payload;
    const tokenIndex = state.findIndex((s) => s.id === token.id);

    if (tokenIndex !== -1) {
      state[tokenIndex] = token;
      return [...state];
    } else {
      return [token, ...state];
    }
  }

  if (action.type === "DELETE_TOKEN") {
    const tokenId = action.payload;

    const tokenIndex = state.findIndex((s) => s.id === tokenId);
    if (tokenIndex !== -1) {
      state.splice(tokenIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
}));

const ActivationTokens = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [deletingToken, setDeletingToken] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [tokens, dispatch] = useReducer(reducer, []);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchTokens = async () => {
        try {
          const { data } = await api.get("/activation-tokens", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_TOKENS", payload: data.tokens });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchTokens();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  const handleOpenTokenModal = () => {
    setSelectedToken(null);
    setTokenModalOpen(true);
  };

  const handleCloseTokenModal = () => {
    setSelectedToken(null);
    setTokenModalOpen(false);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleDeleteToken = async (tokenId) => {
    try {
      await api.delete(`/activation-tokens/${tokenId}`);
      toast.success("Token deletado com sucesso");
      dispatch({ type: "DELETE_TOKEN", payload: tokenId });
    } catch (err) {
      toastError(err);
    }
    setDeletingToken(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const getStatusChip = (status) => {
    const statusMap = {
      available: { label: "Disponível", color: "primary" },
      used: { label: "Usado", color: "default" },
      expired: { label: "Expirado", color: "secondary" },
    };
    const { label, color } = statusMap[status] || statusMap.available;
    return <Chip size="small" label={label} color={color} />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title="Deletar Token"
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteToken(deletingToken.id)}
      >
        Tem certeza que deseja deletar este token? Esta ação não pode ser desfeita.
      </ConfirmationModal>
      <TokenModal
        open={tokenModalOpen}
        onClose={handleCloseTokenModal}
        aria-labelledby="form-dialog-title"
        tokenId={selectedToken && selectedToken.id}
      />
      <MainHeader>
        <Title>Tokens de Ativação</Title>
        <MainHeader.Buttons>
          <TextField
            placeholder="Buscar"
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "gray" }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenTokenModal}
          >
            Adicionar Token
          </Button>
        </MainHeader.Buttons>
      </MainHeader>
      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">Token</TableCell>
              <TableCell align="center">Empresa</TableCell>
              <TableCell align="center">Plano</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Expira em</TableCell>
              <TableCell align="center">Usado em</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell align="center">
                    <code>{token.token}</code>
                  </TableCell>
                  <TableCell align="center">{token.companyName}</TableCell>
                  <TableCell align="center">
                    {token.plan ? token.plan.name : "-"}
                  </TableCell>
                  <TableCell align="center">
                    {getStatusChip(token.status)}
                  </TableCell>
                  <TableCell align="center">
                    {formatDate(token.expiresAt)}
                  </TableCell>
                  <TableCell align="center">
                    {formatDate(token.usedAt)}
                  </TableCell>
                  <TableCell align="center">
                    {token.status !== "used" && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setDeletingToken(token);
                          setConfirmModalOpen(true);
                        }}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={7} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default ActivationTokens;

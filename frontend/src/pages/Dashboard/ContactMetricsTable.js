import React, { useState, useEffect } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Tooltip,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import useDashboard from "../../hooks/useDashboard";

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: theme.spacing(2),
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing(2),
    paddingBottom: 0,
  },
  filterRow: {
    display: "flex",
    gap: theme.spacing(2),
    padding: theme.spacing(2),
    paddingTop: theme.spacing(1),
    flexWrap: "wrap",
    alignItems: "center",
  },
  filterControl: {
    minWidth: 180,
  },
  tableContainer: {
    maxHeight: 440,
  },
  loadingBox: {
    display: "flex",
    justifyContent: "center",
    padding: theme.spacing(4),
  },
  emptyBox: {
    textAlign: "center",
    padding: theme.spacing(4),
    color: theme.palette.text.secondary,
  },
  smallCount: {
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
  },
}));

const DIFFICULTY_COLORS = {
  1: { bg: "#E8F5E9", text: "#388E3C" },
  2: { bg: "#F1F8E9", text: "#558B2F" },
  3: { bg: "#FFF3E0", text: "#E65100" },
  4: { bg: "#FBE9E7", text: "#BF360C" },
  5: { bg: "#FFEBEE", text: "#B71C1C" },
};

function formatMinutes(minutes) {
  if (!minutes || minutes === 0) return "-";
  const m = Math.round(minutes);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function DifficultyStars({ value }) {
  if (!value || value === 0) return <span style={{ color: "#BDBDBD" }}>—</span>;
  const color = DIFFICULTY_COLORS[Math.round(value)]?.text || "#FF9800";
  return (
    <span style={{ color, fontWeight: "bold" }}>
      {"★".repeat(Math.round(value))}{"☆".repeat(5 - Math.round(value))} {value.toFixed(1)}
    </span>
  );
}

function DifficultyDistribution({ row }) {
  const total = row.ratedTickets;
  if (total === 0) return <span style={{ color: "#BDBDBD", fontSize: "0.75rem" }}>Sem avaliações</span>;
  return (
    <Box display="flex" style={{ gap: 4, flexWrap: "wrap" }}>
      {[1, 2, 3, 4, 5].map((level) => {
        const count = row[`difficulty${level}`] || 0;
        if (count === 0) return null;
        const { bg, text } = DIFFICULTY_COLORS[level];
        return (
          <Tooltip key={level} title={`${level} estrela${level > 1 ? "s" : ""}: ${count} ticket${count > 1 ? "s" : ""}`}>
            <span style={{ background: bg, color: text, padding: "2px 6px", borderRadius: 4, fontSize: "0.75rem", fontWeight: "bold", cursor: "default" }}>
              {"★".repeat(level)}: {count}
            </span>
          </Tooltip>
        );
      })}
    </Box>
  );
}

const ContactMetricsTable = ({ dashboardParams }) => {
  const classes = useStyles();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const { findContactMetrics } = useDashboard();

  useEffect(() => {
    if (dashboardParams && Object.keys(dashboardParams).length > 0) {
      loadData(dashboardParams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardParams]);

  const loadData = async (params) => {
    setLoading(true);
    try {
      let queryParams = { ...params };
      if (difficultyFilter === "easy") {
        queryParams.minDifficulty = 1;
        queryParams.maxDifficulty = 2;
      } else if (difficultyFilter === "medium") {
        queryParams.minDifficulty = 3;
        queryParams.maxDifficulty = 3;
      } else if (difficultyFilter === "hard") {
        queryParams.minDifficulty = 4;
        queryParams.maxDifficulty = 5;
      }
      const result = await findContactMetrics(queryParams);
      setData(result.data || []);
    } catch (err) {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => {
    if (dashboardParams && Object.keys(dashboardParams).length > 0) {
      loadData(dashboardParams);
    }
  };

  return (
    <Paper className={classes.root} elevation={2}>
      <Box className={classes.header}>
        <Typography variant="h6">Métricas por Cliente</Typography>
        <Typography variant="body2" color="textSecondary">
          Tickets encerrados no período
        </Typography>
      </Box>
      <Box className={classes.filterRow}>
        <FormControl className={classes.filterControl} size="small">
          <InputLabel>Filtrar por Dificuldade</InputLabel>
          <Select
            value={difficultyFilter}
            onChange={(e) => {
              setDifficultyFilter(e.target.value);
            }}
          >
            <MenuItem value="all">Todas as dificuldades</MenuItem>
            <MenuItem value="easy">★★ Fáceis (1-2)</MenuItem>
            <MenuItem value="medium">★★★ Moderadas (3)</MenuItem>
            <MenuItem value="hard">★★★★ Difíceis (4-5)</MenuItem>
          </Select>
        </FormControl>
        <Box
          component="span"
          onClick={handleApplyFilter}
          style={{ cursor: "pointer", padding: "6px 16px", background: "#1976d2", color: "#fff", borderRadius: 4, fontSize: "0.875rem", fontWeight: 500 }}
        >
          Filtrar
        </Box>
      </Box>
      {loading ? (
        <Box className={classes.loadingBox}>
          <CircularProgress size={32} />
        </Box>
      ) : data.length === 0 ? (
        <Box className={classes.emptyBox}>
          <Typography>Nenhum dado disponível para o período selecionado.</Typography>
          <Typography variant="body2">Aplique um filtro de datas no topo e clique em Filtrar.</Typography>
        </Box>
      ) : (
        <TableContainer className={classes.tableContainer}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Cliente</strong></TableCell>
                <TableCell align="center"><strong>Tickets</strong></TableCell>
                <TableCell align="center"><strong>Avaliados</strong></TableCell>
                <TableCell align="center"><strong>TM Resolução</strong></TableCell>
                <TableCell align="center"><strong>Dif. Média</strong></TableCell>
                <TableCell><strong>Distribuição</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.contactId} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" style={{ fontWeight: 500 }}>{row.contactName}</Typography>
                      <Typography className={classes.smallCount}>{row.contactNumber}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={row.totalTickets} size="small" color="primary" />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {row.ratedTickets > 0 ? (
                        <span>{row.ratedTickets} <span className={classes.smallCount}>/ {row.totalTickets}</span></span>
                      ) : (
                        <span style={{ color: "#BDBDBD" }}>—</span>
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{formatMinutes(row.avgResolutionMinutes)}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <DifficultyStars value={row.avgDifficulty} />
                  </TableCell>
                  <TableCell>
                    <DifficultyDistribution row={row} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default ContactMetricsTable;

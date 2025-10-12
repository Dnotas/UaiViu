import React, { useState, useEffect } from "react";

import Paper from "@material-ui/core/Paper";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import TextField from "@material-ui/core/TextField";
import FormHelperText from "@material-ui/core/FormHelperText";
import Typography from "@material-ui/core/Typography";

import CallIcon from "@material-ui/icons/Call";
import GroupAddIcon from "@material-ui/icons/GroupAdd";
import HourglassEmptyIcon from "@material-ui/icons/HourglassEmpty";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import AccessAlarmIcon from "@material-ui/icons/AccessAlarm";
import TimerIcon from "@material-ui/icons/Timer";

import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";

import ButtonWithSpinner from "../../components/ButtonWithSpinner";
import TableAttendantsStatus from "../../components/Dashboard/TableAttendantsStatus";
import { isArray, isEmpty } from "lodash";

import useDashboard from "../../hooks/useDashboard";
import useContacts from "../../hooks/useContacts";
import { ChatsUser } from "./ChartsUser";
import { ChartsDate } from "./ChartsDate";
import moment from "moment";
import { i18n } from "../../translate/i18n";

// -----------------------------
// 🎨 ESTILOS ATUALIZADOS E SEGUROS
// -----------------------------
const useStyles = makeStyles((theme) => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
    animation: `$fadeIn 0.6s ease-out`,
  },
  "@keyframes fadeIn": {
    "0%": { opacity: 0, transform: "translateY(10px)" },
    "100%": { opacity: 1, transform: "translateY(0)" },
  },
  cardBase: {
    padding: theme.spacing(3),
    borderRadius: 20,
    display: "flex",
    flexDirection: "column",
    height: "100%",
    color: "#EEE",
    background:
      "linear-gradient(145deg, #0B3B33 0%, #145C50 100%)",
    border: "1px solid rgba(196,154,108,0.25)",
    boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
    transition: "all 0.3s ease-in-out",
    "&:hover": {
      transform: "translateY(-6px)",
      boxShadow: "0 10px 25px rgba(0,0,0,0.45)",
      border: "1px solid rgba(196,154,108,0.6)",
    },
  },
  icon: {
    fontSize: 80,
    color: "#C49A6C",
    transition: "transform 0.3s ease, color 0.3s ease",
    "&:hover": {
      color: "#d9b57b",
      transform: "scale(1.05)",
    },
  },
  title: {
    fontSize: "1.1rem",
    fontWeight: 500,
    color: "#C49A6C",
    letterSpacing: 0.5,
  },
  number: {
    fontSize: "2.2rem",
    fontWeight: 600,
    color: "#ffffff",
  },
  alignRight: {
    textAlign: "right",
  },
  fullWidth: {
    width: "100%",
  },
  selectContainer: {
    width: "100%",
    textAlign: "left",
  },
  fixedHeightPaper2: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    borderRadius: "14px",
    background: theme.palette.background.paper,
    boxShadow: "0 3px 12px rgba(0,0,0,0.2)",
  },
}));

// -----------------------------
// 💼 COMPONENTE PRINCIPAL
// -----------------------------
const Dashboard = () => {
  const classes = useStyles();
  const [counters, setCounters] = useState({});
  const [attendants, setAttendants] = useState([]);
  const [period, setPeriod] = useState(0);
  const [filterType, setFilterType] = useState(1);
  const [dateFrom, setDateFrom] = useState(moment("1", "D").format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState(moment().format("YYYY-MM-DD"));
  const [loading, setLoading] = useState(false);
  const { find } = useDashboard();

  useEffect(() => {
    async function firstLoad() {
      await fetchData();
    }
    setTimeout(() => {
      firstLoad();
    }, 1000);
  }, []);

  async function handleChangePeriod(value) {
    setPeriod(value);
  }

  async function handleChangeFilterType(value) {
    setFilterType(value);
    if (value === 1) {
      setPeriod(0);
    } else {
      setDateFrom("");
      setDateTo("");
    }
  }

  async function fetchData() {
    setLoading(true);
    let params = {};

    if (period > 0) params.days = period;
    if (!isEmpty(dateFrom) && moment(dateFrom).isValid())
      params.date_from = moment(dateFrom).format("YYYY-MM-DD");
    if (!isEmpty(dateTo) && moment(dateTo).isValid())
      params.date_to = moment(dateTo).format("YYYY-MM-DD");

    if (Object.keys(params).length === 0) {
      toast.error(i18n.t("dashboard.toasts.selectFilterError"));
      setLoading(false);
      return;
    }

    const data = await find(params);
    setCounters(data.counters);
    setAttendants(isArray(data.attendants) ? data.attendants : []);
    setLoading(false);
  }

  function formatTime(minutes) {
    return moment().startOf("day").add(minutes, "minutes").format("HH[h] mm[m]");
  }

  const GetContacts = (all) => {
    const { count } = useContacts(all ? {} : {});
    return count;
  };

  function renderFilters() {
    if (filterType === 1) {
      return (
        <>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label={i18n.t("dashboard.filters.initialDate")}
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={classes.fullWidth}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label={i18n.t("dashboard.filters.finalDate")}
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={classes.fullWidth}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </>
      );
    } else {
      return (
        <Grid item xs={12} sm={6} md={4}>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="period-selector-label">
              {i18n.t("dashboard.periodSelect.title")}
            </InputLabel>
            <Select
              labelId="period-selector-label"
              id="period-selector"
              value={period}
              onChange={(e) => handleChangePeriod(e.target.value)}
            >
              <MenuItem value={0}>{i18n.t("dashboard.periodSelect.options.none")}</MenuItem>
              <MenuItem value={3}>{i18n.t("dashboard.periodSelect.options.last3")}</MenuItem>
              <MenuItem value={7}>{i18n.t("dashboard.periodSelect.options.last7")}</MenuItem>
              <MenuItem value={15}>{i18n.t("dashboard.periodSelect.options.last15")}</MenuItem>
              <MenuItem value={30}>{i18n.t("dashboard.periodSelect.options.last30")}</MenuItem>
              <MenuItem value={60}>{i18n.t("dashboard.periodSelect.options.last60")}</MenuItem>
              <MenuItem value={90}>{i18n.t("dashboard.periodSelect.options.last90")}</MenuItem>
            </Select>
            <FormHelperText>{i18n.t("dashboard.periodSelect.helper")}</FormHelperText>
          </FormControl>
        </Grid>
      );
    }
  }

  const Card = ({ icon: Icon, title, value }) => (
    <Paper className={classes.cardBase} elevation={6}>
      <Grid container alignItems="center" spacing={2}>
        <Grid item xs={8}>
          <Typography className={classes.title}>{title}</Typography>
          <Typography className={classes.number}>{value}</Typography>
        </Grid>
        <Grid item xs={4} style={{ textAlign: "right" }}>
          <Icon className={classes.icon} />
        </Grid>
      </Grid>
    </Paper>
  );

  return (
    <div>
      <Container maxWidth="lg" className={classes.container}>
        <Grid container spacing={3} justifyContent="flex-end">
          <Grid item xs={12} sm={6} md={4}>
            <Card
              icon={CallIcon}
              title={i18n.t("dashboard.counters.inTalk")}
              value={counters.supportHappening}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card
              icon={HourglassEmptyIcon}
              title={i18n.t("dashboard.counters.waiting")}
              value={counters.supportPending}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card
              icon={CheckCircleIcon}
              title={i18n.t("dashboard.counters.finished")}
              value={counters.supportFinished}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card
              icon={GroupAddIcon}
              title={i18n.t("dashboard.counters.newContacts")}
              value={GetContacts(true)}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card
              icon={AccessAlarmIcon}
              title={i18n.t("dashboard.counters.averageTalkTime")}
              value={formatTime(counters.avgSupportTime)}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card
              icon={TimerIcon}
              title={i18n.t("dashboard.counters.averageWaitTime")}
              value={formatTime(counters.avgWaitTime)}
            />
          </Grid>

          {/* FILTROS */}
          <Grid item xs={12} sm={6} md={4}>
            <FormControl className={classes.selectContainer}>
              <InputLabel id="period-selector-label">
                {i18n.t("dashboard.filters.filterType.title")}
              </InputLabel>
              <Select
                labelId="period-selector-label"
                value={filterType}
                onChange={(e) => handleChangeFilterType(e.target.value)}
              >
                <MenuItem value={1}>
                  {i18n.t("dashboard.filters.filterType.options.perDate")}
                </MenuItem>
                <MenuItem value={2}>
                  {i18n.t("dashboard.filters.filterType.options.perPeriod")}
                </MenuItem>
              </Select>
              <FormHelperText>
                {i18n.t("dashboard.filters.filterType.helper")}
              </FormHelperText>
            </FormControl>
          </Grid>

          {renderFilters()}

          {/* BOTÃO FILTRAR */}
          <Grid item xs={12} className={classes.alignRight}>
            <ButtonWithSpinner
              loading={loading}
              onClick={() => fetchData()}
              variant="contained"
              color="primary"
            >
              {i18n.t("dashboard.buttons.filter")}
            </ButtonWithSpinner>
          </Grid>

          {/* USUÁRIOS ONLINE */}
          <Grid item xs={12}>
            {attendants.length ? (
              <TableAttendantsStatus attendants={attendants} loading={loading} />
            ) : null}
          </Grid>

          <Grid item xs={12}>
            <Paper className={classes.fixedHeightPaper2}>
              <ChatsUser />
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper className={classes.fixedHeightPaper2}>
              <ChartsDate />
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </div>
  );
};

export default Dashboard;
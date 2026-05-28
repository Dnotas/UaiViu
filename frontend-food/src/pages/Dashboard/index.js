import React, { useEffect, useState } from "react";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import CircularProgress from "@material-ui/core/CircularProgress";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  card: { padding: theme.spacing(3), textAlign: "center" },
  number: { fontSize: 48, fontWeight: "bold", color: theme.palette.primary.main },
  label: { color: theme.palette.text.secondary },
  menuLink: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    wordBreak: "break-all",
  }
}));

const Dashboard = () => {
  const classes = useStyles();
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ordersRes, configRes] = await Promise.all([
          api.get("/api/food/orders"),
          api.get("/api/food/restaurant-config"),
        ]);
        const orders = ordersRes.data;
        setStats({
          total: orders.length,
          pending: orders.filter(o => o.status === "pending").length,
          preparing: orders.filter(o => o.status === "preparing" || o.status === "confirmed").length,
          onTheWay: orders.filter(o => o.status === "on_the_way").length,
          delivered: orders.filter(o => o.status === "delivered").length,
        });
        setConfig(configRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;

  const menuUrl = config?.slug
    ? `${process.env.REACT_APP_PUBLIC_MENU_URL || window.location.origin + "/cardapio"}/${config.slug}`
    : null;

  return (
    <div>
      <Typography variant="h5" gutterBottom>Dashboard</Typography>

      {menuUrl && (
        <Paper className={classes.menuLink}>
          <Typography variant="body2" color="textSecondary">Link do seu cardápio (enviar para clientes):</Typography>
          <Typography variant="body1"><strong>{menuUrl}</strong></Typography>
        </Paper>
      )}

      <Box mt={3}>
        <Grid container spacing={3}>
          {[
            { label: "Total hoje", value: stats?.total ?? 0 },
            { label: "Aguardando", value: stats?.pending ?? 0 },
            { label: "Em preparo", value: stats?.preparing ?? 0 },
            { label: "Saiu p/ entrega", value: stats?.onTheWay ?? 0 },
            { label: "Entregues", value: stats?.delivered ?? 0 },
          ].map((item) => (
            <Grid item xs={6} sm={4} md={2} key={item.label}>
              <Paper className={classes.card}>
                <Typography className={classes.number}>{item.value}</Typography>
                <Typography className={classes.label}>{item.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </div>
  );
};

export default Dashboard;

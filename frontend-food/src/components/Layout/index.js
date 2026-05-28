import React, { useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import Drawer from "@material-ui/core/Drawer";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import MenuIcon from "@material-ui/icons/Menu";
import DashboardIcon from "@material-ui/icons/Dashboard";
import RestaurantMenuIcon from "@material-ui/icons/RestaurantMenu";
import ShoppingCartIcon from "@material-ui/icons/ShoppingCart";
import PhoneAndroidIcon from "@material-ui/icons/PhoneAndroid";
import SettingsIcon from "@material-ui/icons/Settings";
import ExitToAppIcon from "@material-ui/icons/ExitToApp";
import Hidden from "@material-ui/core/Hidden";

const DRAWER_WIDTH = 240;

const useStyles = makeStyles((theme) => ({
  root: { display: "flex" },
  appBar: { zIndex: theme.zIndex.drawer + 1 },
  drawer: { width: DRAWER_WIDTH, flexShrink: 0 },
  drawerPaper: { width: DRAWER_WIDTH },
  menuButton: { marginRight: theme.spacing(2), [theme.breakpoints.up("md")]: { display: "none" } },
  toolbar: theme.mixins.toolbar,
  content: { flexGrow: 1, padding: theme.spacing(3) },
  logo: { fontWeight: "bold", color: "white", flexGrow: 1 },
  activeItem: { backgroundColor: theme.palette.action.selected, borderRadius: 8 },
}));

const menuItems = [
  { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
  { label: "Cardápio", path: "/menu", icon: <RestaurantMenuIcon /> },
  { label: "Pedidos", path: "/pedidos", icon: <ShoppingCartIcon /> },
  { label: "WhatsApp", path: "/whatsapp", icon: <PhoneAndroidIcon /> },
  { label: "Configurações", path: "/configuracoes", icon: <SettingsIcon /> },
];

const Layout = ({ children }) => {
  const classes = useStyles();
  const history = useHistory();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("food_token");
    localStorage.removeItem("food_companyId");
    localStorage.removeItem("food_userId");
    const mainUrl = process.env.REACT_APP_MAIN_URL || "http://localhost:3000";
    window.location.href = `${mainUrl}/login`;
  };

  const drawerContent = (
    <div>
      <div className={classes.toolbar} />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.path}
            onClick={() => { history.push(item.path); setMobileOpen(false); }}
            className={location.pathname === item.path ? classes.activeItem : ""}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
        <ListItem button onClick={handleLogout}>
          <ListItemIcon><ExitToAppIcon /></ListItemIcon>
          <ListItemText primary="Sair" />
        </ListItem>
      </List>
    </div>
  );

  return (
    <div className={classes.root}>
      <AppBar position="fixed" className={classes.appBar}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} className={classes.menuButton}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" className={classes.logo}>
            🍽️ UaiViu Food
          </Typography>
        </Toolbar>
      </AppBar>

      <Hidden smDown>
        <Drawer className={classes.drawer} variant="permanent" classes={{ paper: classes.drawerPaper }}>
          {drawerContent}
        </Drawer>
      </Hidden>
      <Hidden mdUp>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          classes={{ paper: classes.drawerPaper }}
          ModalProps={{ keepMounted: true }}
        >
          {drawerContent}
        </Drawer>
      </Hidden>

      <main className={classes.content}>
        <div className={classes.toolbar} />
        {children}
      </main>
    </div>
  );
};

export default Layout;

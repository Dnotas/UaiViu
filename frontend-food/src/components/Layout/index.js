import React, { useEffect, useRef, useState } from "react";
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
import Badge from "@material-ui/core/Badge";
import MenuIcon from "@material-ui/icons/Menu";
import DashboardIcon from "@material-ui/icons/Dashboard";
import RestaurantMenuIcon from "@material-ui/icons/RestaurantMenu";
import ShoppingCartIcon from "@material-ui/icons/ShoppingCart";
import PhoneAndroidIcon from "@material-ui/icons/PhoneAndroid";
import SettingsIcon from "@material-ui/icons/Settings";
import ExitToAppIcon from "@material-ui/icons/ExitToApp";
import ChatIcon from "@material-ui/icons/Chat";
import Hidden from "@material-ui/core/Hidden";
import io from "socket.io-client";
import api from "../../services/api";

const FOOD_API = process.env.REACT_APP_BACKEND_FOOD_URL || "http://localhost:3003";

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

const staticMenuItems = [
  { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
  { label: "Cardápio", path: "/menu", icon: <RestaurantMenuIcon /> },
  { label: "Pedidos", path: "/pedidos", icon: <ShoppingCartIcon /> },
  { label: "Conversas", path: "/conversas", icon: <ChatIcon />, badgeKey: "conversations" },
  { label: "WhatsApp", path: "/whatsapp", icon: <PhoneAndroidIcon /> },
  { label: "Configurações", path: "/configuracoes", icon: <SettingsIcon /> },
];

const Layout = ({ children }) => {
  const classes = useStyles();
  const history = useHistory();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadConversations, setUnreadConversations] = useState(0);
  const socketRef = useRef(null);
  const companyId = localStorage.getItem("food_companyId");

  useEffect(() => {
    // Carrega contagem inicial de não lidas
    api.get("/api/food/conversations")
      .then(({ data }) => {
        const total = data.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        setUnreadConversations(total);
      })
      .catch(() => {});

    // Socket para receber atualizações em tempo real
    const socket = io(FOOD_API, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.emit("joinCompany", companyId);
    socket.on("food:conversation:message", ({ message }) => {
      if (!message.fromMe) {
        setUnreadConversations((prev) => prev + 1);
      }
    });

    return () => socket.disconnect();
  }, []); // eslint-disable-line

  // Zera contador ao entrar na página de conversas
  useEffect(() => {
    if (location.pathname === "/conversas") {
      setUnreadConversations(0);
    }
  }, [location.pathname]);

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
        {staticMenuItems.map((item) => (
          <ListItem
            button
            key={item.path}
            onClick={() => { history.push(item.path); setMobileOpen(false); }}
            className={location.pathname === item.path ? classes.activeItem : ""}
          >
            <ListItemIcon>
              {item.badgeKey === "conversations" ? (
                <Badge badgeContent={unreadConversations} color="error" max={99} invisible={!unreadConversations}>
                  {item.icon}
                </Badge>
              ) : item.icon}
            </ListItemIcon>
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

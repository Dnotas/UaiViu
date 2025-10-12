import React, { useContext, useEffect, useReducer, useState } from "react";
import { Link as RouterLink, useHistory } from "react-router-dom";

import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import ListSubheader from "@material-ui/core/ListSubheader";
import Divider from "@material-ui/core/Divider";
import { Badge, Collapse, List } from "@material-ui/core";
import DashboardOutlinedIcon from "@material-ui/icons/DashboardOutlined";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import SyncAltIcon from "@material-ui/icons/SyncAlt";
import SettingsOutlinedIcon from "@material-ui/icons/SettingsOutlined";
import PeopleAltOutlinedIcon from "@material-ui/icons/PeopleAltOutlined";
import ContactPhoneOutlinedIcon from "@material-ui/icons/ContactPhoneOutlined";
import AccountTreeOutlinedIcon from "@material-ui/icons/AccountTreeOutlined";
import FlashOnIcon from "@material-ui/icons/FlashOn";
import HelpOutlineIcon from "@material-ui/icons/HelpOutline";
import CodeRoundedIcon from "@material-ui/icons/CodeRounded";
import EventIcon from "@material-ui/icons/Event";
import LocalOfferIcon from "@material-ui/icons/LocalOffer";
import EventAvailableIcon from "@material-ui/icons/EventAvailable";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import PeopleIcon from "@material-ui/icons/People";
import ListIcon from "@material-ui/icons/ListAlt";
import AnnouncementIcon from "@material-ui/icons/Announcement";
import ForumIcon from "@material-ui/icons/Forum";
import LocalAtmIcon from '@material-ui/icons/LocalAtm';
import RotateRight from "@material-ui/icons/RotateRight";
import { i18n } from "../translate/i18n";
import { WhatsAppsContext } from "../context/WhatsApp/WhatsAppsContext";
import { AuthContext } from "../context/Auth/AuthContext";
import LoyaltyRoundedIcon from '@material-ui/icons/LoyaltyRounded';
import { Can } from "../components/Can";
import { SocketContext } from "../context/Socket/SocketContext";
import { isArray } from "lodash";
import TableChartIcon from '@material-ui/icons/TableChart';
import api from "../services/api";
import BorderColorIcon from '@material-ui/icons/BorderColor';
import ToDoList from "../pages/ToDoList/";
import toastError from "../errors/toastError";
import { makeStyles } from "@material-ui/core/styles";
import { AccountTree, AllInclusive, AttachFile, BlurCircular, Chat, DeviceHubOutlined, Schedule } from '@material-ui/icons';
import usePlans from "../hooks/usePlans";
import Typography from "@material-ui/core/Typography";
import { ShapeLine } from "@mui/icons-material";

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: "#0F2E27", // verde escuro sólido
    color: "#C18E49", // dourado metálico
    minHeight: "100vh",
    transition: "all 0.3s ease",
    paddingBottom: theme.spacing(2),
  },
  listItem: {
    color: "#C18E49",
    borderRadius: "8px",
    margin: "4px 8px",
    transition: "all 0.25s ease",
    "&:hover": {
      backgroundColor: "rgba(193,142,73,0.1)",
      transform: "translateX(3px)",
      boxShadow: "0 2px 8px rgba(193,142,73,0.25)",
    },
  },
  icon: {
    color: "#C18E49",
    minWidth: "40px",
  },
  listText: {
    color: "#C18E49",
    fontWeight: 500,
    letterSpacing: "0.3px",
  },
  subheader: {
    color: "#C18E49",
    fontWeight: "bold",
    fontSize: "0.85rem",
    textTransform: "uppercase",
    marginTop: "10px",
    paddingLeft: "16px",
  },
  divider: {
    backgroundColor: "rgba(193,142,73,0.3)",
    margin: "8px 0",
  },
  nested: {
    paddingLeft: theme.spacing(4),
  },
}));

function ListItemLink(props) {
  const { icon, primary, to, className } = props;
  const classes = useStyles();

  const renderLink = React.useMemo(
    () =>
      React.forwardRef((itemProps, ref) => (
        <RouterLink to={to} ref={ref} {...itemProps} />
      )),
    [to]
  );

  return (
    <li>
      <ListItem button dense component={renderLink} className={classes.listItem}>
        {icon ? <ListItemIcon className={classes.icon}>{icon}</ListItemIcon> : null}
        <ListItemText primary={primary} className={classes.listText} />
      </ListItem>
    </li>
  );
}

const reducer = (state, action) => {
  if (action.type === "LOAD_CHATS") {
    const chats = action.payload;
    const newChats = [];

    if (isArray(chats)) {
      chats.forEach((chat) => {
        const chatIndex = state.findIndex((u) => u.id === chat.id);
        if (chatIndex !== -1) {
          state[chatIndex] = chat;
        } else {
          newChats.push(chat);
        }
      });
    }

    return [...state, ...newChats];
  }

  if (action.type === "UPDATE_CHATS") {
    const chat = action.payload;
    const chatIndex = state.findIndex((u) => u.id === chat.id);

    if (chatIndex !== -1) {
      state[chatIndex] = chat;
      return [...state];
    } else {
      return [chat, ...state];
    }
  }

  if (action.type === "DELETE_CHAT") {
    const chatId = action.payload;

    const chatIndex = state.findIndex((u) => u.id === chatId);
    if (chatIndex !== -1) {
      state.splice(chatIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }

  if (action.type === "CHANGE_CHAT") {
    const changedChats = state.map((chat) => {
      if (chat.id === action.payload.chat.id) {
        return action.payload.chat;
      }
      return chat;
    });
    return changedChats;
  }
};

const MainListItems = (props) => {
  const classes = useStyles();
  const { drawerClose, collapsed } = props;
  const { whatsApps } = useContext(WhatsAppsContext);
  const { user, handleLogout } = useContext(AuthContext);
  const [connectionWarning, setConnectionWarning] = useState(false);
  const [openCampaignSubmenu, setOpenCampaignSubmenu] = useState(false);
  const [openFlowsSubmenu, setOpenFlowsSubmenu] = useState(false);
  const [showCampaigns, setShowCampaigns] = useState(false);
  const [showKanban, setShowKanban] = useState(false);
  const [showOpenAi, setShowOpenAi] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showSchedules, setShowSchedules] = useState(false);
  const [showInternalChat, setShowInternalChat] = useState(false);
  const [showExternalApi, setShowExternalApi] = useState(false);
  const history = useHistory();

  const [invisible, setInvisible] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam] = useState("");
  const [chats, dispatch] = useReducer(reducer, []);
  const { getPlanCompany } = usePlans();
  const socketManager = useContext(SocketContext);

  useEffect(() => {}, []);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    async function fetchData() {
      const companyId = user.companyId;
      const planConfigs = await getPlanCompany(undefined, companyId);

      setShowCampaigns(planConfigs.plan.useCampaigns);
      setShowKanban(planConfigs.plan.useKanban);
      setShowOpenAi(planConfigs.plan.useOpenAi);
      setShowIntegrations(planConfigs.plan.useIntegrations);
      setShowSchedules(planConfigs.plan.useSchedules);
      setShowInternalChat(planConfigs.plan.useInternalChat);
      setShowExternalApi(planConfigs.plan.useExternalApi);
    }
    fetchData();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchChats();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const socket = socketManager.getSocket(companyId);

    socket.on(`company-${companyId}-chat`, (data) => {
      if (data.action === "new-message" || data.action === "update") {
        dispatch({ type: "CHANGE_CHAT", payload: data });
      }
    });
    return () => socket.disconnect();
  }, [socketManager]);

  useEffect(() => {
    let unreadsCount = 0;
    if (chats.length > 0) {
      for (let chat of chats) {
        for (let chatUser of chat.users) {
          if (chatUser.userId === user.id) {
            unreadsCount += chatUser.unreads;
          }
        }
      }
    }
    setInvisible(unreadsCount === 0);
  }, [chats, user.id]);

  useEffect(() => {
    if (localStorage.getItem("cshow")) {
      setShowCampaigns(true);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (whatsApps.length > 0) {
        const offlineWhats = whatsApps.filter((whats) => {
          return (
            whats.status === "qrcode" ||
            whats.status === "PAIRING" ||
            whats.status === "DISCONNECTED" ||
            whats.status === "TIMEOUT" ||
            whats.status === "OPENING"
          );
        });
        setConnectionWarning(offlineWhats.length > 0);
      }
    }, 2000);
    return () => clearTimeout(delayDebounceFn);
  }, [whatsApps]);

  const fetchChats = async () => {
    try {
      const { data } = await api.get("/chats/", {
        params: { searchParam, pageNumber },
      });
      dispatch({ type: "LOAD_CHATS", payload: data.records });
    } catch (err) {
      toastError(err);
    }
  };

  const handleClickLogout = () => {
    handleLogout();
  };

  return (
    <div className={classes.root} onClick={drawerClose}>
      <Can role={user.profile} perform="dashboard:view" yes={() => (
        <ListItemLink to="/" primary="Dashboard" icon={<DashboardOutlinedIcon />} />
      )}/>

      <ListItemLink to="/tickets" primary={i18n.t("mainDrawer.listItems.tickets")} icon={<WhatsAppIcon />} />
      {showKanban && <ListItemLink to="/kanban" primary="Kanban" icon={<TableChartIcon />} />}
      <ListItemLink to="/quick-messages" primary={i18n.t("mainDrawer.listItems.quickMessages")} icon={<FlashOnIcon />} />
      <ListItemLink to="/todolist" primary={i18n.t("mainDrawer.listItems.tasks")} icon={<BorderColorIcon />} />
      <ListItemLink to="/contacts" primary={i18n.t("mainDrawer.listItems.contacts")} icon={<ContactPhoneOutlinedIcon />} />
      <ListItemLink to="/schedules" primary={i18n.t("mainDrawer.listItems.schedules")} icon={<EventIcon />} />
      <ListItemLink to="/tags" primary={i18n.t("mainDrawer.listItems.tags")} icon={<LocalOfferIcon />} />
      <ListItemLink to="/chats" primary={i18n.t("mainDrawer.listItems.chats")} icon={<Badge color="secondary" variant="dot" invisible={invisible}><ForumIcon /></Badge>} />
      <ListItemLink to="/helps" primary={i18n.t("mainDrawer.listItems.helps")} icon={<HelpOutlineIcon />} />

      <Can role={user.profile} perform="drawer-admin-items:view" yes={() => (
        <>
          <Divider className={classes.divider}/>
          <ListSubheader hidden={collapsed} className={classes.subheader} inset color="inherit">
            {i18n.t("mainDrawer.listItems.administration")}
          </ListSubheader>

          {showCampaigns && (
            <>
              <ListItem button onClick={() => setOpenCampaignSubmenu(prev => !prev)} className={classes.listItem}>
                <ListItemIcon className={classes.icon}><EventAvailableIcon /></ListItemIcon>
                <ListItemText primary={i18n.t("mainDrawer.listItems.campaigns")} className={classes.listText} />
                {openCampaignSubmenu ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItem>

              <Collapse in={openCampaignSubmenu} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItem onClick={() => history.push("/campaigns")} button className={classes.listItem}>
                    <ListItemIcon className={classes.icon}><ListIcon /></ListItemIcon>
                    <ListItemText primary="Listagem" className={classes.listText} />
                  </ListItem>
                  <ListItem onClick={() => history.push("/contact-lists")} button className={classes.listItem}>
                    <ListItemIcon className={classes.icon}><PeopleIcon /></ListItemIcon>
                    <ListItemText primary="Listas de Contatos" className={classes.listText} />
                  </ListItem>
                  <ListItem onClick={() => history.push("/campaigns-config")} button className={classes.listItem}>
                    <ListItemIcon className={classes.icon}><SettingsOutlinedIcon /></ListItemIcon>
                    <ListItemText primary="Configurações" className={classes.listText} />
                  </ListItem>
                </List>
              </Collapse>

              {/* FLOW BUILDER */}
              <ListItem button onClick={() => setOpenFlowsSubmenu(prev => !prev)} className={classes.listItem}>
                <ListItemIcon className={classes.icon}><AccountTree /></ListItemIcon>
                <ListItemText primary={i18n.t("mainDrawer.listItems.flows")} className={classes.listText} />
                {openFlowsSubmenu ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItem>

              <Collapse in={openFlowsSubmenu} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItem onClick={() => history.push("/flow-campaigns")} button className={classes.listItem}>
                    <ListItemIcon className={classes.icon}><EventAvailableIcon /></ListItemIcon>
                    <ListItemText primary="Campanha" className={classes.listText} />
                  </ListItem>
                  <ListItem onClick={() => history.push("/flowbuilder")} button className={classes.listItem}>
                    <ListItemIcon className={classes.icon}><ShapeLine /></ListItemIcon>
                    <ListItemText primary="Conversa" className={classes.listText} />
                  </ListItem>
                </List>
              </Collapse>
            </>
          )}

          {user.super && <ListItemLink to="/announcements" primary={i18n.t("mainDrawer.listItems.annoucements")} icon={<AnnouncementIcon />} />}
          {showOpenAi && <ListItemLink to="/prompts" primary={i18n.t("mainDrawer.listItems.prompts")} icon={<AllInclusive />} />}
          {showIntegrations && <ListItemLink to="/queue-integration" primary={i18n.t("mainDrawer.listItems.queueIntegration")} icon={<DeviceHubOutlined />} />}
          <ListItemLink to="/connections" primary={i18n.t("mainDrawer.listItems.connections")} icon={<Badge badgeContent={connectionWarning ? "!" : 0} color="error"><SyncAltIcon /></Badge>} />
          <ListItemLink to="/files" primary={i18n.t("mainDrawer.listItems.files")} icon={<AttachFile />} />
          <ListItemLink to="/queues" primary={i18n.t("mainDrawer.listItems.queues")} icon={<AccountTreeOutlinedIcon />} />
          <ListItemLink to="/users" primary={i18n.t("mainDrawer.listItems.users")} icon={<PeopleAltOutlinedIcon />} />
          {showExternalApi && <ListItemLink to="/messages-api" primary={i18n.t("mainDrawer.listItems.messagesAPI")} icon={<CodeRoundedIcon />} />}
          <ListItemLink to="/financeiro" primary={i18n.t("mainDrawer.listItems.financeiro")} icon={<LocalAtmIcon />} />
          <ListItemLink to="/settings" primary={i18n.t("mainDrawer.listItems.settings")} icon={<SettingsOutlinedIcon />} />

          {!collapsed && (
            <>
              <Divider className={classes.divider} />
              <Typography style={{ fontSize: "12px", padding: "10px", textAlign: "right", fontWeight: "bold", color: "#C18E49" }}>
                8.0.1
              </Typography>
            </>
          )}
        </>
      )}/>
    </div>
  );
};

export default MainListItems;

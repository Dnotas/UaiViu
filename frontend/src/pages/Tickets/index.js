// /src/pages/Tickets/index.js
import React from "react";
import { useParams } from "react-router-dom";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";

import TicketsManager from "../../components/TicketsManager/";
import Ticket from "../../components/Ticket/";

import logo from "../../assets/logo.png";

import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  chatContainer: {
    flex: 1,
    backgroundColor:
      theme.palette.type === "dark" ? "#1C1C1C" : "#F3F3F3",
    padding: theme.spacing(4),
    height: `calc(100% - 48px)`,
    overflowY: "hidden",
  },

  chatPapper: {
    display: "flex",
    height: "100%",
    borderRadius: 10,
    overflow: "hidden",
    boxShadow: "0px 4px 15px rgba(0,0,0,0.3)",
  },

  contactsWrapper: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflowY: "hidden",
    backgroundColor: "#0F2E27", // verde escuro institucional
    color: "#C18E49", // texto dourado
    borderRight: "2px solid #C18E49",
  },

  messagessWrapper: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    backgroundColor:
      theme.palette.type === "dark" ? "#222" : "#F5F5F5",
  },

  welcomeMsg: {
    backgroundColor:
      theme.palette.type === "dark" ? "#1F1F1F" : "#FFFFFF",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    textAlign: "center",
    border: "none",
    boxShadow: "inset 0 0 10px rgba(0,0,0,0.1)",
  },

  logoContainer: {
    textAlign: "center",
  },

  logo: {
    margin: "0 auto",
    width: "70%",
    opacity: 0.95,
    transition: "transform 0.3s ease",
    "&:hover": {
      transform: "scale(1.03)",
    },
  },

  // efeito sutil dourado nos hovers da área de contatos
  contactItem: {
    "&:hover": {
      backgroundColor: "rgba(193,142,73,0.1)",
      transition: "0.3s",
    },
  },
}));

const Chat = () => {
  const classes = useStyles();
  const { ticketId } = useParams();

  return (
    <div className={classes.chatContainer}>
      <div className={classes.chatPapper}>
        <Grid container spacing={0}>
          <Grid item xs={4} className={classes.contactsWrapper}>
            <TicketsManager className={classes.contactItem} />
          </Grid>

          <Grid item xs={8} className={classes.messagessWrapper}>
            {ticketId ? (
              <Ticket />
            ) : (
              <Paper square variant="outlined" className={classes.welcomeMsg}>
                <div className={classes.logoContainer}>
                  <img
                    className={classes.logo}
                    src={logo}
                    alt="Chat Assistance Logo"
                  />
                </div>
              </Paper>
            )}
          </Grid>
        </Grid>
      </div>
    </div>
  );
};

export default Chat;


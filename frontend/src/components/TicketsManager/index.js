import React, { useContext, useEffect, useState } from "react";

import { 
  Badge,
  Button,
  FormControlLabel,
  makeStyles,
  Paper,
  Tab,
  Tabs,
  Switch
} from "@material-ui/core";

import {
  AllInboxRounded,
  HourglassEmptyRounded,
  MoveToInbox,
  Search,
  Warning
} from "@material-ui/icons";

import NewTicketModal from "../NewTicketModal";
import TicketsList from "../TicketsList";
import TabPanel from "../TabPanel";
import { TagsFilter } from "../TagsFilter";
import { Can } from "../Can";
import TicketsQueueSelect from "../TicketsQueueSelect";
import UrgentTicketsAlert from "../UrgentTicketsAlert";

import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  ticketsWrapper: {
    position: "relative",
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflow: "hidden",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: theme.palette.background.default,
  },

  tabsHeader: {
    flex: "none",
    backgroundColor: "transparent",
    boxShadow: "none",
    "& .MuiTabs-root": {
      minHeight: 48,
    },
    "& .MuiTabs-indicator": {
      height: 3,
      borderRadius: "3px 3px 0 0",
    },
  },

  settingsIcon: {
    alignSelf: "center",
    marginLeft: "auto",
    padding: 8,
  },

  tab: {
    minWidth: 100,
    textTransform: "none",
    fontWeight: 500,
    fontSize: "0.875rem",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
    },
  },

  ticketOptionsBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "transparent",
    padding: theme.spacing(1.5, 2),
    gap: theme.spacing(1),
  },

  serachInputWrapper: {
    flex: 1,
    backgroundColor: theme.palette.background.default,
    display: "flex",
    borderRadius: 40,
    padding: 4,
    marginRight: theme.spacing(1),
  },

  searchIcon: {
    color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
    marginLeft: 12,
    marginRight: 8,
    alignSelf: "center",
  },

  searchInput: {
    flex: 1,
    border: "none",
    borderRadius: 25,
    padding: "10px 12px",
    outline: "none",
    backgroundColor: "transparent",
    fontSize: "0.875rem",
    color: theme.palette.text.primary,
    "&::placeholder": {
      color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
    },
  },

  badge: {
    "& .MuiBadge-badge": {
      right: -16,
      top: 2,
      padding: "0 6px",
      height: 20,
      minWidth: 20,
      borderRadius: 10,
      fontSize: "0.7rem",
      fontWeight: 600,
    },
  },
  show: {
    display: "block",
  },
  hide: {
    display: "none !important",
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
    borderRadius: "12px",
    margin: "12px 16px 0",
    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
    transition: "all 0.2s ease",
    "&:focus-within": {
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
      borderColor: theme.palette.primary.main,
      boxShadow: `0 0 0 2px ${theme.palette.primary.main}20`,
    },
  },
  newTicketButton: {
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.875rem",
    padding: "8px 20px",
    boxShadow: "0 2px 8px rgba(76, 175, 80, 0.25)",
    transition: "all 0.2s ease",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: "0 4px 12px rgba(76, 175, 80, 0.35)",
    },
  },
  switchControl: {
    "& .MuiFormControlLabel-label": {
      fontSize: "0.875rem",
      fontWeight: 500,
    },
  },
  tabIcon: {
    opacity: 0.7,
    transition: "opacity 0.2s ease",
  },
}));

const TicketsManager = () => {
  const classes = useStyles();

  const [searchParam, setSearchParam] = useState("");
  const [tab, setTab] = useState("open");
  const [tabOpen] = useState("open");
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const { user } = useContext(AuthContext);

  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);

  const userQueueIds = user.queues.map((q) => q.id);
  const [selectedQueueIds, setSelectedQueueIds] = useState(userQueueIds || []);

  useEffect(() => {
    if (user.profile.toUpperCase() === "ADMIN") {
      setShowAllTickets(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (e) => {
    const searchedTerm = e.target.value.toLowerCase();


    setSearchParam(searchedTerm);
    if (searchedTerm === "") {
      setTab("open");
    } else if (tab !== "search") {
      setTab("search");
    }

  };

  const handleSelectedTags = (selecteds) => {
    const tags = selecteds.map(t => t.id);
    setSelectedTags(tags);
  }

  const handleChangeTab = (e, newValue) => {
    setTab(newValue);
  };

  const applyPanelStyle = (status) => {
    if (tabOpen !== status) {
      return { width: 0, height: 0 };
    }
  };

  // DEBUG LOGS
  console.log("🔍 [URGENCY DEBUG] TicketsManager rendered");
  console.log("🔍 [URGENCY DEBUG] Tab state:", tab);
  console.log("🔍 [URGENCY DEBUG] Urgent count:", urgentCount);
  console.log("🔍 [URGENCY DEBUG] Open count:", openCount);
  console.log("🔍 [URGENCY DEBUG] Pending count:", pendingCount);

  return (
    <Paper elevation={0} variant="outlined" className={classes.ticketsWrapper}>
      <UrgentTicketsAlert />
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        onClose={(e) => setNewTicketModalOpen(false)}
      />
      <Paper elevation={0} square className={classes.searchContainer}>
        <Search className={classes.searchIcon} />
        <input
          type="text"
          placeholder={i18n.t("tickets.search.placeholder")}
          className={classes.searchInput}
          value={searchParam}
          onChange={handleSearch}
        />
      </Paper>
      <Paper elevation={0} square className={classes.tabsHeader}>
        {console.log("🔍 [URGENCY DEBUG] Rendering Tabs section")}
        {console.log("🔍 [URGENCY DEBUG] Urgent tab translation:", i18n.t("tickets.tabs.urgent.title"))}
        <Tabs
          value={tab}
          onChange={handleChangeTab}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          aria-label="icon label tabs example"
        >
          <Tab
            value={"open"}
            icon={<MoveToInbox className={classes.tabIcon} />}
            label={
              <Badge
                className={classes.badge}
                badgeContent={openCount}
                overlap="rectangular"
                color="secondary"
              >
                {"TESTE - " + i18n.t("tickets.tabs.open.title")}
              </Badge>
            }
            classes={{ root: classes.tab }}
          />
          <Tab
            value={"pending"}
            icon={<HourglassEmptyRounded className={classes.tabIcon} />}
            label={
              <Badge
                className={classes.badge}
                badgeContent={pendingCount}
                overlap="rectangular"
                color="secondary"
              >
                {i18n.t("ticketsList.pendingHeader")}
              </Badge>
            }
            classes={{ root: classes.tab }}
          />
          <Tab
            value={"urgent"}
            icon={<Warning className={classes.tabIcon} />}
            label={
              <Badge
                className={classes.badge}
                badgeContent={urgentCount}
                overlap="rectangular"
                color="error"
              >
                {i18n.t("tickets.tabs.urgent.title")}
              </Badge>
            }
            classes={{ root: classes.tab }}
          />
          <Tab
            value={"closed"}
            icon={<AllInboxRounded className={classes.tabIcon} />}
            label={i18n.t("tickets.tabs.closed.title")}
            classes={{ root: classes.tab }}
          />
        </Tabs>
      </Paper>
      <Paper square elevation={0} className={classes.ticketOptionsBox}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setNewTicketModalOpen(true)}
          className={classes.newTicketButton}
        >
          {i18n.t("ticketsManager.buttons.newTicket")}
        </Button>
        <Can
          role={user.profile}
          perform="tickets-manager:showall"
          yes={() => (
            <FormControlLabel
              label={i18n.t("tickets.buttons.showAll")}
              labelPlacement="start"
              className={classes.switchControl}
              control={
                <Switch
                  size="small"
                  checked={showAllTickets}
                  onChange={() =>
                    setShowAllTickets((prevState) => !prevState)
                  }
                  name="showAllTickets"
                  color="primary"
                />
              }
            />
          )}
        />
        <TicketsQueueSelect
          style={{ marginLeft: 6 }}
          selectedQueueIds={selectedQueueIds}
          userQueues={user?.queues}
          onChange={(values) => setSelectedQueueIds(values)}
        />
      </Paper>
      <TabPanel value={tab} name="open" className={classes.ticketsWrapper}>
      <TagsFilter onFiltered={handleSelectedTags} />
        <Paper className={classes.ticketsWrapper}>
          <TicketsList
            status="open"
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setOpenCount(val)}
            style={applyPanelStyle("open")}
          />
          <TicketsList
            status="pending"
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setPendingCount(val)}
            style={applyPanelStyle("pending")}
          />
        </Paper>
      </TabPanel>

      <TabPanel value={tab} name="pending" className={classes.ticketsWrapper}>
      <TagsFilter onFiltered={handleSelectedTags} />
        <TicketsList
          status="pending"
          showAll={true}
          selectedQueueIds={selectedQueueIds}
          updateCount={(val) => setPendingCount(val)}
        />
      </TabPanel>

      <TabPanel value={tab} name="urgent" className={classes.ticketsWrapper}>
      <TagsFilter onFiltered={handleSelectedTags} />
        <TicketsList
          status="urgent"
          showAll={true}
          selectedQueueIds={selectedQueueIds}
          updateCount={(val) => setUrgentCount(val)}
        />
      </TabPanel>

      <TabPanel value={tab} name="closed" className={classes.ticketsWrapper}>
      <TagsFilter onFiltered={handleSelectedTags} />
        <TicketsList
          status="closed"
          showAll={true}
          selectedQueueIds={selectedQueueIds}
        />
      </TabPanel>
      <TabPanel value={tab} name="search" className={classes.ticketsWrapper}>
      <TagsFilter onFiltered={handleSelectedTags} />
        <TicketsList
          searchParam={searchParam}
          tags={selectedTags}
          showAll={true}
          selectedQueueIds={selectedQueueIds}
        />
      </TabPanel>
    </Paper>
  );
};

export default TicketsManager;
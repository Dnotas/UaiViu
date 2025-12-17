import React, { useContext, useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import SearchIcon from "@material-ui/icons/Search";
import InputBase from "@material-ui/core/InputBase";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Badge from "@material-ui/core/Badge";
import MoveToInboxIcon from "@material-ui/icons/MoveToInbox";
import CheckBoxIcon from "@material-ui/icons/CheckBox";
import Warning from "@material-ui/icons/Warning";

import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";

import NewTicketModal from "../NewTicketModal";
import TicketsList from "../TicketsListCustom";
import TabPanel from "../TabPanel";
import UrgentTicketsAlert from "../UrgentTicketsAlert";

import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../Can";
import TicketsQueueSelect from "../TicketsQueueSelect";
import { Button } from "@material-ui/core";
import { TagsFilter } from "../TagsFilter";
import { UsersFilter } from "../UsersFilter";

const useStyles = makeStyles(theme => ({
	ticketsWrapper: {
		position: "relative",
		display: "flex",
		height: "100%",
		flexDirection: "column",
		overflow: "hidden",
		borderTopRightRadius: 0,
		borderBottomRightRadius: 0,
		borderRadius:0,
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

	tabsInternal: {
		flex: "none",
		backgroundColor: "transparent",
		boxShadow: "none",
		"& .MuiTabs-indicator": {
			height: 2,
			borderRadius: "2px 2px 0 0",
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

	internalTab: {
		minWidth: 100,
		padding: "6px 12px",
		textTransform: "none",
		fontWeight: 500,
		fontSize: "0.8rem",
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

	ticketSearchLine: {
		padding: theme.spacing(1.5, 2),
	},

	serachInputWrapper: {
		flex: 1,
		backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
		display: "flex",
		borderRadius: 12,
		padding: "8px 12px",
		marginRight: theme.spacing(1),
		border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
		transition: "all 0.2s ease",
		"&:focus-within": {
			backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
			borderColor: theme.palette.primary.main,
			boxShadow: `0 0 0 2px ${theme.palette.primary.main}20`,
		},
	},

	searchIcon: {
		color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
		marginLeft: 4,
		marginRight: 8,
		alignSelf: "center",
	},

	searchInput: {
		flex: 1,
		border: "none",
		borderRadius: 8,
		backgroundColor: "transparent",
		fontSize: "0.875rem",
		color: theme.palette.text.primary,
		"&::placeholder": {
			color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
		},
	},

	insiderTabPanel: {
		height: '100%',
		marginTop: "-72px",
		paddingTop: "72px"
	},

	insiderDoubleTabPanel: {
		display:"flex",
		flexDirection: "column",
		marginTop: "-72px",
		paddingTop: "72px",
		height: "100%"
	},

	labelContainer: {
		width: "auto",
		padding: 0
	},
	iconLabelWrapper: {
		flexDirection: "row",
		'& > *:first-child': {
			marginBottom: '3px !important',
			marginRight: 16
		}
	},
	insiderTabLabel: {
		[theme.breakpoints.down(1600)]: {
			display:'none'
		}
	},
	smallFormControl: {
		'& .MuiOutlinedInput-input': {
			padding: "12px 10px",
		},
		'& .MuiInputLabel-outlined': {
			marginTop: "-6px"
		}
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
	queueSelectWrapper: {
		"& .MuiOutlinedInput-root": {
			borderRadius: 10,
			backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
			transition: "all 0.2s ease",
			"&:hover": {
				backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
			},
			"&.Mui-focused": {
				backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
			},
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

const TicketsManagerTabs = () => {
  const classes = useStyles();
  const history = useHistory();

  const [searchParam, setSearchParam] = useState("");
  const [tab, setTab] = useState("open");
  const [tabOpen, setTabOpen] = useState("open");
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const searchInputRef = useRef();
  const { user } = useContext(AuthContext);
  const { profile } = user;

  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);

  const userQueueIds = user.queues.map((q) => q.id);
  const [selectedQueueIds, setSelectedQueueIds] = useState(userQueueIds || []);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => {
    if (user.profile.toUpperCase() === "ADMIN") {
      setShowAllTickets(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "search") {
      searchInputRef.current.focus();
    }
  }, [tab]);

  let searchTimeout;

  const handleSearch = (e) => {
    const searchedTerm = e.target.value.toLowerCase();

    clearTimeout(searchTimeout);

    if (searchedTerm === "") {
      setSearchParam(searchedTerm);
      setTab("open");
      return;
    }

    searchTimeout = setTimeout(() => {
      setSearchParam(searchedTerm);
    }, 500);
  };

  const handleChangeTab = (e, newValue) => {
    setTab(newValue);
  };

  const handleChangeTabOpen = (e, newValue) => {
    setTabOpen(newValue);
  };

  const applyPanelStyle = (status) => {
    if (tabOpen !== status) {
      return { width: 0, height: 0 };
    }
  };

  const handleCloseOrOpenTicket = (ticket) => {
    setNewTicketModalOpen(false);
    if (ticket !== undefined && ticket.uuid !== undefined) {
      history.push(`/tickets/${ticket.uuid}`);
    }
  };

  const handleSelectedTags = (selecteds) => {
    const tags = selecteds.map((t) => t.id);
    setSelectedTags(tags);
  };

  const handleSelectedUsers = (selecteds) => {
    const users = selecteds.map((t) => t.id);
    setSelectedUsers(users);
  };

  return (
    <Paper elevation={0} variant="outlined" className={classes.ticketsWrapper}>
      <UrgentTicketsAlert />
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        onClose={(ticket) => {

          handleCloseOrOpenTicket(ticket);
        }}
      />
      <Paper elevation={0} square className={classes.tabsHeader}>
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
            icon={<MoveToInboxIcon className={classes.tabIcon} />}
            label={i18n.t("tickets.tabs.open.title")}
            classes={{ root: classes.tab }}
          />
          <Tab
            value={"closed"}
            icon={<CheckBoxIcon className={classes.tabIcon} />}
            label={i18n.t("tickets.tabs.closed.title")}
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
            value={"search"}
            icon={<SearchIcon className={classes.tabIcon} />}
            label={i18n.t("tickets.tabs.search.title")}
            classes={{ root: classes.tab }}
          />
        </Tabs>
      </Paper>
      <Paper square elevation={0} className={classes.ticketOptionsBox}>
        {tab === "search" ? (
          <div className={classes.serachInputWrapper}>
            <SearchIcon className={classes.searchIcon} />
            <InputBase
              className={classes.searchInput}
              inputRef={searchInputRef}
              placeholder={i18n.t("tickets.search.placeholder")}
              type="search"
              onChange={handleSearch}
            />
          </div>
        ) : (
          <>
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
          </>
        )}
        <div className={classes.queueSelectWrapper}>
          <TicketsQueueSelect
            style={{ marginLeft: 6 }}
            selectedQueueIds={selectedQueueIds}
            userQueues={user?.queues}
            onChange={(values) => setSelectedQueueIds(values)}
          />
        </div>
      </Paper>
      <TabPanel value={tab} name="open" className={classes.ticketsWrapper}>
        <Paper elevation={0} square className={classes.tabsInternal}>
          <Tabs
            value={tabOpen}
            onChange={handleChangeTabOpen}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab
              label={
                <Badge
                  className={classes.badge}
                  badgeContent={openCount}
                  color="primary"
                >
                  {i18n.t("ticketsList.assignedHeader")}
                </Badge>
              }
              value={"open"}
              classes={{ root: classes.internalTab }}
            />
            <Tab
              label={
                <Badge
                  className={classes.badge}
                  badgeContent={pendingCount}
                  color="secondary"
                >
                  {i18n.t("ticketsList.pendingHeader")}
                </Badge>
              }
              value={"pending"}
              classes={{ root: classes.internalTab }}
            />
          </Tabs>
        </Paper>
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
      <TabPanel value={tab} name="closed" className={classes.ticketsWrapper}>
        <TicketsList
          status="closed"
          showAll={true}
          selectedQueueIds={selectedQueueIds}
        />
      </TabPanel>
      <TabPanel value={tab} name="urgent" className={classes.ticketsWrapper}>
        <TicketsList
          status="urgent"
          showAll={true}
          selectedQueueIds={selectedQueueIds}
          updateCount={(val) => setUrgentCount(val)}
        />
      </TabPanel>
      <TabPanel value={tab} name="search" className={classes.ticketsWrapper}>
        <TagsFilter onFiltered={handleSelectedTags} />
        {profile === "admin" && (
          <UsersFilter onFiltered={handleSelectedUsers} />
        )}
        <TicketsList
          searchParam={searchParam}
          showAll={true}
          tags={selectedTags}
          users={selectedUsers}
          selectedQueueIds={selectedQueueIds}
        />
      </TabPanel>
    </Paper>
  );
};

export default TicketsManagerTabs;

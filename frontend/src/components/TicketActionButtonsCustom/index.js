import React, { useContext, useState, useEffect } from "react";
import { useHistory } from "react-router-dom";

import { makeStyles, createTheme, ThemeProvider } from "@material-ui/core/styles";
import { IconButton } from "@material-ui/core";
import { MoreVert, Replay } from "@material-ui/icons";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import TicketOptionsMenu from "../TicketOptionsMenu";
import ButtonWithSpinner from "../ButtonWithSpinner";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import UndoRoundedIcon from '@material-ui/icons/UndoRounded';
import Tooltip from '@material-ui/core/Tooltip';
import { green, orange } from '@material-ui/core/colors';
import DifficultyRatingModal from "../DifficultyRatingModal";
import AndroidIcon from '@material-ui/icons/Android';
import BlockIcon from '@material-ui/icons/Block';


const useStyles = makeStyles(theme => ({
	actionButtons: {
		marginRight: 6,
		flex: "none",
		alignSelf: "center",
		marginLeft: "auto",
		"& > *": {
			margin: theme.spacing(0.5),
		},
	},
}));

const TicketActionButtonsCustom = ({ ticket, contact }) => {
	const classes = useStyles();
	const history = useHistory();
	const [anchorEl, setAnchorEl] = useState(null);
	const [loading, setLoading] = useState(false);
	const [difficultyModalOpen, setDifficultyModalOpen] = useState(false);
	const [botPaused, setBotPaused] = useState(false);
	const [botLoading, setBotLoading] = useState(false);
	const ticketOptionsMenuOpen = Boolean(anchorEl);
	const { user } = useContext(AuthContext);
	const { setCurrentTicket } = useContext(TicketsContext);

	useEffect(() => {
		setBotPaused(contact?.disableBot || false);
	}, [contact?.disableBot]);

	const customTheme = createTheme({
		palette: {
		  	primary: green,
		}
	});

	const handleOpenTicketOptionsMenu = e => {
		setAnchorEl(e.currentTarget);
	};

	const handleCloseTicketOptionsMenu = e => {
		setAnchorEl(null);
	};

	const handleUpdateTicketStatus = async (e, status, userId) => {
		setLoading(true);
		try {
			await api.put(`/tickets/${ticket.id}`, {
				status: status,
				userId: userId || null,
				useIntegration: status === "closed" ? false : ticket.useIntegration,
				promptId: status === "closed" ? false : ticket.promptId,
				integrationId: status === "closed" ? false : ticket.integrationId
			});

			setLoading(false);
			if (status === "open") {
				setCurrentTicket({ ...ticket, code: "#open" });
			} else {
				setCurrentTicket({ id: null, code: null })
				history.push("/tickets");
			}
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
	};

	const handleToggleBot = async () => {
		if (!contact?.id) return;
		setBotLoading(true);
		try {
			await api.put(`/contacts/toggleDisableBot/${contact.id}`);
			setBotPaused(prev => !prev);
		} catch (err) {
			toastError(err);
		}
		setBotLoading(false);
	};

	const handleDifficultyConfirm = async (difficultyLevel) => {
		setDifficultyModalOpen(false);
		setLoading(true);
		try {
			await api.put(`/tickets/${ticket.id}`, {
				status: "closed",
				userId: user?.id,
				difficultyLevel: difficultyLevel,
				useIntegration: false,
				promptId: false,
				integrationId: false,
			});
			setLoading(false);
			setCurrentTicket({ id: null, code: null });
			history.push("/tickets");
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
	};

	return (
		<div className={classes.actionButtons}>
			<DifficultyRatingModal
				open={difficultyModalOpen}
				onClose={() => setDifficultyModalOpen(false)}
				onConfirm={handleDifficultyConfirm}
			/>
			{ticket.status === "closed" && (
				<ButtonWithSpinner
					loading={loading}
					startIcon={<Replay />}
					size="small"
					onClick={e => handleUpdateTicketStatus(e, "open", user?.id)}
				>
					{i18n.t("messagesList.header.buttons.reopen")}
				</ButtonWithSpinner>
			)}
			{ticket.status === "open" && (
				<>
					{contact?.id && !ticket.isGroup && (
						<Tooltip title={botPaused ? "Retomar IA (IA pausada para este contato)" : "Pausar IA (IA ativa para este contato)"}>
							<span>
								<IconButton onClick={handleToggleBot} disabled={botLoading} style={{ color: botPaused ? orange[700] : green[600] }}>
									{botPaused ? <BlockIcon /> : <AndroidIcon />}
								</IconButton>
							</span>
						</Tooltip>
					)}
					{ticket.userId === user?.id && (
						<>
							<Tooltip title={i18n.t("messagesList.header.buttons.return")}>
								<IconButton onClick={e => handleUpdateTicketStatus(e, "pending", null)}>
									<UndoRoundedIcon />
								</IconButton>
							</Tooltip>
							<ThemeProvider theme={customTheme}>
								<Tooltip title={i18n.t("messagesList.header.buttons.resolve")}>
									<IconButton onClick={() => setDifficultyModalOpen(true)} color="primary">
										<CheckCircleIcon />
									</IconButton>
								</Tooltip>
							</ThemeProvider>
						</>
					)}
					<IconButton onClick={handleOpenTicketOptionsMenu}>
						<MoreVert />
					</IconButton>
					<TicketOptionsMenu
						ticket={ticket}
						anchorEl={anchorEl}
						menuOpen={ticketOptionsMenuOpen}
						handleClose={handleCloseTicketOptionsMenu}
					/>
				</>
			)}
			{ticket.status === "pending" && (
				<ButtonWithSpinner
					loading={loading}
					size="small"
					variant="contained"
					color="primary"
					onClick={e => handleUpdateTicketStatus(e, "open", user?.id)}
				>
					{i18n.t("messagesList.header.buttons.accept")}
				</ButtonWithSpinner>
			)}
		</div>
	);
};

export default TicketActionButtonsCustom;

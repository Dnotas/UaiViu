import React, { useContext, useEffect, useRef, useState } from "react";

import MenuItem from "@material-ui/core/MenuItem";
import Menu from "@material-ui/core/Menu";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ConfirmationModal from "../ConfirmationModal";
import TransferTicketModalCustom from "../TransferTicketModalCustom";
import toastError from "../../errors/toastError";
import { Can } from "../Can";
import { AuthContext } from "../../context/Auth/AuthContext";

import ScheduleModal from "../ScheduleModal";

const TRANSFER_PASSWORD = "*";

const TicketOptionsMenu = ({ ticket, menuOpen, handleClose, anchorEl }) => {
	const [confirmationOpen, setConfirmationOpen] = useState(false);
	const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
	const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
	const [passwordInput, setPasswordInput] = useState("");
	const [passwordError, setPasswordError] = useState(false);
	const isMounted = useRef(true);
	const { user } = useContext(AuthContext);

	const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
	const [contactId, setContactId] = useState(null);

	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	const handleDeleteTicket = async () => {
		try {
			await api.delete(`/tickets/${ticket.id}`);
		} catch (err) {
			toastError(err);
		}
	};

	const handleOpenConfirmationModal = e => {
		setConfirmationOpen(true);
		handleClose();
	};

	const handleOpenTransferModal = e => {
		setTransferTicketModalOpen(true);
		handleClose();
	};

	const handleCloseTransferTicketModal = () => {
		if (isMounted.current) {
			setTransferTicketModalOpen(false);
		}
	};

	const handleOpenScheduleModal = () => {
		handleClose();
		setContactId(ticket.contact.id);
		setScheduleModalOpen(true);
	}

	const handleCloseScheduleModal = () => {
		setScheduleModalOpen(false);
		setContactId(null);
	}

	const handleOpenPasswordDialog = () => {
		setPasswordInput("");
		setPasswordError(false);
		setPasswordDialogOpen(true);
		handleClose();
	};

	const handlePasswordConfirm = () => {
		if (passwordInput === TRANSFER_PASSWORD) {
			setPasswordDialogOpen(false);
			setTransferTicketModalOpen(true);
		} else {
			setPasswordError(true);
		}
	};

	const handlePasswordKeyDown = (e) => {
		if (e.key === "Enter") handlePasswordConfirm();
	};

	return (
		<>
			<Menu
				id="menu-appbar"
				anchorEl={anchorEl}
				getContentAnchorEl={null}
				anchorOrigin={{
					vertical: "bottom",
					horizontal: "right",
				}}
				keepMounted
				transformOrigin={{
					vertical: "top",
					horizontal: "right",
				}}
				open={menuOpen}
				onClose={handleClose}
			>
				<MenuItem onClick={handleOpenScheduleModal}>
					{i18n.t("ticketOptionsMenu.schedule")}
				</MenuItem>
				{ticket.userId === user?.id && (
					<MenuItem onClick={handleOpenTransferModal}>
						{i18n.t("ticketOptionsMenu.transfer")}
					</MenuItem>
				)}
				{ticket.userId !== user?.id && (
					<MenuItem onClick={handleOpenPasswordDialog}>
						Transferir com senha
					</MenuItem>
				)}
				<Can
					role={user.profile}
					perform="ticket-options:deleteTicket"
					yes={() => (
						<MenuItem onClick={handleOpenConfirmationModal}>
							{i18n.t("ticketOptionsMenu.delete")}
						</MenuItem>
					)}
				/>
			</Menu>
			<ConfirmationModal
				title={`${i18n.t("ticketOptionsMenu.confirmationModal.title")}${
					ticket.id
				} ${i18n.t("ticketOptionsMenu.confirmationModal.titleFrom")} ${
					ticket.contact.name
				}?`}
				open={confirmationOpen}
				onClose={setConfirmationOpen}
				onConfirm={handleDeleteTicket}
			>
				{i18n.t("ticketOptionsMenu.confirmationModal.message")}
			</ConfirmationModal>
			<TransferTicketModalCustom
				modalOpen={transferTicketModalOpen}
				onClose={handleCloseTransferTicketModal}
				ticketid={ticket.id}
			/>
			<ScheduleModal
				open={scheduleModalOpen}
				onClose={handleCloseScheduleModal}
				aria-labelledby="form-dialog-title"
				contactId={contactId}
			/>
		<Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)}>
			<DialogTitle>Transferir Chamado</DialogTitle>
			<DialogContent>
				<TextField
					autoFocus
					label="Senha"
					type="password"
					fullWidth
					value={passwordInput}
					onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
					onKeyDown={handlePasswordKeyDown}
					error={passwordError}
					helperText={passwordError ? "Senha incorreta" : ""}
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => setPasswordDialogOpen(false)} color="default">
					Cancelar
				</Button>
				<Button onClick={handlePasswordConfirm} color="primary" variant="contained">
					Confirmar
				</Button>
			</DialogActions>
		</Dialog>
		</>
	);
};

export default TicketOptionsMenu;
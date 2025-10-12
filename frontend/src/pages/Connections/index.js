import React, { useState, useCallback, useContext } from "react";
import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import {
	Button,
	TableBody,
	TableRow,
	TableCell,
	IconButton,
	Table,
	TableHead,
	Paper,
	Tooltip,
	Typography,
	CircularProgress,
} from "@material-ui/core";
import {
	Edit,
	CheckCircle,
	SignalCellularConnectedNoInternet2Bar,
	SignalCellularConnectedNoInternet0Bar,
	SignalCellular4Bar,
	CropFree,
	DeleteOutline,
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import TableRowSkeleton from "../../components/TableRowSkeleton";

import api from "../../services/api";
import WhatsAppModal from "../../components/WhatsAppModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import QrcodeModal from "../../components/QrcodeModal";
import { i18n } from "../../translate/i18n";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";

const useStyles = makeStyles((theme) => ({
	mainPaper: {
		flex: 1,
		padding: theme.spacing(1),
		overflowY: "scroll",
		...theme.scrollbarStyles,
		backgroundColor: theme.palette.background.paper,
	},
	tableRow: {
		transition: "all 0.3s ease",
		"&:hover": {
			backgroundColor: "rgba(255, 215, 0, 0.08)",
			boxShadow: "0px 3px 10px rgba(255, 215, 0, 0.25)",
			transform: "scale(1.01)",
		},
	},
	iconButton: {
		color: theme.palette.text.secondary,
		transition: "color 0.3s ease",
		"&:hover": {
			color: "#FFD700",
		},
	},
	goldButton: {
		backgroundColor: "#1b4332",
		color: "#fff",
		fontWeight: "bold",
		transition: "all 0.3s ease",
		"&:hover": {
			backgroundColor: "#2d6a4f",
			color: "#FFD700",
			boxShadow: "0 0 10px rgba(255, 215, 0, 0.4)",
		},
	},
	customTableCell: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	tooltip: {
		backgroundColor: "#f5f5f9",
		color: "rgba(0, 0, 0, 0.87)",
		fontSize: theme.typography.pxToRem(14),
		border: "1px solid #dadde9",
		maxWidth: 450,
	},
	tooltipPopper: {
		textAlign: "center",
	},
	buttonProgress: {
		color: green[500],
	},
}));

const CustomToolTip = ({ title, content, children }) => {
	const classes = useStyles();
	return (
		<Tooltip
			arrow
			classes={{
				tooltip: classes.tooltip,
				popper: classes.tooltipPopper,
			}}
			title={
				<React.Fragment>
					<Typography gutterBottom color="inherit">
						{title}
					</Typography>
					{content && <Typography>{content}</Typography>}
				</React.Fragment>
			}
		>
			{children}
		</Tooltip>
	);
};

const Connections = () => {
	const classes = useStyles();
	const { user } = useContext(AuthContext);
	const { whatsApps, loading } = useContext(WhatsAppsContext);

	const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
	const [qrModalOpen, setQrModalOpen] = useState(false);
	const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);
	const [confirmModalOpen, setConfirmModalOpen] = useState(false);

	const confirmationModalInitialState = {
		action: "",
		title: "",
		message: "",
		whatsAppId: "",
		open: false,
	};
	const [confirmModalInfo, setConfirmModalInfo] = useState(
		confirmationModalInitialState
	);

	const handleStartWhatsAppSession = async (whatsAppId) => {
		try {
			await api.post(`/whatsappsession/${whatsAppId}`);
		} catch (err) {
			toastError(err);
		}
	};

	const handleRequestNewQrCode = async (whatsAppId) => {
		try {
			await api.put(`/whatsappsession/${whatsAppId}`);
		} catch (err) {
			toastError(err);
		}
	};

	const handleOpenWhatsAppModal = () => {
		setSelectedWhatsApp(null);
		setWhatsAppModalOpen(true);
	};

	const handleCloseWhatsAppModal = useCallback(() => {
		setWhatsAppModalOpen(false);
		setSelectedWhatsApp(null);
	}, []);

	const handleOpenQrModal = (whatsApp) => {
		setSelectedWhatsApp(whatsApp);
		setQrModalOpen(true);
	};

	const handleCloseQrModal = useCallback(() => {
		setSelectedWhatsApp(null);
		setQrModalOpen(false);
	}, []);

	const handleEditWhatsApp = (whatsApp) => {
		setSelectedWhatsApp(whatsApp);
		setWhatsAppModalOpen(true);
	};

	const handleOpenConfirmationModal = (action, whatsAppId) => {
		if (action === "disconnect") {
			setConfirmModalInfo({
				action,
				title: i18n.t("connections.confirmationModal.disconnectTitle"),
				message: i18n.t("connections.confirmationModal.disconnectMessage"),
				whatsAppId,
			});
		}
		if (action === "delete") {
			setConfirmModalInfo({
				action,
				title: i18n.t("connections.confirmationModal.deleteTitle"),
				message: i18n.t("connections.confirmationModal.deleteMessage"),
				whatsAppId,
			});
		}
		setConfirmModalOpen(true);
	};

	const handleSubmitConfirmationModal = async () => {
		try {
			if (confirmModalInfo.action === "disconnect") {
				await api.delete(`/whatsappsession/${confirmModalInfo.whatsAppId}`);
			}
			if (confirmModalInfo.action === "delete") {
				await api.delete(`/whatsapp/${confirmModalInfo.whatsAppId}`);
				toast.success(i18n.t("connections.toasts.deleted"));
			}
		} catch (err) {
			toastError(err);
		}
		setConfirmModalInfo(confirmationModalInitialState);
	};

	const renderActionButtons = (whatsApp) => {
		return (
			<>
				{whatsApp.status === "qrcode" && (
					<Button
						size="small"
						variant="contained"
						className={classes.goldButton}
						onClick={() => handleOpenQrModal(whatsApp)}
					>
						{i18n.t("connections.buttons.qrcode")}
					</Button>
				)}
				{whatsApp.status === "DISCONNECTED" && (
					<>
						<Button
							size="small"
							variant="outlined"
							className={classes.goldButton}
							onClick={() => handleStartWhatsAppSession(whatsApp.id)}
						>
							{i18n.t("connections.buttons.tryAgain")}
						</Button>{" "}
						<Button
							size="small"
							variant="outlined"
							className={classes.goldButton}
							onClick={() => handleRequestNewQrCode(whatsApp.id)}
						>
							{i18n.t("connections.buttons.newQr")}
						</Button>
					</>
				)}
				{["CONNECTED", "PAIRING", "TIMEOUT"].includes(whatsApp.status) && (
					<Button
						size="small"
						variant="outlined"
						className={classes.goldButton}
						onClick={() => handleOpenConfirmationModal("disconnect", whatsApp.id)}
					>
						{i18n.t("connections.buttons.disconnect")}
					</Button>
				)}
				{whatsApp.status === "OPENING" && (
					<Button size="small" variant="outlined" disabled color="default">
						{i18n.t("connections.buttons.connecting")}
					</Button>
				)}
			</>
		);
	};

	const renderStatusToolTips = (whatsApp) => (
		<div className={classes.customTableCell}>
			{whatsApp.status === "DISCONNECTED" && (
				<CustomToolTip
					title={i18n.t("connections.toolTips.disconnected.title")}
					content={i18n.t("connections.toolTips.disconnected.content")}
				>
					<SignalCellularConnectedNoInternet0Bar color="secondary" />
				</CustomToolTip>
			)}
			{whatsApp.status === "OPENING" && (
				<CircularProgress size={24} className={classes.buttonProgress} />
			)}
			{whatsApp.status === "qrcode" && (
				<CustomToolTip
					title={i18n.t("connections.toolTips.qrcode.title")}
					content={i18n.t("connections.toolTips.qrcode.content")}
				>
					<CropFree />
				</CustomToolTip>
			)}
			{whatsApp.status === "CONNECTED" && (
				<CustomToolTip title={i18n.t("connections.toolTips.connected.title")}>
					<SignalCellular4Bar style={{ color: green[500] }} />
				</CustomToolTip>
			)}
			{["TIMEOUT", "PAIRING"].includes(whatsApp.status) && (
				<CustomToolTip
					title={i18n.t("connections.toolTips.timeout.title")}
					content={i18n.t("connections.toolTips.timeout.content")}
				>
					<SignalCellularConnectedNoInternet2Bar color="secondary" />
				</CustomToolTip>
			)}
		</div>
	);

	return (
		<MainContainer>
			<ConfirmationModal
				title={confirmModalInfo.title}
				open={confirmModalOpen}
				onClose={setConfirmModalOpen}
				onConfirm={handleSubmitConfirmationModal}
			>
				{confirmModalInfo.message}
			</ConfirmationModal>

			<QrcodeModal
				open={qrModalOpen}
				onClose={handleCloseQrModal}
				whatsAppId={!whatsAppModalOpen && selectedWhatsApp?.id}
			/>
			<WhatsAppModal
				open={whatsAppModalOpen}
				onClose={handleCloseWhatsAppModal}
				whatsAppId={!qrModalOpen && selectedWhatsApp?.id}
			/>

			<MainHeader>
				<Title>{i18n.t("connections.title")}</Title>
				<MainHeaderButtonsWrapper>
					<Can
						role={user.profile}
						perform="connections-page:addConnection"
						yes={() => (
							<Button
								variant="contained"
								className={classes.goldButton}
								onClick={handleOpenWhatsAppModal}
							>
								{i18n.t("connections.buttons.add")}
							</Button>
						)}
					/>
				</MainHeaderButtonsWrapper>
			</MainHeader>

			<Paper className={classes.mainPaper} variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell align="center">{i18n.t("connections.table.name")}</TableCell>
							<TableCell align="center">{i18n.t("connections.table.status")}</TableCell>
							<Can
								role={user.profile}
								perform="connections-page:actionButtons"
								yes={() => <TableCell align="center">{i18n.t("connections.table.session")}</TableCell>}
							/>
							<TableCell align="center">{i18n.t("connections.table.lastUpdate")}</TableCell>
							<TableCell align="center">{i18n.t("connections.table.default")}</TableCell>
							<Can
								role={user.profile}
								perform="connections-page:editOrDeleteConnection"
								yes={() => <TableCell align="center">{i18n.t("connections.table.actions")}</TableCell>}
							/>
						</TableRow>
					</TableHead>

					<TableBody>
						{loading ? (
							<TableRowSkeleton />
						) : (
							whatsApps?.map((whatsApp) => (
								<Tooltip
									key={whatsApp.id}
									title={
										<div style={{ fontSize: 14 }}>
											<strong>{whatsApp.name}</strong>
											<br />
											📶 {whatsApp.status}
											<br />
											🕒 Atualizado:{" "}
											{format(parseISO(whatsApp.updatedAt), "dd/MM/yy HH:mm")}
										</div>
									}
									placement="top"
									arrow
								>
									<TableRow className={classes.tableRow}>
										<TableCell align="center">{whatsApp.name}</TableCell>
										<TableCell align="center">{renderStatusToolTips(whatsApp)}</TableCell>
										<Can
											role={user.profile}
											perform="connections-page:actionButtons"
											yes={() => (
												<TableCell align="center">{renderActionButtons(whatsApp)}</TableCell>
											)}
										/>
										<TableCell align="center">
											{format(parseISO(whatsApp.updatedAt), "dd/MM/yy HH:mm")}
										</TableCell>
										<TableCell align="center">
											{whatsApp.isDefault && (
												<div className={classes.customTableCell}>
													<CheckCircle style={{ color: green[500] }} />
												</div>
											)}
										</TableCell>
										<Can
											role={user.profile}
											perform="connections-page:editOrDeleteConnection"
											yes={() => (
												<TableCell align="center">
													<IconButton
														size="small"
														className={classes.iconButton}
														onClick={() => handleEditWhatsApp(whatsApp)}
													>
														<Edit />
													</IconButton>
													<IconButton
														size="small"
														className={classes.iconButton}
														onClick={() =>
															handleOpenConfirmationModal("delete", whatsApp.id)
														}
													>
														<DeleteOutline />
													</IconButton>
												</TableCell>
											)}
										/>
									</TableRow>
								</Tooltip>
							))
						)}
					</TableBody>
				</Table>
			</Paper>
		</MainContainer>
	);
};

export default Connections;

import React, { useEffect, useState } from "react";

import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Drawer from "@material-ui/core/Drawer";
import Link from "@material-ui/core/Link";
import InputLabel from "@material-ui/core/InputLabel";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import CreateIcon from '@material-ui/icons/Create';

import { i18n } from "../../translate/i18n";

import ContactDrawerSkeleton from "../ContactDrawerSkeleton";
import MarkdownWrapper from "../MarkdownWrapper";
import { CardHeader } from "@material-ui/core";
import { ContactForm } from "../ContactForm";
import ContactModal from "../ContactModal";
import { ContactNotes } from "../ContactNotes";
import api from "../../services/api";

const drawerWidth = 320;

const useStyles = makeStyles(theme => ({
	drawer: {
		width: drawerWidth,
		flexShrink: 0,
	},
	drawerPaper: {
		width: drawerWidth,
		display: "flex",
		borderTop: "1px solid rgba(0, 0, 0, 0.12)",
		borderRight: "1px solid rgba(0, 0, 0, 0.12)",
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
		borderTopRightRadius: 4,
		borderBottomRightRadius: 4,
	},
	header: {
		display: "flex",
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
		backgroundColor: theme.palette.contactdrawer, //DARK MODE PLW DESIGN//
		alignItems: "center",
		padding: theme.spacing(0, 1),
		minHeight: "73px",
		justifyContent: "flex-start",
	},
	content: {
		display: "flex",
		backgroundColor: theme.palette.contactdrawer, //DARK MODE PLW DESIGN//
		flexDirection: "column",
		padding: "8px 0px 8px 8px",
		height: "100%",
		overflowY: "scroll",
		...theme.scrollbarStyles,
	},

	contactAvatar: {
		margin: 15,
		width: 100,
		height: 100,
	},

	contactHeader: {
		display: "flex",
		padding: 8,
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		"& > *": {
			margin: 4,
		},
	},

	contactDetails: {
		marginTop: 8,
		padding: 8,
		display: "flex",
		flexDirection: "column",
	},
	contactExtraInfo: {
		marginTop: 4,
		padding: 6,
	},
}));

const ContactDrawer = ({ open, handleDrawerClose, contact, ticket, loading }) => {
	const classes = useStyles();

	const [modalOpen, setModalOpen] = useState(false);
	const [openForm, setOpenForm] = useState(false);
	const [groupParticipants, setGroupParticipants] = useState([]);
	const [loadingParticipants, setLoadingParticipants] = useState(false);
	const [participantsError, setParticipantsError] = useState(null);

	useEffect(() => {
		setOpenForm(false);
		setGroupParticipants([]);
		setParticipantsError(null);

		// Debug
		console.log("ContactDrawer - contact:", contact);
		console.log("ContactDrawer - isGroup:", contact?.isGroup);
		console.log("ContactDrawer - open:", open);

		// Buscar participantes se for um grupo
		if (open && contact?.isGroup && contact?.id) {
			console.log("🔍 Buscando participantes do grupo:", contact.id);
			setLoadingParticipants(true);
			api.get(`/contacts/${contact.id}/participants`)
				.then(response => {
					console.log("✅ Participantes recebidos:", response.data);
					setGroupParticipants(response.data.participants || []);
					setParticipantsError(null);
				})
				.catch(error => {
					console.error("❌ Erro ao buscar participantes do grupo:", error);
					console.error("Detalhes do erro:", error.response?.data);
					setParticipantsError(error.response?.data?.message || error.message || "Erro ao buscar participantes");
				})
				.finally(() => {
					setLoadingParticipants(false);
				});
		}
	}, [open, contact]);

	return (
		<>
			<Drawer
				className={classes.drawer}
				variant="persistent"
				anchor="right"
				open={open}
				PaperProps={{ style: { position: "absolute" } }}
				BackdropProps={{ style: { position: "absolute" } }}
				ModalProps={{
					container: document.getElementById("drawer-container"),
					style: { position: "absolute" },
				}}
				classes={{
					paper: classes.drawerPaper,
				}}
			>
				<div className={classes.header}>
					<IconButton onClick={handleDrawerClose}>
						<CloseIcon />
					</IconButton>
					<Typography style={{ justifySelf: "center" }}>
						{i18n.t("contactDrawer.header")}
					</Typography>
				</div>
				{loading ? (
					<ContactDrawerSkeleton classes={classes} />
				) : (
					<div className={classes.content}>
						<Paper square variant="outlined" className={classes.contactHeader}>
							<CardHeader
								onClick={() => {}}
								style={{ cursor: "pointer", width: '100%' }}
								titleTypographyProps={{ noWrap: true }}
								subheaderTypographyProps={{ noWrap: true }}
								avatar={<Avatar src={contact.profilePicUrl} alt="contact_image" style={{ width: 60, height: 60 }} />}
								title={
									<>
										<Typography onClick={() => setOpenForm(true)}>
											{contact.name}
											<CreateIcon style={{fontSize: 16, marginLeft: 5}} />
										</Typography>
									</>
								}
								subheader={
									<>
										<Typography style={{fontSize: 12}}>
											<Link href={`tel:${contact.number}`}>{contact.number}</Link>
										</Typography>
										<Typography style={{fontSize: 12}}>
											<Link href={`mailto:${contact.email}`}>{contact.email}</Link>
										</Typography>
									</>
								}
							/>
							<Button
								variant="outlined"
								color="primary"
								onClick={() => setModalOpen(!openForm)}
								style={{fontSize: 12}}
							>
								{i18n.t("contactDrawer.buttons.edit")}
							</Button>
							{(contact.id && openForm) && <ContactForm initialContact={contact} onCancel={() => setOpenForm(false)} />}
						</Paper>
						<Paper square variant="outlined" className={classes.contactDetails}>
							<Typography variant="subtitle1" style={{marginBottom: 10}}>
								{i18n.t("ticketOptionsMenu.appointmentsModal.title")}
							</Typography>
							<ContactNotes ticket={ticket} />
						</Paper>
						<Paper square variant="outlined" className={classes.contactDetails}>
							<ContactModal
								open={modalOpen}
								onClose={() => setModalOpen(false)}
								contactId={contact.id}
							></ContactModal>
							<Typography variant="subtitle1">
								{i18n.t("contactDrawer.extraInfo")}
							</Typography>

							{/* Exibir participantes do grupo */}
							{contact?.isGroup && groupParticipants.length > 0 && (
								<Paper
									square
									variant="outlined"
									className={classes.contactExtraInfo}
								>
									<InputLabel>Participantes do Grupo ({groupParticipants.length})</InputLabel>
									<div style={{ paddingTop: 8, maxHeight: 300, overflowY: 'auto' }}>
										{groupParticipants.map((participant, index) => (
											<div
												key={participant.id || index}
												style={{
													paddingTop: 6,
													paddingBottom: 6,
													borderBottom: index < groupParticipants.length - 1 ? '1px solid rgba(0, 0, 0, 0.08)' : 'none',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'space-between'
												}}
											>
												<div style={{ flex: 1, minWidth: 0 }}>
													<Typography
														component="div"
														style={{
															fontSize: 14,
															fontWeight: 500,
															marginBottom: 2,
															overflow: 'hidden',
															textOverflow: 'ellipsis',
															whiteSpace: 'nowrap'
														}}
													>
														{participant.name}
													</Typography>
													<Typography
														component="div"
														style={{
															fontSize: 12,
															color: '#666'
														}}
													>
														<Link href={`tel:+${participant.number}`}>
															+{participant.number}
														</Link>
													</Typography>
												</div>
												{participant.isAdmin && (
													<span style={{
														fontSize: 11,
														color: '#4caf50',
														fontWeight: 'bold',
														marginLeft: 8,
														padding: '2px 8px',
														backgroundColor: '#e8f5e9',
														borderRadius: 4
													}}>
														Admin
													</span>
												)}
											</div>
										))}
									</div>
								</Paper>
							)}

							{loadingParticipants && contact?.isGroup && (
								<Paper
									square
									variant="outlined"
									className={classes.contactExtraInfo}
								>
									<Typography component="div" style={{ paddingTop: 8 }}>
										Carregando participantes...
									</Typography>
								</Paper>
							)}

							{participantsError && contact?.isGroup && (
								<Paper
									square
									variant="outlined"
									className={classes.contactExtraInfo}
									style={{ backgroundColor: '#ffebee' }}
								>
									<Typography component="div" style={{ paddingTop: 8, color: '#c62828' }}>
										❌ {participantsError}
									</Typography>
									<Typography component="div" style={{ paddingTop: 4, fontSize: 12, color: '#666' }}>
										Verifique o console do navegador para mais detalhes
									</Typography>
								</Paper>
							)}

							{contact?.extraInfo?.map(info => (
								<Paper
									key={info.id}
									square
									variant="outlined"
									className={classes.contactExtraInfo}
								>
									<InputLabel>{info.name}</InputLabel>
									<Typography component="div" noWrap style={{ paddingTop: 2 }}>
										<MarkdownWrapper>{info.value}</MarkdownWrapper>
									</Typography>
								</Paper>
							))}
						</Paper>
					</div>
				)}
			</Drawer>
		</>
	);
};

export default ContactDrawer;

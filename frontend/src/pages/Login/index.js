import React, { useState, useContext } from "react";
import { Link as RouterLink } from "react-router-dom";

import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid"; 
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import logo from "../../assets/logo.png";
import { LanguageOutlined } from "@material-ui/icons";
import { IconButton, Menu, MenuItem } from "@material-ui/core";
import LanguageControl from "../../components/LanguageControl";

// ✅ Importação do package.json no topo, antes de qualquer código
import config from "../../../package.json";
const { nomeEmpresa, versionSystem } = config;

const Copyright = () => {
	return (
		<Typography variant="body2" color="primary" align="center">
			{"Copyright "}
 			<Link color="primary" href="#">
 				{nomeEmpresa} - v {versionSystem}
 			</Link>{" "}
 			{new Date().getFullYear()}
 			{"."}
 		</Typography>
 	);
};

const useStyles = makeStyles(theme => ({
	root: {
		width: "100vw",
		height: "100vh",
		backgroundColor: theme.palette.primary.main,
		backgroundRepeat: "no-repeat",
		backgroundSize: "100% 100%",
		backgroundPosition: "center",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		textAlign: "center",
		position: "relative"
	},
	paper: {
		backgroundColor: theme.palette.login,
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		padding: "55px 30px",
		borderRadius: "12.5px",
	},
	form: {
		width: "100%",
		marginTop: theme.spacing(1),
	},
	submit: {
		margin: theme.spacing(3, 0, 2),
	},
	languageControl: {
		position: "absolute",
		top: 0,
		left: 0,
		paddingLeft: 15
	}
}));

const Login = () => {
	const classes = useStyles();
	const [user, setUser] = useState({ email: "", password: "" });

	// Controle de idiomas
	const [anchorElLanguage, setAnchorElLanguage] = useState(null);
	const [menuLanguageOpen, setMenuLanguageOpen] = useState(false);

	const { handleLogin } = useContext(AuthContext);

	const handleChangeInput = e => {
		setUser({ ...user, [e.target.name]: e.target.value });
	};

	const handleSubmit = e => {
		e.preventDefault();
		handleLogin(user);
	};

	const handleMenuLanguage = event => {
		setAnchorElLanguage(event.currentTarget);
		setMenuLanguageOpen(true);
	};

	const handleCloseMenuLanguage = () => {
		setAnchorElLanguage(null);
		setMenuLanguageOpen(false);
	};

	return (
		<div className={classes.root}>
			<div className={classes.languageControl}>
				<IconButton edge="start">
					<LanguageOutlined
						aria-label="language selector"
						aria-controls="menu-appbar"
						aria-haspopup="true"
						onClick={handleMenuLanguage}
						variant="contained"
						style={{ color: "white", marginRight: 10 }}
					/>
				</IconButton>
				<Menu
					id="menu-appbar-language"
					anchorEl={anchorElLanguage}
					getContentAnchorEl={null}
					anchorOrigin={{
						vertical: "bottom",
						horizontal: "right",
					}}
					transformOrigin={{
						vertical: "top",
						horizontal: "right",
					}}
					open={menuLanguageOpen}
					onClose={handleCloseMenuLanguage}
				>
					<MenuItem>
						<LanguageControl />
					</MenuItem>
				</Menu>
			</div>

			<Container component="main" maxWidth="xs">
				<CssBaseline />
				<div className={classes.paper}>
					<img style={{ margin: "0 auto", width: "70%" }} src={logo} alt="Logo" />
					<form className={classes.form} noValidate onSubmit={handleSubmit}>
						<TextField
							variant="outlined"
							margin="normal"
							required
							fullWidth
							id="email"
							label={i18n.t("login.form.email")}
							name="email"
							value={user.email}
							onChange={handleChangeInput}
							autoComplete="email"
							autoFocus
						/>
						<TextField
							variant="outlined"
							margin="normal"
							required
							fullWidth
							name="password"
							label={i18n.t("login.form.password")}
							type="password"
							id="password"
							value={user.password}
							onChange={handleChangeInput}
							autoComplete="current-password"
						/>

						<Button
							type="submit"
							fullWidth
							variant="contained"
							color="primary"
							className={classes.submit}
						>
							{i18n.t("login.buttons.submit")}
						</Button>

						<Grid container>
							<Grid item>
								<Link
									href="#"
									variant="body2"
									component={RouterLink}
									to="/signup"
								>
									{i18n.t("login.buttons.register")}
								</Link>
							</Grid>
						</Grid>
					</form>
				</div>
				<Box mt={8}><Copyright /></Box>
			</Container>
		</div>
	);
};

export default Login;

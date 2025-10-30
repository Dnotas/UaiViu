import React, { useState } from "react";
import * as Yup from "yup";
import { useHistory } from "react-router-dom";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { Formik, Form, Field } from "formik";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";
import Paper from "@material-ui/core/Paper";
import logo from "../../assets/logo.png";
import { i18n } from "../../translate/i18n";
import { openApi } from "../../services/api";
import toastError from "../../errors/toastError";

const Copyright = () => {
  return (
    <Typography variant="body2" color="textSecondary" align="center">
      {"Copyright © "}
      <Link color="inherit" href="#">
        UaiViu
      </Link>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
};

const useStyles = makeStyles((theme) => ({
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
  },
  paper: {
    backgroundColor: theme.palette.login,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 30px",
    borderRadius: "12.5px",
    maxWidth: "600px",
    width: "100%",
  },
  form: {
    width: "100%",
    marginTop: theme.spacing(2),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
  sectionTitle: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    fontWeight: "bold",
  },
}));

const CompanySignUpSchema = Yup.object().shape({
  activationToken: Yup.string().required("Token de ativação é obrigatório"),
  companyName: Yup.string()
    .min(2, "Nome da empresa muito curto")
    .required("Nome da empresa é obrigatório"),
  companyEmail: Yup.string()
    .email("Email inválido")
    .required("Email da empresa é obrigatório"),
  companyPhone: Yup.string().required("Telefone da empresa é obrigatório"),
  adminName: Yup.string()
    .min(2, "Nome do administrador muito curto")
    .required("Nome do administrador é obrigatório"),
  adminEmail: Yup.string()
    .email("Email inválido")
    .required("Email do administrador é obrigatório"),
  adminPassword: Yup.string()
    .min(6, "Senha deve ter no mínimo 6 caracteres")
    .required("Senha é obrigatória"),
  adminPasswordConfirm: Yup.string()
    .oneOf([Yup.ref("adminPassword"), null], "Senhas não conferem")
    .required("Confirmação de senha é obrigatória"),
});

const CompanySignUp = () => {
  const classes = useStyles();
  const history = useHistory();

  const initialValues = {
    activationToken: "",
    companyName: "",
    companyEmail: "",
    companyPhone: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    adminPasswordConfirm: "",
  };

  const handleSignUp = async (values) => {
    try {
      await openApi.post("/auth/signup-company", {
        activationToken: values.activationToken,
        companyName: values.companyName,
        companyEmail: values.companyEmail,
        companyPhone: values.companyPhone,
        adminName: values.adminName,
        adminEmail: values.adminEmail,
        adminPassword: values.adminPassword,
      });

      toast.success("Cadastro realizado com sucesso! Você já pode fazer login.");
      history.push("/login");
    } catch (err) {
      console.log(err);
      toastError(err);
    }
  };

  return (
    <div className={classes.root}>
      <Container component="main" maxWidth="sm">
        <CssBaseline />
        <div className={classes.paper}>
          <div>
            <img
              style={{ margin: "0 auto", width: "60%", marginBottom: "20px" }}
              src={logo}
              alt="Logo"
            />
          </div>
          <Typography component="h1" variant="h5" style={{ marginBottom: "10px" }}>
            Novo Assinante
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Preencha os dados abaixo para criar sua conta
          </Typography>

          <Formik
            initialValues={initialValues}
            validationSchema={CompanySignUpSchema}
            onSubmit={(values, actions) => {
              setTimeout(() => {
                handleSignUp(values);
                actions.setSubmitting(false);
              }, 400);
            }}
          >
            {({ touched, errors, isSubmitting }) => (
              <Form className={classes.form}>
                <Grid container spacing={2}>
                  {/* Token de Ativação */}
                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      name="activationToken"
                      variant="outlined"
                      fullWidth
                      label="Token de Ativação"
                      error={touched.activationToken && Boolean(errors.activationToken)}
                      helperText={touched.activationToken && errors.activationToken}
                      placeholder="Digite o token fornecido"
                    />
                  </Grid>

                  {/* Dados da Empresa */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" className={classes.sectionTitle}>
                      Dados da Empresa
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      name="companyName"
                      variant="outlined"
                      fullWidth
                      label="Nome da Empresa"
                      error={touched.companyName && Boolean(errors.companyName)}
                      helperText={touched.companyName && errors.companyName}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Field
                      as={TextField}
                      name="companyEmail"
                      variant="outlined"
                      fullWidth
                      label="Email da Empresa"
                      type="email"
                      error={touched.companyEmail && Boolean(errors.companyEmail)}
                      helperText={touched.companyEmail && errors.companyEmail}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Field
                      as={TextField}
                      name="companyPhone"
                      variant="outlined"
                      fullWidth
                      label="Telefone da Empresa"
                      error={touched.companyPhone && Boolean(errors.companyPhone)}
                      helperText={touched.companyPhone && errors.companyPhone}
                    />
                  </Grid>

                  {/* Dados do Administrador */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" className={classes.sectionTitle}>
                      Dados do Administrador
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      name="adminName"
                      variant="outlined"
                      fullWidth
                      label="Nome do Administrador"
                      error={touched.adminName && Boolean(errors.adminName)}
                      helperText={touched.adminName && errors.adminName}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      name="adminEmail"
                      variant="outlined"
                      fullWidth
                      label="Email do Administrador"
                      type="email"
                      error={touched.adminEmail && Boolean(errors.adminEmail)}
                      helperText={touched.adminEmail && errors.adminEmail}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Field
                      as={TextField}
                      name="adminPassword"
                      variant="outlined"
                      fullWidth
                      label="Senha"
                      type="password"
                      error={touched.adminPassword && Boolean(errors.adminPassword)}
                      helperText={touched.adminPassword && errors.adminPassword}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Field
                      as={TextField}
                      name="adminPasswordConfirm"
                      variant="outlined"
                      fullWidth
                      label="Confirmar Senha"
                      type="password"
                      error={
                        touched.adminPasswordConfirm &&
                        Boolean(errors.adminPasswordConfirm)
                      }
                      helperText={
                        touched.adminPasswordConfirm && errors.adminPasswordConfirm
                      }
                    />
                  </Grid>
                </Grid>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  className={classes.submit}
                  disabled={isSubmitting}
                >
                  Criar Conta
                </Button>

                <Grid container justify="center">
                  <Grid item>
                    <Link
                      href="#"
                      variant="body2"
                      component={RouterLink}
                      to="/login"
                    >
                      Já tem uma conta? Faça login
                    </Link>
                  </Grid>
                </Grid>
              </Form>
            )}
          </Formik>
        </div>
        <Box mt={3}>
          <Copyright />
        </Box>
      </Container>
    </div>
  );
};

export default CompanySignUp;

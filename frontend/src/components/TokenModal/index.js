import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  DialogActions,
  CircularProgress,
  TextField,
  Select,
  InputLabel,
  MenuItem,
  FormControl,
  Grid,
} from "@material-ui/core";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
  },

  btnWrapper: {
    position: "relative",
  },

  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
}));

const TokenSchema = Yup.object().shape({
  companyName: Yup.string()
    .min(2, "Nome muito curto")
    .required("Nome da empresa é obrigatório"),
  planId: Yup.number().required("Plano é obrigatório"),
  maxUsers: Yup.number().min(1).required("Máximo de usuários é obrigatório"),
  maxConnections: Yup.number().min(1).required("Máximo de conexões é obrigatório"),
  expiresInDays: Yup.number().min(0).nullable(),
});

const TokenModal = ({ open, onClose, tokenId }) => {
  const classes = useStyles();
  const [plans, setPlans] = useState([]);

  const initialState = {
    companyName: "",
    planId: "",
    maxUsers: 10,
    maxConnections: 3,
    expiresInDays: 30,
    notes: "",
  };

  const [token, setToken] = useState(initialState);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data } = await api.get("/plans/list");
        setPlans(data);
      } catch (err) {
        toastError(err);
      }
    };
    fetchPlans();
  }, []);

  const handleClose = () => {
    onClose();
    setToken(initialState);
  };

  const handleSaveToken = async (values) => {
    try {
      await api.post("/activation-tokens", values);
      toast.success("Token criado com sucesso!");
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        scroll="paper"
      >
        <DialogTitle id="form-dialog-title">
          Novo Token de Ativação
        </DialogTitle>
        <Formik
          initialValues={token}
          enableReinitialize={true}
          validationSchema={TokenSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveToken(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ touched, errors, isSubmitting, values }) => (
            <Form>
              <DialogContent dividers>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      label="Nome da Empresa"
                      autoFocus
                      name="companyName"
                      error={touched.companyName && Boolean(errors.companyName)}
                      helperText={touched.companyName && errors.companyName}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControl
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      error={touched.planId && Boolean(errors.planId)}
                    >
                      <InputLabel id="plan-selection-label">Plano</InputLabel>
                      <Field
                        as={Select}
                        label="Plano"
                        labelId="plan-selection-label"
                        name="planId"
                      >
                        <MenuItem value="">Selecione um plano</MenuItem>
                        {plans.map((plan) => (
                          <MenuItem key={plan.id} value={plan.id}>
                            {plan.name} - {plan.users} usuários - {plan.connections} conexões
                          </MenuItem>
                        ))}
                      </Field>
                    </FormControl>
                  </Grid>

                  <Grid item xs={6}>
                    <Field
                      as={TextField}
                      label="Máx. Usuários"
                      type="number"
                      name="maxUsers"
                      error={touched.maxUsers && Boolean(errors.maxUsers)}
                      helperText={touched.maxUsers && errors.maxUsers}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <Field
                      as={TextField}
                      label="Máx. Conexões"
                      type="number"
                      name="maxConnections"
                      error={
                        touched.maxConnections && Boolean(errors.maxConnections)
                      }
                      helperText={touched.maxConnections && errors.maxConnections}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      label="Dias para expirar (0 = nunca expira)"
                      type="number"
                      name="expiresInDays"
                      error={
                        touched.expiresInDays && Boolean(errors.expiresInDays)
                      }
                      helperText={touched.expiresInDays && errors.expiresInDays}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      label="Observações (opcional)"
                      name="notes"
                      variant="outlined"
                      margin="dense"
                      multiline
                      rows={3}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting}
                  variant="outlined"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting}
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  Criar Token
                  {isSubmitting && (
                    <CircularProgress
                      size={24}
                      className={classes.buttonProgress}
                    />
                  )}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default TokenModal;

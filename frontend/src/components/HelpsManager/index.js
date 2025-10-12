import React, { useState, useEffect } from "react";
import {
  makeStyles,
  Paper,
  Grid,
  TextField,
  Typography,
  Card,
  CardContent,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  IconButton,
} from "@material-ui/core";
import { Formik, Form, Field } from "formik";
import ButtonWithSpinner from "../ButtonWithSpinner";
import ConfirmationModal from "../ConfirmationModal";
import { Edit as EditIcon } from "@material-ui/icons";
import { toast } from "react-toastify";
import useHelps from "../../hooks/useHelps";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    width: "100%",
    padding: theme.spacing(3),
    backgroundColor: "#fafafa",
  },
  card: {
    width: "100%",
    borderRadius: 12,
    boxShadow: "0px 2px 8px rgba(0,0,0,0.08)",
    marginBottom: theme.spacing(3),
  },
  cardTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(1),
    color: theme.palette.primary.main,
  },
  formGrid: {
    marginTop: theme.spacing(2),
  },
  fullWidth: {
    width: "100%",
  },
  tableContainer: {
    borderRadius: 12,
    boxShadow: "0px 2px 8px rgba(0,0,0,0.05)",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  tableHeader: {
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    fontWeight: 600,
  },
  formButton: {
    marginTop: theme.spacing(1),
  },
}));

function extractYouTubeId(input) {
  if (!input || typeof input !== "string") return null;
  const value = input.trim();
  const possibleId = value.match(/^[A-Za-z0-9_-]{11}$/);
  if (possibleId) return possibleId[0];
  const watchMatch = value.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watchMatch && watchMatch[1]) return watchMatch[1];
  const shortMatch = value.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (shortMatch && shortMatch[1]) return shortMatch[1];
  const embedMatch = value.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
  if (embedMatch && embedMatch[1]) return embedMatch[1];
  const vMatch = value.match(/\/v\/([A-Za-z0-9_-]{11})/);
  if (vMatch && vMatch[1]) return vMatch[1];
  return null;
}

export function HelpManagerForm({ onSubmit, onDelete, onCancel, initialValue, loading }) {
  const classes = useStyles();
  const [record, setRecord] = useState(initialValue);

  useEffect(() => {
    setRecord(initialValue);
  }, [initialValue]);

  const handleSubmit = (data) => {
    const videoRaw = (data.video || "").trim();
    if (videoRaw.length > 0) {
      const ytId = extractYouTubeId(videoRaw);
      if (ytId) data.video = ytId;
    }
    onSubmit(data);
  };

  return (
    <Card className={classes.card}>
      <CardContent>
        <Typography variant="h6" className={classes.cardTitle}>
          {i18n.t("settings.helps.form.header", "Adicionar ou editar tutorial")}
        </Typography>
        <Divider />
        <Formik
          enableReinitialize
          initialValues={record}
          onSubmit={(values, { resetForm }) => {
            setTimeout(() => {
              handleSubmit(values);
              resetForm();
            }, 300);
          }}
        >
          {() => (
            <Form className={classes.formGrid}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Field
                    as={TextField}
                    label={i18n.t("settings.helps.form.title")}
                    name="title"
                    variant="outlined"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Field
                    as={TextField}
                    label={i18n.t("settings.helps.form.video")}
                    name="video"
                    variant="outlined"
                    fullWidth
                    helperText="Cole o link completo do vídeo (YouTube, KiwiFi, etc.)"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Field
                    as={TextField}
                    label={i18n.t("settings.helps.form.description")}
                    name="description"
                    variant="outlined"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={12} style={{ textAlign: "right" }}>
                  <ButtonWithSpinner
                    className={classes.formButton}
                    loading={loading}
                    onClick={onCancel}
                    variant="outlined"
                    style={{ marginRight: 10 }}
                  >
                    {i18n.t("settings.helps.buttons.clean")}
                  </ButtonWithSpinner>
                  {record.id && (
                    <ButtonWithSpinner
                      className={classes.formButton}
                      loading={loading}
                      onClick={() => onDelete(record)}
                      variant="contained"
                      color="secondary"
                      style={{ marginRight: 10 }}
                    >
                      {i18n.t("settings.helps.buttons.delete")}
                    </ButtonWithSpinner>
                  )}
                  <ButtonWithSpinner
                    className={classes.formButton}
                    loading={loading}
                    type="submit"
                    variant="contained"
                    color="primary"
                  >
                    {i18n.t("settings.helps.buttons.save")}
                  </ButtonWithSpinner>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      </CardContent>
    </Card>
  );
}

export function HelpsManagerGrid({ records, onSelect }) {
  const classes = useStyles();

  return (
    <Paper className={classes.tableContainer}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell className={classes.tableHeader} align="center">
              #
            </TableCell>
            <TableCell className={classes.tableHeader}>Título</TableCell>
            <TableCell className={classes.tableHeader}>Descrição</TableCell>
            <TableCell className={classes.tableHeader}>Link/Vídeo</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell align="center">
                <IconButton onClick={() => onSelect(row)} size="small">
                  <EditIcon color="primary" />
                </IconButton>
              </TableCell>
              <TableCell>{row.title || "-"}</TableCell>
              <TableCell>{row.description || "-"}</TableCell>
              <TableCell style={{ color: "#1976d2", fontWeight: 500 }}>
                {row.video || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

export default function HelpsManager() {
  const classes = useStyles();
  const { list, save, update, remove } = useHelps();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [record, setRecord] = useState({ title: "", description: "", video: "" });

  useEffect(() => {
    loadHelps();
  }, []);

  const loadHelps = async () => {
    setLoading(true);
    try {
      const helpList = await list();
      setRecords(helpList);
    } catch {
      toast.error(i18n.t("settings.helps.toasts.errorList"));
    }
    setLoading(false);
  };

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      if (data.id) await update(data);
      else await save(data);
      await loadHelps();
      handleCancel();
      toast.success(i18n.t("settings.helps.toasts.success"));
    } catch {
      toast.error(i18n.t("settings.helps.toasts.error"));
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await remove(record.id);
      await loadHelps();
      handleCancel();
      toast.success(i18n.t("settings.helps.toasts.success"));
    } catch {
      toast.error(i18n.t("settings.helps.toasts.errorOperation"));
    }
    setLoading(false);
  };

  const handleCancel = () => setRecord({ title: "", description: "", video: "" });
  const handleSelect = (data) => setRecord(data);
  const handleOpenDeleteDialog = () => setShowConfirmDialog(true);

  return (
    <Paper className={classes.mainPaper} elevation={0}>
      <HelpManagerForm
        initialValue={record}
        onDelete={handleOpenDeleteDialog}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
      />
      <HelpsManagerGrid records={records} onSelect={handleSelect} />
      <ConfirmationModal
        title={i18n.t("settings.helps.confirmModal.title")}
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={() => handleDelete()}
      >
        {i18n.t("settings.helps.confirmModal.confirm")}
      </ConfirmationModal>
    </Paper>
  );
}

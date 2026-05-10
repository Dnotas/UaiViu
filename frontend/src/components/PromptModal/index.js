import React, { useState, useEffect, useRef } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green, red } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import { i18n } from "../../translate/i18n";
import { MenuItem, FormControl, InputLabel, Select, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton as MuiIconButton, Typography, Divider } from "@material-ui/core";
import { Visibility, VisibilityOff, CloudUpload, Delete, InsertDriveFile } from "@material-ui/icons";
import { InputAdornment, IconButton } from "@material-ui/core";
import QueueSelectSingle from "../../components/QueueSelectSingle";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
    root: {
        display: "flex",
        flexWrap: "wrap",
    },
    multFieldLine: {
        display: "flex",
        "& > *:not(:last-child)": {
            marginRight: theme.spacing(1),
        },
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
    colorAdorment: {
        width: 20,
        height: 20,
    },
    uploadSection: {
        marginTop: theme.spacing(2),
        padding: theme.spacing(2),
        border: `1px dashed ${theme.palette.divider}`,
        borderRadius: 4,
    },
    uploadButton: {
        marginTop: theme.spacing(1),
    },
    fileList: {
        marginTop: theme.spacing(1),
    },
    fileItem: {
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 4,
        marginBottom: theme.spacing(0.5),
    },
    deleteFileBtn: {
        color: red[500],
    },
}));

const PromptSchema = Yup.object().shape({
    name: Yup.string().min(5, i18n.t("promptModal.formErrors.name.short")).max(100, i18n.t("promptModal.formErrors.name.long")).required(i18n.t("promptModal.formErrors.name.required")),
    prompt: Yup.string().min(50, i18n.t("promptModal.formErrors.prompt.short")).required(i18n.t("promptModal.formErrors.prompt.required")),
    model: Yup.string().required(i18n.t("promptModal.formErrors.modal.required")),
    maxTokens: Yup.number().required(i18n.t("promptModal.formErrors.maxTokens.required")),
    temperature: Yup.number().required(i18n.t("promptModal.formErrors.temperature.required")),
    apiKey: Yup.string().required(i18n.t("promptModal.formErrors.apikey.required")),
    queueId: Yup.number().required(i18n.t("promptModal.formErrors.queueId.required")),
    maxMessages: Yup.number().required(i18n.t("promptModal.formErrors.maxMessages.required"))
});

const PromptModal = ({ open, onClose, promptId, refreshPrompts }) => {
    const classes = useStyles();
    const [selectedModel, setSelectedModel] = useState("gpt-3.5-turbo-1106");
    const [showApiKey, setShowApiKey] = useState(false);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [uploadingFile, setUploadingFile] = useState(false);
    const fileInputRef = useRef(null);

    const handleToggleApiKey = () => {
        setShowApiKey(!showApiKey);
    };

    const initialState = {
        name: "",
        prompt: "",
        model: "gpt-3.5-turbo-1106",
        maxTokens: 100,
        temperature: 1,
        apiKey: "",
        queueId: '',
        maxMessages: 10
    };

    const [prompt, setPrompt] = useState(initialState);

    useEffect(() => {
        const fetchPrompt = async () => {
            if (!promptId) {
                setPrompt(initialState);
                setMediaFiles([]);
                return;
            }
            try {
                const { data } = await api.get(`/prompt/${promptId}`);
                setPrompt(prevState => {
                    return { ...prevState, ...data };
                });
                setSelectedModel(data.model);
                setMediaFiles(data.mediaFiles || []);
            } catch (err) {
                toastError(err);
            }
        };

        fetchPrompt();
    }, [promptId, open]);

    const handleClose = () => {
        setPrompt(initialState);
        setSelectedModel("gpt-3.5-turbo-1106");
        setMediaFiles([]);
        onClose();
    };

    const handleChangeModel = (e) => {
        setSelectedModel(e.target.value);
    };

    const handleSavePrompt = async values => {
        const promptData = { ...values, model: selectedModel };
        if (!values.queueId) {
            toastError(i18n.t("promptModal.setor"));
            return;
        }
        try {
            if (promptId) {
                await api.put(`/prompt/${promptId}`, promptData);
            } else {
                await api.post("/prompt", promptData);
            }
            toast.success(i18n.t("promptModal.success"));
            refreshPrompts();
        } catch (err) {
            toastError(err);
        }
        handleClose();
    };

    const handleFileUpload = async (e) => {
        if (!promptId) {
            toast.warning("Salve o prompt primeiro antes de adicionar arquivos.");
            return;
        }
        const file = e.target.files[0];
        if (!file) return;

        setUploadingFile(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("typeArch", "prompt");
        formData.append("fileId", String(promptId));

        try {
            const { data } = await api.post(`/prompt/${promptId}/media`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setMediaFiles(data.mediaFiles || []);
            toast.success("Arquivo enviado com sucesso!");
        } catch (err) {
            toastError(err);
        }
        setUploadingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDeleteFile = async (fileName) => {
        if (!promptId) return;
        try {
            const { data } = await api.delete(`/prompt/${promptId}/media/${fileName}`);
            setMediaFiles(data.mediaFiles || []);
            toast.success("Arquivo removido.");
        } catch (err) {
            toastError(err);
        }
    };

    const getFileDisplayName = (file) => file.name || file.path?.split("/").pop() || "arquivo";

    return (
        <div className={classes.root}>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="md"
                scroll="paper"
                fullWidth
            >
                <DialogTitle id="form-dialog-title">
                    {promptId
                        ? `${i18n.t("promptModal.title.edit")}`
                        : `${i18n.t("promptModal.title.add")}`}
                </DialogTitle>
                <Formik
                    initialValues={prompt}
                    enableReinitialize={true}
                    validationSchema={PromptSchema}
                    onSubmit={(values, actions) => {
                        setTimeout(() => {
                            handleSavePrompt(values);
                            actions.setSubmitting(false);
                        }, 400);
                    }}
                >
                    {({ touched, errors, isSubmitting, values }) => (
                        <Form style={{ width: "100%" }}>
                            <DialogContent dividers>
                                <Field
                                    as={TextField}
                                    label={i18n.t("promptModal.form.name")}
                                    name="name"
                                    error={touched.name && Boolean(errors.name)}
                                    helperText={touched.name && errors.name}
                                    variant="outlined"
                                    margin="dense"
                                    fullWidth
                                />
                                <FormControl fullWidth margin="dense" variant="outlined">
                                    <Field
                                        as={TextField}
                                        label={i18n.t("promptModal.form.apikey")}
                                        name="apiKey"
                                        type={showApiKey ? 'text' : 'password'}
                                        error={touched.apiKey && Boolean(errors.apiKey)}
                                        helperText={touched.apiKey && errors.apiKey}
                                        variant="outlined"
                                        margin="dense"
                                        fullWidth
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton onClick={handleToggleApiKey}>
                                                        {showApiKey ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </FormControl>
                                <Field
                                    as={TextField}
                                    label={i18n.t("promptModal.form.prompt")}
                                    name="prompt"
                                    error={touched.prompt && Boolean(errors.prompt)}
                                    helperText={touched.prompt && errors.prompt}
                                    variant="outlined"
                                    margin="dense"
                                    fullWidth
                                    rows={10}
                                    multiline={true}
                                />
                                <QueueSelectSingle touched={touched} errors={errors}/>
                                <div className={classes.multFieldLine}>
                                    <FormControl fullWidth margin="dense" variant="outlined">
                                    <InputLabel>{i18n.t("promptModal.form.model")}</InputLabel>
                                        <Select
                                            id="type-select"
                                            labelWidth={60}
                                            name="model"
                                            value={selectedModel}
                                            onChange={handleChangeModel}
                                            multiple={false}
                                        >
                                            <MenuItem key={"gpt-3.5"} value={"gpt-3.5-turbo-1106"}>
                                                GPT 3.5 turbo
                                            </MenuItem>
                                            <MenuItem key={"gpt-4"} value={"gpt-4o-mini"}>
                                                GPT 4.0
                                            </MenuItem>
                                        </Select>
                                    </FormControl>
                                    <Field
                                        as={TextField}
                                        label={i18n.t("promptModal.form.temperature")}
                                        name="temperature"
                                        error={touched.temperature && Boolean(errors.temperature)}
                                        helperText={touched.temperature && errors.temperature}
                                        variant="outlined"
                                        margin="dense"
                                        fullWidth
                                        type="number"
                                        inputProps={{
                                            step: "0.1",
                                            min: "0",
                                            max: "1"
                                        }}
                                    />
                                </div>

                                <div className={classes.multFieldLine}>
                                    <Field
                                        as={TextField}
                                        label={i18n.t("promptModal.form.max_tokens")}
                                        name="maxTokens"
                                        error={touched.maxTokens && Boolean(errors.maxTokens)}
                                        helperText={touched.maxTokens && errors.maxTokens}
                                        variant="outlined"
                                        margin="dense"
                                        fullWidth
                                    />
                                    <Field
                                        as={TextField}
                                        label={i18n.t("promptModal.form.max_messages")}
                                        name="maxMessages"
                                        error={touched.maxMessages && Boolean(errors.maxMessages)}
                                        helperText={touched.maxMessages && errors.maxMessages}
                                        variant="outlined"
                                        margin="dense"
                                        fullWidth
                                    />
                                </div>

                                <Divider style={{ marginTop: 16, marginBottom: 8 }} />
                                <div className={classes.uploadSection}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Arquivos da IA (cardápio, PDF, imagens)
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        {promptId
                                            ? "Adicione arquivos que a IA poderá enviar aos clientes (PDFs, imagens, cardápio, etc.)"
                                            : "Salve o prompt primeiro para poder adicionar arquivos."}
                                    </Typography>

                                    {promptId && (
                                        <>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                style={{ display: "none" }}
                                                accept="image/*,.pdf"
                                                onChange={handleFileUpload}
                                            />
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                startIcon={uploadingFile ? <CircularProgress size={16} /> : <CloudUpload />}
                                                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                                disabled={uploadingFile}
                                                className={classes.uploadButton}
                                            >
                                                {uploadingFile ? "Enviando..." : "Adicionar arquivo"}
                                            </Button>

                                            {mediaFiles.length > 0 && (
                                                <List dense className={classes.fileList}>
                                                    {mediaFiles.map((file, idx) => {
                                                        const displayName = getFileDisplayName(file);
                                                        const fileName = file.path?.split("/").pop();
                                                        return (
                                                            <ListItem key={idx} className={classes.fileItem}>
                                                                <InsertDriveFile style={{ marginRight: 8, color: "#1976d2" }} />
                                                                <ListItemText
                                                                    primary={displayName}
                                                                    secondary={file.mimetype}
                                                                    primaryTypographyProps={{ noWrap: true, style: { maxWidth: 400 } }}
                                                                />
                                                                <ListItemSecondaryAction>
                                                                    <MuiIconButton
                                                                        edge="end"
                                                                        size="small"
                                                                        className={classes.deleteFileBtn}
                                                                        onClick={() => handleDeleteFile(fileName)}
                                                                    >
                                                                        <Delete fontSize="small" />
                                                                    </MuiIconButton>
                                                                </ListItemSecondaryAction>
                                                            </ListItem>
                                                        );
                                                    })}
                                                </List>
                                            )}

                                            {mediaFiles.length === 0 && (
                                                <Typography variant="caption" display="block" style={{ marginTop: 8, color: "#999" }}>
                                                    Nenhum arquivo adicionado ainda.
                                                </Typography>
                                            )}
                                        </>
                                    )}
                                </div>
                            </DialogContent>
                            <DialogActions>
                                <Button
                                    onClick={handleClose}
                                    color="secondary"
                                    disabled={isSubmitting}
                                    variant="outlined"
                                >
                                    {i18n.t("promptModal.buttons.cancel")}
                                </Button>
                                <Button
                                    type="submit"
                                    color="primary"
                                    disabled={isSubmitting}
                                    variant="contained"
                                    className={classes.btnWrapper}
                                >
                                    {promptId
                                        ? `${i18n.t("promptModal.buttons.okEdit")}`
                                        : `${i18n.t("promptModal.buttons.okAdd")}`}
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

export default PromptModal;

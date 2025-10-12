import React, { useState, useEffect, useReducer, useCallback, useContext } from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import ScheduleModal from "../../components/ScheduleModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { SocketContext } from "../../context/Socket/SocketContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Calendar } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import SearchIcon from "@material-ui/icons/Search";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import { Dialog, DialogTitle, DialogContent, DialogActions, MenuItem } from "@material-ui/core";
import "./Schedules.css";
import { createMomentLocalizer } from "../../translate/calendar-locale";

// -------- util data/hora
const localizer = createMomentLocalizer();
const fmtDateTime = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "short",
  timeStyle: "short",
});

// -------- helpers
function getUrlParam(paramName) {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(paramName);
}

const eventTitleStyle = {
  fontSize: "14px",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

const defaultMessages = {
  date: i18n.t("schedules.messages.date"),
  time: i18n.t("schedules.messages.time"),
  event: i18n.t("schedules.messages.event"),
  allDay: i18n.t("schedules.messages.allDay"),
  week: i18n.t("schedules.messages.week"),
  work_week: i18n.t("schedules.messages.work_week"),
  day: i18n.t("schedules.messages.day"),
  month: i18n.t("schedules.messages.month"),
  previous: i18n.t("schedules.messages.previous"),
  next: i18n.t("schedules.messages.next"),
  yesterday: i18n.t("schedules.messages.yesterday"),
  tomorrow: i18n.t("schedules.messages.tomorrow"),
  today: i18n.t("schedules.messages.today"),
  agenda: i18n.t("schedules.messages.agenda"),
  noEventsInRange: i18n.t("schedules.messages.noEventsInRange"),
  showMore: (total) => "+" + total + " " + i18n.t("schedules.messages.showMore"),
};

// -------- reducer (inalterado)
const reducer = (state, action) => {
  if (action.type === "LOAD_SCHEDULES") return [...state, ...action.payload];
  if (action.type === "UPDATE_SCHEDULES") {
    const schedule = action.payload;
    const idx = state.findIndex((s) => s.id === schedule.id);
    if (idx !== -1) {
      state[idx] = schedule;
      return [...state];
    }
    return [schedule, ...state];
  }
  if (action.type === "DELETE_SCHEDULE") {
    const scheduleId = action.payload;
    return state.filter((s) => s.id !== scheduleId);
  }
  if (action.type === "RESET") return [];
  return state;
};

// -------- estilos
const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  tagDot: {
    display: "inline-block",
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 6,
  },
  headerRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
}));

// -------- storage de tarefas pessoais (sem backend)
const PERSONAL_STORE_KEY = "personal_tasks_v1";

// -------- paleta de tags (cores sofisticadas)
const TAG_COLORS = [
  { value: "#EF4444", label: "Alta (Vermelho)" },
  { value: "#F59E0B", label: "Média (Âmbar)" },
  { value: "#10B981", label: "Baixa (Verde)" },
  { value: "#3B82F6", label: "Info (Azul)" },
  { value: "#8B5CF6", label: "Especial (Roxo)" },
];

const Schedules = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);
  const socketManager = useContext(SocketContext);

  // -------- estado original (schedules para CONTATOS)
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [deletingSchedule, setDeletingSchedule] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [schedules, dispatch] = useReducer(reducer, []);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [contactId, setContactId] = useState(+getUrlParam("contactId"));

  // -------- estado novo (tarefas pessoais, sem backend)
  const [personalTasks, setPersonalTasks] = useState([]);
  const [personalModalOpen, setPersonalModalOpen] = useState(false);
  const [personalEditingId, setPersonalEditingId] = useState(null);
  const [personalTitle, setPersonalTitle] = useState("");
  const [personalDescription, setPersonalDescription] = useState("");
  const [personalDueAt, setPersonalDueAt] = useState("");
  const [personalTagColor, setPersonalTagColor] = useState(TAG_COLORS[2].value); // default: Verde (Baixa)

  // -------- carregar/salvar tarefas pessoais
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSONAL_STORE_KEY);
      if (raw) setPersonalTasks(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PERSONAL_STORE_KEY, JSON.stringify(personalTasks));
    } catch {}
  }, [personalTasks]);

  // -------- API schedules (CONTATOS)
  const fetchSchedules = useCallback(async () => {
    try {
      const { data } = await api.get("/schedules/", {
        params: { searchParam, pageNumber },
      });
      dispatch({ type: "LOAD_SCHEDULES", payload: data.schedules });
      setHasMore(data.hasMore);
      setLoading(false);
    } catch (err) {
      toastError(err);
    }
  }, [searchParam, pageNumber]);

  const handleOpenScheduleModalFromContactId = useCallback(() => {
    if (contactId) handleOpenScheduleModal();
  }, [contactId]);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => fetchSchedules(), 500);
    return () => clearTimeout(t);
  }, [searchParam, pageNumber, contactId, fetchSchedules, handleOpenScheduleModalFromContactId]);

  useEffect(() => {
    handleOpenScheduleModalFromContactId();
    const socket = socketManager.getSocket(user.companyId);
    socket.on(`company${user.companyId}-schedule`, (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_SCHEDULES", payload: data.schedule });
      }
      if (data.action === "delete") {
        dispatch({ type: "DELETE_SCHEDULE", payload: +data.scheduleId });
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [handleOpenScheduleModalFromContactId, socketManager, user]);

  // -------- handlers schedules (CONTATOS)
  const cleanContact = () => setContactId("");

  const handleOpenScheduleModal = () => {
    setSelectedSchedule(null);
    setScheduleModalOpen(true);
  };

  const handleCloseScheduleModal = () => {
    setSelectedSchedule(null);
    setScheduleModalOpen(false);
  };

  const handleSearch = (event) => setSearchParam(event.target.value.toLowerCase());

  const handleEditSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setScheduleModalOpen(true);
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await api.delete(`/schedules/${scheduleId}`);
      toast.success(i18n.t("schedules.toasts.deleted") || "Excluído com sucesso");
    } catch (err) {
      toastError(err);
    }
    setDeletingSchedule(null);
    setSearchParam("");
    setPageNumber(1);
    dispatch({ type: "RESET" });
    await fetchSchedules();
  };

  const loadMore = () => setPageNumber((prev) => prev + 1);

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) loadMore();
  };

  // -------- handlers tarefas pessoais
  const openPersonalModal = (presetDateISO) => {
    setPersonalEditingId(null);
    setPersonalTitle("");
    setPersonalDescription("");
    setPersonalDueAt(presetDateISO || "");
    setPersonalTagColor(TAG_COLORS[2].value);
    setPersonalModalOpen(true);
  };

  const startEditPersonal = (task) => {
    setPersonalEditingId(task.id);
    setPersonalTitle(task.title);
    setPersonalDescription(task.description || "");
    setPersonalDueAt(task.dueAt ? task.dueAt.slice(0, 16) : "");
    setPersonalTagColor(task.tagColor || TAG_COLORS[2].value);
    setPersonalModalOpen(true);
  };

  const savePersonal = () => {
    const title = personalTitle.trim();
    if (!title) {
      toast.error("Informe um título.");
      return;
    }
    if (personalEditingId) {
      setPersonalTasks((prev) =>
        prev.map((t) =>
          t.id === personalEditingId
            ? {
                ...t,
                title,
                description: personalDescription || "",
                dueAt: personalDueAt || null,
                tagColor: personalTagColor,
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
      toast.success("Tarefa pessoal atualizada.");
    } else {
      const id =
        (typeof crypto !== "undefined" && crypto.randomUUID)
          ? crypto.randomUUID()
          : "id-" + Math.random().toString(36).slice(2) + Date.now();
      setPersonalTasks((prev) => [
        ...prev,
        {
          id,
          title,
          description: personalDescription || "",
          dueAt: personalDueAt || null,
          tagColor: personalTagColor,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
      toast.success("Tarefa pessoal criada.");
    }
    setPersonalModalOpen(false);
  };

  const deletePersonal = (id) => {
    setPersonalTasks((prev) => prev.filter((t) => t.id !== id));
    toast.success("Tarefa pessoal excluída.");
    setPersonalModalOpen(false);
  };

  // -------- eventos do calendário (mescla CONTATOS + PESSOAIS)
  const events = [
    // tarefas para contatos (do backend)
    ...schedules.map((schedule) => ({
      _kind: "contact",
      id: "sched-" + schedule.id,
      raw: schedule,
      title: (
        <div className="event-container">
          <div style={eventTitleStyle}>
            {/* nome do contato */}
            {schedule?.contact?.name || i18n.t("schedules.messages.event") || "Evento"}
          </div>
          <DeleteOutlineIcon
            onClick={(e) => {
              e.stopPropagation();
              setDeletingSchedule(schedule);
              setConfirmModalOpen(true);
            }}
            className="delete-icon"
            titleAccess="Excluir"
          />
          <EditIcon
            onClick={(e) => {
              e.stopPropagation();
              handleEditSchedule(schedule);
              setScheduleModalOpen(true);
            }}
            className="edit-icon"
            titleAccess="Editar"
          />
        </div>
      ),
      start: new Date(schedule.sendAt),
      end: new Date(schedule.sendAt),
    })),
    // tarefas pessoais (local)
    ...personalTasks.map((t) => ({
      _kind: "personal",
      id: "pers-" + t.id,
      raw: t,
      title: (
        <div className="event-container">
          <span className="tag-dot" style={{ background: t.tagColor }} />
          <div style={eventTitleStyle}>{t.title}</div>
          <DeleteOutlineIcon
            onClick={(e) => {
              e.stopPropagation();
              deletePersonal(t.id);
            }}
            className="delete-icon"
            titleAccess="Excluir"
          />
          <EditIcon
            onClick={(e) => {
              e.stopPropagation();
              startEditPersonal(t);
            }}
            className="edit-icon"
            titleAccess="Editar"
          />
        </div>
      ),
      start: t.dueAt ? new Date(t.dueAt) : new Date(), // fallback
      end: t.dueAt ? new Date(t.dueAt) : new Date(),
    })),
  ];

  // -------- clique no evento: abre o modal correto
  const onSelectEvent = (evt) => {
    if (evt._kind === "personal") {
      startEditPersonal(evt.raw);
    } else {
      handleEditSchedule(evt.raw);
    }
  };

  // -------- clique no dia vazio: abrir “Nova tarefa pessoal” com data
  const onSelectSlot = ({ start }) => {
    const d = new Date(start);
    // pré-preencher datetime-local como YYYY-MM-DDTHH:mm
    const iso = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0) // 09:00
      .toISOString()
      .slice(0, 16);
    openPersonalModal(iso);
  };

  // -------- UI
  return (
    <MainContainer>
      {/* Confirmação de EXCLUSÃO de schedule (contato) */}
      <ConfirmationModal
        title={deletingSchedule && (i18n.t("schedules.confirmationModal.deleteTitle") || "Excluir?")}
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => handleDeleteSchedule(deletingSchedule.id)}
      >
        {i18n.t("schedules.confirmationModal.deleteMessage") || "Essa ação não poderá ser desfeita."}
      </ConfirmationModal>

      {/* Modal original (CONTATOS) */}
      <ScheduleModal
        open={scheduleModalOpen}
        onClose={handleCloseScheduleModal}
        reload={fetchSchedules}
        aria-labelledby="form-dialog-title"
        scheduleId={selectedSchedule && selectedSchedule.id}
        contactId={contactId}
        cleanContact={() => setContactId("")}
      />

      {/* Cabeçalho — renomeado para TAREFAS e com 2 botões */}
      <MainHeader>
        <div className={classes.headerRow}>
          <Title>{i18n.t("tasks.title") || "Tarefas"} ({schedules.length + personalTasks.length})</Title>
        </div>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={i18n.t("contacts.searchPlaceholder") || "Buscar..."}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "gray" }} />
                </InputAdornment>
              ),
            }}
          />
          {/* Botão tarefas para CONTATOS (mantém ScheduleModal) */}
          <Button variant="contained" color="primary" onClick={handleOpenScheduleModal}>
            {i18n.t("tasks.buttons.addContact") || "Nova tarefa"}
          </Button>
          {/* Botão tarefas PESSOAIS (localStorage) */}
          <Button variant="outlined" color="primary" onClick={() => openPersonalModal()}>
            {i18n.t("tasks.buttons.addPersonal") || "Nova tarefa pessoal"}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      {/* Calendário — agora “selectable” para clicar no dia */}
      <Paper className={classes.mainPaper} variant="outlined" onScroll={handleScroll}>
        <Calendar
          messages={defaultMessages}
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 500 }}
          selectable
          onSelectEvent={onSelectEvent}
          onSelectSlot={onSelectSlot}
          popup
        />
      </Paper>

      {/* Modal simples para TAREFAS PESSOAIS */}
      <Dialog
        open={personalModalOpen}
        onClose={() => setPersonalModalOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="personal-task-modal-title"
      >
        <DialogTitle id="personal-task-modal-title">
          {personalEditingId ? "Editar tarefa pessoal" : "Nova tarefa pessoal"}
        </DialogTitle>
        <DialogContent dividers>
          <div style={{ display: "grid", gap: 12 }}>
            <TextField
              label="Título"
              variant="outlined"
              fullWidth
              value={personalTitle}
              onChange={(e) => setPersonalTitle(e.target.value)}
              autoFocus
            />
            <TextField
              label="Descrição"
              variant="outlined"
              fullWidth
              multiline
              minRows={3}
              value={personalDescription}
              onChange={(e) => setPersonalDescription(e.target.value)}
            />
            <TextField
              type="datetime-local"
              label="Prazo"
              variant="outlined"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={personalDueAt}
              onChange={(e) => setPersonalDueAt(e.target.value)}
            />
            <TextField
              select
              label="Tag / Importância"
              variant="outlined"
              fullWidth
              value={personalTagColor}
              onChange={(e) => setPersonalTagColor(e.target.value)}
            >
              {TAG_COLORS.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  <span className={classes.tagDot} style={{ background: c.value }} />
                  {c.label}
                </MenuItem>
              ))}
            </TextField>
          </div>
        </DialogContent>
        <DialogActions>
          {personalEditingId && (
            <Button onClick={() => deletePersonal(personalEditingId)} style={{ marginRight: "auto" }} color="secondary">
              Excluir
            </Button>
          )}
          <Button onClick={() => setPersonalModalOpen(false)}>Cancelar</Button>
          <Button color="primary" variant="contained" onClick={savePersonal}>
            {personalEditingId ? "Salvar" : "Criar"}
          </Button>
        </DialogActions>
      </Dialog>
    </MainContainer>
  );
};

export default Schedules;

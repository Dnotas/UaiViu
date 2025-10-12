import React, { useState, useEffect, useContext } from "react";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import Board from "react-trello";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import { useHistory } from "react-router-dom";

// ---------- Estilos suaves + viewport fixo com scroll ----------
const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    padding: theme.spacing(1),
    backgroundColor: "#f7f8fa",
  },
  viewport: {
    // ocupa a tela e mantém a barra de scroll sempre visível
    height: "calc(100vh - 120px)", // ajuste se tiver header/footer
    minHeight: 500,
    overflowX: "auto",
    overflowY: "auto",
    borderRadius: 8,
    background: "#fff",
    boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
  },
  button: {
    background: "#4caf50",
    border: "none",
    padding: "8px 14px",
    color: "white",
    fontWeight: 500,
    borderRadius: 6,
    cursor: "pointer",
    transition: "background 0.2s ease",
    "&:hover": {
      background: "#45a049",
    },
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 10,
    margin: "6px 0",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  },
}));

// ---------- Cabeçalho customizado da coluna (pinta com a cor da tag) ----------
const CustomLaneHeader = (props) => {
  const {
    title,
    label,
    // lane id e custom props que mandamos no objeto da lane:
    id,
    tagColor, // vamos injetar isso em cada lane
  } = props;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        background: tagColor || "#e9eef5",
        color: "#111827",
        fontWeight: 600,
        fontSize: 14,
      }}
    >
      <span style={{ opacity: 0.9 }}>{title}</span>
      {label ? (
        <span
          style={{
            fontSize: 12,
            background: "rgba(255,255,255,0.6)",
            padding: "2px 8px",
            borderRadius: 999,
            color: "#111827",
          }}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
};

const Kanban = () => {
  const classes = useStyles();
  const history = useHistory();

  const [tags, setTags] = useState([]);
  const [file, setFile] = useState({ lanes: [] });
  const [tickets, setTickets] = useState([]);

  const { user } = useContext(AuthContext);
  const { profile } = user;
  const jsonString = user.queues.map((queue) => queue.UserQueue.queueId);

  const fetchTags = async () => {
    try {
      const response = await api.get("/tags/kanban");
      const fetchedTags = response.data.lista ?? [];
      setTags(fetchedTags);
      await fetchTickets(jsonString);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchTickets = async (queueIds) => {
    try {
      const { data } = await api.get("/ticket/kanban", {
        params: {
          queueIds: JSON.stringify(queueIds),
          showAll: profile === "admin",
        },
      });
      setTickets(data.tickets);
    } catch (err) {
      console.log(err);
      setTickets([]);
    }
  };

  useEffect(() => {
    fetchTags(); // carrega tags e na sequência tickets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCardClick = (uuid) => {
    history.push("/tickets/" + uuid);
  };

  // ---------- Monta as colunas (lanes) ----------
  const popularCards = (queueIds) => {
    // tickets sem tag -> coluna "Abertos"
    const filteredTickets = tickets.filter((ticket) => ticket.tags.length === 0);

    const lanes = [
      {
        id: "lane0",
        title: i18n.t("kanban.open"),
        label: filteredTickets.length.toString(),
        // cor do cabeçalho dessa coluna (fixa e discreta)
        tagColor: "#e5e7eb",
        // estilo do corpo da coluna (fundo claro e bordas suaves)
        style: { backgroundColor: "#f8fafc", borderRadius: 8 },
        cards: filteredTickets.map((ticket) => ({
          id: ticket.id.toString(),
          label: "Ticket nº " + ticket.id.toString(),
          title: ticket.contact.name,
          description: (
            <div className={classes.card}>
              <p style={{ marginTop: 0, marginBottom: 10 }}>
                {ticket.contact.number}
                <br />
                {ticket.lastMessage}
              </p>
              <button
                className={classes.button}
                onClick={() => handleCardClick(ticket.uuid)}
              >
                {i18n.t("kanban.seeTicket")}
              </button>
            </div>
          ),
          draggable: true,
          href: "/tickets/" + ticket.uuid,
        })),
      },

      // colunas por tag, com cabeçalho na cor da própria tag
      ...tags.map((tag) => {
        const tagsTickets = tickets.filter((ticket) => {
          const tagIds = ticket.tags.map((t) => t.id);
          return tagIds.includes(tag.id);
        });

        return {
          id: tag.id.toString(),
          title: tag.name,
          label: tagsTickets.length.toString(),
          tagColor: tag.color, // <<< cabeçalho recebe a cor da tag
          style: { backgroundColor: "#f8fafc", borderRadius: 8 },
          cards: tagsTickets.map((ticket) => ({
            id: ticket.id.toString(),
            label: "Ticket nº " + ticket.id.toString(),
            title: ticket.contact.name,
            description: (
              <div className={classes.card}>
                <p style={{ marginTop: 0, marginBottom: 10 }}>
                  {ticket.contact.number}
                  <br />
                  {ticket.lastMessage}
                </p>
                <button
                  className={classes.button}
                  onClick={() => handleCardClick(ticket.uuid)}
                >
                  {i18n.t("kanban.seeTicket")}
                </button>
              </div>
            ),
            draggable: true,
            href: "/tickets/" + ticket.uuid,
          })),
        };
      }),
    ];

    setFile({ lanes });
  };

  useEffect(() => {
    popularCards(jsonString);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags, tickets]);

  // mover card entre colunas
  const handleCardMove = async (cardId, sourceLaneId, targetLaneId) => {
    try {
      await api.delete(`/ticket-tags/${targetLaneId}`);
      toast.success(i18n.t("kanban.toasts.removed"));
      await api.put(`/ticket-tags/${targetLaneId}/${sourceLaneId}`);
      toast.success(i18n.t("kanban.toasts.added"));
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className={classes.root}>
      <div className={classes.viewport}>
        <Board
          data={file}
          onCardMoveAcrossLanes={handleCardMove}
          draggableLanes // <<< permite arrastar colunas (Pessoal, etc.)
          components={{
            LaneHeader: CustomLaneHeader, // <<< cabeçalho custom com cor
          }}
          style={{
            backgroundColor: "#fff",
            height: "100%", // ocupa todo o viewport para a barra de scroll aparecer
          }}
        />
      </div>
    </div>
  );
};

export default Kanban;

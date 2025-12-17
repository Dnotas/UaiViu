import React, { useEffect, useRef, useState, useContext } from "react";
import { AuthContext } from "../../context/Auth/AuthContext";
import useSound from "use-sound";
import alertSound from "../../assets/sound.mp3";
import api from "../../services/api";

const UrgentTicketsAlert = () => {
  const { user } = useContext(AuthContext);
  const volume = parseFloat(localStorage.getItem("volume")) || 1;
  const [play] = useSound(alertSound, { volume });
  const intervalRef = useRef(null);
  const [urgentTickets, setUrgentTickets] = useState([]);

  useEffect(() => {
    const checkUrgentTickets = async () => {
      try {
        const { data } = await api.get("/tickets", {
          params: {
            status: "urgent",
            showAll: true,
            queueIds: JSON.stringify(user.queues.map(q => q.id))
          }
        });

        if (data && data.tickets) {
          const now = new Date();
          const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000);

          // Filtrar tickets urgentes há mais de 20 minutos
          const criticalTickets = data.tickets.filter(ticket => {
            if (ticket.urgentAt) {
              const urgentDate = new Date(ticket.urgentAt);
              return urgentDate <= twentyMinutesAgo;
            }
            return false;
          });

          setUrgentTickets(criticalTickets);

          // Se houver tickets críticos, tocar som
          if (criticalTickets.length > 0) {
            play();
          }
        }
      } catch (error) {
        console.error("Erro ao verificar tickets urgentes:", error);
      }
    };

    // Verificar a cada 5 segundos
    intervalRef.current = setInterval(() => {
      checkUrgentTickets();
    }, 5000);

    // Verificar imediatamente ao montar
    checkUrgentTickets();

    // Limpar intervalo ao desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [play, user.queues]);

  return null; // Componente invisível
};

export default UrgentTicketsAlert;

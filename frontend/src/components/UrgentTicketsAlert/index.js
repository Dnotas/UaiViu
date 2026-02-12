import React, { useEffect, useRef, useState, useContext } from "react";
import { AuthContext } from "../../context/Auth/AuthContext";
import useSound from "use-sound";
import urgentAlarm from "../../assets/urgent-alarm.mp3";
import api from "../../services/api";

const UrgentTicketsAlert = () => {
  const { user } = useContext(AuthContext);
  const volume = parseFloat(localStorage.getItem("volume")) || 1;
  const [play] = useSound(urgentAlarm, { volume });
  const intervalRef = useRef(null);
  const [urgentTickets, setUrgentTickets] = useState([]);
  const playedTicketsRef = useRef(new Set()); // Rastrear tickets que já tocaram alarme

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

          // Verificar se há novos tickets críticos que ainda não tocaram alarme
          const newCriticalTickets = criticalTickets.filter(
            ticket => !playedTicketsRef.current.has(ticket.id)
          );

          // Se houver novos tickets críticos, tocar som uma única vez
          if (newCriticalTickets.length > 0) {
            play();
            // Marcar esses tickets como já tendo tocado alarme
            newCriticalTickets.forEach(ticket => {
              playedTicketsRef.current.add(ticket.id);
            });
          }

          // Limpar tickets que não estão mais na lista (foram resolvidos)
          const currentTicketIds = new Set(criticalTickets.map(t => t.id));
          playedTicketsRef.current.forEach(ticketId => {
            if (!currentTicketIds.has(ticketId)) {
              playedTicketsRef.current.delete(ticketId);
            }
          });

          setUrgentTickets(criticalTickets);
        }
      } catch (error) {
        console.error("Erro ao verificar tickets urgentes:", error);
      }
    };

    // Verificar a cada 30 segundos (reduzido de 5 para economizar recursos)
    intervalRef.current = setInterval(() => {
      checkUrgentTickets();
    }, 30000);

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

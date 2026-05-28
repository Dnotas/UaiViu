import { Server as SocketServer } from "socket.io";
import http from "http";

let io: SocketServer;

export const initSocket = (httpServer: http.Server) => {
  io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  io.on("connection", (socket) => {
    socket.on("joinCompany", (companyId: string) => {
      socket.join(`food-company-${companyId}`);
    });
    socket.on("joinOrderRoom", (orderId: string) => {
      socket.join(`food-order-${orderId}`);
    });
  });

  return io;
};

export const getIO = (): SocketServer => {
  if (!io) throw new Error("Socket.io não inicializado");
  return io;
};

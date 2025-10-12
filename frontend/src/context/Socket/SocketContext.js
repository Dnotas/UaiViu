import { createContext } from "react";
import openSocket from "socket.io-client";
import { jwtDecode } from "jwt-decode"; // ✅ correção do import moderno

class ManagedSocket {
  constructor(socketManager) {
    this.socketManager = socketManager;
    this.rawSocket = socketManager.currentSocket;
    this.callbacks = [];
    this.joins = [];

    this.rawSocket.on("connect", () => {
      if (!this.rawSocket.recovered) {
        const refreshJoinsOnReady = () => {
          for (const j of this.joins) {
            console.debug("refreshing join", j);
            this.rawSocket.emit(`join${j.event}`, ...j.params);
          }
          this.rawSocket.off("ready", refreshJoinsOnReady);
        };

        for (const j of this.callbacks) {
          this.rawSocket.off(j.event, j.callback);
          this.rawSocket.on(j.event, j.callback);
        }

        this.rawSocket.on("ready", refreshJoinsOnReady);
      }
    });
  }

  on(event, callback) {
    if (event === "ready" || event === "connect") {
      return this.socketManager.onReady(callback);
    }
    this.callbacks.push({ event, callback });
    return this.rawSocket.on(event, callback);
  }

  off(event, callback) {
    const i = this.callbacks.findIndex(
      (c) => c.event === event && c.callback === callback
    );
    if (i !== -1) this.callbacks.splice(i, 1);
    return this.rawSocket.off(event, callback);
  }

  emit(event, ...params) {
    if (event.startsWith("join")) {
      this.joins.push({ event: event.substring(4), params });
      console.log("Joining", { event: event.substring(4), params });
    }
    return this.rawSocket.emit(event, ...params);
  }

  disconnect() {
    for (const j of this.joins) {
      this.rawSocket.emit(`leave${j.event}`, ...j.params);
    }
    this.joins = [];
    for (const c of this.callbacks) {
      this.rawSocket.off(c.event, c.callback);
    }
    this.callbacks = [];
  }
}

class DummySocket {
  on() {}
  off() {}
  emit() {}
  disconnect() {}
}

const SocketManager = {
  currentCompanyId: -1,
  currentUserId: -1,
  currentSocket: null,
  socketReady: false,

  getSocket(companyId) {
    let userId = localStorage.getItem("userId");
    if (!companyId && !this.currentSocket) {
      return new DummySocket();
    }

    if (companyId && typeof companyId !== "string") {
      companyId = `${companyId}`;
    }

    if (companyId !== this.currentCompanyId || userId !== this.currentUserId) {
      if (this.currentSocket) {
        console.warn("closing old socket - company or user changed");
        this.currentSocket.removeAllListeners();
        this.currentSocket.disconnect();
        this.currentSocket = null;
      }

      const tokenRaw = localStorage.getItem("token");
      if (!tokenRaw) {
        console.warn("No token found in localStorage");
        return new DummySocket();
      }

      let token = null;
      try {
        token = JSON.parse(tokenRaw);
      } catch (e) {
        console.error("Invalid token format:", e);
        return new DummySocket();
      }

      let decoded;
      try {
        decoded = jwtDecode(token);
      } catch (err) {
        console.error("Error decoding JWT:", err);
        return new DummySocket();
      }

      const exp = decoded?.exp || 0;

      if (Date.now() >= exp * 1000) {
        console.warn("Expired token, reloading...");
        setTimeout(() => window.location.reload(), 1000);
        return new DummySocket();
      }

      this.currentCompanyId = companyId;
      this.currentUserId = userId;

      this.currentSocket = openSocket(process.env.REACT_APP_BACKEND_URL, {
        transports: ["polling"],
        pingTimeout: 18000,
        pingInterval: 18000,
        query: { token },
      });

      this.currentSocket.on("disconnect", (reason) => {
        console.warn(`Socket disconnected: ${reason}`);
        if (reason.startsWith("io ")) {
          console.warn("Attempting to reconnect...");
          let decodedAgain;
          try {
            decodedAgain = jwtDecode(token);
          } catch (e) {
            console.error("JWT decode failed during reconnect:", e);
            window.location.reload();
            return;
          }
          const expAgain = decodedAgain?.exp || 0;

          if (Date.now() >= expAgain * 1000) {
            console.warn("Token expired during reconnect, reloading app");
            window.location.reload();
            return;
          }

          this.currentSocket.connect();
        }
      });

      this.currentSocket.on("connect", (...params) => {
        console.warn("Socket connected", params);
      });

      this.currentSocket.onAny((event, ...args) => {
        console.debug("Event: ", { event, args });
      });

      this.onReady(() => {
        this.socketReady = true;
      });
    }

    return new ManagedSocket(this);
  },

  onReady(callbackReady) {
    if (this.socketReady) {
      callbackReady();
      return;
    }

    if (this.currentSocket) {
      this.currentSocket.once("ready", callbackReady);
    }
  },
};

const SocketContext = createContext();

export { SocketContext, SocketManager };

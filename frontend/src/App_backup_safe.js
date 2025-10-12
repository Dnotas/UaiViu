// src/App.js
import React, { useState, useEffect, useMemo } from "react";

import "react-toastify/dist/ReactToastify.css";
import { QueryClient, QueryClientProvider } from "react-query";

import { enUS, ptBR, esES } from "@material-ui/core/locale";
import { createTheme, ThemeProvider } from "@material-ui/core/styles";
import { useMediaQuery, CssBaseline } from "@material-ui/core";

import ColorModeContext from "./layout/themeContext";
import { SocketContext, SocketManager } from "./context/Socket/SocketContext";

import Routes from "./routes";

const queryClient = new QueryClient();

const App = () => {
  const [locale, setLocale] = useState();

  // Detecta preferência do SO e carrega last choice do localStorage
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const preferredTheme = window.localStorage.getItem("preferredTheme");
  const [mode, setMode] = useState(
    preferredTheme ? preferredTheme : prefersDarkMode ? "dark" : "light"
  );

  // Expor função para alternar o tema (sem botão flutuante aqui)
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prev) => (prev === "light" ? "dark" : "light"));
      },
    }),
    []
  );

  // Paleta da marca
  const BRAND = {
    green: "#093E34",
    gold: "#C18E49",
    offWhite: "#F5F5F5",
    dark: "#1C1C1C",
    lightGray: "#F3F3F3",
    midGray: "#666666",
    softGray: "#EEE",
    inputDark: "#333333",
  };

  // Tema MUI (v4: palette.type)
  const theme = useMemo(
    () =>
      createTheme(
        {
          scrollbarStyles: {
            "&::-webkit-scrollbar": { width: "8px", height: "8px" },
            "&::-webkit-scrollbar-thumb": {
              boxShadow: "inset 0 0 6px rgba(0, 0, 0, 0.3)",
              backgroundColor: BRAND.gold,
            },
          },
          scrollbarStylesSoft: {
            "&::-webkit-scrollbar": { width: "8px" },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: mode === "light" ? BRAND.lightGray : BRAND.inputDark,
            },
          },
          palette: {
            type: mode,
            primary: {
              main: mode === "light" ? BRAND.green : BRAND.gold,
            },
            secondary: {
              main: BRAND.gold,
            },

            // Chaves customizadas usadas no seu app
            textPrimary: mode === "light" ? BRAND.green : "#FFFFFF",
            borderPrimary: BRAND.gold,

            dark: { main: mode === "light" ? BRAND.dark : BRAND.lightGray },
            light: { main: mode === "light" ? BRAND.lightGray : BRAND.inputDark },

            tabHeaderBackground: mode === "light" ? BRAND.softGray : BRAND.midGray,
            optionsBackground: mode === "light" ? "#FAFAFA" : BRAND.inputDark,
            options: mode === "light" ? "#FAFAFA" : BRAND.midGray,
            fontecor: mode === "light" ? BRAND.green : "#FFFFFF",
            fancyBackground: mode === "light" ? "#FAFAFA" : BRAND.inputDark,
            bordabox: mode === "light" ? BRAND.softGray : BRAND.inputDark,
            newmessagebox: mode === "light" ? BRAND.softGray : BRAND.inputDark,
            inputdigita: mode === "light" ? "#FFFFFF" : BRAND.midGray,
            contactdrawer: mode === "light" ? "#FFFFFF" : BRAND.midGray,
            announcements: mode === "light" ? "#EDEDED" : BRAND.inputDark,
            login: mode === "light" ? "#FFFFFF" : BRAND.dark,
            announcementspopover: mode === "light" ? "#FFFFFF" : BRAND.midGray,
            chatlist: mode === "light" ? BRAND.softGray : BRAND.midGray,
            boxlist: mode === "light" ? "#EDEDED" : BRAND.midGray,
            boxchatlist: mode === "light" ? "#EDEDED" : BRAND.inputDark,
            total: mode === "light" ? "#FFFFFF" : "#222222",
            messageIcons: mode === "light" ? "grey" : BRAND.lightGray,
            inputBackground: mode === "light" ? "#FFFFFF" : BRAND.inputDark,

            barraSuperior:
              mode === "light"
                ? `linear-gradient(90deg, ${BRAND.green}, ${BRAND.green})`
                : `linear-gradient(90deg, ${BRAND.green}, ${BRAND.gold})`,

            boxticket: mode === "light" ? BRAND.softGray : BRAND.midGray,
            campaigntab: mode === "light" ? "#EDEDED" : BRAND.midGray,
            mediainput: mode === "light" ? "#EDEDED" : BRAND.dark,
          },
          mode,
          overrides: {
            MuiTypography: {
              colorTextPrimary: {
                color: mode === "dark" ? "#FFFFFF" : BRAND.green,
              },
            },
          },
        },
        locale
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, locale]
  );

  // Define locale do MUI
  useEffect(() => {
    const i18nlocale = localStorage.getItem("i18nextLng");
    const browserLocale = i18nlocale?.substring(0, 2) ?? "pt";

    if (browserLocale === "pt") setLocale(ptBR);
    else if (browserLocale === "en") setLocale(enUS);
    else if (browserLocale === "es") setLocale(esES);
  }, []);

  // Persiste preferência
  useEffect(() => {
    window.localStorage.setItem("preferredTheme", mode);
  }, [mode]);

  return (
    <ColorModeContext.Provider value={{ colorMode }}>
      <ThemeProvider theme={theme}>
        {/* CssBaseline precisa ficar DENTRO do ThemeProvider para herdar o tema */}
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <SocketContext.Provider value={SocketManager}>
            <Routes />
          </SocketContext.Provider>
        </QueryClientProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default App;

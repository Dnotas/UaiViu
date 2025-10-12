// src/GlobalStyle.js
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { useEffect } from "react";

const useStyles = makeStyles((theme) => ({
  "@global": {
    "html, body": {
      scrollBehavior: "smooth",
      backgroundColor: theme.palette.background?.default || "#f9f9f9",
      transition: "background-color 0.4s ease, color 0.4s ease",
      fontFamily: "'Inter', 'Roboto', sans-serif",
    },
    "*": {
      transition: "background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease",
    },
    "::-webkit-scrollbar": { width: 8, height: 8 },
    "::-webkit-scrollbar-thumb": {
      background: theme.palette.secondary.main,
      borderRadius: 8,
    },
    a: {
      textDecoration: "none",
      color: theme.palette.secondary.main,
      "&:hover": { opacity: 0.8 },
    },
    ".MuiPaper-root": {
      borderRadius: 14,
      boxShadow:
        theme.palette.type === "light"
          ? "0 4px 12px rgba(0,0,0,0.08)"
          : "0 4px 18px rgba(0,0,0,0.4)",
    },
    ".MuiButton-root": {
      borderRadius: 10,
      textTransform: "none",
      fontWeight: 600,
      transition: "all 0.25s ease",
      "&:hover": {
        transform: "translateY(-1px)",
        boxShadow:
          theme.palette.type === "light"
            ? "0 6px 12px rgba(0,0,0,0.1)"
            : "0 6px 12px rgba(255,255,255,0.08)",
      },
    },
  },
}));

export default function GlobalStyle({ mode }) {
  const classes = useStyles();
  useEffect(() => {}, [mode]);
  return null;
}

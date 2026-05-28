import React, { useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";
import CircularProgress from "@material-ui/core/CircularProgress";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";

/**
 * Esta página recebe o token enviado pelo UaiViu principal após o login
 * via query string: /auth?token=xxx&companyId=yyy&userId=zzz
 * Salva no localStorage e redireciona para o dashboard.
 */
const AuthPage = () => {
  const history = useHistory();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const companyId = params.get("companyId");
    const userId = params.get("userId");

    if (token && companyId) {
      localStorage.setItem("food_token", JSON.stringify(token));
      localStorage.setItem("food_companyId", companyId);
      if (userId) localStorage.setItem("food_userId", userId);
      history.replace("/dashboard");
    } else {
      // Sem token: redireciona para o login do UaiViu principal
      const mainUrl = process.env.REACT_APP_MAIN_URL || "http://localhost:3000";
      window.location.href = `${mainUrl}/login`;
    }
  }, []);

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
      <CircularProgress color="primary" />
      <Typography variant="body1" style={{ marginTop: 16 }}>
        Autenticando...
      </Typography>
    </Box>
  );
};

export default AuthPage;

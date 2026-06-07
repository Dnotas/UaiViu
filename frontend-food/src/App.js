import React from "react";
import { BrowserRouter, Switch, Route, Redirect } from "react-router-dom";
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CssBaseline from "@material-ui/core/CssBaseline";

import LandingPage from "./pages/Landing";
import AuthPage from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MenuPage from "./pages/Menu";
import OrdersPage from "./pages/Orders";
import WhatsappPage from "./pages/Whatsapp";
import SettingsPage from "./pages/Settings";
import ConversationsPage from "./pages/Conversations";
import PublicMenuPage from "./pages/PublicMenu";
import DeliveryConfirmPage from "./pages/DeliveryConfirm";
import Layout from "./components/Layout";

const theme = createMuiTheme({
  palette: {
    primary: { main: "#e53935" },
    secondary: { main: "#ff7043" },
  },
  typography: { fontFamily: "Roboto, sans-serif" },
});

const isAuthenticated = () => !!localStorage.getItem("food_token");

const PrivateRoute = ({ component: Component, ...rest }) => (
  <Route
    {...rest}
    render={(props) =>
      isAuthenticated() ? (
        <Layout>
          <Component {...props} />
        </Layout>
      ) : (
        <Redirect to="/login" />
      )
    }
  />
);

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastContainer autoClose={3000} />
      <BrowserRouter>
        <Switch>
          {/* Auth — recebe token do UaiViu principal via query string */}
          <Route path="/auth" component={AuthPage} />
          <Route path="/login" component={AuthPage} />

          {/* Cardápio público — sem login */}
          <Route path="/cardapio/:slug" component={PublicMenuPage} />

          {/* Link do motoboy — sem login */}
          <Route path="/entrega/:token" component={DeliveryConfirmPage} />

          {/* Painel do restaurante — autenticado */}
          <PrivateRoute path="/dashboard" component={Dashboard} />
          <PrivateRoute path="/menu" component={MenuPage} />
          <PrivateRoute path="/pedidos" component={OrdersPage} />
          <PrivateRoute path="/whatsapp" component={WhatsappPage} />
          <PrivateRoute path="/conversas" component={ConversationsPage} />
          <PrivateRoute path="/configuracoes" component={SettingsPage} />

          {/* Landing page pública */}
          <Route exact path="/" component={LandingPage} />
        </Switch>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;

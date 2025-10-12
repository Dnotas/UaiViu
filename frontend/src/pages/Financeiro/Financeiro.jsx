// src/pages/Financeiro/index.jsx
import React, { useState, useEffect } from "react";
import "./Financeiro.css";

function Financeiro() {
  const [clientes, setClientes] = useState([]);
  const [cliente, setCliente] = useState({
    nome: "",
    email: "",
    telefone: "",
    documento: "",
    plano: "",
  });

  const planos = {
    "Plano Básico": 100,
    "Plano Avançado": 200,
    "EnterpriseFlow": 300,
  };

  const handleInputChange = (e) => {
    setCliente({ ...cliente, [e.target.name]: e.target.value });
  };

  const handlePlanoClick = (plano) => {
    setCliente({ ...cliente, plano });
  };

  const gerarFatura = () => {
    if (
      !cliente.nome ||
      !cliente.email ||
      !cliente.telefone ||
      !cliente.documento ||
      !cliente.plano
    ) {
      alert("Preencha todos os campos e selecione um plano.");
      return;
    }

    const dataAtual = new Date();
    const vencimento = new Date();
    vencimento.setMonth(vencimento.getMonth() + 1);

    const novaFatura = {
      id: clientes.length + 1,
      ...cliente,
      valor: `R$ ${planos[cliente.plano]},00`,
      emissao: dataAtual.toLocaleDateString(),
      vencimento: vencimento.toLocaleDateString(),
      status: "Pendente",
      formaPagamento: "Boleto",
    };

    const novaLista = [...clientes, novaFatura];
    setClientes(novaLista);
    localStorage.setItem("faturas", JSON.stringify(novaLista));

    // Limpa campos
    setCliente({
      nome: "",
      email: "",
      telefone: "",
      documento: "",
      plano: "",
    });
  };

  useEffect(() => {
    const armazenadas = localStorage.getItem("faturas");
    if (armazenadas) {
      setClientes(JSON.parse(armazenadas));
    }
  }, []);

  return (
    <div className="container">
      <h2>Cadastro de Cliente</h2>
      <input
        type="text"
        name="nome"
        placeholder="Nome"
        value={cliente.nome}
        onChange={handleInputChange}
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={cliente.email}
        onChange={handleInputChange}
      />
      <input
        type="text"
        name="telefone"
        placeholder="Telefone"
        value={cliente.telefone}
        onChange={handleInputChange}
      />
      <input
        type="text"
        name="documento"
        placeholder="CPF ou NIF"
        value={cliente.documento}
        onChange={handleInputChange}
      />

      <h4>Escolha um plano:</h4>
      {Object.keys(planos).map((plano) => (
        <button key={plano} onClick={() => handlePlanoClick(plano)}>
          {plano} - R$ {planos[plano]},00
        </button>
      ))}

      <br />
      <button className="gerar-btn" onClick={gerarFatura}>
        Cadastrar Cliente e Gerar Fatura
      </button>

      <h2>Faturas</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Documento</th>
            <th>Plano</th>
            <th>Valor</th>
            <th>Emissão</th>
            <th>Vencimento</th>
            <th>Status</th>
            <th>Forma Pagamento</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((fatura) => (
            <tr key={fatura.id}>
              <td>{fatura.id}</td>
              <td>{fatura.nome}</td>
              <td>{fatura.documento}</td>
              <td>{fatura.plano}</td>
              <td>{fatura.valor}</td>
              <td>{fatura.emissao}</td>
              <td>{fatura.vencimento}</td>
              <td>{fatura.status}</td>
              <td>{fatura.formaPagamento}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Financeiro;

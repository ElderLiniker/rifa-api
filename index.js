const express = require("express");
const cors = require("cors");

require("dotenv").config(); // Carrega as variáveis de ambiente

const app = express();
const port = process.env.PORT || 3000;

// Habilitando CORS
app.use(cors());
app.use(express.json()); // Para analisar corpos JSON

// Configuração do Sequelize e conexão com o PostgreSQL
const { Sequelize, DataTypes } = require("sequelize");

// Usando a URL de conexão do banco de dados do Render
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  protocol: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Necessário para conexões seguras com Render
    },
  },
});

// Teste de conexão com o banco de dados
sequelize.authenticate()
  .then(() => {
    console.log("Conexão com o banco de dados bem-sucedida.");
  })
  .catch((err) => {
    console.error("Erro ao conectar ao banco de dados:", err);
  });

// Modelos para as reservas e configurações
const Reserva = sequelize.define("Reserva", {
  numero: {
    type: DataTypes.STRING,
    unique: true,
  },
  nome: DataTypes.STRING,
  pago: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

const Configuracao = sequelize.define("Configuracao", {
  tipo: DataTypes.STRING,
  valor: DataTypes.STRING,
});

// Rota para configurar o valor da rifa e prêmio
app.get("/configuracoes", async (req, res) => {
  try {
    const configuracoes = await Configuracao.findAll();
    const configObj = {};
    configuracoes.forEach((config) => {
      configObj[config.tipo] = config.valor;
    });
    res.json(configObj);
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
    res.status(500).json({ message: "Erro ao carregar configurações" });
  }
});

app.put("/configuracoes", async (req, res) => {
  const { rifa, premio } = req.body;

  try {
    if (rifa) {
      await Configuracao.upsert({ tipo: "rifa", valor: rifa });
    }

    if (premio) {
      await Configuracao.upsert({ tipo: "premio", valor: premio });
    }

    res.json({ message: "Configurações atualizadas com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar configurações:", error);
    res.status(500).json({ message: "Erro ao atualizar configurações" });
  }
});

// Rota para reservar números
app.post("/reservas", async (req, res) => {
  const { nome, numeros } = req.body;

  try {
    for (let numero of numeros) {
      await Reserva.create({ numero, nome });
    }

    res.status(201).json({ message: "Reserva feita com sucesso!" });
  } catch (error) {
    console.error("Erro ao fazer reserva:", error);
    res.status(500).json({ message: "Erro ao fazer reserva" });
  }
});

// Rota para obter as reservas
app.get("/reservas", async (req, res) => {
  try {
    const reservas = await Reserva.findAll();
    res.json(reservas);
  } catch (error) {
    console.error("Erro ao buscar reservas:", error);
    res.status(500).json({ message: "Erro ao buscar reservas" });
  }
});

// Rota para limpar todas as reservas
app.delete("/reservas", async (req, res) => {
  try {
    await Reserva.destroy({ where: {} });
    res.json({ message: "Rifa limpa com sucesso!" });
  } catch (error) {
    console.error("Erro ao limpar rifa:", error);
    res.status(500).json({ message: "Erro ao limpar rifa" });
  }
});

// Iniciando o servidor
app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});

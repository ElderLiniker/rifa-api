const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  protocol: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

sequelize.authenticate()
  .then(() => {
    console.log("Conexão com o banco de dados bem-sucedida.");
  })
  .catch((err) => {
    console.error("Erro ao conectar ao banco de dados:", err);
  });

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

// 🔐 Rota de login do admin
app.post("/admin/login", (req, res) => {
  const { senha } = req.body;

  if (senha === process.env.ADMIN_SENHA) {
    res.json({ autorizado: true, message: "Acesso autorizado" });
  } else {
    res.status(401).json({ autorizado: false, message: "Senha incorreta" });
  }
});

// 🔒 Protegendo configuração de rifa
app.put("/configuracoes", async (req, res) => {
  const { rifa, premio, senha } = req.body;

  if (senha !== process.env.ADMIN_SENHA) {
    return res.status(401).json({ message: "Acesso negado" });
  }

  try {
    if (rifa) await Configuracao.upsert({ tipo: "rifa", valor: rifa });
    if (premio) await Configuracao.upsert({ tipo: "premio", valor: premio });

    res.json({ message: "Configurações atualizadas com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar configurações:", error);
    res.status(500).json({ message: "Erro ao atualizar configurações" });
  }
});

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

app.get("/reservas", async (req, res) => {
  try {
    const reservas = await Reserva.findAll();
    res.json(reservas);
  } catch (error) {
    console.error("Erro ao buscar reservas:", error);
    res.status(500).json({ message: "Erro ao buscar reservas" });
  }
});

// 🔒 Protegendo exclusão de reservas com senha de admin
app.delete("/reservas", async (req, res) => {
  const { senha } = req.body;

  if (senha !== process.env.ADMIN_SENHA) {
    return res.status(401).json({ message: "Acesso negado" });
  }

  try {
    await Reserva.destroy({ where: {} });
    res.json({ message: "Rifa limpa com sucesso!" });
  } catch (error) {
    console.error("Erro ao limpar rifa:", error);
    res.status(500).json({ message: "Erro ao limpar rifa" });
  }
});

// Novo endpoint para excluir uma reserva individual
app.delete("/reservas/:numero", async (req, res) => {
  const { numero } = req.params;
  try {
    await Reserva.destroy({ where: { numero } });
    res.status(200).json({ message: 'Reserva excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir a reserva:', error);
    res.status(500).json({ message: 'Erro ao excluir a reserva' });
  }
});

// Endpoint para marcar como pago
app.put('/reservas/:numero/pago', async (req, res) => {
  const { numero } = req.params;
  try {
    const reserva = await Reserva.findOne({ where: { numero } });
    if (reserva) {
      reserva.pago = true;
      await reserva.save();
      res.status(200).json({ message: 'Reserva marcada como paga' });
    } else {
      res.status(404).json({ message: 'Reserva não encontrada' });
    }
  } catch (error) {
    console.error('Erro ao marcar como pago:', error);
    res.status(500).json({ message: 'Erro ao marcar como pago' });
  }
});

// Endpoint para marcar como não pago
app.put('/reservas/:numero/nao-pago', async (req, res) => {
  const { numero } = req.params;
  try {
    const reserva = await Reserva.findOne({ where: { numero } });
    if (reserva) {
      reserva.pago = false;
      await reserva.save();
      res.status(200).json({ message: 'Reserva marcada como não paga' });
    } else {
      res.status(404).json({ message: 'Reserva não encontrada' });
    }
  } catch (error) {
    console.error('Erro ao marcar como não pago:', error);
    res.status(500).json({ message: 'Erro ao marcar como não pago' });
  }
});

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});

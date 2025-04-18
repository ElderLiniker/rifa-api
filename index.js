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

app.post("/admin/login", (req, res) => {
  const { senha } = req.body;

  if (senha === process.env.ADMIN_SENHA) {
    res.json({ autorizado: true, message: "Acesso autorizado" });
  } else {
    res.status(401).json({ autorizado: false, message: "Senha incorreta" });
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

// Rota para marcar um número como pago
app.put("/reservas/:numero/pago", async (req, res) => {
  const { numero } = req.params;
  try {
    const reserva = await Reserva.findOne({ where: { numero } });
    if (reserva) {
      reserva.pago = true;
      await reserva.save();
      res.json({ message: "Número marcado como pago" });
    } else {
      res.status(404).json({ message: "Número não encontrado" });
    }
  } catch (error) {
    console.error("Erro ao marcar como pago:", error);
    res.status(500).json({ message: "Erro ao marcar como pago" });
  }
});

// Rota para excluir um número individual
app.delete("/reservas/:numero", async (req, res) => {
  const { numero } = req.params;
  try {
    const reserva = await Reserva.findOne({ where: { numero } });
    if (reserva) {
      await reserva.destroy();
      res.json({ message: "Número excluído com sucesso" });
    } else {
      res.status(404).json({ message: "Número não encontrado" });
    }
  } catch (error) {
    console.error("Erro ao excluir número:", error);
    res.status(500).json({ message: "Erro ao excluir número" });
  }
});

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});

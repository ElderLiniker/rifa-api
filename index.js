const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());


let rifa = "";
let premio = "";



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




// Rota para setar o valor da rifa
app.post("/api/rifa", (req, res) => {
  const { valor } = req.body;
  if (!valor) return res.status(400).json({ error: "Valor da rifa é obrigatório." });
  rifa = valor;
  res.json({ message: "Rifa atualizada com sucesso!", rifa });
});

// Rota para pegar o valor da rifa
app.get("/api/rifa", (req, res) => {
  res.json({ rifa });
});

// Rota para setar o valor do prêmio
app.post("/api/premio", (req, res) => {
  const { valor } = req.body;
  if (!valor) return res.status(400).json({ error: "Valor do prêmio é obrigatório." });
  premio = valor;
  res.json({ message: "Prêmio atualizado com sucesso!", premio });
});

// Rota para pegar o valor do prêmio
app.get("/api/premio", (req, res) => {
  res.json({ premio });
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
app.put("/reservas/:numero/pago", async (req, res) => {
  const { numero } = req.params;

  try {
    const reserva = await Reserva.findOne({ where: { numero } });
    if (!reserva) return res.status(404).json({ message: "Reserva não encontrada" });

    reserva.pago = true;
    await reserva.save();

    res.json({ message: "Número marcado como pago!" });
  } catch (error) {
    console.error("Erro ao marcar como pago:", error);
    res.status(500).json({ message: "Erro ao marcar como pago" });
  }
});

app.get("/api/verificar-admin", (req, res) => {
  const senha = req.headers.authorization;

  if (senha === process.env.ADMIN_SENHA) {
    res.sendStatus(200); // Autorizado
  } else {
    res.sendStatus(401); // Não autorizado
  }
});


app.put("/reservas/:numero/nao-pago", async (req, res) => {
  const { numero } = req.params;

  try {
    const reserva = await Reserva.findOne({ where: { numero } });
    if (!reserva) return res.status(404).json({ message: "Reserva não encontrada" });

    reserva.pago = false;
    await reserva.save();

    res.json({ message: "Número marcado como não pago!" });
  } catch (error) {
    console.error("Erro ao marcar como não pago:", error);
    res.status(500).json({ message: "Erro ao marcar como não pago" });
  }
});


// 🔒 Protegendo exclusão de reservas com senha de admin
app.delete("/reservas/:numero", async (req, res) => {
  const { senha } = req.body;
  const { numero } = req.params;

  if (senha !== process.env.ADMIN_SENHA) {
    return res.status(401).json({ message: "Acesso negado" });
  }

  try {
    const deletado = await Reserva.destroy({ where: { numero } });

    if (deletado === 0) {
      return res.status(404).json({ message: "Número não encontrado" });
    }

    res.json({ message: `Número ${numero} excluído com sucesso!` });
  } catch (error) {
    console.error("Erro ao excluir número:", error);
    res.status(500).json({ message: "Erro ao excluir número" });
  }
});
app.delete("/reservas", async (req, res) => {
  const { senha } = req.body;

  if (senha !== process.env.ADMIN_SENHA) {
    return res.status(401).json({ message: "Acesso negado" });
  }

  try {
    // Deletando todos os registros de reservas
    const deletado = await Reserva.destroy({ where: {} });

    if (deletado === 0) {
      return res.status(404).json({ message: "Nenhum número encontrado para excluir" });
    }

    res.json({ message: "Rifa limpa com sucesso!" });
  } catch (error) {
    console.error("Erro ao limpar rifa:", error);
    res.status(500).json({ message: "Erro ao limpar rifa" });
  }
});



app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});

require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const { Sequelize, DataTypes } = require("sequelize");

const app  = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// ── Conexão ────────────────────────────────────────
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  protocol: "postgres",
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});
sequelize.authenticate()
  .then(() => console.log("🔥  Banco conectado"))
  .catch(err  => console.error("❌  Falha ao conectar:", err));

// ── Models ─────────────────────────────────────────
const Reserva = sequelize.define("Reserva", {
  numero: { type: DataTypes.STRING, primaryKey: true },
  nome  : DataTypes.STRING,
  pago  : { type: DataTypes.BOOLEAN, defaultValue: false }
});

const Configuracao = sequelize.define("Configuracao", {
  tipo : { type: DataTypes.STRING, primaryKey: true }, // "rifa" | "premio"
  valor: DataTypes.STRING
});

sequelize.sync();   // cria tabelas se não existirem

// ── Middleware de admin (senha no header Authorization) ─
function authAdmin(req, res, next) {
  const senha = req.headers.authorization || req.body.senha;
  if (senha === process.env.ADMIN_SENHA) return next();
  res.status(401).json({ message: "Acesso negado" });
}

// ── Configurações rifa / prêmio ───────────────────
app.get("/configuracoes", async (_, res) => {
  const pares = await Configuracao.findAll();
  res.json(Object.fromEntries(pares.map(p => [p.tipo, p.valor])));
});

app.put("/configuracoes", authAdmin, async (req, res) => {
  const { rifa, premio } = req.body;
  if (rifa   !== undefined) await Configuracao.upsert({ tipo: "rifa",   valor: rifa   });
  if (premio !== undefined) await Configuracao.upsert({ tipo: "premio", valor: premio });
  res.json({ message: "Configurações atualizadas" });
});

// ── Reservas ───────────────────────────────────────
app.post("/reservas", async (req, res) => {
  const { nome, numeros } = req.body;
  try {
    await Promise.all(numeros.map(n => Reserva.create({ numero: n, nome })));
    res.status(201).json({ message: "Reserva feita!" });
  } catch (e) { res.status(500).json({ message: "Erro ao reservar" }); }
});

app.get("/reservas", async (_, res) => res.json(await Reserva.findAll()));

app.put("/reservas/:numero/pago",    async (req,res)=>togglePago(req,res,true));
app.put("/reservas/:numero/nao-pago",async (req,res)=>togglePago(req,res,false));
async function togglePago(req,res,flag){
  const r=await Reserva.findByPk(req.params.numero);
  if(!r) return res.status(404).json({message:"Não encontrado"});
  r.pago=flag; await r.save(); res.json({message:"Atualizado"});
}

app.delete("/reservas/:numero", authAdmin, async (req,res)=>{
  const del=await Reserva.destroy({ where:{ numero:req.params.numero }});
  if(!del) return res.status(404).json({message:"Não encontrado"});
  res.json({message:"Excluído"});
});
app.delete("/reservas", authAdmin, async (_,res)=>{
  await Reserva.destroy({ where:{}});
  res.json({message:"Rifa limpa"});
});

// ── Login admin (opcional: guarda senha no cliente) ─
app.post("/admin/login", (req,res)=>{
  res.json({ autorizado: req.body.senha === process.env.ADMIN_SENHA });
});

app.listen(port, ()=>console.log(`🚀  API http://localhost:${port}`));

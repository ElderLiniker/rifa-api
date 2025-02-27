const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config(); // Carrega as variáveis de ambiente

const app = express();
const port = process.env.PORT || 3000



// Habilitando CORS
app.use(cors());
app.use(express.json()); // Para analisar corpos JSON

// Configuração do Sequelize e conexão com o PostgreSQL
const sequelize = new Sequelize('rifa_db', 'user', 'password', {
  host: 'localhost',
  dialect: 'postgres',
  port: 5434, // Use a mesma porta que você configurou no Docker
});

// Modelo para as reservas
const Reserva = sequelize.define('Reserva', {
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

// Testando a conexão com o banco
sequelize.authenticate()
  .then(() => console.log('Conexão com o banco de dados bem-sucedida.'))
  .catch(err => console.error('Erro ao conectar ao banco de dados:', err));

// Rota para login do admin
app.post('/admin/login', (req, res) => {
  const { senha } = req.body;

  if (senha === process.env.ADMIN_SENHA) {
    return res.json({ sucesso: true });
  } else {
    return res.json({ sucesso: false });
  }
});

// Rota para obter as reservas
app.get('/reservas', async (req, res) => {
  try {
    const reservas = await Reserva.findAll();
    res.json(reservas);
  } catch (error) {
    console.error('Erro ao buscar reservas:', error);
    res.status(500).json({ message: 'Erro ao buscar reservas' });
  }
});

// Rota para reservar números
app.post('/reservas', async (req, res) => {
  try {
    const { nome, numeros } = req.body;
    
    for (let numero of numeros) {
      await Reserva.create({ numero, nome });
    }

    res.status(201).json({ message: 'Reserva feita com sucesso!' });
  } catch (error) {
    console.error('Erro ao fazer reserva:', error);
    res.status(500).json({ message: 'Erro ao fazer reserva' });
  }
});

// Rota para marcar como pago
app.put('/reservas/:numero/pago', async (req, res) => {
  try {
    const { numero } = req.params;
    const reserva = await Reserva.findOne({ where: { numero } });

    if (reserva) {
      reserva.pago = true;
      await reserva.save();
      res.json({ message: 'Reserva marcada como paga!' });
    } else {
      res.status(404).json({ message: 'Reserva não encontrada' });
    }
  } catch (error) {
    console.error('Erro ao marcar como pago:', error);
    res.status(500).json({ message: 'Erro ao marcar como pago' });
  }
});

// Rota para excluir número reservado
app.delete('/reservas/:numero', async (req, res) => {
  try {
    const { numero } = req.params;
    const reserva = await Reserva.findOne({ where: { numero } });

    if (reserva) {
      await reserva.destroy();
      res.json({ message: 'Reserva excluída com sucesso!' });
    } else {
      res.status(404).json({ message: 'Reserva não encontrada' });
    }
  } catch (error) {
    console.error('Erro ao excluir reserva:', error);
    res.status(500).json({ message: 'Erro ao excluir reserva' });
  }
});

// Iniciando o servidor
app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});

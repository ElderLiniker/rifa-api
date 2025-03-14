const express = require('express');
const cors = require('cors');

require('dotenv').config(); // Carrega as variáveis de ambiente

const app = express();
const port = process.env.PORT || 3000



// Habilitando CORS
app.use(cors());
app.use(express.json()); // Para analisar corpos JSON

// Configuração do Sequelize e conexão com o PostgreSQL
const { Sequelize, DataTypes } = require('sequelize');

// Usando a URL de conexão do banco de dados do Render
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,  // Necessário para conexões seguras com Render
    },
  },
});

// Teste de conexão com o banco de dados
sequelize.authenticate()
  .then(() => {
    console.log('Conexão com o banco de dados bem-sucedida.');
  })
  .catch(err => {
    console.error('Erro ao conectar ao banco de dados:', err);
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


  app.get("/", (req, res) => {
    res.send("API funcionando na Vercel!");
  });

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
// Rota para limpar todas as reservas (limpar a rifa)
app.delete('/reservas', async (req, res) => {
  try {
    await Reserva.destroy({ where: {} });  // Apaga todas as reservas
    res.json({ message: 'Rifa limpa com sucesso!' });
  } catch (error) {
    console.error('Erro ao limpar rifa:', error);
    res.status(500).json({ message: 'Erro ao limpar rifa' });
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

// Rota para marcar como não pago
// Rota para marcar uma reserva como "Não Pago"
app.put('/reservas/:numero/nao-pago', async (req, res) => {
  try {
    const { numero } = req.params;
    const reserva = await Reserva.findOne({ where: { numero } });

    if (reserva) {
      reserva.pago = false;  // Marca como não pago
      await reserva.save();   // Salva a alteração no banco de dados
      res.json({ message: 'Reserva marcada como não paga!' });
    } else {
      res.status(404).json({ message: 'Reserva não encontrada' });
    }
  } catch (error) {
    console.error('Erro ao marcar como não pago:', error);
    res.status(500).json({ message: 'Erro ao marcar como não pago' });
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

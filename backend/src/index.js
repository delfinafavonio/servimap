const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const oficiosRouter = require('./routes/oficiosRouter');
app.use('/api/oficios', oficiosRouter);

app.get('/', (req, res) => {
  res.json({ mensaje: 'API de ServiMap funcionando' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
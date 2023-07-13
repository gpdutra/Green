const express = require('express');
const multer = require('multer');
const fs = require('fs');
const BoletoService = require("../Service/BoletoService");

const app = express();
const upload = multer({ dest: 'uploads/' });

// Rota para o upload do arquivo CSV
app.post('/uploadCSV', upload.single('csvFile'), async (req, res) => {
    const results = await BoletoService.saveBoletoByUpload(req.file.path);
    
    res.send('Arquivo CSV processado com sucesso!');
});

// Rota para o upload do arquivo PDF
app.post('/uploadPDF', upload.single('pdfFile'), async (req, res) => {
  const results = await BoletoService.splitPagesPDF(req.file.path);
  
  res.send(results); 
});

app.get('/boletos', async (req, res) => {
  const results = await BoletoService.getAll(req.query)
  res.send(results);
})

// Inicie o servidor
app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
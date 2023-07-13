
const csv = require('csv-parser');
const pdfjs = require('pdfjs-dist');
const fs = require('fs');
const BoletoRepository = require('../Repository/BoletoRepository')
const LotesService = require('./LoteService')
const { PDFDocument, rgb } = require('pdf-lib');
const { promisify } = require('util');


async function saveBoletoByUpload(path) {
    
    return new Promise((resolve, reject) => {
        const results = [];

    
        fs.createReadStream(path)
          .pipe(csv({ separator: ';' })) // Defina o separador correto do CSV, caso seja diferente de vírgula
          .on('data', (data) => {
            results.push(data);
          })
          .on('end', () => {
            results.forEach(async (boleto) => {

                nomeLote = await boleto.unidade.toString().padStart(4, '0');

                const lote = await LotesService.getLotesByName(nomeLote);

                boleto.id_lote = await lote.id;

                const result = await BoletoRepository.insertBoleto(boleto);
                console.log(result);
            })
            resolve(results);
          })
          .on('error', (error) => {
            reject(error);
          });
      });
}


async function splitPagesPDF(path) {
  return new Promise(async (resolve, reject) => {
    try {
      const data = new Uint8Array(fs.readFileSync(path));
  
      const loadingTask = pdfjs.getDocument(data);
      const pdfDocument = await loadingTask.promise;
  
      const numPages = pdfDocument.numPages;
      console.log(`Número de páginas: ${numPages}`);
  
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        const textItems = textContent.items;

        const boleto = await BoletoRepository.getByName(textItems[0].str.substring(16))

        await adicionarPagPDF(boleto);

      }
  
      resolve('Arquivo PDF processado com sucesso!');
    } catch (error) {
      console.error('Erro ao processar o arquivo PDF:', error);
      reject('Ocorreu um erro ao processar o arquivo PDF.');
    } finally {
      // Excluir o arquivo do diretório de upload após o processamento
      fs.unlinkSync(path);
    }
  });
}


async function getAll(filters){
  filterQry = [];
  relatorio = 0;
  if(filters.nome != undefined){
    filterQry.push(`LOWER(nome_sacado) LIKE LOWER('%${filters.nome}%')`)
  }

  if(filters.valor_inicial != undefined){
    filterQry.push(`valor >= ${filters.valor_inicial}`)
  }

  if(filters.valor_final != undefined){
    filterQry.push(`valor <= ${filters.valor_final}`)   
  }

  if(filters.id_lote != undefined){
    filterQry.push(`id_lote = ${filters.id_lote}`)   
  }


  let boletos = await BoletoRepository.getBoletos(filterQry);

  if(filters.relatorio == 1){
    await generateBoletoPDF(boletos)
    .then((base64PDF) => {
      boletos = base64PDF
    })
    .catch((error) => {
      console.error('Erro ao gerar o PDF:', error);
    });
  }

  return boletos;

}


async function adicionarPagPDF(boleto) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();

  // Adicione um retângulo preenchido à página
  const { width, height } = page.getSize();
  page.drawRectangle({
    x: 50,
    y: height - 100,
    width: width - 100,
    height: 50,
    color: rgb(0.2, 0.4, 0.6),
  });

  // Adicione um texto à página
  const font = await pdfDoc.embedFont('Helvetica');
  page.drawText('Boleto de '+boleto.nome_sacado, {
    x: 75,
    y: height - 75,
    font,
    size: 24,
    color: rgb(1, 1, 1),
  });
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(boleto.id+'.pdf', pdfBytes);
}

async function generateBoletoPDF(registros) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();


  // Defina as configurações da tabela
  const table = {
    startX: 50,
    startY: 700,
    rowHeight: 20,
    columnWidths: [50, 100, 50, 100, 150],
    header: ['ID', 'Nome Sacado', 'ID Lote', 'Valor', 'Linha Digitável'],
    data: registros.map((registro) => [
      registro.id.toString(),
      registro.nome_sacado,
      registro.id_lote.toString(),
      registro.valor,
      registro.linha_digitavel,
    ]),
  };

  function drawTable() {
    const { startX, startY, rowHeight, columnWidths, header, data } = table;
    const tableHeight = (data.length + 1) * rowHeight;
  
    // Desenhe o cabeçalho da tabela
    page.drawText(header.join(' | '), {
      x: startX,
      y: startY,
      size: 12,
      color: rgb(0, 0, 0),
    });
  
    // Desenhe as linhas horizontais da tabela
    for (let i = 0; i <= data.length; i++) {
      const y = startY - (i + 1) * rowHeight;
      page.drawLine({
        start: { x: startX, y },
        end: { x: startX + columnWidths.reduce((a, b) => a + b, 0), y },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });
    }
  
    // Desenhe as linhas verticais da tabela
    for (let i = 0; i <= columnWidths.length; i++) {
      const x = startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0);
      page.drawLine({
        start: { x, y: startY },
        end: { x, y: startY - tableHeight },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });
    }
  
    // Preencha os dados na tabela
    for (let i = 0; i < data.length; i++) {
      const rowData = data[i];
      for (let j = 0; j < rowData.length; j++) {
        const cellData = rowData[j];
        const x = startX + columnWidths.slice(0, j).reduce((a, b) => a + b, 0);
        const y = startY - (i + 2) * rowHeight;
        page.drawText(cellData, {
          x: x + 2,
          y: y + 4,
          size: 10,
          color: rgb(0, 0, 0),
        });
      }
    }
  }

  drawTable();

  const pdfBytes = await pdfDoc.save();
  const tmpFilePath = 'relatorio.pdf';
  await promisify(fs.writeFile)(tmpFilePath, pdfBytes);

  const fileData = fs.readFileSync(tmpFilePath);
  const base64String = fileData.toString('base64');

  fs.unlinkSync(tmpFilePath);

  return base64String;
}





  
module.exports = {
    saveBoletoByUpload,
    splitPagesPDF,
    getAll
}
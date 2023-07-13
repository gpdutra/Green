const db = require('../Core/Database');

async function getBoletos(filters) {

    qry = 'SELECT * FROM boletos ';
    let whereClause = 'WHERE ';

    if(filters.length > 0){
        whereClause += await filters.join(' AND ');
        qry += whereClause;
    }
    
    try {

      const result = await db.query(qry);
      return result.rows;
    } catch (error) {
      console.error(error);
    }
}

async function insertBoleto(boleto) {
    try {        
        const query = 'INSERT INTO boletos (nome_sacado, id_lote, valor, linha_digitavel, ativo, criado_em) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING *';
        const values = [
            boleto.nome,
            boleto.id_lote,
            boleto.valor,
            boleto.linha_digitavel,
            true
        ];
        const result = await db.query(query, values);
        console.log('Usuário inserido com sucesso:', result.rows[0]);
        return 200;
    } catch (error) {
        console.error(error);
    }
}


async function getByName(name) {
    const query = 'SELECT * FROM boletos WHERE LOWER(nome_sacado) LIKE LOWER($1)';
    const values = [`%${name}%`]
    try {
        const result = await db.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error(error);   
    }
}

module.exports = {
    getBoletos,
    insertBoleto,
    getByName
}
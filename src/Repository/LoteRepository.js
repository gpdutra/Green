const db = require('../Core/Database');

async function getLotes() {
    try {
      const result = await db.query('SELECT * FROM lotes');
      console.log(result.rows);
      return result;
    } catch (error) {
      console.error(error);
    }
}

async function getLotesByName(name) {
    const query = 'SELECT * FROM lotes where nome = $1';
    const values = [name];
    try {
        const result = await db.query(query, values);   
        console.log('Consulta bem-sucedida:', result.rows[0]);
        return result.rows[0];
    } catch (error) {
      console.error(error);
    }
}


module.exports = {
    getLotes,
    getLotesByName
}

const LoteRepository = require('../Repository/LoteRepository')


async function getLotes() {

    const lotes = LoteRepository.getLotes();
    return lotes;
}

async function getLotesByName(nameLote) {

    const lotes = LoteRepository.getLotesByName(nameLote);
    return lotes;
}

module.exports = {
    getLotes,
    getLotesByName
}
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('./auth');
const { createLink, getLinkByShortUrl, incrementLinkUses, getLinksByUser } = require('./database');
const { generate } = require('./nanoid');

// Página de inicio
router.get('/', (req, res) => {
  res.render('index', {
    user: req.user
  });
});

// Página de enlaces del usuario
router.get('/mylinks', isLoggedIn, async (req, res) => {
  try {
    const links = await getLinksByUser(req.user.id);
    res.render('mylinks', {
      user: req.user,
      links
    });
  } catch (error) {
    console.error(error.message);
    res.sendStatus(500);
  }
});

// Crear un nuevo enlace
router.post('/newlink', isLoggedIn, async (req, res) => {
  const { url_original } = req.body;
  try {
    // Generar un nuevo identificador de enlace corto
    let short_url = generate();
    while (await getLinkByShortUrl(short_url)) {
      short_url = generate();
    }
    // Crear el enlace en la base de datos
    await createLink(req.user.id, url_original, short_url);
    res.redirect('/mylinks');
  } catch (error) {
    console.error(error.message);
    res.sendStatus(500);
  }
});

// Redirigir al enlace original
router.get('/:short_url', async (req, res) => {
  try {
    const link = await getLinkByShortUrl(req.params.short_url);
    if (!link) {
      res.sendStatus(404);
      return;
    }
    // Incrementar el número de usos del enlace y redirigir al enlace original
    await incrementLinkUses(link.id);
    res.redirect(link.url_original);
  } catch (error) {
    console.error(error.message);
    res.sendStatus(500);
  }
});

module.exports = router;

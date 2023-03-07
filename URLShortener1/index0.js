const express = require('express');
const app = express();
const shortid = require('shortid');
const validUrl = require('valid-url');
const mysql = require('mysql2');

app.use(express.urlencoded({ extended: false }));

// Conexión a la base de datos MySQL
const connection = mysql.createConnection({
  host: "localhost",
    user: "root",
    password: "root",
  database: 'shortener1'
});

connection.connect((err) => {
  if (err) {
    console.error(err.message);
    return;
  }
  console.log('Conectado a la base de datos de url shortener.');
});

// Crear tabla en la base de datos si no existe
connection.query(`CREATE TABLE IF NOT EXISTS links (
  id INT(11) NOT NULL AUTO_INCREMENT,
  short_id VARCHAR(255) UNIQUE,
  url TEXT NOT NULL,
  PRIMARY KEY (id)
)`, (err) => {
  if (err) {
    console.error(err.message);
    return;
  }
  console.log('Tabla links creada/verificada.');
});

app.get('/new/:url(*)', (req, res) => {
  let url = req.params.url;
  if (validUrl.isUri(url)) {
    // Generar un ID aleatorio y verificar si ya existe en la base de datos
    let shortId = shortid.generate();
    connection.query(`SELECT * FROM links WHERE short_id = ?`, [shortId], (err, results) => {
      if (err) {
        console.error(err.message);
        res.send({
          'error': 'Error de base de datos'
        });
        return;
      }
      if (results.length > 0) {
        // Si el ID aleatorio ya existe, generar uno nuevo
        shortId = shortid.generate();
      }
      // Insertar enlace acortado en la base de datos
      connection.query(`INSERT INTO links (short_id, url) VALUES (?, ?)`, [shortId, url], (err) => {
        if (err) {
          console.error(err.message);
          res.send({
            'error': 'Error de base de datos'
          });
          return;
        }
        console.log(`Enlace acortado insertado: ${shortId} -> ${url}`);
        // Devolver respuesta al usuario con el enlace acortado
        res.send({
          'short_url': `http://localhost:3000/${shortId}`
        });
      });
    });
  } else {
    res.send({
      'error': 'URL inválida'
    });
  }
});

app.get('/:shortId', (req, res) => {
  let shortId = req.params.shortId;
  // Buscar enlace acortado en la base de datos
  connection.query(`SELECT * FROM links WHERE short_id = ?`, [shortId], (err, results) => {
    if (err) {
      console.error(err.message);
      res.send({
        'error': 'Error de base de datos'
      });
      return;
    }
    if (results.length > 0) {
      // Redirigir al usuario a la URL original
      res.redirect(results[0].url);
    } else {
      res.send({
        'error': 'Enlace no encontrado'
      });
    }
  });
});

// Iniciar el servidor
app.listen(3000, () => {
  console.log('Servidor iniciado en http://localhost:3000');
});

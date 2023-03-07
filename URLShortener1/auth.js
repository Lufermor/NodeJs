const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const nanoid = require('nanoid');
const mysql = require('mysql2');

// Conexión a la base de datos MySQL
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'myuser',
  password: 'mypassword',
  database: 'mydatabase'
});

connection.connect((err) => {
  if (err) {
    console.error(err.message);
    return;
  }
  console.log('Conectado a la base de datos de acortador de enlaces.');
});

// Crear tabla en la base de datos si no existe
connection.query(`CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  displayName VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY email (email)
)`, (err) => {
  if (err) {
    console.error(err.message);
    return;
  }
  console.log('Tabla de usuarios creada/verificada.');
});

router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login',
  passport.authenticate('local', { failureRedirect: '/auth/login', failureFlash: true }),
  (req, res) => {
    res.redirect('/');
  }
);

router.get('/register', (req, res) => {
  res.render('register');
});

router.post('/register', (req, res) => {
  const id = nanoid.nanoid();
  const email = req.body.email;
  const displayName = req.body.displayName;
  const password = req.body.password;
  
  // Verificar si el correo electrónico ya está en uso
  connection.query(`SELECT * FROM users WHERE email = ?`, [email], (err, results) => {
    if (err) {
      console.error(err.message);
      return;
    }
    if (results.length > 0) {
      req.flash('error', 'El correo electrónico ya está en uso.');
      res.redirect('/auth/register');
    } else {
      // Crear un nuevo usuario
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
          console.error(err.message);
          return;
        }
        const newUser = {
          id: id,
          email: email,
          displayName: displayName,
          password: hash
        };
        connection.query(`INSERT INTO users SET ?`, newUser, (err) => {
          if (err) {
            console.error(err.message);
            return;
          }
          req.flash('success', 'Usuario creado con éxito.');
          res.redirect('/auth/login');
        });
      });
    }
  });
});

router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

module.exports = router;

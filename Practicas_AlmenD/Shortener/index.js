// importamos los paquetes necesarios
const express = require('express');
const mysql = require('mysql2');
const app = express();
const session = require('express-session');
const bp = require('body-parser');
const alert = require('alert');
var userLogin = "";
var idUser = "";
const nanoid = require('nanoid');

const port = 3000;

//Creamos la conexión a la base de datos
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "shortener1"
});

con.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
});

// Realiza lo necesario para parsear el body y poder recoger datos del html mientras 
// usamos express a la vez.
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

// Rutas
// El /index nos devuelve los enlaces donde el id usuario sea el mismo que el
// usuario logeado
app.get("/index", (req, res) => {
  con.query(`select * from enlaces where ${idUser} = idUser`, function (err, todos, fields) {
    res.render("index.ejs", { todos, userLogin });
  });
});

// En añadir url creamos una dirección reducida aleatoria y la añadimos a la base 
// de datos con su url larga correspondiente
app.post("/anadirUrl", (req, res) => {
  if (req.body.enlace == "") {
    alert("Escribe un enlace");
  }
  else {
    console.log(" Id del usuario: " + idUser);
    id = nanoid.nanoid(5).toString();
    var fecha = new Date();
    let hoy = fecha.getDate() + " - " + (fecha.getUTCMonth() + 1) + " - " + fecha.getFullYear();
    con.query(`insert into enlaces
    (id, idUser, url, urlcorta, usos, fecha)
    values
    ('${id}',${idUser},'${req.body.enlace}','${id}', 0,'${hoy}')`);
    alert("Enlace añadido correctamente");
    con.query(`select * from enlaces where ${idUser} = idUser`, function (err, todos, fields) {
      res.render("index.ejs", { todos, userLogin });
    });
  }
});

// Redirige a la url larga y aumenta en uno los usos de la url acortada
app.get("/e/:id", (req, res) => {
  console.log(req.params.id);
  con.query(`select * from enlaces where '${req.params.id}' = id`, function (err, result) {
    res.redirect(result[0].url);
    usos = result[0].usos + 1;
    con.query(`UPDATE enlaces SET usos = ${usos} where '${req.params.id}' = id`, function (err, result) {
    });
  });
});

// Elimina la url con el id recibido
app.post("/x:id", (req, res) => {
  console.log(req.params.id);
  con.query(`delete from enlaces where '${req.params.id}' = id`, function (err, result) {
    alert("Enlace eliminado correctamente");
  });
  con.query(`select * from enlaces where ${idUser} = idUser`, function (err, todos, fields) {
    res.render("index.ejs", { todos, userLogin });
  });
});

// Devuelve la pagina login.ejs
app.get("/", (req, res) => {
  res.render("login.ejs");
});

// Iniciamos servidor
app.listen(port, () =>
  console.log(`Server abierto = ${port}`));

app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: 'SECRET'
}));

/*  PASSPORT SETUP  */
const passport = require('passport');
var userProfile;

app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');

// Devuelve el index si el login ha sido aeptado o devuelve error si se ha puesto
// un usuario o contraseña erroneos
app.get('/success', (req, res) => res.redirect('/index'));
app.get('/error', (req, res) => res.send("error logging in"));

passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});


/*  Google AUTH  */

const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const GOOGLE_CLIENT_ID = '970852492779-k3lrcn2dfbbj3geh1fgrnr2s1blr00kq.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/callback"
},
  // Creamos el id usuario y recogemos su nombre en dos variables
  function (accessToken, refreshToken, profile, done) {
    userProfile = profile;
    userLogin = userProfile.name.givenName;
    idUser = userProfile.id;
    console.log(userProfile.username);
    console.log(userProfile.name.givenName);
    console.log(userProfile.id);
    return done(null, userProfile);
  }
));

// Devuelve la página de para logearse en google
app.post('/iniciarSesion',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/error' }),
  function (req, res) {
    // Successful authentication, redirect success.
    res.setHeader('Cache-Control', 'no-cache');
    res.redirect('/success');
  });

// Elimina las variables de usuario y devuelve a la página de login
app.post("/cerrarSesion", (req, res) => {
  idUser = "";
  userLogin = "";
  res.setHeader('Cache-Control', 'no-cache');
  res.render("login.ejs");
});
// importamos los paquetes necesarios
const express = require('express');
const mysql = require('mysql2');
const app = express();
const session = require('express-session');
const bp = require('body-parser');
const alert = require('alert');
const generateApikey = require('generate-api-key');
var userLogin = "";
var idUser = "";
const port = 3000;
// var bol = false;
const util = require('util');
var userApiKey = "Null";
var permisos = 0;

//Creamos la conexión a la base de datos
var con = mysql.createConnection({
  host: "localhost",
  user: "DiegoAl",
  password: "123",
  database: "Adopciones"
});


con.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
});

const com = util.promisify(con.query).bind(con);
// Realiza lo necesario para parsear el body y poder recoger datos del html mientras 
// usamos express a la vez.
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

// Rutas
// El /index nos devuelve los enlaces donde el id usuario sea el mismo que el
// usuario logeado
app.get("/index2", (req, res) => {
  res.render("index2.ejs", {api: userApiKey, permisos});
});

app.get("/index", (req, res) => {
    res.render("index.ejs");
});

app.post("/buscarRedirect", (req, res) => {
  res.redirect(req.body.codigo);
});

app.post("/explicacion", (req, res) => {
  res.render("explicacion.ejs");
});

// Comprueba si hay un usuario logeado, si no lo hay devuelve al html de login
app.post("/volver2", (req, res) => {
  if(userApiKey == "Null"){
    res.redirect("/");
  }
  else{
    res.redirect("index2")
  }
});

// Comprueba los permisos actuales y los cambia.
app.post("/changePermisos", (req, res) => {
  if(permisos == 1){
    permisos = 2
  }
  else{
    permisos = 1
  }
  con.query(`UPDATE usuario SET permisos = ${permisos} WHERE (id = ${idUser});`, 
  function (err, result) {
  });
  res.redirect("index2");
});

// Crea una nueva apiKey y la modifica en la base de datos.
app.post("/changeApi", (req, res) => {
  userApiKey = generateApikey.generateApiKey();
  console.log(typeof(userApiKey));
  userApiKey = userApiKey.replaceAll("/","(");
  con.query(`UPDATE usuario SET api_key = '${userApiKey}' WHERE (id = ${idUser});`, 
  function (err, result) {
  });
  res.redirect("index2");
});

// Llamada a la api en la que devolvemos los datos de una mascota.
app.get("/:api/mascotas/:id", (req, res) => {
  console.log(`id recibida a buscar ${req.params.id}`);
  // Comprobamos si la api existe en la base de datos
  con.query(`select * from usuario where '${req.params.api}' = api`,  function (err, result) {
    var userFound = false;
    if(result.length < 1){
      userFound = false;
      console.log("No se encontró un usuario con la apiKey dada.");
    } else {
      userFound = true;
      console.log("Usuario con apiKey dada, encontrado en la DB.");
    }
    if(userFound){
      // Realiza la select de los datos de la mascota y los devuelve en un json.
      con.query(`select * from mascotas where '${req.params.id}' = id`, function (err, result) {
        resultado = anadirJson(result);
        res.setHeader("Content-Type", "application/json");
        res.writeHead(200);
        res.end(JSON.stringify(resultado, null, 3));
      });
    }
    else{
      res.send("La api no es correcta");
    }
  });
});

// Llamada a la api en la que devolvemos la protectora de una mascota.
app.get("/:api/mascotas/protectora/:id", (req, res) => {
  // Comprobamos si la api existe en la base de datos
  con.query(`select * from usuario where '${req.params.api}' = api`,  function (err, result) {
    var userFound = false;
    if(result.length < 1){
      userFound = false;
      console.log("No se encontró un usuario con la apiKey dada.");
    } else {
      // Si existe en la base de datos comprueba si tiene los permisos necesarios.
      if(result[0].permisos === 2){
        userFound = true;
      }
      else{
        res.send("No tiene los permisos necesarios para realizar esta petición");
        userFound = false;
      }
    }
    if(userFound){
      // Realiza la select de la protectora de mascotas y la devuelve en un json.
      con.query(`select protectora from mascotas where '${req.params.id}' = id`, function (err, result) {
        var datos = [];
        var objeto = {};
        datos.push({
          "Protectora": result[0].protectora,
        });
        objeto.protectoras = datos;
        res.setHeader("Content-Type", "application/json");
        res.writeHead(200);
        res.end(JSON.stringify(datos[0], null, 3));
      });
    }
  });
});

// En esta funcion creamos el json de mascota con los datos recibidos de la query(todos).
function anadirJson(todos) {
  var datos = [];
  var objeto = {};
  for (var i = 0; i < todos.length; i++) {
    datos.push({
      "nombre": todos[i].nombre,
      "raza": todos[i].raza,
      "sexo": todos[i].sexo
    });
  }
  objeto.mascota = datos
  return objeto;
}

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
app.get('/success', (req, res) => res.redirect('/index2'));
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
    console.log("id del usuario" + idUser);
    // Realizar una query buscando si el id del usuario está en la base de datos
    con.query(`select * from usuario where '${idUser}' = id`, function (err, result) {
      console.log("resultados con el idUser = " + result.length);
      // Si el id no existe crea un nuevo usuario con permisos 1 y una apiKey nueva.
      if (result.length == 0) {
        userApiKey = generateApikey.generateApiKey();
        userApiKey = userApiKey.replaceAll("/","(");
        permisos = 1;
        con.query(`insert into usuario (id, nombre, api, permisos)
        values
        (${idUser},'${userLogin}','${userApiKey}', ${permisos})`, function (err, result) {
          console.log("dentro del insert"); //TODO: cambiar esto
        });
      }
      else{
        userApiKey = result[0].api;
        permisos = result[0].permisos;
      }
    });
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
  permisos = 0;
  res.setHeader('Cache-Control', 'no-cache');
  userApiKey = "Null";
  res.render("login.ejs");
});



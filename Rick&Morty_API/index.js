const express = require('express');
const app = express();
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const alert = require('alert');
const generateApikey = require('generate-api-key');
//const fetch = require('node-fetch');
//const nanoid = require('nanoid');
//const { nanoid } = require('nanoid');
//import { nanoid } from 'nanoid';
const shortid = require('shortid');
var userApiKey = "Null";
var permisos = 0;

app.set('view engine', 'ejs');
app.use(express.static('public'));

// Realiza lo necesario para parsear el body y poder recoger datos del html mientras 
// usamos express a la vez.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

// Conexión a la base de datos MySQL
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'rick_morty_api_db'
});

connection.connect((err) => {
    if (err) {
        console.error(err.message);
        return;
    }
    console.log('Conectado a la base de datos de la api Rick y Morty.');
});

// Crear tabla en la base de datos si no existe
connection.query(`CREATE TABLE IF NOT EXISTS rick_morty_api_db.usuarios (
  id VARCHAR(255) NOT NULL,
  api_key VARCHAR(255) NOT NULL,
  permisos INT NOT NULL DEFAULT 1,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY api_key (api_key)
)`, (err) => {
    if (err) {
        console.error(err.message);
        return;
    }
    console.log('Tabla de usuarios creada/verificada.');
});

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GOOGLE_CLIENT_ID = '27100042038-ui30qinsg5jlipadj9jr4bddomoi8j9a.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/callback'
},
    (accessToken, refreshToken, profile, done) => {
        // Guardar información del usuario en sesión
        userProfile = profile;
        connection.query(`select * from usuarios where '${profile.id}' = id`, function (err, results) {
            if (err) {
                console.error(err.message);
                return res.sendStatus(500);
            }
            // Si el id no existe, crea un nuevo usuario con permisos 1 y una apiKey nueva.
            if (results.length == 0) {
              userApiKey = generateApikey.generateApiKey();
              userApiKey = userApiKey.replaceAll("/","(");
              permisos = 1;
              connection.query(`insert into usuarios (id, api_key)
              values (${profile.id}, '${userApiKey}')`, function (err, result) {
                if (err) {
                    console.error(err.message);
                    return res.sendStatus(500);
                }else {
                    console.log(`Usuario ${profile.displayName} insertado en la base de datos`);
                }
              });
            }else{
              userApiKey = results[0].api;
              permisos = results[0].permisos;
            }
          });
        const user = {
            id: profile.id,
            displayName: profile.displayName,
            //profilePicUrl: profile._json.image.url, //esto no sé si funciona
            profilePic: profile.photos[0].value, //esto no sé si funciona
        };
        done(null, user);
    }
));

app.get('/success', (req, res) => res.redirect('/home'));
app.get('/error', (req, res) => {
    res.send("Error iniciando sesion");
    res.render('error.ejs', {
        user: null,
        message: "Error iniciando sesion", 
        baseUrl: 'http://localhost:3000/',
    });
});

passport.serializeUser(function(user, cb) {
    cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
});

// Página de inicio
app.get('/', (req, res) => {
    res.render('auth.ejs', {
        user: req.user
    });
});

// Página de autenticación de Google
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }));

// Callback de autenticación de Google
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/error' }),
    (req, res) => {
        // Successful authentication, redirect success.
        res.redirect('/success');
    });

var addSuccess = null;
var addError = null;
// Página de enlaces del usuario
app.get('/home', isLoggedIn, (req, res) => {
    // Obtener los enlaces del usuario de la base de datos
    console.log('Entrando en /home')
    connection.query(`SELECT * FROM rick_morty_api_db.usuarios WHERE id = ?`, [req.user.id], (err, results) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error al obtener los datos del usuario.');
        }
        res.render('profile.ejs', { //Esta página será la página de perfil del usuario
            user: req.user,
            userApiKey : results[0].api_key, 
            permisos: results[0].permisos, 
            baseUrl: 'http://localhost:3000/',
        });
    });
});

// Crea una nueva apiKey y la modifica en la base de datos.
app.get("/changeKey", isLoggedIn, (req, res) => {
    userApiKey = generateApikey.generateApiKey();
    userApiKey = userApiKey.replaceAll("/","(");
    connection.query(`UPDATE rick_morty_api_db.usuarios SET api_key = '${userApiKey}' WHERE (id = ${req.user.id});`, 
    function (err, result) {
    });
    res.redirect("/home");
});

//Petición que lanza una consulta a la api para obtener los datos del personaje del que se pasa su id
app.get("/character/:idCharacter?", isLoggedIn,(req, res) =>{
    console.log("Entramos en /character/:idCharacter?");
    console.log(`id del personaje obtenida = ${req.query.idCharacter}`);
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200); 
    let charId = "" + `${req.query.idCharacter}`;
    const jsonContent = JSON.stringify(getCharacter(req.query.idCharacter), null, 3); 
    return res.end(jsonContent);
    connection.query(`SELECT trofeo.nombre FROM fecha join trofeo  ON fecha.trofeo_id = trofeo.id 
            WHERE fecha.equipo_id = ?`, [req.query.idCharacter], function (error, results, fields) {
        if (error) throw error;
        
        res.setHeader("Content-Type", "application/json");
        res.writeHead(200); 

        results.forEach(result => {
            console.log(result);
            //res.write(JSON.stringify(result, null, 3));
        });
        
        //Formateamos el resultado en JSON
        const jsonContent = JSON.stringify(results, null, 3); 
        console.log(typeof(jsonContent));
        console.log(typeof(JSON.parse(jsonContent)));
        res.end(jsonContent);
        //res.send(JSON.parse(jsonContent)); 
        //res.end();
    });
});

// función que realiza la petición a la API pública y devuelve el JSON
async function getCharacter(id) {
    let response;
    await import('node-fetch').then( fetch => {
      response = fetch(`https://rickandmortyapi.com/api/character/${id}`);
      console.log(response);
      //return response;
    }).catch(err => {
      console.log(err.message);
    });
    const data = await response.json();
    return data;
  }  

// Agregar un nuevo enlace
app.post('/add', isLoggedIn, (req, res) => {
    console.log('Entramos en post add')
    console.log(`URL leida = ${req.body.newUrl}`)
    if (req.body.newUrl == "") {
        alert("Escribe un enlace");
    }else{
        const url_original = req.body.newUrl;
        //const short_url = nanoid.nanoid(7).toString();
        var short_url = shortid.generate();
        connection.query(`SELECT * FROM links WHERE url_original = ?`, [url_original], (err, results) => {
            if (err) {
                addError = "Error al realizar query en la base de datos.";
                addSuccess = null;
                console.error(err.message);
                return res.sendStatus(500);
            }
            if (results.length > 0) {
                // Si se obtiene algún resultado, significa que la url original ya tiene una url acortada asignada
                short_url = results[0].short_url;
                addSuccess = short_url;
                addError = null;
                return res.redirect('/home');
            }else{
                const userId = req.user.id;
                connection.query(`INSERT INTO links (id, userId, url_original, short_url) VALUES (?, ?, ?, ?)`, [short_url, userId, url_original, short_url], (err, results) => {
                    if (err) {
                        addError = "Error al insertar nueva url.";
                        addSuccess = null;
                        console.error(err.message);
                        return res.sendStatus(500);
                    }
                    addSuccess = short_url;
                    addError = null;
                    return res.redirect('/home');
                });
            }
        });
    }
});

// Elimina la url con el id recibido
app.get("/delete/:id", (req, res) => {
    console.log(`URL a borrar = ${req.params.id}`);
    addSuccess = null;
    addError = null;
    connection.query(`DELETE FROM links WHERE '${req.params.id}' = id`, function (err, result) {
        alert("Enlace eliminado correctamente");
    });
    res.redirect('/home');
});

// Redirigir a la URL original
app.get('/redir/:short_url', (req, res) => {
    const short_url = req.params.short_url;
    console.log(`URL leida  en redirect= ${short_url}`);
    addSuccess = null;
    addError = null;
    connection.query(`SELECT * FROM links WHERE id = ?`, [short_url], (err, results) => {
        if (err) {
            console.error(err.message);
            return res.sendStatus(500);
        }
        if (results.length === 0) {
            return res.sendStatus(404);
        }
        
        // Incrementar el contador de usos
        connection.query(`UPDATE links SET usos = usos + 1 WHERE short_url = ?`, [short_url], (err) => {
            if (err) {
                console.error(err.message);
            }
        });
        const laUrlOriginal = results[0].url_original;
        console.log(`URL original obtenida en redirect= ${laUrlOriginal}`);
        return res.redirect(laUrlOriginal);
    });
});

// Función para verificar si el usuario ha iniciado sesión
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/google');
}

// Logging out: Elimina la variable de user y redirige a la página de autenticación
app.get('/auth/logout', (req, res, next) => {
    console.log("Entramos a /auth/logout");
    user = null;
    req.logout(function(err) {
        if (err) { return next(err); }
        res.setHeader('Cache-Control', 'no-cache');
        req.session = null;
        res.redirect('/');
    });
});

// Iniciar el servidor
const port = 3000;
app.listen(port, () => {
    console.log(`Servidor iniciado en el puerto ${port}`);
});

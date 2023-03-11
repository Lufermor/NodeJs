const express = require('express');
const app = express();
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const alert = require('alert');
const generateApikey = require('generate-api-key');
const shortid = require('shortid');
//Usamos axios para ayudarnos a obtener datos de la API pública:
const axios = require('axios');
var userApiKey = "Null";
var userPermisos = 0;

//Importamos cosas de nuestro fichero database
const { queryDatabase, conectarADataBase, connection } = require('./database');

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

// Conexión a la base de datos MySQL usando la función exportada del fichero database
conectarADataBase();

//Se realiza la autenticación de google, se carga un usuario si existe en la BBDD y sino, se crea uno nuevo con una api key nueva
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
              userPermisos = 1;
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
              userPermisos = results[0].permisos;
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

// Redirige a la petición que nos da el perfil en caso de que la autenticación sea exitosa
app.get('/success', (req, res) => res.redirect('/home'));
// carga la pagina de error que le muestra un mensaje de error al usuario.
app.get('/error', (req, res) => {
    //res.send("Error iniciando sesion");
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

// mapea la petición barra, comprueba si el usuario ya se ha autenticado, en cuyo caso lleva a la pagina de inicio, sino a la de autenticación
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/home');
    }
    res.render('auth.ejs');
});

// Página de autenticación de Google
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }));

// Callback de autenticación de Google
app.get('/auth/google/callback',
    // Si la autenticación es correcta, redirige a la petición error
    passport.authenticate('google', { failureRedirect: '/error' }),
    (req, res) => {
        // Si la autenticación es correcta, redirige a la petición success
        res.redirect('/success');
    });

var errorDePermisos = null;
// Página de enlaces y del perfil del usuario
app.get('/home', isLoggedIn, (req, res) => {
    // obtiene los datos del usuario de la base de datos
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
            errorDePermisos,
        });
    });
});

app.get('/documentacion', isLoggedIn, (req, res) => {
    // Obtener los enlaces del usuario de la base de datos
    console.log('Entrando en /documentacion')
    res.render('documentacion.ejs', { //Esta página será la página de documentación
        user: req.user,
    });
});

// Crea una nueva apiKey y la modifica en la base de datos.
app.get("/changeKey", isLoggedIn, (req, res) => {
    userApiKey = generateApikey.generateApiKey();
    userApiKey = userApiKey.replaceAll("/","(");
    errorDePermisos = null;
    connection.query(`UPDATE rick_morty_api_db.usuarios SET api_key = '${userApiKey}' WHERE (id = ${req.user.id});`, 
        function (err, result) {
            if (err) {
                console.error(err);
                res.status(500).send("Error interno del servidor al obtener datos de la base de datos");
                return;
              }
        });
    res.redirect("/home");
});

// Cambia el nivel de permisos del usuario
app.get("/cambiarPermisos", isLoggedIn, (req, res) => {
    if(userPermisos === 1) userPermisos = 2;
    else userPermisos = 1;
    errorDePermisos = null;
    queryDatabase(`UPDATE usuarios SET permisos = ? WHERE id = ?`, [userPermisos, req.user.id],
        (err, results) => {
            if (err) {
                console.error(err);
                res.status(500).send("Error interno del servidor al obtener datos de la base de datos");
                return;
              }
        }
    );
    res.redirect("/home");
  });

//Petición que recibe un parámetro realiza una consulta a la base de datos, devuelve los resultados en formato json
app.get("/location/:locationName?", isLoggedIn,(req, res) =>{
    errorDePermisos = null;
    queryDatabase('SELECT * FROM locations WHERE name LIKE ?', [`%${req.query.locationName}%`],
      (err, results) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error interno del servidor al obtener datos de la base de datos");
          return;
        }
        res.setHeader("Content-Type", "application/json");
        res.status(200).send(JSON.stringify(results, null, 3));
      }
    );
});

//Petición que recibe un parámetro idCharacter, realiza una consulta a la base de datos, devuelve los resultados en formato json
app.get("/mycharacter/:idCharacter?", isLoggedIn, (req, res) => {
    //console.log("Entrando en /mycharacter/:idCharacter?");
    errorDePermisos = null;
    queryDatabase(`SELECT * FROM rick_morty_api_db.characters WHERE id = ?`, [req.query.idCharacter],
      (err, results) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error interno del servidor al obtener datos de la base de datos");
          return;
        }
        res.setHeader("Content-Type", "application/json");
        res.status(200).send(JSON.stringify(results, null, 3));
      }
    );
  });  

//Petición que recibe dos parámetros, comprueba si los permisos son adecuados y realiza una consulta a la base de datos, devuelve los resultados en formato json
app.get("/mycharacter2/:nameCharacter?:characterStatus?", isLoggedIn,(req, res) =>{

    if(!(userPermisos === 2)){
        errorDePermisos =  "Error de permisos ¡Necesitas un nivel de permisos 2 para ejecutar esta petición!";
        return res.redirect('/home');
    } else errorDePermisos = null;
    queryDatabase('SELECT * FROM characters WHERE name LIKE ? AND status LIKE ?', [`%${req.query.nameCharacter}%`, `%${req.query.characterStatus}%`],
      (err, results) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error interno del servidor al obtener datos de la base de datos");
          return;
        }
        res.setHeader("Content-Type", "application/json");
        res.status(200).send(JSON.stringify(results, null, 3));
      }
    );
});

//Petición que lanza una consulta a la api para obtener los datos del personaje del que se pasa su id
app.get("/character/:idCharacter?", isLoggedIn,(req, res) =>{
    
    let charId = "" + `${req.query.idCharacter}`;
    getCharacter(req.query.idCharacter)
        .then(data => {
            res.setHeader("Content-Type", "application/json");
            res.writeHead(200);
            const jsonContent = JSON.stringify(data, null, 3); 
            return res.end(jsonContent);
        })
        .catch(error => { 
            console.error(error);
            return res.send(error);
        });
});

//Ahora vamos a solicitar los datos de la API pública
// Función que realiza la petición a la API pública para obtener un personaje y devuelve el JSON
async function getCharacter(id) {
    try {
        const response = await axios.get(`https://rickandmortyapi.com/api/character/${id}`);
        return response.data;
    } catch (error) {
        console.error(error);
    }
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
    return res.redirect('/');
}

// Logging out: Elimina la variable de user y redirige a la página de autenticación
app.get('/auth/logout', (req, res, next) => {
    console.log("Entramos a /auth/logout");
    user = null;
    userApiKey = "Null";
    userPermisos = 0;
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

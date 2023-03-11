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
var permisos = 0;

//Importamos cosas de nuestro fichero database
const { cargarLocations, queryDatabase, conectarADataBase, connection } = require('./database');

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
// Cargamos datos en nuestra tabla locations de la BBDD, esta función sólo necesita ejecutarse una vez, por lo que ya después estará comentada siempre.
// cargarLocations('https://rickandmortyapi.com/api/location');


// getLocations()
//     .then(data => {
//         insertLocations(data.results);
//         console.log("Ubicaciones cargadas en la BBDD");
//     })
//     .catch(error => {
//         console.error(error);
//         return res.status(500).send(error);
//     });

// Con esta función vamos a cargar automáticamente nuestra tabla characters de la BBDD 
//con los datos de la API pública original
// getCharacters()
//     .then(data => {
//         insertCharacters(data.results);
//         console.log("Personajes cargados en la BBDD");
//     })
//     .catch(error => {
//         console.error(error);
//         return res.status(500).send(error);
//     });


function dataBaseLocations(req, res, next) {
    getLocations()
        .then(data => {
            insertLocations(data.results);
        })
        .catch(error => { 
            console.error(error);
            return res.status(500).send(error);
        });
}
// function dataBaseCharacters(req, res, next) {
//     if (req.isAuthenticated()) {
//         return next();
//     }
//     res.redirect('/auth/google');
// }

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

// Redirige a la petición que nos da el perfil en caso de que la autenticación sea exitosa
app.get('/success', (req, res) => res.redirect('/home'));
// carga la pagina de error que le muestra un mensaje de error al usuario.
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

// mapea la petición barra, comprueba si el usuario ya se ha autenticado, en cuyo caso lleva a la pagina de inicio, sino a la de autenticación
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/home', {
            user: req.user
        });
    }
    res.redirect('/auth/google');
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
    
    let charId = "" + `${req.query.idCharacter}`;
    getCharacter(req.query.idCharacter)
        .then(data => {
            res.setHeader("Content-Type", "application/json");
            res.writeHead(200); 
            console.log(data);
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

// función que realiza la petición a la API pública para obtener una lista de personajes y devuelve el JSON
async function getCharacters() {
    try {
        const response = await axios.get(`https://rickandmortyapi.com/api/character`);
        return response.data;
    } catch (error) {
        console.error(error);
    }
}





//Función que inserta en la tabla characters de la base de datos, los datos obtenidos de un json
function insertCharacters(characters) {

    for (const character of characters) {
        const query = `INSERT INTO characters (id, name, status, species, type, gender, origin_id, location_id, image, url, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const { id, name, status, species, type, gender, origin, location, image, url, created } = character;
        const origin_name = origin.name;
        const origin_url = origin.url;
        const location_name = location.name;
        const location_url = location.url;
        const created_at = new Date(created).toISOString().slice(0, 19).replace('T', ' ');
        
        const originResult = connection.query('SELECT id FROM locations WHERE name = ? AND url = ?', [origin_name, origin_url]);
        // Verificar si la ubicación ya existe en la tabla locations
        let originId;
        if (originResult[0]) {
            originId = originResult[0].id;
        } else originId = 1;

        const locationResult = connection.query('SELECT id FROM locations WHERE name = ? AND url = ?', [location_name, location_url]);
        // Verificar si la ubicación ya existe en la tabla locations
        let locationId;
        if (locationResult[0]) {
            locationId = locationResult[0].id;
        } else locationId = 1;

        const values = [id, name, status, species, type, gender, originId, locationId, image, url, created_at];

        connection.execute(query, values);
    }

    //await connection.end();
}

async function insertCharacters2(characters) {
    for (const character of characters) {
        const locationName = character.origin.name;
        const locationUrl = character.origin.url;

        // Verificar si la ubicación ya existe en la tabla locations
        let locationId;
        try {
            const locationResult = await pool.query('SELECT id FROM locations WHERE name = ? AND url = ?', [locationName, locationUrl]);
            if (locationResult[0]) {
                locationId = locationResult[0].id;
            } else {
                const insertLocationResult = await pool.query('INSERT INTO locations (name, url) VALUES (?, ?)', [locationName, locationUrl]);
                locationId = insertLocationResult.insertId;
            }
        } catch (error) {
            console.error(error);
        }

        // Insertar datos del personaje en la tabla characters
        try {
            await pool.query('INSERT INTO characters (id, name, status, species, type, gender, image, url, created, location_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [character.id, character.name, character.status, character.species, character.type, character.gender, character.image, character.url, character.created, locationId]);
        } catch (error) {
            console.error(error);
        }
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

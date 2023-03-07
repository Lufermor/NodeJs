//IMportamos express
const express = require('express');
const mysql = require('mysql2');
//const mysql = require('mysql');

//const session = require('express-session');


//Creamos e Inicializamos un servidor de express vacío
const app = express();

//Creamos una variable que almacena el puerto en el que queremos que ese servidor se quede escuchando
const port = 3000;

app.set('view engine', 'ejs');
app.set('json spaces', 2);

const bodyParser = require('body-parser');

// ...

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


//Creamos la conexión con la base de datos:

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: 'examen_sge_trimestre2_luis_moreno',
});

con.connect(function(err){
    if(err) console.log("Error al conectar con la BBDD");
    else console.log("Connected")
});

//Creamos las rutas:
//Mi servidor cuando reciba una petición rest:
app.get("/", (req, res) =>{ //Observemos que get es el tipo de petición, podría ser post, delete, etc.
    //Dentro del paréntesis anterior, req: contiene todo lo que viaja del cliente al servidor, ej: usuario y contraseña
    //res: contiene lo que viaja del servidor al cliente como respuesta, ej: página de perfil si las credenciales son correctas
    //res.send('Hello Examen!');
    res.render('index');
});
//Hemos creado el servidor, ahora nos faltan las rutas

//Con esta línea, inicializamos el servidor, le decimos que el servidor se quede escuchando
//peticiones en el puerto port, y cuando reciba una petición nos indicará por consola el texto
//que le estamos escribiendo en console log
app.listen(port, () => console.log(`Server opened at port = ${port}`));


//Petición random porque el examen va sobre futbol
app.get("/futbol", (req, res) =>{
    res.send("A la people le encanta el futbol");
});

//Petición que lanza una consulta a la base de datos para obtener los equipos de futbol guardados
app.get("/showTeams", (req, res) =>{
    console.log('Entramos en showTeams');
    con.query('SELECT * FROM equipo', function (error, results, fields) {
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
})

//Petición que lanza una consulta a la base de datos para obtener los trofeos guardados
app.get("/showTrophies/", (req, res) =>{
    console.log('Entramos en showTrophies');
    con.query('SELECT * FROM trofeo', function (error, results, fields) {
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
})

//Petición que lanza una consulta a la base de datos para obtener los trofeos guardados según el equipo
app.get("/showTrophiesTeam/:idTeam?", (req, res) =>{
    console.log("Entramos en /showTrophiesTeam/:idTeam")
    console.log(`id del equipo obtenida = ${req.query.idTeam}`);
    con.query(`SELECT trofeo.nombre FROM fecha join trofeo  ON fecha.trofeo_id = trofeo.id 
            WHERE fecha.equipo_id = ?`, [req.query.idTeam], function (error, results, fields) {
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
})

//Petición que muestra en formato JSON toda la información de los equipos
//que han ganado alguna vez el trofeo cuya id es [idTrophie] pasada como parámetro de la
//petición POST, junto a la fecha en la que la ganaron.
app.post("/winnersTrophie", (req, res) =>{
    console.log("Entramos en /winnersTrophie/")
    console.log(`id del trofeo obtenida = ${req.body.trophieId}`);
    con.query(`SELECT equipo.*, fecha.fecha FROM fecha
    JOIN equipo ON fecha.equipo_id = equipo.id
    WHERE fecha.trofeo_id = ?`, [req.body.trophieId], function (error, results, fields) {
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
})

//IMportamos express
const express = require('express');

//const session = require('express-session');


//Creamos e Inicializamos un servidor de express vacío
const app = express();

//Creamos una variable que almacena el puerto en el que queremos que ese servidor se quede escuchando
const port = 3000;

app.set('view engine', 'ejs');
app.set('json spaces', 2);

//Creamos las rutas:
//Mi servidor cuando reciba una petición rest:
app.get("/", (req, res) =>{ //Observemos que get es el tipo de petición, podría ser post, delete, etc.
    //Dentro del paréntesis anterior, req: contiene todo lo que viaja del cliente al servidor, ej: usuario y contraseña
    //res: contiene lo que viaja del servidor al cliente como respuesta, ej: página de perfil si las credenciales son correctas
    //  res.send('Hello world!');
    res.render('index');
});
//Hemos creado el servidor, ahora nos faltan las rutas

//Con esta línea, inicializamos el servidor, le decimos que el servidor se quede escuchando
//peticiones en el puerto port, y cuando reciba una petición nos indicará por consola el texto
//que le estamos escribiendo en console log
app.listen(port, () => console.log(`Server opened at port = ${port}`));

//Escribimos en consola npm start para ejecutar e iniciar el servidor
//Ahora abrimos nuestro navegador y abrimos: localhost:3000

app.get("/futbol", (req, res) =>{
    res.send("A la people le encanta el futbol");
    //Si quisieramos cargar una página pondríamos:
    //res.render("index");
})

//Creamos una carpeta llamada static, que es donde tendremos los estilos

//instalamos mysql en nodejs: 
//npm install mysql

//Creamos la conexión con la base de datos:
var mysql = require('mysql');

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root"
});

con.connect(function(err){
    if(err) throw err;
    else console.log("Connected")
})

/* Ahora vamos a crear una segunda ruta : /mostrarUsuarios
Esta petición será de tipo get 
Ahora, como la variable con está creada arriba y fuera de cualquier método, 
    quiere decir que esta variable está accesible desde cualquier lugar del proyecto?

    */

app.get("/mostrarUsuarios", (req, res) =>{
    con.query('SELECT * FROM nodejs_db1.usuarios', function (error, results, fields) {
        if (error) throw error;
        
        /* res.setHeader("Content-Type", "application/json");
        res.writeHead(200); */

        results.forEach(result => {
            console.log(result);
            res.write(JSON.stringify(result, null, 3));
        });
        //res.send(); //Esto aquí funciona, pero hay que formatearlo un poco, el problema es que si queremos enviar más cosas después, las líneas de abajo dan error

        //res.send(results)
        const jsonContent = JSON.stringify(results, null, 3); // No sé por qué ese null, 3
        console.log(typeof(jsonContent));
        console.log(typeof(JSON.parse(jsonContent)));
        res.end(jsonContent);
        //res.send(JSON.parse(jsonContent)); 
        //res.end();
    });
});

//con.end();

/**Ahora queremos que la aplicación get a '/' nos cargue un index
 * Nos pide que lo hagamos con la función render
 * render nos obliga a que la función que se cargue no sea un html sino un ejs?
 * la petición get de  / que nos renderice el index?
 * tenemos que crear un index.ejs que lo que tiene dentro es html puro
 */

/**
 * Lo último es que modifiquemos el index para que hayan dos input text y un botón
 * En el primer input se pone el user y en el otro el pass
 *  -----ALGO AQUÍ
 * Esos dos datos que han viajado están en req
 */

/* app.get("/", (req, res) =>{
    res.render(index);
}); */
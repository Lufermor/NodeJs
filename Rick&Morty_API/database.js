const mysql = require('mysql2');
//Usamos axios para ayudarnos a obtener datos de la API pública:
const axios = require('axios');

// Configuración de la conexión a la base de datos
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'rick_morty_api_db'
});

// Conectar a la base de datos

// Conecta a la base de datos y crea o verifica la tabla de usuarios.
function conectarADataBase(){
  //Conecta a la base de datos
  connection.connect((err) => {
    if (err) {
        console.error(err.message);
        return;
    }
    console.log('Conectado a la base de datos de la api Rick y Morty.');
  });

  // Crea la tabla usuarios en la base de datos si no existe
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

  // Crea la tabla locations en la base de datos si no existe
  connection.query(`CREATE TABLE IF NOT EXISTS rick_morty_api_db.locations (
    id INT PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(255),
    dimension VARCHAR(255),
    url VARCHAR(255)
  )`, (err) => {
      if (err) {
          console.error(err.message);
          return;
      }
      console.log('Tabla de locations creada/verificada.');
  });

  // Crea la tabla characters en la base de datos si no existe
  connection.query(`CREATE TABLE IF NOT EXISTS rick_morty_api_db.characters (
    id INT PRIMARY KEY,
    name VARCHAR(255),
    status VARCHAR(255),
    species VARCHAR(255),
    type VARCHAR(255),
    gender VARCHAR(255),
    origin_id INT,
    location_id INT,
    image VARCHAR(255),
    url VARCHAR(255),
    created TIMESTAMP,
    FOREIGN KEY (origin_id) REFERENCES locations(id),
    FOREIGN KEY (location_id) REFERENCES locations(id)
  )`, (err) => {
      if (err) {
          console.error(err.message);
          return;
      }
      console.log('Tabla de characters creada/verificada.');
  });
  // Cargamos datos en nuestra tabla locations de la BBDD, esta función sólo necesita ejecutarse una vez, por lo que ya después estará comentada siempre.
  //cargarLocations('https://rickandmortyapi.com/api/location');
  // Cargamos datos en nuestra tabla locations de la BBDD, esta función sólo necesita ejecutarse una vez, por lo que ya después estará comentada siempre.
  cargarCharacters('https://rickandmortyapi.com/api/character');
  
}



// Con esta función vamos a cargar automáticamente nuestra tabla locations de la BBDD 
//con los datos de la API pública original
//NOTA: Esta función no funciona como se esperaba, ya que entra al bucle infinito sin realizar insersiones
//      aunque nunca llegé a probarlo con el bucle for.
function obtenerAllLocations(req, res, next) {
  // var pages = 1 ;
  // getLocations()
  //   .then(data => {
  //     pages = data.info.pages;
  //   })
  //   .catch(error => {
  //     console.error(error);
  //     return res.status(500).send(error);
  //   });

  // Ahora, ya que la api nos da reslutados en varias páginas, necesitamos recorrer todas las páginas
  var url = 'https://rickandmortyapi.com/api/location';
  while (!(url == null)) {
    getDatosApi(url)
      .then(data => {
        console.log("algo");
        insertLocations(data.results);
        url = data.info.next;
        console.log(data.results[0]);
        //url = null;
      })
      .catch(error => {
        console.error(error);
        url = null;
        return res.status(500).send(error);
      });
      //url = null;
      console.log("Ubicaciones cargadas en la BBDD");
  }

  // for (let page = 1; page < pages; page++) {
  //   getLocationsPage(page)
  //     .then(data => {
  //       insertLocations(data.results);
  //     })
  //     .catch(error => {
  //       console.error(error);
  //       return res.status(500).send(error);
  //     });
  // }
}

// Con esta función vamos a cargar automáticamente nuestra tabla locations de la BBDD 
//con los datos de la API pública original. Esta función es recursiva y se ejecuta de nuevo hasta que no hayan más páginas de datos
async function cargarLocations(url) {
  try {
    const response = await axios.get(url);
    const locations = response.data.results;

    // Inserta las ubicaciones en la base de datos
    await insertLocations(locations);

    // Si hay más páginas, hace una nueva petición recursiva
    if (response.data.info.next) {
      await cargarLocations(response.data.info.next);
    }else{
      console.log("Ubicaciones cargadas en la BBDD");
    }
  } catch (error) {
    console.error(error);
  }
}

// Esta función obtiene la primera página de los datos de ubicaciones de la API pública.
async function getLocations() {
  try {
      const response = await axios.get(`https://rickandmortyapi.com/api/location`);
      console.log(response.data.info.count);
      return response.data;
  } catch (error) {
      console.error(error);
  }
}

//Esta función obtiene los datos de las ubicaciones que devuelve la api pública para una página
async function getLocationsPage(page) {

  try {
      const response = await axios.get(`https://rickandmortyapi.com/api/location/?page=${page}`);
      return response.data;
  } catch (error) {
      console.error(error);
  }
}

//Esta función obtiene los datos que devuelve una api pública según su url
async function getDatosApi(url) {
  try {
      console.log(url);
      const response = await axios.get(url);
      console.log(response.data.info); //No sé por qué no llega a esta parte del código
      return response.data;
  } catch (error) {
      console.error(error);
  }
}

//Función que inserta en la tabla locations de la base de datos, los datos obtenidos de un json
function insertLocations(locations) {
  console.log("entramos en insertLocations")
  for (const location of locations) {
      const query = `INSERT INTO locations (id, name, type, dimension, url) VALUES (?, ?, ?, ?, ?)`;

      const {id, name, type, dimension, url} = location;

      const values = [id, name, type, dimension, url];

      connection.execute(query, values);

  }

  //await connection.end();
}

// Ejecuta una consulta en la base de datos
function queryDatabase(query, params, callback) {
  connection.query(query, params, (err, results) => {
    if (err) {
      console.error(err.message);
      callback(err, null);
      return;
    }
    callback(null, results);
  });
}

// Con esta función vamos a cargar automáticamente nuestra tabla locations de la BBDD 
//con los datos de la API pública original. Esta función es recursiva y se ejecuta de nuevo hasta que no hayan más páginas de datos
async function cargarCharacters(url) {
  try {
    const response = await axios.get(url);
    const locations = response.data.results;

    // Inserta las ubicaciones en la base de datos
    await insertLocations(locations);

    // Si hay más páginas, hace una nueva petición recursiva
    if (response.data.info.next) {
      await cargarCharacters(response.data.info.next);
    }else{
      console.log("Ubicaciones cargadas en la BBDD");
    }
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

// Exporta las funciones para ejecutar consultas
module.exports = {
  insertLocations,
  getLocationsPage,
  getLocations,
  cargarLocations,
  queryDatabase,
  conectarADataBase,
  connection
};
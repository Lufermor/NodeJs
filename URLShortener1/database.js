const mysql = require('mysql2');

// Configuración de la conexión a la base de datos
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'myuser',
  password: 'mypassword',
  database: 'mydatabase'
});

// Conectar a la base de datos
connection.connect((err) => {
  if (err) {
    console.error(err.message);
    return;
  }
  console.log('Conectado a la base de datos.');
});

// Ejecutar una consulta en la base de datos
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

// Exportar la función para ejecutar consultas
module.exports = {
  queryDatabase
};

import mysql from "mysql2/promise";
import picocolors from "picocolors";

const { red, green, bold, yellow, blueBright } = picocolors;

const conexionDATA = {
  host: 'localhost',
  user: 'root',
  database: 'proyecto-cvg',
  password: '',
  supportBigNumbers: true,
  bigNumberStrings: false,

}

const pool = mysql.createPool(conexionDATA)

try {
  const connection = await pool.getConnection();
  connection.release();
  console.log(green("Conexión a la base de datos exitosa."));
}
catch (err) {
  console.error(red("Error al conectar a la base de datos:", err.message));
}


export default pool;
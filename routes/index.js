var express = require('express');
var router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index');
});

const dbFile = path.join(__dirname, "database", "datas.db");

const sqlite = new sqlite3.Database(dbFile, err => {
  err ? console.log(err) : console.log('Conexión exitosa')
})

const tableSqlite = "CREATE TABLE IF NOT EXISTS Contactos(email VARCHAR(255),name VARCHAR(255), commentary TEXT,date DATATIME,ip VARCHAR(255));";
sqlite.run(tableSqlite, err => {
  err ? console.log(err) : console.log('Tabla creada exitosamente')
})


router.get('/contactos',(req,res)=>{
  const query = "SELECT * FROM Contactos;";
  sqlite.all(query,[],(err,rows) => {
    res.render("contactos.ejs",{get:rows})
  })
})



router.post('/form', (req,res) => {
	let ip = req.headers["x-forwarded-for"];
  	if(ip){
    	let list = ip_new.split(",");
    	ip = list[list.length-1];
	}
	let hoy = new Date();
	let horas = hoy.getHours();
	let minutos = hoy.getMinutes();
	let hora = horas + ':' + minutos;
	let fecha = hoy.getDate() + '-' + ( hoy.getMonth() + 1 ) + '-' + hoy.getFullYear() + '' + '/' + '' + hora;
    const sql = "INSERT INTO Contactos(email, name, commentary, date, ip) VALUES (?,?,?,?,?)";
    const query = [req.body.email, req.body.name, req.body.message,fecha,ip_new];
	  sqlite.run(sql, query, err =>{
	  if (err){
		return console.error(err.message);
	  }
	  else{
		res.redirect("/");
		}
	  })
})


module.exports = router;

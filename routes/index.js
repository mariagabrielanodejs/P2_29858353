var express = require('express');
var router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

router.get('/', function (req, res, next) {
	res.render('index');
});

const dbFile = path.join(__dirname, "database", "datas.db");

const sqlite = new sqlite3.Database(dbFile, err => {
	err ? console.log(err) : console.log('Conexión exitosa')
})

const tableSqlite = "CREATE TABLE IF NOT EXISTS Contactos(email VARCHAR(255),name VARCHAR(255), commentary TEXT,date DATATIME,ip VARCHAR(255), country VARCHAR(255));";
sqlite.run(tableSqlite, err => {
	err ? console.log(err) : console.log('Tabla creada exitosamente')
})


router.get('/contactos', (req, res) => {
	const query = "SELECT * FROM Contactos;";
	sqlite.all(query, [], (err, rows) => {
		res.render("contactos.ejs", { get: rows })
	})
})


router.post('/form', async(req, res) => {
	const ipaddress = req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress;

	let hoy = new Date();
	let horas = hoy.getHours();
	let minutos = hoy.getMinutes();
	let hora = horas + ':' + minutos;
	let fecha = hoy.getDate() + '-' + (hoy.getMonth() + 1) + '-' + hoy.getFullYear() + '' + '/' + '' + hora;


	const get = await fetch(`https://ipwho.is/${ipaddress}`);
	const ipwhois = await get.json();
	let country = ipwhois.country;

	const response = req.body["g-recaptcha-response"];
	const secret = process.env.KEY_PRIVATE;
	const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${response}`;


	const recaptcha = await fetch(url, { method: "post", });
	const google = await recaptcha.json();

	if (google.success == true) {
		const sql = "INSERT INTO Contactos(email, name, commentary, date, ipaddress, country) VALUES (?,?,?,?,?,?)";
		const query = [req.body.email, req.body.name, req.body.message, fecha, ipaddress, country];



		let transporter = nodemailer.createTransport({
			host: "smtp-mail.outlook.com",
			secureConnection: false,
			port: 587,
			tls: {
				ciphers: 'SSLv3'
			},
			auth: {
				user: process.env.EMAIL,
				pass: process.env.PASSWORD
			}
		});
		const customer = `
						  <h2>Información del Cliente</h2>
							<p>Email: ${correo}</p>
							<p>Nombre: ${nombre}</p>
							<p>Comentario: ${comentario}</p>
							<p>Fecha: ${fecha}</p>
							<p>IP: ${ipaddress}</p>
							<pli>Pais: ${pais}</p>
							`;
		const receiver = {
			from: process.env.EMAIL,
			to: 'programacion2ais@dispostable.com',
			subject: 'Informacion del Contacto',
			html: customer
		};
		transporter.sendMail(receiver, (err, info) => {
			if (err)
				console.log(err)
			else
				console.log(info);
		})
		sqlite.run(sql, query, err => {
			if (err) {
				return console.error(err.message);
			}
			else {
				res.redirect("/");
			}
		})
	} else {
		res.redirect("/");
	}
})


module.exports = router;

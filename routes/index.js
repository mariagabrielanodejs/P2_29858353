var express = require('express');
var router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');
const GitHubStrategy = require("passport-github2");
const passport = require("passport");
const jwt = require("jsonwebtoken");
require('dotenv').config();

router.get('/', function (req, res, next) {
	res.render('index');
});


router.use(passport.initialize());
router.use(passport.session());

const dbFile = path.join(__dirname, "database", "datas.db");

const sqlite = new sqlite3.Database(dbFile, err => {
	err ? console.log(err) : console.log('Conexión exitosa')
})

const tableSqlite = "CREATE TABLE IF NOT EXISTS Contactos(email VARCHAR(255),name VARCHAR(255), message TEXT,date DATATIME,ipaddress VARCHAR(255), country VARCHAR(255));";
sqlite.run(tableSqlite, err => {
	err ? console.log(err) : console.log('Tabla creada exitosamente')
})



protectRoute = async (req, res, next) => {
	if (req.cookies.jwt) {
	  try {
		const tokenAuthorized = await promisify(jwt.verify)(req.cookies.jwt,'token');
		if (tokenAuthorized) {
		  return next();
		}
		req.user = 1
	  } catch (error) {
		console.log(error);
		return next();
	  }
	} else {
	  res.redirect("/login");
	}
  };

  router.get('/contactos', protectRoute,(req, res) => {
	const query = "SELECT * FROM Contactos;";
	sqlite.all(query, [], (err, rows) => {
		res.render("contactos.ejs", { get: rows })
	})
})


router.get('/login',(req,res) => {
	res.render('login');
})

router.post('/login', (req,res) => {
	let usuario = req.body.usuario;
	let contraseña = req.body.password;

	let userPeriod = 'admin'
	let userPassword = 'admin'

	if(usuario == userPeriod && contraseña == userPassword) {
		const id = 1
    	const token = jwt.sign({ id: id }, 'token');
    	res.cookie("jwt", token);
		res.redirect('/contactos')
	}
	else {
		res.redirect('/login')
	}

})


router.post('/form', async (req, res) => {
	
	const ipaddress = req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress;


	let hoy = new Date();
	let horas = hoy.getHours();
	let minutos = hoy.getMinutes();
	let hora = horas + ':' + minutos;
	let fecha = hoy.getDate() + '-' + (hoy.getMonth() + 1) + '-' + hoy.getFullYear() + '' + '/' + '' + hora;


	const get = await fetch(`https://ipwho.is/${ipaddress}`);
	const ipwhois = await get.json();
	let country = ipwhois.country;

	const name_key = req.body.name;
	const response = req.body["g-recaptcha-response"];
	const secret= process.env.KEY_PRIVATE;
	const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${response}`;

	const sql = "INSERT INTO Contactos(email, name, message, date, ipaddress, country) VALUES (?,?,?,?,?,?)";
	const query = [req.body.email, req.body.name, req.body.message, fecha, ipaddress, country];
	const Recaptcha = await fetch(url, { method: "post", });
  	const google_response = await Recaptcha.json();
	console.log(google_response)
  	if (google_response.success == true) {
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
							<p>Email: ${req.body.email}</p>
							<p>Nombre: ${req.body.name}</p>
							<p>Comentario: ${req.body.message}</p>
							<p>Fecha: ${fecha}</p>
							<p>IP: ${ipaddress}</p>
							<pli>Pais: ${country}</p>
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
				res.redirect("/login");
			}
		})

	} else {
		res.redirect("/");
		console.log('Captcha invalid')
	}
})

passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser((user, done) => {
    done(null, user);
  });

router.get('/auth/github',passport.authenticate('github', { scope: [ 'user:email' ] }));
router.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    const id = 1
    const token = jwt.sign({ id: id }, 'token');
    res.cookie("jwt", token);
    res.redirect("/contactos");
  });

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "https://mariagabriela-p2.onrender.com/auth/github/callback"
  },
  function (request, accessToken, refreshToken, profile, cb) {
	cb(null,profile)
} 
));






module.exports = router;

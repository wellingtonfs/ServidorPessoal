import path from "path"
import fs from "fs"
import dotenv from "dotenv"
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import express from "express";
import exphbs from "express-handlebars";
import mongoose from "mongoose";
import morgan from "morgan";
import moment from "moment-timezone"
import sessions from "express-session";
import cookieParser from "cookie-parser";

//API

import apiHome from "./src/routes/api/home.js"
import apiAuth from "./src/routes/api/auth.js"
import apiFiles from "./src/routes/api/filesystem.js"
import apiYoutube from "./src/routes/api/youtube.js"
import apiYoutubeRobot from "./src/routes/api/youtube_robot.js"
import apiPostit from "./src/routes/api/postit.js"

//front

import frontHome from "./src/routes/front/home.js"
import frontViewer from "./src/routes/front/view.js"
import rotaYoutube from "./src/routes/front/youtube.js"

import MyRobot from "./src/services/robot.js"

const app = express()

// Log

if (!fs.existsSync(process.env.DIR_LOG))
    fs.mkdirSync(process.env.DIR_LOG, { recursive: true })

const accessLogStream = fs.createWriteStream(path.join(process.env.DIR_LOG, 'access.log'), { flags: 'a' })

// Definições

morgan.token("userip", (req, res) => {
    return (req.body && req.body.ip) ? req.body.ip : ''
})

morgan.token("mydate", (req, res) => {
    return moment().tz("America/Sao_Paulo").format("DD/MM/YYYY HH:mm")
})

app.use(morgan('[:mydate] IP ( :userip ) ROTA ( :method :url :status ) :response-time ms', {
    skip: function (req, res) {
        if (req.originalUrl.lastIndexOf('/') <= 0)
            if ([".png", ".ico", ".jpg"].some((item) => req.originalUrl.endsWith(item)))
                return true

        return req.originalUrl.startsWith("/api")
    },
    stream: accessLogStream
}))

app.engine('hbs', exphbs({extname: '.hbs'}));
app.set('view engine', 'hbs');
app.set('views', __dirname + '/src/views');

app.use(express.static(__dirname + '/recursos'));
app.use(express.json())
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError)
        return res.status(400).send({ error: 'error parsing data: invalid json' })
    next()
})

app.use(express.urlencoded({extended: true}))
app.use(cookieParser())

const oneDay = 1000 * 60 * 60; // 1 hora

// Sessions middleware

app.use(sessions({
    secret: process.env.SECRET_KEY,
    name: "Servidor",
    saveUninitialized:true,
    cookie: {
        maxAge: oneDay,
        sameSite: 'strict'
    },
    saveUninitialized: false,
    resave: false
}));

// Banco de dados
mongoose.Promise = global.Promise

var connectMongo = () => {
    console.log("Tentando conectar ao banco de dados...")
    mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWD}@api-youtube.nlanral.mongodb.net/?retryWrites=true&w=majority`, {
        keepAlive: true,
        keepAliveInitialDelay: 300000
    }).then(() => {
        console.log("Conectado ao Banco de Dados!")
    }).catch((err) => {
        console.log("Não foi possivel se conectar ao banco de dados! Erro: " + err)
        setTimeout(() => connectMongo(), 5000)
    })
}

connectMongo()

// Rotas

//api

app.use('/api', apiHome)
app.use('/api/auth', apiAuth)
app.use('/api/filesystem', apiFiles)
app.use('/api/youtube', apiYoutube)
app.use('/api/youtube-robot', apiYoutubeRobot)
app.use('/api/postit', apiPostit)

//front

app.use('/', frontHome)
app.use('/view', frontViewer)
app.use('/youtube', rotaYoutube)

let server = app.listen(process.env.PORTA, () => console.log("Servidor Iniciado! IP: http://localhost:" + process.env.PORTA))

async function clear(error) {
    console.log("Erro:", error ? error : "desconhecido")

    server.close()
    await MyRobot.close()
    process.exit(1);
}

process.on('uncaughtException', clear);
process.on('unhandledRejection', clear);
process.on('SIGINT', clear);
process.on('SIGTERM', clear);
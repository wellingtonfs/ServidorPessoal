import express from "express"

import trycatch from "../../util/trycatch.js"

import { Login, LogOut, LoginPost, Home, Upload, Postit, Charts, Checkin, CriarPasta } from "../../controllers/front/homeController.js"

const rota = express.Router()

rota.get('/',
    trycatch(Login)
)

rota.get('/logout',
    trycatch(LogOut)
)

rota.post('/home',
    trycatch(LoginPost)
)

rota.get('/home',
    trycatch(Home)
)

rota.get('/requestpermission/:folder', trycatch(async (req, res) => {
    res.render('auth', { folder: decodeURIComponent(req.params.folder) })
}))

rota.get('/upload',
    trycatch(Upload)
)

rota.get('/criar_pasta',
    trycatch(CriarPasta)
)

rota.get('/notas',
    trycatch(Postit)
)

rota.get('/postit',
    trycatch(Postit)
)

rota.get('/charts',
    trycatch(Charts)
)

rota.post('/checkin',
    trycatch(Checkin)
)

export default rota
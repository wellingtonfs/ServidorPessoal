import express from "express"

import { AddComment, DownloadFile, ViewFile, CreateFolder, UploadFile, ListFiles, ListFolders, Details, Rename, Delete } from "../../controllers/api/fileController.js"
import AuthMiddleware from "../../middlewares/auth.js"
import trycatch from "../../util/trycatch.js"

const rota = express.Router()

rota.get(
    '/list',
    trycatch(AuthMiddleware),
    trycatch(ListFolders)
)

rota.post(
    '/list',
    trycatch(AuthMiddleware),
    trycatch(ListFiles)
)

rota.post(
    '/details',
    trycatch(AuthMiddleware),
    trycatch(Details)
)

rota.post(
    '/addcomment',
    trycatch(AuthMiddleware),
    trycatch(AddComment)
)

rota.get('/get/:folder/:filename',
    trycatch(AuthMiddleware),
    trycatch(DownloadFile)
)

rota.get('/view/:folder/:filename',
    trycatch(AuthMiddleware),
    trycatch(ViewFile)
)

rota.post('/create_folder',
    trycatch(CreateFolder)
)

rota.post('/push/:folder',
    trycatch(AuthMiddleware),
    trycatch(UploadFile)
)

rota.post('/renomear',
    trycatch(AuthMiddleware),
    trycatch(Rename)
)

rota.post('/deletar',
    trycatch(AuthMiddleware),
    trycatch(Delete)
)

export default rota
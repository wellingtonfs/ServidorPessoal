import express from "express"

import { requestPermission, logout } from "../../controllers/api/fileController.js"
import trycatch from "../../util/trycatch.js"

const rota = express.Router()

rota.post(
    '/requestpermission/:folder',
    trycatch(requestPermission)
)

rota.get(
    '/logout',
    trycatch(logout)
)


export default rota
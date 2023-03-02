import express from "express"

import { Home } from "../../controllers/api/fileController.js"
import trycatch from "../../util/trycatch.js"

const rota = express.Router()

rota.get(
    '/:code',
    trycatch(Home)
)


export default rota
import express from "express"
import trycatch from "../../util/trycatch.js"

import { openpose } from "../../controllers/api/replicaiController.js"

const rota = express.Router()

rota.post('/openpose', trycatch(openpose))

export default rota;
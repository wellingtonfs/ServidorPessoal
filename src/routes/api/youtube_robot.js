import express from "express"

import { search, details, getLink, convertVideo, downloadVideo } from "../../controllers/api/musicRobotController.js"
import trycatch from "../../util/trycatch.js"

const rota = express.Router()

rota.post("/search", trycatch(search))

rota.get("/details/:videoid", trycatch(details))

rota.get("/get_link/:videoid", trycatch(getLink))

rota.get("/convert/:videoid", trycatch(convertVideo))

rota.get("/get/:videoid", trycatch(downloadVideo))

export default rota
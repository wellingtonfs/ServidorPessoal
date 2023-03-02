import express from "express"

import trycatch from "../../util/trycatch.js"

const rota = express.Router()

rota.get('/', trycatch(async (req, res) => {
    let params = req.query

    if (typeof params.bot != 'undefined')
        return res.render('youtube', { rota: "/api/youtube-robot" })

    res.render('musica', { rota: "/api/youtube" })
}))

rota.get('/:videoid', trycatch(async (req, res) => {
    const videoId = decodeURIComponent(req.params.videoid)
    let params = req.query

    if (typeof params.bot != 'undefined')
        return res.render('youtube', { videoId, rota: "/api/youtube-robot" })

    res.render('musica', { videoId, rota: "/api/youtube" })
}))

export default rota
import ytdl from "ytdl-core";

import MyRobot from "../../services/robot.js"
import UrlParser from "../../services/urlparseServices.js"

export async function search(req, res) {
    const frase = req.body.frase
    const params = req.query

    let resp;

    if (params.similar)
        resp = await MyRobot.getResults(params.similar, true)
    else 
        resp = await MyRobot.getResults(frase, false)

    if (resp === null) return res.status(500).json({ error: "Erro desconhecido" })

    res.status(200).json(resp)
}

export async function details(req, res) {
    const videoId = decodeURIComponent(req.params.videoid)

    let resp = await MyRobot.getVideoDetails(videoId)

    if (resp === null) return res.status(404).json({ error: "Vídeo não encontrado" })

    res.status(200).json(resp)
}

export async function getLink(req, res) {
    const videoId = decodeURIComponent(req.params.videoid)

    let resp = await MyRobot.getVideoDetails(videoId)

    if (resp === null) return res.status(404).json({ error: "Vídeo não encontrado" })

    //let url = `${UrlParser.CONSTS.URL_YOUTUBE_DOWNLOAD}/${videoId}`

    //await UrlParser.saveVideoId(videoId, url)

    res.status(200).json({
        url: `${UrlParser.CONSTS.URL_ENCURTADOR}/${videoId}`
    })
}

export async function convertVideo(req, res) {
    const videoId = decodeURIComponent(req.params.videoid)
    const link = `https://www.youtube.com/watch?v=${videoId}`

    const video = await MyRobot.getVideoDetails(videoId)
    let title = "api_convert.mp3"

    if (video !== null) {
        title = video.title + '.mp3'
    }

    try {
        const audio = ytdl(link, { quality: 'highestaudio' })

        res.set("Content-Disposition", `filename=${title}`);
        res.contentType("audio/mpeg")
        audio.pipe(res)

    } catch (e) {
        res.status(400).json({ error: `link inválido: ${link}` })
    }
}

export async function downloadVideo(req, res) {
    const videoId = decodeURIComponent(req.params.videoid)
    const link = `https://www.youtube.com/watch?v=${videoId}`

    const video = await MyRobot.getVideoDetails(videoId)
    let title = "api_convert.mp3"

    if (video !== null) {
        title = video.title + '.mp3'
        title = title.replace(/\/+/g, '-')
    }

    try {
        const audio = ytdl(link, { quality: 'highestaudio' })

        res.attachment(title)
        res.contentType("audio/mpeg")
        audio.pipe(res)

    } catch (e) {
        res.status(400).json({ error: `link inválido: ${link}` })
    }
}
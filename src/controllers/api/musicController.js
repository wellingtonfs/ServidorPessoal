import ytdl from "ytdl-core";

import ApiYoutube from "../../services/api_youtube.js";
import UrlParser from "../../services/urlparseServices.js"

export async function search(req, res) {
    const frase = req.body.frase
    const params = req.query

    let resp;

    if (params.similar) {
        resp = await ApiYoutube.getResults(params.similar, true)
        if (resp === null) return res.redirect(307, "/api/youtube-robot/search?similar=" + params.similar)
    } else { 
        resp = await ApiYoutube.getResults(frase, false)
        if (resp === null) return res.redirect(307, "/api/youtube-robot/search")
    }

    res.status(200).json(resp)
}

// está gastando muita cota, então é melhor usar o robo neste caso
export async function details(req, res) {
    return res.redirect(`/api/youtube-robot/details/${req.params.videoid}`)

    // const videoId = decodeURIComponent(req.params.videoid)

    // let resp = await ApiYoutube.getVideoDetails(videoId)

    // if (resp === null) return res.redirect(`/api/youtube-robot/details/${encodeURIComponent(videoId)}`) //status(404).json({ error: "Vídeo não encontrado" })

    // res.status(200).json(resp)
}

export async function getLink(req, res) {
    const videoId = decodeURIComponent(req.params.videoid)

    let resp = await ApiYoutube.getVideoDetails(videoId)

    if (resp === null)
        return res.redirect(`/api/youtube-robot/get_link/${encodeURIComponent(videoId)}`) //status(404).json({ error: "Vídeo não encontrado" })

    res.status(200).json({
        url: `${UrlParser.CONSTS.URL_ENCURTADOR}/${videoId}`
    })
}

export async function convertVideo(req, res) {
    const videoId = decodeURIComponent(req.params.videoid)
    const link = `https://www.youtube.com/watch?v=${videoId}`

    const video = await ApiYoutube.getVideoDetails(videoId)
    if (video === null) {
        return res.redirect(`/api/youtube-robot/convert/${encodeURIComponent(videoId)}`)
    }

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

    const video = await ApiYoutube.getVideoDetails(videoId)
    if (video === null) {
        return res.redirect(`/api/youtube-robot/get/${encodeURIComponent(videoId)}`)
    }

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
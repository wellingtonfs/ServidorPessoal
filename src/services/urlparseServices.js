import Url from "../models/Url.js";
import NewHash from "md5"

const CONSTS = {
    URL_ENCURTADOR: '/api',
    URL_DOWNLOAD: '/api/filesystem/get',
    URL_UPLOAD: '/api/filesystem/push',
    URL_FILELIST: '/api/filesystem/list',
    URL_YOUTUBE_DOWNLOAD: '/api/youtube/get',
    CODE_SIZE: 7
}

function getUrlForDownload(folder, file) {
    return `${CONSTS.URL_DOWNLOAD}/${folder}/${file}`
}

async function getUrlById(id) {
    const urlparse = await Url.findOne({ id })

    if (!urlparse) return null

    return urlparse.url
}

async function getIdByUrl(url, options = { createIfNotExist: false }) {
    const urlparse = await Url.findOne({ url })

    if (!urlparse) {
        if (options.createIfNotExist) return await createIdForUrl(url)
        return null
    }

    return urlparse.id
}

async function deleteIdIfExist(url) {
    const urlparse = await Url.findOne({ url })

    if (!urlparse) return;

    await Url.deleteOne({ url })
}

async function createIdForUrl(url) {
    let id = url
    let count = 0

    do {
        id = NewHash(id).slice(0, CONSTS.CODE_SIZE)

        //evitar recursão infinita ou muito longa
        count += 1
        if (count > 10) return null
    } while( await Url.findOne({ id }) );

    await Url.create({ id, url })

    return id
}

async function saveVideoId(videoId, url) {
    const urlparse = await Url.findOne({ id: videoId })

    if (!urlparse) {
        await Url.create({ id: videoId, url })
    }
}

export default {
    CONSTS,
    getUrlForDownload,
    getUrlById,
    getIdByUrl,
    createIdForUrl,
    deleteIdIfExist,
    saveVideoId
}
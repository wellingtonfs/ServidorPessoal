import path from "path"
import dotenv from "dotenv"
import { fileURLToPath } from 'url';
import { decode } from 'html-entities';
import Video from "../models/Video.js"

import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

class ApiYoutube {
    static API_URL = "https://www.googleapis.com/youtube/v3"

    constructor () {
        this.keys = process.env.API_KEY.split(',').map(k => k.trim())
        this.ponteiroKey = 0
    }

    getVideoId(url) {
        let lookFor = "watch?v="
        let indexInit = url.indexOf(lookFor) + lookFor.length
        let indexEnd = url.length

        if (url.includes("&list=")) {
            lookFor = "&list="
            indexEnd = url.indexOf(lookFor)
        }

        return url.slice(indexInit, indexEnd)
    }

    getMaxRes(snippet) {
        if (snippet['thumbnails']['maxres'])
            return snippet['thumbnails']['maxres']['url']
        if (snippet['thumbnails']['standard'])
            return snippet['thumbnails']['standard']['url']
        if (snippet['thumbnails']['high'])
            return snippet['thumbnails']['high']['url']
        if (snippet['thumbnails']['medium'])
            return snippet['thumbnails']['medium']['url']

        return snippet['thumbnails']['default']['url']
    }

    async makeRequest(parametros) {
        let count = 0

        while (count < this.keys.length) {
            let url = `${ApiYoutube.API_URL}/${parametros}&key=${this.keys[this.ponteiroKey]}`

            this.ponteiroKey = (this.ponteiroKey + 1) % this.keys.length

            let response = await fetch(url)
            response = await response.json()

            if (!response.error) return response

            count += 1
        }

        return null
    }

    convertIntToDuration(duration) {
        let hrs = Math.floor(duration / 3600.0)
        let mim = Math.floor((duration % 3600.0) / 60)
        let seg = Math.floor((duration % 3600.0) % 60)
        return [hrs, mim, seg]
    }

    convertStringToDuration(duration) {
        let numeros = ""
        for (let l of duration) {
            //se é número
            if (l.match(/^\d$/)) 
                numeros += l
            else
                numeros += ','
        }

        numeros = numeros.replace(/^,+|,+$/g, '').split(',')
        numeros = numeros
            .reverse()
            .map((txt, idx) => Number.parseInt(txt) * (60 ** idx))
            .reduce((ac, n) => ac + n)

        return this.convertIntToDuration(numeros)
    }

    convertDurationToInt(duration) {
        let tempo = duration.at(2)
        tempo += duration.at(1) > 0 ? duration.at(1) * 60 : 0
        tempo += duration.at(0) > 0 ? duration.at(0) * 60 * 60 : 0
        return tempo
    }

    getImgName(url) {
        return url.slice(url.lastIndexOf('/')+1)
    }

    async getVideoDetails(videoId) {
        if (!videoId) return null;

        //buscar no banco de dados primeiro

        const video = await Video.findOne({ id: videoId })
        if (video) {
            return {
                id: video.id,
                title: video.title,
                img: `https://i.ytimg.com/vi/${video.id}/${video.imgname}`,
                duration: this.convertIntToDuration(video.duration)
            };
        }

        //caso não ache

        let url = `videos?part=snippet,contentDetails`
        url += `&fields=items(id,snippet.title,snippet.thumbnails,contentDetails.duration)`
        url += `&maxResults=15`
        url += `&type=video`
        url += `&regionCode=BR`
        url += `&id=${videoId}`

        let data;
        let imgname = "maxresdefault.jpg";

        try {
            let response = await this.makeRequest(url)

            if (response === null) return null
            if (response["items"].length == 0) return null

            const video = response["items"][0]

            const img = this.getMaxRes(video['snippet'])
            imgname = this.getImgName(img)

            data =  {
                id: video['id'],
                title: decode(video['snippet']['title']),
                img: img,
                duration: this.convertStringToDuration(video['contentDetails']['duration'])
            }

        } catch (e) {
            console.log(e)
            return null
        }

        //salva no banco de dados
        await Video.create({
            id: data.id,
            title: data.title,
            imgname: imgname,
            duration: this.convertDurationToInt(data.duration)
        })

        return data
    }

    async getResults(parametro, similar) {
        if (!parametro) return null

        let data = null

        try {
            if (similar)
                data = await this.getSimilar(parametro)
            else
                data = await this.makeSearch(parametro)

        } catch (e) {
            console.log(e)
            data = null
        }

        return data;
    }

    async makeSearch(frase) {
        let pesquisa = frase.trim().replace(/ /g, '+').replace(/\//g, '')

        let url = `search?q=${pesquisa}`
        url += `&part=snippet`
        url += `&fields=items(id.videoId,snippet.title)`
        url += `&maxResults=15`
        url += `&regionCode=BR`

        try {
            let response = await this.makeRequest(url)

            if (response === null) 
                return null
            
            let listIds = response["items"]
                .map(item => {
                    return {
                        id: item['id']['videoId'],
                        title: decode(item['snippet']['title'])
                    }
                })
                .filter(item => item.id)

            return {
                videos: listIds
            }

        } catch (error) {
            console.log(error)
            return null
        }
    }

    async getSimilar(videoId) {
        videoId = videoId.trim()

        let url = `search?relatedToVideoId=${videoId}`
        url += `&part=snippet`
        url += `&fields=items(id.videoId,snippet)`
        url += `&maxResults=18`
        url += `&type=video`
        url += `&regionCode=BR`

        try {
            let response = await this.makeRequest(url)

            if (response === null)
                return null

            let listIds = response["items"]
                .filter(item => typeof item['snippet'] != 'undefined')
                .map(item => {
                    return {
                        id: item['id']['videoId'],
                        title: decode(item['snippet']['title'])
                    }
                })
                .filter(item => item.id)

            return {
                videos: listIds
            }

        } catch (error) {
            console.log(error)
            return null
        }
    }
}

export default new ApiYoutube()
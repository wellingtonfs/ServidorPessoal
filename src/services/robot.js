import puppeteer from "puppeteer"
import cheerio from "cheerio"
import fetch from "node-fetch";
import Video from "../models/Video.js"

import path from "path"
import dotenv from "dotenv"
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

class MyRobot {
    constructor() {
        this.browser = null

        this.counter = 0
        this.shouldReconnect = true
    
        this.start()
        this.getVideoId = this.getVideoId.bind(this)
        this.checkCounter = this.checkCounter.bind(this)
    }

    async start() {
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ]
        });

        this.browser.on("disconnected", async () => {
            console.log("Desconectado do browser")

            if (this.shouldReconnect) {
                await this.browser.close()
                await this.start()
                console.log("Reconectado?", this.browser.isConnected() ? "Sim" : "Não")
            } else {
                console.log("Não devo reconectar")
            }
        })
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

        let data;
        let imgname = "maxresdefault.jpg";

        try {    
            let response = await fetch(`https://www.youtube.com/watch?v=${videoId.trim()}`)

            const $ = cheerio.load(await response.text());

            let title = $('[name="title"]')

            if (!title['0'].attribs.content)
                return null;
    
            let id = $('[itemprop="videoId"]')
            let img = $('[property="og:image"]')
            let duration = $('[itemprop="duration"]')
            
            title = title['0'].attribs.content

            if (id['0']) id = id['0'].attribs.content
            if (img['0']) img = img['0'].attribs.content
            if (duration['0']) duration = duration['0'].attribs.content

            imgname = this.getImgName(img)
    
            data = {
                id,
                title,
                img,
                duration: this.convertStringToDuration(duration)
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

    async checkCounter(resolve, reject, c) {
        if (this.counter < process.env.MAX_ABAS) return resolve()
        if (c > 120) return reject("timeout") //máximo 1 minuto

        setTimeout(() => this.checkCounter(resolve, reject, c+1), 500)
    }

    waitCounter() {
        return new Promise(async (res, rej) => {
            await this.checkCounter(res, rej, 0)
        })
    }

    async getResults(parametro, similar) {
        if (!parametro) return null

        try {
            await this.waitCounter()
        } catch (e) {
            console.log(e)
            return null
        }

        this.counter += 1
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

        this.counter -= 1
        return data;
    }
    
    async makeSearch(frase) {
        let url = `https://www.youtube.com/results?search_query=${frase.trim().replace(/ /g, '+')}`

        let page = await this.browser.newPage();
        await page.exposeFunction("getVideoId", this.getVideoId);
        await page.goto(url);

        await page.waitForSelector("ytd-video-renderer #video-title")
    
        let resp = await page.evaluate(async () => {
            try {
                const wait = () => new Promise((res) => setTimeout(res, 100))

                let dados = document.querySelectorAll("ytd-video-renderer #video-title")
                dados = [...dados].filter(el => el.href.includes("watch?v="))

                let count = 0

                while (dados.length < 8 && count < 30) {
                    await wait()

                    dados = document.querySelectorAll("ytd-video-renderer #video-title")
                    dados = [...dados].filter(el => el.href.includes("watch?v="))
                    count += 1
                }

                let links = []
        
                for (let i = 0; i < dados.length; i++) {
                    let title = dados[i].title
                    let linkvideo = dados[i].href

                    linkvideo = await getVideoId(linkvideo)

                    links.push({
                        id: linkvideo,
                        title: title
                    })
                }

                return links

            } catch (e) {
                return null
            }
        })

        await page.close()

        if (resp === null) return null

        return {
            videos: resp
        }
    }

    async getSimilar(videoId) {
        let url = `https://www.youtube.com/watch?v=${videoId.trim()}`

        let page = await this.browser.newPage();
        await page.exposeFunction("getVideoId", this.getVideoId);
        await page.goto(url);

        await page.waitForSelector("ytd-compact-video-renderer .details a span")
    
        let resp = await page.evaluate(async () => {
            try {
                const wait = () => new Promise((res) => setTimeout(res, 100))

                let dados = document.querySelectorAll("ytd-compact-video-renderer .details a")
                dados = [...dados].filter(el => el.href.includes("watch?v="))
                
                let count = 0

                while (dados.length < 8 && count < 30) {
                    await wait()

                    dados = document.querySelectorAll("ytd-compact-video-renderer .details a")
                    dados = [...dados].filter(el => el.href.includes("watch?v="))
                    count += 1
                }

                let links = []

                for (let i = 0; i < dados.length; i++) {
                    const span = dados[i].querySelector('span')

                    if (typeof span == 'undefined') break;

                    links.push({
                        id: await getVideoId(dados[i].href),
                        title: span.title
                    })
                }

                return links
            } catch (e) {
                return null
            }
        })

        await page.close()

        if (resp === null) return null

        return {
            videos: resp
        }
    }

    async close() {
        this.shouldReconnect = false
        if (this.browser !== null)
            await this.browser.close();
    }
}

export default new MyRobot()
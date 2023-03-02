import multer from "multer"
import fs from "fs"

import FileService from "../../services/fileServices.js"
import UrlParser from "../../services/urlparseServices.js"
import configMulter from "../../modules/multer.js"

import Auth from "../../services/session.js"
import File from "../../models/File.js"

const upload = multer(configMulter).single('file')

export async function Home(req, res) {
    const code = decodeURIComponent(req.params.code)

    const urlparse = await UrlParser.getUrlById(code)

    if (urlparse === null) {
        if (code.length > UrlParser.CONSTS.CODE_SIZE) {
            return res.redirect(`${UrlParser.CONSTS.URL_YOUTUBE_DOWNLOAD}/${code}`)
        }

        return res.status(404).json({ error: "página não encontrada" })
    }

    res.redirect(urlparse)
}

export async function requestPermission(req, res) {
    const folder = decodeURIComponent(req.params.folder)

    if (!folder) return res.status(400).json({ error: "dados não fornecidos" });

    let error = await Auth.RequestPermission(req, folder)

    if (error) {
        return res.status(400).json({ error });
    }

    return res.sendStatus(200)
}

export async function logout(req, res) {
    await Auth.RemovePermission()
    res.redirect('/');
}

export async function ListFolders(req, res) {
    const data = FileService.ListFolders()

    if ( data.error ) return res.status(500).json({ error: "erro desconhecido" })

    return res.status(200).json(data)
}

export async function ListFiles(req, res) {
    let { folder, file } = req.body

    if ( !folder ) return res.status(400).json({ error: "argumento necessário: 'folder', argumento opcional: 'file'" })

    let data = FileService.ListFiles(folder)

    if ( data.error ) return res.status(404).json({ error: data.error })

    return res.status(200).json(data)
}

export async function Details(req, res) {
    let { folder, filename } = req.body

    if ( !folder || !filename ) return res.status(400).json({ error: "argumentos necessários: 'folder' e 'filename'" })

    let data = FileService.GetFileDetails(folder, filename)

    if ( data.error ) return res.status(404).json({ error: data.error })

    let url = UrlParser.getUrlForDownload(folder, filename)

    //obter comentarios

    let comFile = await File.findOne({ folder, filename })

    if (!comFile) {
        return res.status(200).json({
            ...data,
            comentario: "",
            url
        })
    }

    return res.status(200).json({
        ...data,
        comentario: comFile.comentario ? comFile.comentario : "",
        url
    })
}

export async function AddComment(req, res) {
    let { folder, filename, comentario } = req.body

    if ( !folder || !filename || typeof comentario != 'string' )
        return res.status(400).json({ error: "argumentos necessários: 'folder', 'filename' e 'comentario'" });

    let comFile = await File.findOne({ folder, filename })

    if (!comFile) {
        await File.create({ folder, filename, comentario })
    } else {
        comFile.comentario = comentario;

        await comFile.save()
    }

    res.sendStatus(200)
}

export async function DownloadFile(req, res) {
    const isGet = req.method.toLowerCase() == 'get'

    const folder = isGet ? decodeURIComponent(req.params.folder) : req.body.folder
    const filename = isGet ? decodeURIComponent(req.params.filename) : req.body.filename

    if (!folder || !filename)
        return res.status(400).json({ error: "folder or filename not provided" })

    let data = FileService.GetFileDetails(folder, filename)

    if ( data.error ) return res.status(404).json({ error: data.error })

    const stream = fs.createReadStream(FileService.GetFilePath(folder, filename))

    res.attachment(filename)
    stream.pipe(res)
}

export async function ViewFile(req, res) {
    const folder = decodeURIComponent(req.params.folder)
    const filename = decodeURIComponent(req.params.filename)

    let data = FileService.GetFileDetails(folder, filename)

    if ( data.error ) return res.status(404).json({ error: data.error })

    if (filename.endsWith('.mp3')) {
        res.contentType("audio/mpeg")
    }

    res.sendFile(
        FileService.GetFilePath(folder, filename)
    )
}

export async function CreateFolder(req, res) {
    const folder = decodeURIComponent(req.body.folder)

    const data = FileService.CreateFolder(folder)

    if (data.error) return res.status(400).json({ error: data.error })

    res.sendStatus(200)
}

//folder, filename, replace
export async function UploadFile(req, res) {
    upload(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message })

        return res.status(200).json({
            folder: req.body.folder,
            filename: req.body.filename
        })
    })
}

export async function Rename(req, res) {
    const folder = req.body.folder
    const filename = req.body.filename
    const newname = req.body.newname

    if (!folder || !filename || !newname) return res.status(400).json({ error: "dados incompletos" })

    let resp = FileService.RenameFile(folder, filename, newname)

    if ( resp.error ) return res.status(400).json({ error: resp.error });

    if ( resp.ok ) {
        // atualizar no banco de dados

        let comFile = await File.findOne({ folder, filename })

        if (!comFile) return res.sendStatus(200);

        comFile.filename = resp.newname

        await comFile.save()

        return res.sendStatus(200);
    }

    res.status(400).json({ error: "erro desconhecido" })
}

export async function Delete(req, res) {
    const folder = req.body.folder
    const filename = req.body.filename

    if (!folder || !filename) return res.status(400).json({ error: "dados incompletos" })

    let resp = FileService.DeleteFile(folder, filename)

    if ( resp.error ) return res.status(400).json({ error: resp.error });

    if ( resp.ok ) {
        // atualizar no banco de dados

        let comFile = await File.findOne({ folder, filename })

        if (!comFile) return res.sendStatus(200);

        await File.deleteOne({ folder, filename })

        return res.sendStatus(200);
    }

    res.status(400).json({ error: "erro desconhecido" })
}
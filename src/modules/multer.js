import multer from 'multer'

import FileService from "../services/fileServices.js"

export default {
    storage: multer.diskStorage({
        destination: async (req, file, cb) => {
            //console.log(req)
            let { filename, replace } = req.body
            let folder = decodeURIComponent(req.params.folder)

            // tratar dados do cliente

            if (!folder)
                return cb(new Error(`pasta não informada`))
            else if (!FileService.isValidName(folder))
                return cb(new Error('o nome da pasta é inválido'))

            if (!filename || !FileService.isValidName(filename, true))
                filename = file.originalname.trim()

            replace = (replace && replace.toLowerCase() == 'true') ? true : false

            // verificar existencia do arquivo

            const vfile = FileService.isCorrectFile(folder, filename)

            if ( vfile.error )
                return cb(new Error(vfile.error));
            else if ( vfile.exist && !replace )
                return cb(new Error("o arquivo já existe. use 'replace = true' para substituir"));
            else if ( replace )
                await FileService.backupFile(folder, filename)

            req.body.folder = folder
            
            return cb(null, FileService.GetFolderPath(folder))
        },
        filename: (req, file, cb) => {
            if (!FileService.isValidName(req.body.filename, true)) {
                req.body.filename = file.originalname
            }

            req.body.filename = req.body.filename.trim()

            return cb(null, req.body.filename)
        }
    })
}
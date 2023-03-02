import Path from "../util/path.js"
import fs from "fs"

import Folder from "../models/Folder.js"

class FileService {
    constructor () {
        if (!fs.existsSync(Path.dirData))
            fs.mkdirSync(Path.dirData)
        if (!fs.existsSync(Path.dirBackup))
            fs.mkdirSync(Path.dirBackup)

        this.maxNameLength = 90
    }

    async FolderIsProtected(folder) {
        const res = await Folder.findOne({ name: folder })

        if (!res) return null
        return res.passwd
    }

    async SetFolderProtection(folder, passwd) {
        const res = await Folder.findOne({ name: folder })

        if (res) return null

        await Folder.create({
            name: folder,
            passwd
        })
    }

    ListFolders() {
        let folders = []
    
        try {
            if (!fs.existsSync(Path.dirData)) return { error: `erro desconhecido` }
    
            folders = fs.readdirSync(Path.dirData, { withFileTypes: true })
                .filter(file => file.isDirectory())
                .map(file => file.name)
        } catch (e) {
            console.log(e)
            return { error: `erro desconhecido` }
        }
        
        return { folders }
    }
    
    ListFiles(folder) {
        let files = []
        const pathfiles = Path.join([Path.dirData, folder])
    
        try {
            if (!fs.existsSync(pathfiles)) return { error: `pasta não encontrada: '${folder}'` }
    
            files = fs.readdirSync(pathfiles, { withFileTypes: true })
                .filter(file => !file.isDirectory())
                .map(file => file.name)
        } catch (e) {
            console.log(e)
            return { error: `erro desconhecido` }
        }
        
        return { files }
    }
    
    GetFileDetails(folder, file) {
        let details;
    
        const pathfile = Path.join([Path.dirData, folder, file])
    
        try{
            if (!fs.existsSync(pathfile)) return { error: `arquivo não encontrado: '${folder}/${file}'` }
    
            details = fs.statSync(pathfile)
    
            let escala = 'KB'
            let size = details.size
            size = size / 1024.0
    
            if (size >= 1000) { size = size / 1024.0; escala = 'MB' }
            if (size >= 1000) { size = size / 1024.0; escala = 'GB' } 
    
            size = size.toFixed((size >= 100) ? 1 : 2)
    
            let mtime = new Date(details.mtimeMs)
    
            return {
                name: file,
                folder: folder,
                sizeStr: `${size.toString()} ${escala}`,
                mtime: mtime.toLocaleString('pt-BR')
            }
        } catch (e) {
            console.log(e)
        }
    
        return { error: `erro desconhecido` }
    }

    GetFilePath(folder, file) {
        return Path.join([Path.dirData, folder, file])
    }

    GetFolderPath(folder) {
        return Path.join([Path.dirData, folder])
    }

    isValidName(name, file=false) {
        if (!name) return false
        if (name.length > this.maxNameLength) return false
        if (file) return name.match(/^[A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ0-9\-_\.\(\) ]+$/)
    
        return name.match(/^[A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ0-9\-_\(\) ]+$/)
    }

    isCorrectFile(folder, file) {
        if (!this.isValidName(folder)) return { error: `nome inválido: '${folder}'` }
        if (!this.isValidName(file, true)) return { error: `nome inválido: '${file}'` }

        const pathfolder = Path.join([Path.dirData, folder])

        if (!fs.existsSync(pathfolder)) return { error: `pasta não encontrada: '${folder}'` }

        const pathfile = Path.join([Path.dirData, folder, file])

        if (fs.existsSync(pathfile)) return { exist: true }

        return { ok: true }
    }

    DeleteFile(folder, file) {
        if (!this.isValidName(folder)) return { error: `nome inválido: '${folder}'` }
        if (!this.isValidName(file, true)) return { error: `nome inválido: '${file}'` }

        const pathfile = Path.join([Path.dirData, folder, file])

        if (!fs.existsSync(pathfile)) return { error: `arquivo não encontrado: '${folder}/${file}'` }

        try {
            fs.unlinkSync(pathfile)
        } catch (e) {
            return null
        }

        return { ok: true }
    }

    RenameFile(folder, file, newname) {
        if (!this.isValidName(folder)) return { error: `nome inválido: '${folder}'` }
        if (!this.isValidName(file, true)) return { error: `nome inválido: '${file}'` }
        if (!this.isValidName(newname, true)) return { error: `novo nome inválido: '${newname}'` }
        if (!file.includes('.')) return { error: `nome inválido: '${folder}'` }
        if (newname.startsWith('.')) return { error: `novo nome inválido: '${newname}'` }

        if (file == newname) return { error: `novo nome não pode ser igual ao anterior: '${newname}'` }

        const pathfile = Path.join([Path.dirData, folder, file])

        if (!fs.existsSync(pathfile)) return { error: `arquivo não encontrado: '${folder}/${file}'` }

        const ext = file.slice(file.lastIndexOf('.'))

        if (!newname.endsWith(ext)) {
            if (newname.includes('.')) return { error: `novo nome inválido: '${newname}'` }

            newname = newname + ext
        }

        const newpathfile = Path.join([Path.dirData, folder, newname])

        if (fs.existsSync(newpathfile)) return { error: `novo nome já em uso nesta pasta: '${folder}/${newname}'` }

        try {
            fs.renameSync(pathfile, newpathfile)
        } catch (e) {
            return null
        }

        return { ok: true, newname }
    }

    backupFile(folder, file) {
        return new Promise((res) => {
            if (!this.isValidName(folder)) res({ error: `nome inválido: '${folder}'` })
            if (!this.isValidName(file, true)) res({ error: `nome inválido: '${file}'` })

            const pathfile = Path.join([Path.dirData, folder, file])

            if (!fs.existsSync(pathfile)) res({ error: `arquivo não encontrado: '${file}'` })

            const dest = Path.join([Path.dirBackup, folder])
            const pathfileBkp = Path.join([dest, file])

            try {
                if (!fs.existsSync(dest)) {
                    fs.mkdirSync(dest, { recursive: true })
                }

                fs.copyFile(pathfile, pathfileBkp, (err) => {
                    res({ ok: true })
                })
            } catch (e) {
                console.log(e)
                res({ error: `erro desconhecido` })
            }

            res({ ok: true })
        })
    }

    CreateFolder(folder) {
        if (!this.isValidName(folder)) return { error: `nome inválido: '${folder}'` }

        const pathfolder = Path.join([Path.dirData, folder])

        if (fs.existsSync(pathfolder)) return { error: `pasta já existe: '${folder}'` }

        try {
            fs.mkdirSync(pathfolder)
        } catch (e) {
            return { error: `erro desconhecido` }
        }

        return { ok: true }
    }
}

export default new FileService()
import Folder from "../models/Folder.js";

class Auth {
    constructor () {
        this.folders = null
        this.updateFolders()
    }

    async updateFolders() {
        let foldersList = await Folder.find()

        this.folders = {}

        for (const folder of foldersList) {
            this.folders[folder.name] = folder
        }
    }

    //dado uma senha, encontra a pasta protegida correspondente
    async SetPermission(req) {
        const passwd = req.body.password

        if (!passwd) return false;
    
        if (this.folders === null) await this.updateFolders();

        req.session.folder = null
    
        for (const folder in this.folders) {
            if (passwd == this.folders[folder].passwd) {
                req.session.folder = folder
                break
            }
        }
    
        if (!req.session.folder) return false;

        return true;
    }

    //dado uma senha e uma pasta, verifica se a senha bate com a pasta
    async RequestPermission(req, folder) {
        const password = req.body.password

        if (!password) return "dados não fornecidos";

        const pdFolder = await this.IsFolderProtected(folder)

        if (!pdFolder) return "pasta protegida não encontrada";

        if (password == pdFolder) {
            req.session.folder = folder
            return null
        }

        return "senha incorreta"
    }

    //verifica se possui permissão
    async HasPermission(req, folder) {
        if (folder && req.session.folder == folder) return true;

        if (!folder && req.session.folder) return true;

        return false;
    }

    //verifica se uma pasta específica possui proteção e retorna a senha
    async IsFolderProtected(folderName) {
        if (this.folders === null) await this.updateFolders();
        if (folderName in this.folders) return this.folders[folderName].passwd;

        return null;
    }

    //remove a sessão
    async RemovePermission(req) {
        if (req.session.folder) {
            req.session.destroy();
        }
    }
}

export default new Auth();
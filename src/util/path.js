import path from "path"
import dotenv from "dotenv"
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const utilsPath = {
    dirData: process.env.DIR_USER_DATA,
    dirBackup: process.env.DIR_BACKUP
}

const join = function (params = [], opt = { convertToPlatform: true }){
    if (!params || params.length == 0) return ''

    //windows
    var result = params[0]
    const sep = '/'

    for(let i = 1; i < params.length; i++){
        if (!params[i]) continue

        result += (result) ? sep + params[i] : params[i]
    }

    result = result
                .replace(new RegExp('\\+|/{2,}', 'g'), '/')
                .replace(new RegExp('/+$'), '')

    if (opt.convertToPlatform)
        return useDir(result)

    return result
}

const isCorrectDir = (dir) => {
    if (/^\/+|^\\+|\.{2,}/.test(dir))
        return false

    if (/\/{2,}|\\{3,}|\/+$|\\+$/.test(dir))
        return false

    if (/^\.+|\.+$/.test(dir))
        return false

    return true
}

const isCorrectName = (name) => {
    if (/\.{2,}|\\+|\/+|^\.+|\.+$/.test(name)) {
        return false
    }

    return true
}

const normDir = (dir) => {
    return dir.replace(/\\+/g, '/')
}

const useDir = (dir) => {
    if (process.platform == 'win32')
        return dir.replace(/\/+/g, '\\')
    return dir
}

export default {
    ...utilsPath,
    join,
    isCorrectDir,
    isCorrectName,
    normDir,
    useDir
}
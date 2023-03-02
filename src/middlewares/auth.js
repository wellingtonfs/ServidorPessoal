import Auth from "../services/session.js"

//middleware para adicionar algum grau de proteção, embora seja mínima, totalmente burlável
export default async function (req, res, next) {
    //verificar se alguma pasta está sendo acessada
    let folder = req.params.folder ? req.params.folder : req.body.folder
    folder = decodeURIComponent(folder)

    if (!folder) return next()

    if (await Auth.HasPermission(req, folder)) return next()

    //verificar se a pasta possui proteção
    const passwd = await Auth.IsFolderProtected(folder)
    if (passwd === null) return next()

    //caso não tenha acesso, retorna um erro
    res.status(401).json({ error: "permission denied" })
}
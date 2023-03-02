import express from "express"

import { Atualizar, Criar, Deletar, Listar } from "../../controllers/api/postitController.js"
import trycatch from "../../util/trycatch.js"

const rota = express.Router()

rota.post(
    '/criar',
    trycatch(Criar)
)

rota.post(
    '/atualizar',
    trycatch(Atualizar)
)

rota.get(
    '/deletar/:id',
    trycatch(Deletar)
)

rota.get(
    '/listar',
    trycatch(Listar)
)


export default rota
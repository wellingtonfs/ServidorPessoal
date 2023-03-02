import Postit from "../../models/Postit.js"

export async function Criar(req, res) {
    const corId = Number.parseInt(req.body.corId)

    if (typeof req.body.text != 'string' || Number.isNaN(corId))
        return res.status(400).json({ error: "dados incompletos" });

    await Postit.create({
        text: req.body.text,
        corId: corId
    })

    res.sendStatus(200)
}

export async function Atualizar(req, res) {
    const corId = Number.parseInt(req.body.corId)

    if (!req.body.id || (typeof req.body.text != 'string' && Number.isNaN(corId)))
        return res.status(400).json({ error: "dados incompletos" });

    if (typeof req.body.text == 'string' && !Number.isNaN(corId)) {
        await Postit.updateOne({ _id: req.body.id }, {
            text: req.body.text,
            corId: corId
        })
    } else if (typeof req.body.text == 'string') {
        await Postit.updateOne({ _id: req.body.id }, {
            text: req.body.text
        })
    } else {
        await Postit.updateOne({ _id: req.body.id }, {
            corId: corId
        })
    }

    res.sendStatus(200)
}


export async function Deletar(req, res) {
    if (!req.params.id)
        return res.status(400).json({ error: "dados incompletos" });

    try {
        await Postit.deleteOne({ _id: req.params.id })
    } catch (e) {
        return res.status(400).json({ error: "postit não encontrado" })
    }
    
    res.sendStatus(200)
}


export async function Listar(req, res) {
    const dados = await Postit.find()

    if (dados) {
        return res.json(dados.map(postit => {
            return {
                id: postit._id,
                text: postit.text,
                corId: postit.corId
            }
        }))
    }

    return res.json(dados)
}

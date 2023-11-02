import multer from 'multer';
import fs from "fs";

import fetch from 'node-fetch';

// Configurar o armazenamento e o nome do arquivo

const storage = multer.diskStorage({
    destination: (req, file, cb) => {

        if (!fs.existsSync("testes/uploads_openpose/")) {
            fs.mkdirSync("testes/uploads_openpose/", { recursive: true });
        }

        cb(null, 'testes/uploads_openpose/'); // Especifique a pasta onde as imagens serão armazenadas
    },
    filename: (req, file, cb) => {
        let ext = file.originalname.split(".").at(-1)

        cb(null, "img." + ext); // Use o nome original do arquivo
    },
});

const upload = multer({ storage: storage }).single('file');

export async function openpose(req, res) {
    upload(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err })

        // O arquivo estará disponível em req.file

        try {

            const response = await fetch("http://127.0.0.1:8000/", {
                method: 'POST',
                body: JSON.stringify({ path: req.file.path }),
                headers: { 'Content-Type': 'application/json' }
            })

            if (!response.ok) {
                throw new Error(`Erro na requisição python: ${response.status} - ${response.statusText}`);
            }

            const responseData = await response.json();

            if ("error" in responseData) {
                throw new Error(`Python retornou o erro: ${responseData.error}`);
            }

            return res.json({ ok: true });

        } catch (error) {

            return res.status(400).json({ error });

        }
    })
}
export default function trycatch(func) {
    return (req, res, next) => {
        Promise.resolve(func(req, res, next)).catch((error) => {
            console.log(error)
            res.sendStatus(400)
        })
    }
}
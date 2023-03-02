import Auth from "../../services/session.js"

export async function Login(req, res) {
    if (await Auth.HasPermission(req)) {
        return res.redirect('/home')
    }

    res.render('login')
}

export async function LogOut(req, res) {
    await Auth.RemovePermission(req)

    res.sendStatus(200)
}

export async function LoginPost(req, res) {
    if (await Auth.SetPermission(req)) {
        return res.render('home')
    }

    res.redirect('/');
}

export async function Home(req, res) {
    res.render('home')
}

export async function Upload(req, res) {
    res.render('upload')
}

export async function CriarPasta(req, res) {
    res.render('create_folder')
}

export async function Postit(req, res) {
    res.render("postit")
}

export async function Charts(req, res) {
    res.send("<center>Em breve gráficos <br> <a href='/home'>voltar</a><center>")
}

export async function Checkin(req, res) {
    res.sendStatus(200)
}
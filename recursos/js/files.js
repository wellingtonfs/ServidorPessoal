function addButton(command) {
    const divPai = document.getElementById("containerForm")

    const mydiv = document.createElement("div")
    mydiv.className = "div_row"

    const mybutton = document.createElement("button")
    mybutton.addEventListener("click", () => window.location.href = encodeURI(command.link))
    mybutton.textContent = command.label

    if (command.id) mybutton.id = command.id

    mydiv.appendChild(mybutton)
    divPai.appendChild(mydiv)
}

function addFileButton(command) {
    const divPai = document.getElementById("div_itens")

    const mydiv = document.createElement("div")
    mydiv.className = "div_row"

    const mybutton = document.createElement("button")
    mybutton.textContent = command.label
    mybutton.type = "button"

    if (command.id) mybutton.id = command.id

    mybutton.addEventListener("click", () => {
        let url = `${window.location.pathname}/${command.name}`
        url = url.replace(/\/{2,}/, '/')
        window.location.href = url
    })

    mydiv.appendChild(mybutton)
    divPai.appendChild(mydiv)
}

function onReceiveData(res, dados) {
    const files = res.files

    $("#titulo").html(dados.folder)
    $("#subtitulo").html(files.length.toString() + ' arquivo(s)')

    if (files.length == 0) {
        addButton({ label: "Enviar Arquivos", link: "/upload", id: "btnCommand" })
        addGoBackButton("containerForm", "/view")
        return;
    }

    files.forEach(name => {
        addFileButton({ label: name, name: name })
    })

    addGoBackButton("containerForm", "/view")
}

function onError(res, dados) {
    if (res.status == 404) {
        $("#titulo").html("Pasta não Encontrada")
        $("#subtitulo").html(dados.folder)
        hideLoading()
        return;
    } else if (res.status == 401) { //quando não tiver permissão
        localStorage.setItem('folder', location.href);

        $.get({
            url: '/logout',
            success: function () {
                location.href = '/'
            },
            error: function () {
                location.href = '/'
            }
        })
    }
}

async function makeRequest(dados) {
    $.ajax({
        url: "/api/filesystem/list",
        type: "POST",
        data: dados,
        success: function (res) {
            onReceiveData(res, dados)
            hideLoading()
        },
        error: function (res) {
            onError(res, dados)
            hideLoading()
        },
    })
}
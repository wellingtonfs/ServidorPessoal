function addButton(command) {
    const divPai = document.getElementById("containerForm")

    const mydiv = document.createElement("div")
    mydiv.className = "div_row"

    const mybutton = document.createElement("button")
    mybutton.textContent = command.label
    mybutton.type = "button"

    if (command.id) mybutton.id = command.id

    mybutton.addEventListener("click", () => window.location.href = command.link)

    mydiv.appendChild(mybutton)
    divPai.appendChild(mydiv)
}

function addFolderButton(command) {
    const divPai = document.getElementById("div_itens")

    const mydiv = document.createElement("div")
    mydiv.className = "div_row"

    const mybutton = document.createElement("button")
    mybutton.textContent = command.label
    mybutton.type = "button"

    if (command.id) mybutton.id = command.id

    mybutton.addEventListener("click", () => {
        let url = `/view/${command.name}`
        window.location.href = encodeURI(url)
    })

    mydiv.appendChild(mybutton)
    divPai.appendChild(mydiv)
}

function onReceiveData(data) {
    const folders = data.folders

    if (folders.length == 0) {
        $("#titulo").html("Nenhuma pasta encontrada")
        addButton({ label: "Criar Pasta", link: "/criar_pasta", id: "btnCommand" })
        addGoBackButton("containerForm", "/home")
        return;
    }

    $("#titulo").html("Em qual pasta seu arquivo está?")

    folders.forEach(name => {
        addFolderButton({ label: name, name: name })
    })

    addGoBackButton("containerForm", "/home")
}

window.onload = () => {
    showLoading()

    $.ajax({
        url: "/api/filesystem/list",
        type: "GET",
        success: function (data) {
            onReceiveData(data)
            hideLoading()
        },
        error: function (data) {
            hideLoading()
            alert((data.responseJSON ? data.responseJSON.error : data.error))
        },
    })

    //salvar ip como checkIn
    getIp(ip => {
        $.ajax({
            url: "/checkin",
            type: "POST",
            data: { ip: ip }
        })
    })
}
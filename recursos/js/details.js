const state = {
    folder: null,
    filename: null,
    clickTimes: 0
}

function RenameFile(newname) {
    $.post("/api/filesystem/renomear", { folder: state.folder, filename: state.filename, newname }, function (data, status) {
        console.log(data.error)

        if (status != "success") return alert("Problemas ao renomear o arquivo: " + status)

        const ext = state.filename.slice(state.filename.lastIndexOf('.'))

        if (newname.endsWith(ext)) location.href = `/view/${state.folder}/${newname}`;
        else location.href = `/view/${state.folder}/${newname + ext}`;
    })
}

$("#btnVoltar").click(() => {
    if (document.referrer) return window.location.href = document.referrer
    window.location.href = "/home"
})

$("#boxName").click(() => {
    state.clickTimes += 1

    if (state.clickTimes > 4) {
        
        makeQuestion({
            title: "Novo nome",
            inputType: "text",
            ok: {
                title: "Renomear",
                onPress: RenameFile
            }
        })

        state.clickTimes = 0
    }
})

$("textarea").change(function () {
    const text = $(this).val()

    if (text == "@del" || text == "@delete") {

        $.post("/api/filesystem/deletar", { folder: state.folder, filename: state.filename }, function (data, status) {
            console.log(data.error)

            if (status != "success") return alert("Problemas ao apagar o arquivo: " + status)

            location.href = "/view/" + (state.folder ? state.folder : "/view")
        })

        return;
    }

    $.post("/api/filesystem/addcomment", { folder: state.folder, filename: state.filename, comentario: text }, function (data, status) {
        console.log(data.error)

        if (status != "success") return alert("Problemas ao adicionar comentário: " + status)
    })
})

function onReceiveData(res, dados) {
    let date = res.mtime.slice(0, res.mtime.lastIndexOf(':'))
    let url = encodeURI(window.location.origin + res.url)

    state.folder = res.folder
    state.filename = res.name

    $("#label_filename").html(res.name)
    $("#label_size").html(res.sizeStr)
    $("#label_time").html(date)
    $("#label_link").html(url)
    $("textarea").val(res.comentario)

    $("#btnView").click(() => {
        url = encodeURI(`/api/filesystem/view/${res.folder}/${res.name}`)
        window.open(url)
    })

    $("#btnDownload").click(() => {
        window.location.href = url
    })
}

function onError(res, dados) {
    if (res.status == 404) {
        $("#titulo").html("Arquivo não Encontrado")
    } else if (res.status == 401) {
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
    } else {
        $("#titulo").html("Erro Desconhecido")
    }

    document.querySelectorAll(".div_row").forEach(
        el => el.style.display = "none"
    )

    document.getElementById("containerForm").style.justifyContent = "center"
}


async function makeRequest(dados) {
    $.ajax({
        url: "/api/filesystem/details",
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
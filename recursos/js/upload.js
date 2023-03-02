$("#div_inputArquivo").click(() => $("#inputArquivo").trigger('click'))

$("#inputArquivo").click((event) => event.stopPropagation()) //tem que parar a propagação, pois um clique aqui, gera um clique na div pai, gerando uma recursão

$("#inputArquivo").change((value) => {
    let name = value.target.files[0].name

    if (!name) return;
    if (!name.includes('.')) return $("#input_nomesala").prop("value", value.target.files[0].name);

    let sep = name.lastIndexOf('.')
    let firstname = name.slice(0, sep)
    let ext = name.slice(sep)

    $("#input_nomesala").prop("value", firstname)
    $("#label_ext").html(ext)
})

$("#btnCriarPasta").click(() => {
    window.location.href = "/criar_pasta"
})

$("#containerForm").submit(function (e) {
    e.preventDefault()

    if (document.getElementById("inputArquivo").files.length == 0)
        return alert("Nenhum arquivo selecionado!");

    let folder = $("#select_type").val()
    if (!folder)
        return alert("Nenhuma pasta selecionada");

    let dataform = new FormData(document.getElementById("containerForm"))
    let name = dataform.get("filename")
    $("#input_replace").val("false")

    if (!name)
        dataform.set("filename", '');
    else if (!isValidName(name))
        return alert("Nome Inválido\n\nDeve conter apenas:\n\n- Letras\n- Números\n- Espaços\n- Parênteses\n\nMáximo 90 caracteres");
    else
        dataform.set("filename", name + $("#label_ext").text());

    showLoading()

    $.ajax({
        url: `/api/filesystem/push/${encodeURIComponent(folder)}`,
        type: "POST",
        data: dataform,
        contentType: false,
        processData: false
    }).done((data) => {
        if (data.responseJSON) data = data.responseJSON

        location.href = encodeURI(`/view/${data.folder}/${data.filename}`)
    }).fail((data) => {
        hideLoading()

        switch (data.status) {
            case 400:
                if (!onAlreadyExists(data.responseJSON))
                    alert((data.responseJSON ? data.responseJSON.error : data.error));
                break;
            case 401:
                onPermissionDenied(folder)
                break;
            default:
                alert((data.responseJSON ? data.responseJSON.error : data.error));
        }
    })
})

function onAlreadyExists(data) {
    if (!data || !data.error) return false
    if (!data.error.includes("replace")) return false

    makeQuestion({
        title: "Este arquivo já existe. Deseja Substituir?",
        ok: {
            title: "Sim",
            onPress: () => {
                $("#input_replace").val("true")
                $("#containerForm").submit()
            }
        }
    })

    return true
}

function onPermissionDenied(folder) {
    const cb = (password) => {
        if (!password) return alert("Senha não informada")

        showLoading()

        $.ajax({
            url: `/api/auth/requestpermission/${encodeURIComponent(folder)}`,
            method: "POST",
            data: { password }
        }).done(() => {
            $("#containerForm").submit()
        }).fail((data) => {
            hideLoading()

            alert("Servidor diz: " + (data.responseJSON ? data.responseJSON.error : data.error))
        })
    }

    makeQuestion({
        title: "Senha da pasta",
        inputType: "password",
        ok: { title: "Ok", onPress: cb },
    })
}

function onReceiveData(data) {
    const selectPasta = document.getElementById("select_type")
    data.folders.forEach(name => selectPasta.add(new Option(name, name)))
}

function onError(data) {
    if (data.responseJSON.error) {
        $("#titulo").html(data.responseJSON.error)
    } else {
        $("#titulo").html("Serviço Indisponível")
    }

    document.querySelectorAll(".div_row").forEach(
        el => el.style.display = "none"
    )

    document.getElementById("containerForm").style.justifyContent = "center"
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
            onError(data)
            hideLoading()
        },
    }).done(() => {
        addGoBackButton("containerForm", "/home")
    })
}
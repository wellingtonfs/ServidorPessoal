$("#btnCriar").click(() => {
    let name = $("#input_nomesala").val()

    if (!isValidName(name)) {
       return alert("Nome Inválido\n\nDeve conter apenas:\n\
                    \n- Letras\
                    \n- Números\
                    \n- Espaços\
                    \n- Parênteses\
                    \n\nMáximo 90 caracteres")
    }
    
    $.ajax({
        url: "/api/filesystem/create_folder",
        type: "POST",
        data: { folder: name },
        success: function (data) {
            window.location.href = "/upload"
        },
        error: function (data) { 
            alert("Servidor diz:\n\n" + (data.responseJSON ? data.responseJSON.error : data.error));
        }
    })
})

window.onload = () => {
    addGoBackButton("containerForm", "/upload")
}
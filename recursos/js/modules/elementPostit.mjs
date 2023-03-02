import { AtualizarPostit, DeletePostit, ListPostits } from "./serverPostit.mjs"

export var State = {
    count: -1,
    nRows: -1,
    maxPorRow: 5,
    selected: null
}

const cores = ["rgb(161, 64, 8)", "rgb(161, 8, 64)", "rgb(64, 161, 8)", "rgb(8, 64, 161)"]

// atualiza as cores dos postits e marca qual está selecionado

export function UpdateScreen() {
    // colocar seleção de cores para post-its selecionados

    $(".divPostit .divCores").each(function () {
        $(this).hide()
    })

    if (State.selected != null) {
        $(".divCores", State.selected).show()
    }

    // atualizar os botões de cores

    $(".divPostit").each(function () {

        var that = this;

        $(".cor", this).each(function (idx) {

            $(this).css("background-color", cores[idx])

            $(this).off("click").click(function (e) {
                e.stopPropagation()

                $(that).css("background-color", cores[idx])

                // sincronizar com o servidor

                AtualizarPostit({
                    id: $(that).attr("name"),
                    corId: idx
                }).catch((status) => alert("Problemas na sincronização: " + status))
            })

        })
    })
}

// caso clique no textarea dentro do postit (parent)

function OnPostitClick(e) {
    e.stopPropagation()

    State.selected = $(this).parent()

    UpdateScreen()
}

// caso altere o textarea dentro do postit (parent)
// nesta função, o postit também pode ser deletado, caso o texto seja @del ou @delete

function OnPostitChange() {
    const text = $(this).val()

    if (text == "@del" || text == "@delete") {
        DeletePostit($(this).parent().attr("name"))
            .then(UpdateList)
            .catch((status) => alert("Problemas ao deletar: " + status));

        return;
    }

    AtualizarPostit({
        id: $(this).parent().attr("name"),
        text: text,
    }).catch((status) => alert("Problemas na sincronização: " + status))
}

export function CriarPostit({ id, text, corId, novo }) {
    let count = State.count + 1
    let idx = Math.floor(count / State.maxPorRow)

    // criar row

    let divRow;

    if (idx > State.nRows) {
        divRow = $("<div />", { class: "row" })
    } else {
        divRow = $(".row").eq(idx)
    }

    // criar nota
        
    let divMain = $("<div />", { name: id, class: "divPostit" })
    divMain.css("background-color", cores[corId])

    // textarea

    let textarea = $("<textarea />", { placeholder: "" })
    textarea.val(text)
    textarea.click(OnPostitClick)

    // atualizar no servidor quando houver 
    textarea.on("change", OnPostitChange)

    // div cores

    let divCores = $("<div />", { class: "divCores" })

    // juntar tudo

    divCores.append($("<div />", { class: "cor" }))
    divCores.append($("<div />", { class: "cor" }))
    divCores.append($("<div />", { class: "cor" }))
    divCores.append($("<div />", { class: "cor" }))

    divCores.hide()

    divMain.append(textarea)
    divMain.append(divCores)

    divRow.append(divMain)

    // caso tenha que add no body
    if (idx > State.nRows) {
        $("#divContent").append(divRow)
        State.nRows += 1
    }

    State.count += 1

    // selecionar o novo postit

    if (novo) {
        State.selected = divMain;
    }

    UpdateScreen()
}

// funções aux

export function UpdateList() {
    Reset()

    ListPostits().then((data) => {
        data.forEach(elem => {
            CriarPostit(elem)
        })
    })
}

export function Reset() {
    $("#divContent").empty()

    State = {
        ...State,
        count: -1,
        nRows: -1,
        selected: null
    }
}
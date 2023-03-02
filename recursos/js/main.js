const globalState = {
    isLoading: false
}

function isLoading() {
    return globalState.isLoading
}

function showLoading(options = { backColor: null, text: "Carregando..." }) {
    document.querySelector('#loading-circle label').textContent = options.text

    if (options.backColor != null )
        document.getElementById("loading").style.backgroundColor = options.backColor;
        
    document.getElementById("loading").style.display = "flex"
    globalState.isLoading = true
}

function hideLoading() {
    document.getElementById("loading").style.display = "none"
    globalState.isLoading = false
}

let defaultOptions = {
    title: "...",
    inputType: null,
    keep: false,
    ok: { title: "Ok", onPress: () => {} },
    cancel: { title: "Cancelar", onPress: () => {} },
}

async function makeQuestion(options = defaultOptions) {
    options = {...defaultOptions, ...options}

    $("#divContainerAsk #divAsk label").html(options.title)
    const ipt = $("#divContainerAsk #divAsk input")

    if (options.inputType !== null) {
        ipt.prop("type", options.inputType)
        ipt.css("display", "flex")
    } else {
        ipt.css("display", "none")
    }

    const btnNo = $("#divContainerAsk #btnAskNo")
    const btnYes = $("#divContainerAsk #btnAskYes")

    btnNo.html(options.cancel.title)
    btnYes.html(options.ok.title)

    btnNo.off('click').click((e) => {
        e.stopPropagation()

        if (!options.keep)
            $("#divContainerAsk").css("display", "none");

        options.cancel.onPress()
    })

    btnYes.off('click').click((e) => {
        e.stopPropagation()

        if (!options.keep)
            $("#divContainerAsk").css("display", "none");

        const msg = ipt.val()
        ipt.val('')

        options.ok.onPress(msg)
    })

    $("#divContainerAsk").css("display", "flex")
}

$("#divContainerAsk #divAsk").submit((e) => e.preventDefault())
$("#divContainerAsk #divAsk").click((e) => e.stopPropagation())
$("#divContainerAsk #btnAskNo").click((e) => e.stopPropagation())

$("#divContainerAsk").click(() => {
    $("#divContainerAsk #btnAskNo").click()
})

function isValidName(name) {
    if (!name) return false
    if (name.length > 90) return false
    return name.match(/^[A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ0-9\-_\(\) ]+$/)
}

function addGoBackButton(divPaiName, link) {
    const divPai = document.getElementById(divPaiName)

    const mydiv = document.createElement("div")
    mydiv.className = "div_lastrow"

    const mybutton = document.createElement("button")
    mybutton.textContent = "Voltar"
    mybutton.id = "btnVoltar"
    mybutton.type = "button"
    mybutton.addEventListener("click", () => window.location.href = encodeURI(link))

    mydiv.appendChild(mybutton)
    divPai.appendChild(mydiv)
}

//saber o ip da pessoa
function getIp(callback) {
    function response(s) {
        callback(window.userip);

        s.onload = s.onerror = null;
        document.body.removeChild(s);
    }

    function trigger() {
        var s = document.createElement("script");
        s.async = true;
        s.onload = () => response(s)
        s.onerror = () => response(s)

        s.src = "https://l2.io/ip.js?var=userip";
        document.body.appendChild(s);
    }

    if (/^(interactive|complete)$/i.test(document.readyState))
        trigger();
    else
        document.addEventListener('DOMContentLoaded', trigger);
}
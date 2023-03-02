var rotaApi = "/api/youtube"

//cria os estados do cliente
const state = {
    video: {
        id: null,
        title: null
    },
    videolist: null,
    nextlist: null,
    previousVideo: null
}

// ---------------------------------------------------------------------------------- funções uteis

//verifica se uma string é um link do youtube
function isVideoURL(frase) {
    return frase.includes("youtube.com/watch?v=") || frase.match(/^.+youtu\.be\/.+$/)
}

//dado um link do youtube, retorna o se ID
function getVideoId(url) {
    let lookFor = url.includes("watch?v=") ? "watch?v=" : "youtu.be/"
    let indexInit = url.indexOf(lookFor) + lookFor.length
    let indexEnd = url.length

    if (url.includes("&list=")) {
        lookFor = "&list="
        indexEnd = url.indexOf(lookFor)
    }

    return url.slice(indexInit, indexEnd)
}

//realiza uma requisição para obter a imagem de fundo do audio atual
function changeBackground() {
    const body = document.querySelector('body')

    $.ajax({
        url: `${rotaApi}/details/${state.video.id}`,
        type: "GET",
        success: function (data) {
            body.style.background = `url('${ data.img }')`
        },
        error: function (data) {
            body.style.backgroundColor = "#fff"
        },
    })
}

//abre o dialogo mostrando o link do vídeo e a opção de download
function mkQuestion(id) {
    makeQuestion({
        title: `${location.origin}/youtube/${id}`,
        ok: {
            title: "Baixar",
            onPress: () => { location.href = `${rotaApi}/get/${id}` }
        }
    })
}

//botão utilizado para baixar o audio que está sendo reproduzido
function addDownloadAction() {
    if (!state.video.id) return;

    $("#div_download_cur_audio").off('click').click(() => {
        mkQuestion(state.video.id)
    })
}

//Carrega uma música para ser tocada
function loadMusic() {
    //Preparar o Audio
    const audio = document.querySelector("audio")
    document.querySelector("#dialog-title").textContent = state.video.title
    document.querySelector("head title").text = state.video.title

    audio.pause()

    document.querySelector("source").src = `${window.location.origin}/api/${state.video.id}`

    audio.load()
    audio.play()

    //Mudar Background
    changeBackground()

    //Atualizar Botão Download
    addDownloadAction()

    //Buscar Semelhantes
    makeRequestSimilar()
}

//volta uma música
function previousMusic() {
    if (state.previousVideo === null) return;

    //salvar anterior
    const currentVideo = state.video
    state.video = state.previousVideo
    state.previousVideo = currentVideo
    loadMusic()
}

//avança para a próxima música, evitando músicas grandes (maiores que 12 minutos)
//aqui é realizado um sorteio entre as cinco músicas do topo da lista que sejam menores que 12 minutos
function nextMusic() {
    if (state.nextlist !== null && state.nextlist.length > 0) {
        let lista = state.nextlist.filter(({ duration: v }) => {
            return v[0] < 1 && v[1] < 12;
        })
        
        //caso não tenha músicas pequenas, sorteia com as que tem
        if (lista.length == 0) lista = state.nextlist;

        const tam = Math.min(lista.length, 5)
        const aleatorio = Math.floor(Math.random() * tam) % tam

        const { itr } = lista.at(aleatorio)

        //salvar anterior
        state.previousVideo = state.video

        //próximo
        state.video = state.videolist.at(itr)
        loadMusic()
    } else if (state.videolist !== null && state.videolist.length > 0) {
        const tam = Math.min(state.videolist.length, 5)
        const aleatorio = Math.floor(Math.random() * tam) % tam

        //salvar anterior
        state.previousVideo = state.video

        //próximo
        state.video = state.videolist[aleatorio]
        loadMusic()
    }
}

//adiciona um item a lista de músicas
function addVideoButton(video) {
    const divPai = document.getElementById("div_itens")

    //adiciona o container
    const mydiv = document.createElement("div")
    mydiv.id = video.id
    mydiv.className = "div_row"

    //adiciona a imagem do vídeo
    const divimg = document.createElement("div")
    divimg.className = "div_img"
    
    //adiciona o titulo que é um botão
    const mybutton = document.createElement("button")
    mybutton.textContent = video.title
    mybutton.type = "button"
    mybutton.className = "div_item"

    //adiciona a duração da música
    const divTime = document.createElement("div")
    divTime.className = "div_duration div_item"

    const labelDuration = document.createElement("label")
    labelDuration.textContent = "..."

    divTime.appendChild(labelDuration)

    //adiciona o botão de download
    const divDownload = document.createElement("div")
    divDownload.className = "div_download div_item"
    divDownload.onclick = () => mkQuestion(video.id)
    
    //aninha todos os itens
    mydiv.appendChild(divimg)
    mydiv.appendChild(mybutton)
    mydiv.appendChild(divTime)
    mydiv.appendChild(divDownload)
    divPai.appendChild(mydiv)

    //cria o evento de click do botão do titulo
    mybutton.addEventListener("click", () => {
        state.video = video
        loadMusic()
    })
}

//essa função auxilia a função 'updateDetails' recebendo os dados e atualizando na página
function onSuccesUpdateDetails(data, itr) {
    //atualiza a lista de músicas
    state.nextlist.push({
        itr: itr,
        duration: data.duration
    })

    //dada uma duração como: [h, m, s] transforma em: ["hh"?, "mm", "ss"]
    let duration = data.duration.map((v, idx) => {
        if (idx == 0 && v < 1) return ''

        let nv = v.toString()
        return nv.length == 1 ? '0' + nv : nv
    })
    
    //junta a duração em uma string do tipo: hh:mm:ss ou mm:ss
    duration = duration[0] ? duration.join(':') : duration.slice(1).join(':')

    document.querySelector(`[id="${data.id}"] label`).textContent = duration

    const img = document.querySelector(`[id="${data.id}"] .div_img`)
    img.style.background = `url("${data.img}")`
    img.style.backgroundSize = "100% 100%"
    img.onclick = () => window.open(`https://www.youtube.com/watch?v=${data.id}`)
}

//assincronamente atualiza os detalhes de cada música de acordo com seus metadados
async function updateDetails() {
    for (const itr in state.videolist) {
        //para cada música: faz a requisição para buscar os detalhes
        
        $.ajax({
            url: `${rotaApi}/details/${state.videolist[itr].id}`,
            type: "GET",
            success: (data) => onSuccesUpdateDetails(data, itr)
        })
    }
}

//quando os dados são recebidos das requisições de search, similar e ById
//essa função atualiza toda a lista de músicas
function onReceiveData(data) {
    $("#div_itens").empty()

    for (let video of data.videos) {
        addVideoButton(video)
    }

    //configurar próximo
    if (data.videos.length > 0) {
        state.nextlist = new Array()
        state.videolist = data.videos
        updateDetails()
    } else {
        state.nextlist = null
    }
}

// ---------------------------------------------------------------------------------- funções de requisição

//realiza uma requisição de acordo com a frase de busca
function makeRequestSearch(frase) {
    showLoading({ text: "Buscando..." })

    $.ajax({
        url: `${rotaApi}/search`,
        type: "POST",
        data: { frase },
        success: function (data) {
            onReceiveData(data)
        },
        error: function (data) {
            alert(data.responseJSON ? data.responseJSON.error : "Erro desconhecido")
        },
    }).always(() => {
        hideLoading()
    })
}

//realiza uma requisição de acordo com os videos similares ao que está tocando no momento
function makeRequestSimilar() {
    showLoading({  text: "" })

    $.ajax({
        url: `${rotaApi}/search?similar=${state.video.id}`,
        type: "POST",
        success: function (data) {
            onReceiveData(data)
        },
        error: function (data) {
            alert(data.responseJSON ? data.responseJSON.error : "Erro desconhecido")
        },
    }).always(() => {
        hideLoading()
    })
}

//realiza uma requisição de acordo com o id de um vídeo
function makeRequestById(videoId) {
    showLoading({ text: "Buscando..." })

    $.ajax({
        url: `${rotaApi}/details/${videoId}`,
        type: "GET",
        success: function (data) {
            onReceiveData({
                videos: [data]
            })
        },
        error: function (data) {
            alert(data.responseJSON ? data.responseJSON.error : "Erro desconhecido")
        },
    }).always(() => {
        hideLoading()
    })
}

// ---------------------------------------------------------------------------------- funções eventos

//evento do click do botão 'Ok'
$("#btnCommand").click(() => {
    const inputObj = $("#search_field")

    if (!inputObj.val())
        return alert("Campo de busca em branco")

    if (isVideoURL(inputObj.val())) {
        let videoId = getVideoId(inputObj.val())
        return makeRequestById(videoId)
    }

    makeRequestSearch(inputObj.val())
})

function ConfigIni(rota, videoId) {
    //configurar rota
    rotaApi = rota

    //configurar o audio
    let audio = document.querySelector("audio")
    audio.volume = 0.2
    audio.onended = nextMusic

    //adiciona o botão de voltar
    addGoBackButton("containerForm", "/home")

    document.addEventListener("copy", () => {
        try {
            if (state.video.id === null)
                return;

            navigator.clipboard.writeText(
                `${window.location.origin}/youtube/${state.video.id}`
            )
        } catch (e) {
            console.log(e)
        }
    })

    //cria os eventos de teclado
    document.addEventListener("keydown", (event) => {
        if (isLoading()) return;

        if (event.key == "Enter") {
            $("#btnCommand").click()
        } else if (event.key == "ArrowLeft") {
            previousMusic()
        } else if (event.key == "ArrowRight") {
            nextMusic()
        }
    })

    //caso receba um id como parametro, faz a pesquisa
    if (videoId) {
        makeRequestById(videoId)
    }

    //salvar ip como checkIn
    getIp(ip => {
        $.ajax({
            url: "/checkin",
            type: "POST",
            data: { ip: ip }
        })
    })
}
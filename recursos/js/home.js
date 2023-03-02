$("#btnGet").click(() => window.location.href = "/view")

$("#btnPush").click(() => window.location.href = "/upload")

$("#btnYoutube").click(() => window.location.href = "/youtube")

$("#btnNotas").click(() => window.location.href = "/notas")

$("#btnPostit").click(() => window.location.href = "/postit")

$("#btnCharts").click(() => window.location.href = "/charts")

window.onload = () => {
    //veficar se esta tentando ler uma pasta protegida
    const folderLink = localStorage.getItem('folder');

    if (folderLink) {
        localStorage.clear()
        location.href = folderLink
    }

    //salvar ip como checkIn
    getIp(ip => {
        $.ajax({
            url: "/checkin",
            type: "POST",
            data: { ip: ip }
        })
    });
}
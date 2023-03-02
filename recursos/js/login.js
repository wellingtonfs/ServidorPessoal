$("#btnCancel").click(function() {
    localStorage.clear()

    location.href = '/home'
})

window.onload = function() {
    //veficar se esta tentando ler uma pasta protegida
    const folderLink = localStorage.getItem('folder');

    if (folderLink) {
        $("#btnCancel").show()
    }
}
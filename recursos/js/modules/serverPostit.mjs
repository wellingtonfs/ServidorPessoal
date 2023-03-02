// Funções de sincronização com o servidor

export function AddPostit() {
    return new Promise((resolve, reject) => {
        $.post("/api/postit/criar", { text: "", corId: 0 }, function(data, status) {
            resolve(status)
        })
    })
}

export function AtualizarPostit(data) {
    return new Promise((resolve, reject) => {
        $.post("/api/postit/atualizar", data, function(data, status) {
            if (status != 'success') return reject(status);

            resolve(status)
        })
    })
}

export function DeletePostit(id) {
    return new Promise((resolve, reject) => {
        $.get("/api/postit/deletar/" + id, function(data, status) {
            if (status != 'success') return reject(status);

            resolve(status)
        })
    })
}

export function ListPostits() {
    return new Promise((resolve, reject) => {
        $.get("/api/postit/listar", function(data, status) {
            if (!data) return resolve([]);
    
            resolve(data)
        })
    })
}
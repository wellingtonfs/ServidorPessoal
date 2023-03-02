import { State, UpdateList, UpdateScreen } from "./modules/elementPostit.mjs";
import { AddPostit } from "./modules/serverPostit.mjs"

$("#btnVoltar").click(() => location.href = "/home")

$("#divContent").click(() => {State.selected = null; UpdateScreen();})

$("#btnNovo").click(() => {
    AddPostit()
        .then(UpdateList)
})

window.onload = () => {
    UpdateList()
}
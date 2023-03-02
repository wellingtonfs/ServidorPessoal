import mongoose from "mongoose";

const Schema = mongoose.Schema;

const FolderSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    passwd: {
        type: String,
        required: true
    }
})

const Folder = mongoose.model('Folder', FolderSchema)

export default Folder;
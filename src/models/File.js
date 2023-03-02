import mongoose from "mongoose";

const Schema = mongoose.Schema;

const FileSchema = new Schema({
    folder: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    comentario: {
        type: String
    }
})

const File = mongoose.model('File', FileSchema)

export default File;
import mongoose from "mongoose";

const Schema = mongoose.Schema;

const UrlSchema = new Schema({
    id: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
})

const Url = mongoose.model('Url', UrlSchema)

export default Url;

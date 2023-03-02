import mongoose from "mongoose";

const Schema = mongoose.Schema;

const VideoSchema = new Schema({
    id: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    imgname: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
})

const Video = mongoose.model('Video', VideoSchema)

export default Video;
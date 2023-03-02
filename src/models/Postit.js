import mongoose from "mongoose";

const Schema = mongoose.Schema;

const PostitSchema = new Schema({
    text: {
        type: String,
    },
    corId: {
        type: Number,
        required: true
    },
})

const Postit = mongoose.model('Postit', PostitSchema)

export default Postit;

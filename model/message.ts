import {Model, Schema,Document, ObjectId} from "mongoose"
import mongoose from 'mongoose'

export interface MessageDocument extends Document{
  senderId: string,
  senderName: string,
  receiverId : string,
  message: string,
  timestamp: Date,
  messagestatus:string,
  groupId: ObjectId
  roomId: string
}

const messageSchema:Schema<MessageDocument>=new Schema({
  senderId:{type:String,required: true},
  senderName:{type:String,required: true},
  receiverId:{type:String,required: true},
  message:{type:String,required: true},
  timestamp:{type:Date,default: Date.now},  
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  messagestatus:{type:String,default:"unread"},
  roomId:{type:String,required: true}
})

export const Message = mongoose.model('message',messageSchema)as Model<MessageDocument>



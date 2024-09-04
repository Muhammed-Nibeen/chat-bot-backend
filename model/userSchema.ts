import {Model, Schema,Document } from "mongoose"
const mongoose = require('mongoose')

 export interface UserDocument extends Document{
  fullName:string,
  email:string,
  password:string
  isblocked:boolean
 }

 const userSchema:Schema<UserDocument>=new Schema({
  fullName:{type:String,required:true},
  email:{type:String,required:true},
  password:{type:String,required:true},
  isblocked:{type:Boolean, default:false}
 })

export const userCollection = mongoose.model('user', userSchema) as Model<UserDocument>;


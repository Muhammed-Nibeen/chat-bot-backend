import express from 'express'
import cors from 'cors'
import path from 'path';
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import userRoutes from "./router/userRoutes"
import { configureSocket } from './websocketIO.ts/websocketIO';

dotenv.config()

const app = express()
const port = 3000

const corsOptions = {
  orgin:'http://localhost:4200',
  methods:['GET','POST','PUT','DELETE'],
  allowedHeaders:['Content-Type','Authorization'],
  credentials: true
}

app.use(cors(corsOptions))

app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use('/user',userRoutes)

const MONGO_STR = process.env.MONGO_STR;
const dbName = 'Chat'

async function connectDatabase(){
  try{
    await mongoose.connect(MONGO_STR as string,{
      dbName,
    })
    console.log(`MongoDB connected: ${dbName}`)
  }catch(error){
    console.error('Error connecting to MongoDb: ',error)
  }
}

connectDatabase()

const server = app.listen(port,() => {
  console.log(`Server listening at http://localhost:${port}`)
})

configureSocket(server)
import express from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'

import connectDB from './db/connect.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit:'50mb' }))

app.get('/',async (req,res)=>{
    res.send("Hello from DALL-E")
})

const server = async()=>{
    try{
        connectDB(`${process.env.MONGODB_URI}`)
        console.log("MongoDB Connected")
    }catch(error){
        console.log("DB Connection Failed")
    }
    app.listen(8000, ()=> console.log('App is running at PORT:8000'))
}

server()
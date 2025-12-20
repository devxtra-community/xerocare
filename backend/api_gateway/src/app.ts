import express from 'express';
import cors from 'cors';


const app = express();

app.listen(3002,()=>{
    console.log(`api gateway on port :${process.env.PORT}`)
})
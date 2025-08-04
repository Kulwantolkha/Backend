require('dotenv').config
const express = require('express');
const app = express();
const port = 3000;

app.get('/',(req,res) => {
    res.send('Hello World');
})

app.get('/instagram',(req,res) => {
    res.send("kulwantolkha");
})

app.get('/youtube',(req,res) => {
    res.send("<h3>Chai aur Code</h3>")
})

app.get("/google",(req,res) => {
    res.send("<a>https://www.google.com</a>")
})

app.listen(process.env.PORT,()=> {
    console.log('Getting data from port.');
})
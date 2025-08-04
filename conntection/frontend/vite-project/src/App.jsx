import { useState, useEffect } from 'react'
import './App.css'
import axios from 'axios'

function App() {
  const [jokes, setJokes] = useState([])

  useEffect(() => {
    axios.get('http://localhost:3000/api/jokes')
    .then((response) => {
      setJokes(Array.isArray(response.data) ? response.data : []);
    })
    .catch((error) => {
      console.log(error);
    })
  },[])

  return (
    <>
      <h2 className = "text:center">Jokes</h2>
      <p>Number of jokes: {jokes.length}</p>
      {
        Array.isArray(jokes) && jokes.map((joke) => (
          <div key={joke.id}>
            <h3>{joke.title}</h3>
            <p>{joke.content}</p>
          </div>
        ))
      }
    </>
  )
}

export default App

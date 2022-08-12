const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const Redis = require('redis');

// region : setup Redis
let client;
const redisUrl = 'redis://127.0.0.1/6379';

+async function (){
  client = Redis.createClient(redisUrl);
  
  client.on('error', (err) => console.log('Redis Client Error', err));
  
  client.connect();
}();
// end region

// region : setup rate limiter
const limiter = rateLimit({
	windowMs: 30 * 1000, // 30 secs
	max: 5, // Limit each IP to 2 requests per `window` (here, per 30 seconds)
});
// end region

const app = express();
app.use(express.json());

// region : setup routes
app.post('/', async (req, res) => {
  const { key, value } = req.body;
  const response = await client.set(key, value);
  res.json(response);
});

app.get('/', async (req, res) => {
  const { key } = req.body;
  const value = await client.get(key);
  res.json(value);
});

app.get('/posts/:id', limiter, async (req, res) => {
  const { id } = req.params;

  // retrieve from redis if it exists

  const cachedPost = await client.get(`post-${id}`);

  if(cachedPost){
    return res.json(JSON.parse(cachedPost));
  }

  const response = await axios.get(`https://jsonplaceholder.typicode.com/posts/${id}`);

  // save to redis if it doesn't exist
  await client.set(`post-${id}`, JSON.stringify(response.data));

  return res.json(response.data);
});
// end region

app.listen(8080, () => {
  console.log('listening on port 8080');
});

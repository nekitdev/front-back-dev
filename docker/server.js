const express = require("express");

const app = express();

const PORT = 3000;

const MESSAGE = process.env.MESSAGE;

app.get("/", (request, response) => {
  response.json({
    message: `response from backend server ${MESSAGE}`,
    port: PORT,
  });
});

app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});

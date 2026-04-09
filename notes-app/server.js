const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const webPush = require("web-push");
const cors = require("cors");
const path = require("path");

const keys = {
  public:
    "BJwQQ6EZjYdooernFqIsTPQ7I6mwveEeHSlwi1PvEXI30dcC6-0pOZTanzryx_T2ifrZUwqkjYziWCJb3aTJmWc",
  private: "xz8QE7wCYBSscGA2qocP3-mRsFUqKpkaHzzUYwGS4d0",
};

webPush.setVapidDetails("mailto:email@example.com", keys.public, keys.private);

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "./")));

let subscriptions = [];

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`client connected: ${socket.id}`);

  socket.on("newTask", (task) => {
    io.emit("taskAdded", task);

    const payload = JSON.stringify({
      title: "New task",
      body: task.text,
    });

    subscriptions.forEach((subscription) => {
      webPush.sendNotification(subscription, payload).catch((error) => {
        console.error(`push error: ${error}`);
      });
    });
  });

  socket.on("disconnect", () => {
    console.log(`client disconnected: ${socket.id}`);
  });
});

app.post("/subscribe", (request, response) => {
  subscriptions.push(request.body);
  response.status(201).json({ message: "subscription saved" });
});

app.post("/unsubscribe", (request, response) => {
  const { endpoint } = request.body;

  subscriptions = subscriptions.filter(
    (subscription) => subscription.endpoint != endpoint,
  );

  response.status(200).json({ message: "subscription removed" });
});

const PORT = 3001;

server.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});

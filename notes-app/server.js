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

const reminders = new Map();

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
      title: "Новая заметка",
      body: task.text,
    });

    subscriptions.forEach((subscription) => {
      webPush.sendNotification(subscription, payload).catch((error) => {
        console.error(`push error: ${error}`);
      });
    });
  });

  socket.on("newReminder", (reminder) => {
    const { id, text, reminderTime } = reminder;

    const delay = reminderTime - Date.now();

    if (delay <= 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const payload = JSON.stringify({
        title: "Напоминание",
        body: text,
        reminderId: id,
      });

      subscriptions.forEach((subscription) => {
        webPush.sendNotification(subscription, payload).catch((error) => {
          console.error(`push error: ${error}`);
        });
      });
    }, delay);

    reminders.set(id, { timeoutId, text, reminderTime });
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

app.post("/snooze", (request, response) => {
  const reminderId = parseInt(request.query.reminderId, 10);

  if (!(reminderId && reminders.has(reminderId))) {
    response.status(404).json({ error: "reminder not found" });

    return;
  }

  const reminder = reminders.get(reminderId);

  clearTimeout(reminder.timeoutId);

  const delay = 5 * 60 * 1000;

  const timeoutId = setTimeout(() => {
    const payload = JSON.stringify({
      title: "Напоминание отложено",
      body: reminder.text,
      reminderId,
    });

    subscriptions.forEach((subscription) => {
      webPush.sendNotification(subscription, payload).catch((error) => {
        console.error(`push error: ${error}`);
      });
    });
  }, delay);

  const reminderTime = Date.now() + delay;

  reminders.set(reminderId, {
    ...reminder,
    timeoutId,
    reminderTime,
  });

  response.status(200).json({ message: "reminder snoozed for 5 minutes" });
});

const PORT = 3001;

server.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});

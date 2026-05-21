import amqplib from "amqplib";
import express from "express";

const PORT = 3000;

const X_RETRY_COUNT = "x-retry-count";

const app = express();

app.use(express.json());

const sendMessage = async (name, data) => {
  const connection = await amqplib.connect("amqp://localhost");
  const channel = await connection.createChannel();

  await channel.assertQueue(name, { durable: true });

  const message = JSON.stringify(data);
  const buffer = Buffer.from(message);

  channel.sendToQueue(name, buffer, {
    persistent: true,
    headers: { [X_RETRY_COUNT]: 0 },
  });

  console.log(`[producer] sent: ${message}`);

  setTimeout(() => connection.close(), 1000);
};

app.post("/tasks", async (request, response) => {
  try {
    const { type, payload } = request.body;

    if (!(type && payload)) {
      response.status(400).json("missing `type` or `payload`");

      return;
    }

    await sendMessage("main", { type, data: payload });

    response.status(202).json({ message: "task accepted" });
  } catch (error) {
    console.error(error);

    response.status(500).json({ error: "internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`server running at http://localhost:${PORT}`);
});

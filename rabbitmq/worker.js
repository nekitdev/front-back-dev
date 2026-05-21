import amqplib from "amqplib";

const MAX_RETRIES = 3;

const UNKNOWN = "unknown";

const WORKER_ID = process.env.WORKER_ID || UNKNOWN;

const X_RETRY_COUNT = "x-retry-count";

const processMessage = async (data) => {
  console.log(`[process] data: ${data}`);
};

const startWorkerWithDLQ = async () => {
  const connection = await amqplib.connect("amqp://localhost");
  const channel = await connection.createChannel();

  await channel.assertQueue("main", { durable: true });
  await channel.assertQueue("dlq", { durable: true });

  await channel.assertExchange("dlx", "direct", { durable: true });

  await channel.bindQueue("dlq", "dlx", "dlk");

  await channel.assertQueue("main", {
    durable: true,
    deadLetterExchange: "dlx",
    deadLetterRoutingKey: "dlk",
  });

  channel.prefetch(1);

  channel.consume("main", async (message) => {
    if (!message) {
      return;
    }

    const string = message.content.toString();
    const data = JSON.parse(string);

    const retryCount = message.properties.headers?.[X_RETRY_COUNT] || 0;

    const nextCount = retryCount + 1;

    console.log(
      `[worker ${WORKER_ID}] attempt ${nextCount} of ${MAX_RETRIES} for data: ${data}`,
    );

    try {
      await processMessage(data);

      channel.ack(message);

      console.log(
        `[worker ${WORKER_ID}] successfully processed and acknowledged`,
      );
    } catch (error) {
      console.error(
        `[worker ${WORKER_ID}] error processing data: ${error.message}`,
      );

      if (retryCount < MAX_RETRIES) {
        channel.nack(message, false, false);

        const delay = 1000 * Math.pow(2, retryCount);

        console.log(`[worker ${WORKER_ID} retrying in ${delay}ms...`);

        // sleep for `delay` ms
        await new Promise((resolve) => setTimeout(resolve, delay));

        channel.sendToQueue("main", message.content, {
          persistent: true,
          headers: { [X_RETRY_COUNT]: nextCount },
        });
      } else {
        console.error(
          `[worker ${WORKER}] sent to DLQ after ${MAX_RETRIES} retries`,
        );

        channel.nack(message, false, false);
      }
    }
  });
};

setTimeout(() => startWorkerWithDLQ(), 10000);


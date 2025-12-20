import { getRabbitChannel } from "./config/rabbitmq";

(async () => {
  const channel = await getRabbitChannel();

  channel.sendToQueue(
    "email_queue",
    Buffer.from(
      JSON.stringify({
        type: "TEST",
        message: "Hello RabbitMQ",
      })
    ),
    { persistent: true }
  );

  console.log("Test message sent");
})();

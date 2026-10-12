import { randomUUID } from 'crypto';
import type { ConfirmChannel, Options } from 'amqplib';

function waitForDrain(channel: ConfirmChannel): Promise<void> {
  return new Promise((resolve, reject) => {
    const onDrain = () => {
      channel.removeListener('close', onClose);
      resolve();
    };
    const onClose = () => {
      channel.removeListener('drain', onDrain);
      reject(new Error('RabbitMQ channel closed while waiting for publisher backpressure'));
    };
    channel.once('drain', onDrain);
    channel.once('close', onClose);
  });
}

export async function publishConfirmed(
  channel: ConfirmChannel,
  exchange: string,
  routingKey: string,
  content: Buffer,
  options: Options.Publish = {},
): Promise<void> {
  const messageId = options.messageId || randomUUID();
  let returned = false;
  const onReturn = (message: { properties: { messageId?: string } }) => {
    if (message.properties.messageId === messageId) returned = true;
  };
  channel.on('return', onReturn);
  try {
    let accepted = true;
    const confirmed = new Promise<void>((resolve, reject) => {
      try {
        accepted = channel.publish(
          exchange,
          routingKey,
          content,
          { ...options, persistent: true, mandatory: true, messageId },
          (error) => (error ? reject(error) : resolve()),
        );
      } catch (error) {
        reject(error);
      }
    });
    await Promise.all([confirmed, accepted ? Promise.resolve() : waitForDrain(channel)]);
    await new Promise<void>((resolve) => setImmediate(resolve));
    if (returned) throw new Error(`RabbitMQ did not route message for ${routingKey}`);
  } finally {
    channel.removeListener('return', onReturn);
  }
}

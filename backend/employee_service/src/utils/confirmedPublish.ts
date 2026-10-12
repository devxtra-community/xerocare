import { randomUUID } from 'crypto';
import type { ConfirmChannel, Options } from 'amqplib';

function waitForDrain(channel: ConfirmChannel): Promise<void> {
  return new Promise((resolve, reject) => {
    const onClose = () => {
      channel.removeListener('drain', onDrain);
      reject(new Error('RabbitMQ channel closed while waiting for publisher backpressure'));
    };
    const onDrain = () => {
      channel.removeListener('close', onClose);
      resolve();
    };
    channel.once('drain', onDrain);
    channel.once('close', onClose);
  });
}

/** Publish durably, wait for local backpressure to clear and for broker confirm. */
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
    const confirm = new Promise<void>((resolve, reject) => {
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
    await Promise.all([confirm, accepted ? Promise.resolve() : waitForDrain(channel)]);
    // ConfirmChannel callbacks are delivered after any mandatory basic.return.
    await new Promise<void>((resolve) => setImmediate(resolve));
    if (returned) throw new Error(`RabbitMQ did not route message for ${routingKey}`);
  } finally {
    channel.removeListener('return', onReturn);
  }
}

export async function publishQueueConfirmed(
  channel: ConfirmChannel,
  queue: string,
  content: Buffer,
  options: Options.Publish = {},
): Promise<void> {
  await publishConfirmed(channel, '', queue, content, options);
}

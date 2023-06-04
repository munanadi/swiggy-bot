/**
 * This will take a large text and chunk it down to chunkSize and send it to the user
 * and makes sure the messages are sent sequentially
 * @param  client Twilio Client
 * @param {string} sender the consumer to send message to
 * @param {string} text the actual text to send to user
 */
async function sendLargeContent(client, sender, text) {
  const chunkSize = 1000;
  const chunks = [];

  // Split the file contents into chunks
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      await new Promise((resolve, reject) => {
        client.messages.create(
          {
            body: `${chunk}`,
            from: "whatsapp:+14155238886",
            to: sender,
          },
          (err, message) => {
            if (err) {
              reject(err);
            } else {
              console.log(message.sid, message.status);
              resolve();
            }
          }
        );
      });
    } catch (error) {
      console.error(
        `Failed to send message: ${chunk.slice(0, 20)}...`,
        error
      );
    }
    // Wait for a certain period of time before sending the next chunk
    await new Promise((resolve) =>
      setTimeout(resolve, 1000)
    );
  }
}

// TODO: Can make this more fancier on UI
/**
 * This will send updates for the user waiting on the message,
 * @param  client Twilio Client
 * @param {string} sender the consumer to send message to
 * @param {string} text the actual text to send to user
 */
async function sendUpdate(client, sender, text) {
  try {
    await new Promise((resolve, reject) => {
      client.messages.create(
        {
          body: `${text}`,
          from: "whatsapp:+14155238886",
          to: sender,
        },
        (err, message) => {
          if (err) {
            reject(err);
          } else {
            console.log(message.sid, message.status);
            resolve();
          }
        }
      );
    });
  } catch (error) {
    console.error(
      `Failed to send message: ${chunk.slice(0, 20)}...`,
      error
    );
  }
}

module.exports = {
  sendLargeContent,
  sendUpdate,
};

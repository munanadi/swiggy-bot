const express = require("express");
const { urlencoded } = require("body-parser");
const { twiml } = require("twilio");
const { MessagingResponse } = twiml;
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();
const fs = require("fs");
const ytdl = require("ytdl-core");

// Connect to the Openai API and send the message forward.
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create an Express application
const app = express();

// Configure body-parser middleware to parse incoming request bodies
app.use(urlencoded({ extended: false }));

// Define a route to handle incoming messages from Twilio
app.post("/webhook", async (req, res) => {
  const message = req.body.Body;
  const sender = req.body.From;
  const profileName = req.body.ProfileName;

  const youtubeRegex =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/gm;

  const match = youtubeRegex.exec(message);

  let response;

  // Found YT Url in message
  if (match) {
    const youtubeId = match[7];
    response = await handleYoutubeLinks(youtubeId);
  } else {
    // Process the incoming message and generate a response
    response = await generateResponse(message, profileName);
  }

  // Send the response back to the user
  const twiml = new MessagingResponse();
  twiml.message(response);

  console.log(response.slice(0, 100));
  console.log(twiml.toString());

  res.set("Content-Type", "text/xml");
  res.send(twiml.toString());
});

async function handleYoutubeLinks(youtubeId) {
  const openai = new OpenAIApi(configuration);
  // Download the Youtube video.
  try {
    await new Promise((resolve) => {
      ytdl(`http://www.youtube.com/watch?v=${youtubeId}`, {
        filter: "audioonly",
        quality: "highestaudio",
      })
        .pipe(fs.createWriteStream("audio.mp3"))
        .on("close", () => {
          resolve();
        });
    });
  } catch (e) {
    console.log(`Error Transcribing the file`, e);
  }

  console.log(
    "Done downloading the youtube audio!, Creating transcript"
  );

  try {
    const resp = await openai.createTranscription(
      fs.createReadStream("audio.mp3"),
      "whisper-1",
      "",
      undefined,
      0,
      "en"
    );

    // Create the transcipt file locally
    fs.writeFileSync(
      "transctipt.txt",
      resp.data.text.toString()
    );

    console.log("Transctipt done");

    const transcript = resp.data.text;

    return transcript;
  } catch (e) {
    console.log(e);
    return "None";
  }
}

// Function to generate a response based on the received message
async function generateResponse(message, profileName) {
  const openai = new OpenAIApi(configuration);
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: `This is what the user said : ${message}.
    Give a short introduction about yourself in two lines and continue the conversation ${profileName}`,
    max_tokens: 500,
    temperature: 0,
  });

  // console.log(response.data);

  // Example: Echo back the received message
  // return `You said: ${message}`;
  return `You said: ${message}
  ${response.data.choices[0].text}

  ${response.data.usage.total_tokens} tokens were used!`;
}

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

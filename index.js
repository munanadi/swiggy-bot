const express = require("express");
const { urlencoded, json } = require("body-parser");
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();
const fs = require("fs");
const ytdl = require("ytdl-core");

const {
  sendLargeContent,
  sendUpdate,
  normaliseText,
  continueConversation,
  countTokens,
} = require("./helpers");

// Twilio Client
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH;

const client = require("twilio")(accountSid, authToken);

// Connect to the Openai API and send the message forward.
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create an Express application
const app = express();

// Configure body-parser middleware to parse incoming request bodies
app.use(urlencoded({ extended: false }));

// Middleware for parsing JSON bodies
app.use(json());

// Tester routes for local testing.
// app.use(testerRoutes);

// Define a route to handle incoming messages from Twilio
app.post("/webhook", async (req, res) => {
  const message = req.body.Body;
  const sender = req.body.From;
  const profileName = req.body.ProfileName;

  console.log(
    `${message} from ${sender} with name ${profileName}`
  );

  const youtubeRegex =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/gm;

  const match = youtubeRegex.exec(message);

  let response =
    "Hello there from bot, only implemented for YT links";

  // Process the incoming message and generate a response
  if (match) {
    // Found YT Url in message
    const youtubeId = match[7];
    response = await handleYoutubeLinks(youtubeId, sender);
  }

  await sendLargeContent(client, sender, response);

  sendUpdate(client, sender, `Done! ✅`);
});

async function handleYoutubeLinks(youtubeId, sender) {
  const openai = new OpenAIApi(configuration);

  const youtubeLink = `http://www.youtube.com/watch?v=${youtubeId}`;
  const {
    videoDetails: {
      title: videoTitle,
      ownerChannelName: videoChannelName,
      lengthSeconds: videoDurationIns,
      viewCount: videoViews,
    },
  } = await ytdl.getBasicInfo(youtubeLink);

  // Download the Youtube video.
  try {
    await new Promise((resolve) => {
      const video = ytdl(youtubeLink, {
        filter: "audioonly",
        quality: "highestaudio",
      });

      // TODO: Probably save these files in cache or some storaged
      video
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
  await sendUpdate(
    client,
    sender,
    `Oh this video is from ${videoChannelName}, I'll watch it now. Give me a minute.`
  );

  await new Promise((resolve) => {
    setTimeout(() => {
      resolve(); // wait for a second to delay
    }, 1000);
  });

  await sendUpdate(
    client,
    sender,
    `Watching it, it's a ${parseInt(
      videoDurationIns / 60
    )} min long video`
  );

  try {
    // Transcription
    const transcriptResponse =
      await openai.createTranscription(
        fs.createReadStream("audio.mp3"),
        "whisper-1",
        `This is a audio description of cooking a recipe from ${videoChannelName}, we have a walkthrough as the cook explaining the steps involved and the ingredients to cook the recipe`,
        undefined,
        0,
        "en",
        {
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

    // Create the transcipt file locally
    // TODO: Probably save these files in cache or some storaged
    fs.writeFileSync(
      "transcript.txt",
      transcriptResponse.data.text.toString()
    );

    console.log("Transctipt done");

    const transcript = transcriptResponse.data.text;

    await sendUpdate(
      client,
      sender,
      `I saw the video. Taking a few notes..`
    );

    const prompt =
      `The following is a transcript of cooking a recipe titled ${videoTitle}, explaning the steps and ingredienets. List out the steps required to cook this recipe along with its ingredients. Here goes the transcript: ${transcript}`.toString();

    const tokensInPrompt = countTokens(prompt) || 0;
    // 4000 is the max but taking a safer bet.
    const MAX_TOKENS_ALLOWED = 3800 - tokensInPrompt - 1500;

    // Summary of ingredients and procedure
    // TODO: May run out of tokens, need to chunk and complete. need to understand more about tokens.
    const summaryResponse =
      await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: JSON.stringify(prompt),
          },
        ],
        temperature: 0,
        max_tokens: MAX_TOKENS_ALLOWED,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        // echo: true,
      });

    const summaryData = summaryResponse.data.choices[0];

    const reasonCompletion = summaryData.finish_reason;
    let summaryText = summaryData.message.content;

    if (reasonCompletion === "length") {
      summaryText += await continueConversation(
        openai,
        prompt,
        reasonCompletion,
        summaryText
      );
    }

    return summaryText;
  } catch (e) {
    console.log(e);
    return `Something went wrong, somewhere ${e.message}\n\n Please try again!`;
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

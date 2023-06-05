const express = require("express");
const router = express.Router();
const { Configuration, OpenAIApi } = require("openai");
const fs = require("fs");
const {
  continueConversation,
  countTokens,
} = require("./helpers");

// Connect to the Openai API and send the message forward.
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

// Checking tiktoken functionality
router.post("/token", async (req, res) => {
  const { prompt } = req.body;

  if (prompt) {
    const tokenCount = countTokens(prompt);
    return res
      .status(200)
      .json({ result: tokenCount, error: null });
  }

  return res.status(400).json({
    result: null,
    error: "prompt not passed in body",
  });
});

// Check continue conversation
router.post("/stream", async (req, res) => {
  const openai = new OpenAIApi(configuration);

  const transcript = fs.readFileSync(
    "transcript.txt",
    "utf-8"
  );

  console.log("Read file ", transcript.slice(0, 50));

  const prompt =
    `The following is a transcript of cooking a recipe, explaning the steps and ingredienets. List out the steps required to cook this recipe along with its ingredients. Here goes the transcript: ${transcript}`.toString();

  const tokensInPrompt = countTokens(prompt) || 0;
  // 4000 is the max but taking a safer bet.
  const MAX_TOKENS_ALLOWED = 3800 - tokensInPrompt - 1500;

  // console.log({ tokensInPrompt, MAX_TOKENS_ALLOWED });

  try {
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

    const {
      finish_reason: reasonCompletion,
      message: { content },
    } = summaryData;

    console.log(content);

    // If the tokens was limited and not able to continue the conversation, give context and continue the conversation
    if (reasonCompletion === "length") {
      console.log(
        `###----\nCut off by token length, Continuing the conversation...\n`
      );
      await continueConversation(
        openai,
        prompt,
        reasonCompletion,
        content
      );
    }

    return res.send("DONE!");
  } catch (e) {
    console.log(e.message);
  }
});

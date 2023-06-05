# WhatsApp Bot

This should get Youtube, Instagram reel videos of cooking, baking etc and figure out the ingredients used in the video.

![](./demo/youtube-recipie.gif)

---

## TODOs:

1. ~~Need to figure out how to manage tokens, can easily run out of them while parsing some videos~~
2. Instagram Reels
3. Deploy as an actual bot

---

### Local dev

1. Setup twilio account and connect sandbox
2. run local node, and tunnel to expose to public internet (using ngork or cloudlfared)
3. Set this exposed localhost in your sandbox settings in twilio

---

Get tokens used in the prompt with `token` POST endpoint

```sh
curl -X POST \
-H "Content-Type: application/json" \
-d '{
  "prompt": "Your prompt here"
}' \
http://localhost:3000/token
```

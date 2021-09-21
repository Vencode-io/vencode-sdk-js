# Vencode NodeJS SDK

Vencode provides an extensive and simple API and SDK for transcoding video in the cloud - you can find out more here https://vencode.io.

---

## View our documentation
For better and clearer documentation, please visit **https://docs.vencode.io**

### Before you start, you'll need
- Node.js v12 or above
- Your API Key and User ID from https://app.vencode.io/access

---

### Basic Setup
- `npm install --save @vencode/sdk`
- Import in your project and create a new instance of the Client

```js
// commonjs
const { Client } = require("@vencode/sdk");
// ES6  
import { Client } from "@vencode/sdk";
  
const client = new Client({
  // Your Vencode API Key and User ID
  access: {
    apiKey: "API_KEY from https://app.vencode.io/access",
    userId: "USER_ID from https://app.vencode.io/access",
  },
  
  // Cloud storage credentials (your own s3, google cloud, or digital ocean details)
  credentials: {
    type: "s3" | "gc" | "do",
    bucket: "*****",
    clientId: "*****",
    clientSecret: "****",
  },
});
```
- You're ready to go!

---

### Using the JobBuilder

```js
// commonjs
const { JobBuilder } = require("@vencode/sdk");
// ES6  
import { JobBuilder } from "@vencode/sdk";

// Create a builder instance
const builder = new JobBuilder(client)

  // Video input URL
  .withInput("https://file-examples-com.github.io/uploads/2018/04/file_example_MOV_1920_2_2MB.mov")
  
  // Add an output with the key and encoding options (in this case we are encoding to webm at 1080p)
  .addOutput({
    key: "testing/sdk/encoded.webm",
    encode: { format: "webm", res: "1920x1080" },
  });
 
// Run the job
const job = await builder.run()
```
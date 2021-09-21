# Vencode NodeJS SDK

Vencode provides an extensive and simple API and SDK for transcoding video in the cloud - you can find out more here https://vencode.io.

## Before you start, you'll need
- Node.js v12 or above
- Your API Key and User ID from https://app.vencode.io/access

## Setup
- `npm install --save @vencode/core`
- Import in your project and create a new instance of the Client
  ```js
  // commonjs
  const { Client } = require("@vencode/sdk");
  // ES6  
  import { Client } from "@vencode/core";

  const client = new Client({ ... });
  ```
- You're ready to go

import "win-ca"; // still needed
import { bootstrap } from "global-agent";

bootstrap();

import { Client } from "@notionhq/client"
import { config } from "dotenv"

config()

console.log("API Key loaded:", process.env.NOTION_API_KEY ? "✅ yes" : "❌ no")

const notion = new Client({ auth: process.env.NOTION_API_KEY })

async function main() {
  try {
    const response = await notion.users.list()
    console.log("Users in workspace:")
    response.results.forEach(user => {
      console.log(user.name, "-", user.id)
    })
  } catch (err) {
    console.error("Error calling Notion API:", err)
  }
}

main()
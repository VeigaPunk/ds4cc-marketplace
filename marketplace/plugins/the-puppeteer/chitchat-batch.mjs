import process from "node:process";

let prompt = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) prompt += chunk;
if (!prompt) {
  console.error("chitchat-batch: prompt must not be empty");
  process.exit(1);
}
process.stdout.write(JSON.stringify([
  ["keyboard", "inserttext", prompt],
  ["press", "Enter"],
]));

import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph"
import dotenv from 'dotenv'
import {
  SystemMessage,
  ToolMessage
} from "@langchain/core/messages";
dotenv.config();

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    maxOutputTokens: 2048,
    apiKey: process.env.GOOGLE_API_KEY
});

const multiply = tool(
  async ({ a, b }) => {
    return a * b;
  },
  {
    name: "multiply",
    description: "Multiply two numbers together",
    schema: z.object({
      a: z.number().describe("first number"),
      b: z.number().describe("second number"),
    }),
  }
);

const add = tool(
    async ({ a, b }) => {
        return a + b;
    },
    {
        name: "add",
        description: "Add two numbers together",
        schema: z.object({
            a: z.number().describe("first number"),
            b: z.number().describe("second number"),
        }),
    }
);

const divide = tool(
    async ({ a, b }) => {
        return a / b;
    },
    {
        name: "divide",
        description: "Divide two numbers",
        schema: z.object({
            a: z.number().describe("first number"),
            b: z.number().describe("second number"),
        }),
    }
);

const tools = [add, multiply, divide]
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]))

const llmWithTools = llm.bindTools(tools);


async function llmCall(state) {
    // LLM decides whether to call a tool or not
    const result = await llmWithTools.invoke([
        {
            role: "system",
            content: "You are a helpful assistant tasked with performing arithmetic on a set of inputs."
        },
        ...state.messages
    ]);

    return {
        messages: [result]
    };
}

const toolNode = new ToolNode(tools);

function shouldContinue(state) {
    const messages = state.messages;
    const lastMessage = messages.at(-1);

    // If the LLM makes a tool call, then perform an action
    if (lastMessage?.tool_calls?.length) {
        return "Action";
    }
    // Otherwise, we stop (reply to the user)
    return "__end__";
}

const agentBuilder = new StateGraph(MessagesAnnotation)
    .addNode("llmCall", llmCall)
    .addNode("tools", toolNode)
    .addEdge("__start__", "llmCall")
    .addConditionalEdges(
        "llmCall",
        shouldContinue,
        {
            // Name returned by shouldContinue : Name of next node to visit
            "Action": "tools",
            "__end__": "__end__",
        }
    )
    .addEdge("tools", "llmCall")
    .compile();

const messages = [{
    role: "user",
    content: "Add 3 and 4 then multiple  that by 10 and divide it by 2."
}];

const result = await agentBuilder.invoke({ messages });
const finalMessage = result.messages.at(-1); 

console.log("--- FINAL OUTPUT ---");
console.log("Final Content:", finalMessage.content); 
console.log("--------------------");
// console.log(result.messages);



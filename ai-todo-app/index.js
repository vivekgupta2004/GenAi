// Tools 
import { db } from './db/index.js'
import { todosTable } from './db/schema.js'
import { ilike, eq } from 'drizzle-orm';

import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";

import readlineSync from "readline-sync"



const client = new GoogleGenerativeAI(process.env.GENAI_API_KEY);
const model = client.getGenerativeModel({ model: "gemini-1.5-pro-latest" });




async function getAllTodos() {
    const todos = await db.select().from(todosTable);
    return todos
}

async function createTodo(todo) {
    const [result] = await db.insert(todosTable).values({
        todo,
    }).returning({
        id: todosTable.id,
    });
    return result.id;
}

async function deleteTodoById(id) {
    await db.delete(todosTable).where(eq(todosTable.id, id));
}

async function searchTodo(search) {
    const todos = await db.select().from(todosTable).where(ilike(todosTable.todo, `%${search}%`));
    return todos
}


const tools =     {
    getAllTodos: getAllTodos,
    createTodo: createTodo,
    deleteTodoById: deleteTodoById,
    searchTodo: searchTodo
}




const SYSTEM_PROMPT = ` 

You are  an  AI  To-Do List Assistant with START, PLAN, ACTION, Observation and Output State.
Wait for the user prompt and first PLAN using available tools.
After Planning, Take the Action with appropriate tool and wait for Observation based on Action.

You can manage a tasks by adding, viewing, updating and deleting tasks. You must strickly follow the  JSON output format.

Once you get the Observation, Return the AI Response based  on the START prompt and Observation.

Todo DB schema: 
id: Int and Primary Key
todo:String
created_at: Date Time
updated_at: Date Time

Avaliable Tools:
-getAllTodos(): Returns all the Todos from the Database
-createTodo(todo: string): Create a new Todo in the DB and takes todo as a string and returns on the ID of created Todo
-deleteTodoById(id: string): Delete  the todo by Id give in the DB
-searchTodo(query: string): Search  for all todos  matching the query string using i like operator


Example :
START{
 "type": "user",
 "user": "Add a task for shopping groceries"
}
PLAN{
    "type": "plan",
    "plan": "I will try to get more context on what user needs to shop."
}
Output{
    "type": "output",
    "output": "Can you tell me what all items  you want to shop?"   
}
{
"type": "user",
 "user": "I want to shop for vegetables and fruits"
}
PLAN{
    "type": "plan",
    "plan": "I will use createTodo to create a new Todo in DB"
}
ACTION{
    "type": "action",
    "function": "createTodo",
    "input":"Shopping Groceries vegitables and fruits"
}
Obeservation{
   "type":"observation",
    "observation":"2"
}
Output{
  "type":"output",
  "output":"Your todo has been added successfully"
}
`;

const messages = [{ role: 'system', content: SYSTEM_PROMPT }];


// ---------- CHAT LOOP ----------
while (true) {
    const query = readlineSync.question('>> ');
    const userMessage = { type: 'user', user: query };

    messages.push({ role: 'user', content: JSON.stringify(userMessage) });

    while (true) {
        const chatResponse = await model.generateContent({
            contents: messages.map(m => ({
                role: m.role,
                parts: [{ text: m.content }]
            }))
        });

        const raw = chatResponse.response.candidates[0].content.parts[0].text;
        console.log("🤖 Raw Response:", raw);

        let action;
        try {
            action = JSON.parse(raw);
        } catch (e) {
            console.error("⚠️ Failed to parse JSON:", raw);
            break;
        }

        messages.push({ role: 'assistant', content: raw });

        if (action.type === 'output') {
            console.log(`🚩 ${action.output}`);
            break;
        }
        else if (action.type === 'action') {
            const fn = tools[action.function];
            if (!fn) throw new Error('❌ Invalid Tool Call');

            const observation = await fn(action.input);
            const observationMessage = {
                type: 'observation',
                observation: observation,
            };

            messages.push({
                role: 'developer',
                content: JSON.stringify(observationMessage)
            });
        }
    }
}

import readlineSync from 'readline-sync'

import OpenAI from "openai"

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

function getWeatherDetails(city = '') {
    if (city.toLowerCase() === 'aligarh') return '10°c'
    if (city.toLowerCase() === 'delhi') return '10°c'
    if (city.toLowerCase() === 'mumbai') return '14°c'
}

const tools ={
    "getWeatherDetails":getWeatherDetails
}

const SYSTEM_PROMPT = `
 You are an AI Assistant with START , PLAN , ACTION, Obeservation and Output State.
 Wait for the user prompt and first PLAN using available tools. 
 After Planning, Take the action with appropriate tools and wait for Observations based in Action Once you get
 the observations, Return the AI response based in START prompt and observations.

 Strictlty follow the JSON output format as this example

 Available Tools:
 -function getWeatherDetails(city:string):string
 getWeatherDetails is a function that accepts city name as string and returns the weather details

 Example:
 START 
 {"type":"user", "user": "What is the sum of weather of Aliagrh and Mumbai "};
 {"type":"plan", "plan": "I will call the getWeatherDetails for Aligarh "};
 {"type":"action", "function": "getWeatherDetails", "input" :"Aligarh"};
 {"type":"observation", "observation": "10°c"};

 {"type":"plan", "plan": "I will call the getWeatherDetails for Mumbai "};
 {"type":"action", "function": "getWeatherDetails", "input" :"Mumbai"};
 {"type":"observation", "observation": "14°c"};
 {"type":"output", "output": "The sum of weather of Aligarh and Mumbai is 24°c"};
`
// const user = ' hey what is the weather in aligarh'

const message = [
    { "role": "system", content: SYSTEM_PROMPT }
]

while (true) {
    const query = readlineSync.question('>> ');
    const q = {
        type: 'user',
        user: query,
    };
    message.push({ "role": "user", content: JSON.stringify(q) });
    while (true) {
        const chat = await client.chat.completions.create({
            model: 'gpt-4o',
            messages: message,
            response_format: { type: "json_object" }
        });
        const result = chat.choices[0].message.content;
        message.push({ role: 'assistant', content: result });

        const call = JSON.parse(result);
        if(call.type=="output"){
            console.log(`😍 : ${call.output}`);
            break;
        }
        else if(call.type=="action"){
            const fn = tools[call.function]
            const observation = fn(call.input)
            const obs =  {"type":"observation", "observation": observation};
            message.push({role:"developer", content: JSON.stringify(obs) })
        }

    }

}



import dotenv from 'dotenv'
import axios from 'axios'
import * as cheerio from 'cheerio'
import OpenAI from 'openai'
import { ChromaClient } from 'chromadb';

import Groq from 'groq-sdk';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});


const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const chromaClient = new ChromaClient({ path: 'http://localhost:8000' })
chromaClient.heartbeat();


const WEB_COLLECTION = `WEB_SCRAPD_DATA_COLLECTION-1`
async function scapeWebpage(url = '') {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data)

    const pageHead = $('head').html();
    const pageBody = $('body').html();

    const internalLinks = new Set();
    const externalLinks = new Set();

    $('a').each((_, el) => {
        const link = $(el).attr('href');
        if (link === '/') return;
        if (link.startsWith('http') || link.startsWith('https')) {
            externalLinks.add(link);
        }
        else {
            internalLinks.add(link);
        }
    })
    return { head: pageHead, body: pageBody, internalLinks: Array.from(internalLinks), externalLinks: Array.from(externalLinks) }

}


async function generateVectorEmbeddings({ text }) {
    try {
        const response = await axios.post("http://localhost:11434/api/embeddings", {
            model: "nomic-embed-text", // Ollama embedding model
            prompt: text
        });

        return response.data.embedding;
    } catch (err) {
        console.error("Embedding error:", err.response?.data || err.message);
        return [];
    }
}

async function ingest(url = '') {
    // console.log(`ingesting  ${url}`)
    const { head, body, internalLinks } = await scapeWebpage
        (url)
    const bodyChunks = chunkText(body, 1000);
    // const headEmbedding = await generateVectorEmbeddings({ text: body });

    // await insertIntoDB({ embedding: headEmbedding, url })



    for (const chunk of bodyChunks) {

        const bodyEmbedding = await generateVectorEmbeddings({ text: chunk })
        await insertIntoDB({ embedding: bodyEmbedding, url, head, body: chunk })
    }

    /* for (const link of internalLinks) {
        const _url = `${url} ${link}`
        await ingest(_url);

    } */



    // console.log(`ingesting Success ${url}`)

}

async function insertIntoDB({ embedding, url, body = '', head = '' }) {
    const collection = await chromaClient.getOrCreateCollection({
        name: WEB_COLLECTION,
    })

    collection.add({
        ids: [url],
        embeddings: [embedding],
        metadatas: [{ url, body, head }]
    })
}

ingest('https://www.piyushgarg.dev')
ingest('https://www.piyushgarg.dev/cohort')
ingest('https://www.piyushgarg.dev/about')
ingest('https://www.piyushgarg.dev/')



async function chat(question = '') {

    const questionEmbedding = await generateVectorEmbeddings({ text: question })

    const collection = await chromaClient.getOrCreateCollection({
        name: WEB_COLLECTION
    })

    const collectionResult = await collection.query({
        nResults: 1,
        queryEmbeddings: [questionEmbedding]
    })

    const metadatas = collectionResult.metadatas?.[0] || [];
    const body = metadatas.map(e => e.body).filter(Boolean);
    const url = metadatas.map(e => e.url).filter(Boolean);

    // console.log(body)
    // console.log(url)
    const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            {
                role: 'system',
                content: "You are an Ai support agent expert in providing support to users on behalf  of a webpage. Given the context about page content, reply the user accordingly."
            },
            {
                role: 'user',
                content: `
                  Query:${question}\n\n
                  URL:${url.join(', ')}
                  Retrived Context: ${body.join(', ')}
                `
            }
        ]
    })

    console.log({
        message: `AI ${response.choices[0].message.content}`,
        url: url[0],
    })

}

chat('What is cuppan code ?')

function chunkText(text, chunkSize) {
    if (!text || chunkSize <= 0) return [];

    const words = text.split(/\s+/);
    const chunks = []

    for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(words.slice(i, i + chunkSize).join(' '))
    }
    return chunks;
}



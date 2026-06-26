import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const languageNames = {
    en: 'English', hi: 'Hindi', es: 'Spanish',
    fr: 'French', de: 'German', ja: 'Japanese',
    ar: 'Arabic', pt: 'Portuguese', zh: 'Chinese',
    ko: 'Korean', it: 'Italian', ru: 'Russian'
};

const culturalPersona = {
    en: 'Direct, confident, and value-focused',
    hi: 'Warm, relationship-first, and respectful',
    es: 'Energetic, personable, and story-driven',
    fr: 'Elegant, thoughtful, and detail-oriented',
    de: 'Precise, technical, and no-fluff',
    ja: 'Formal, patient, and thorough',
    ar: 'Respectful, trust-building, and thorough',
    pt: 'Friendly, enthusiastic, and engaging'
};

export const navigationTools = [
    {
        type: 'function',
        function: {
            name: 'navigate_to',
            description: 'Navigate the browser to a specific page of the product',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'The URL to navigate to' },
                    pageName: { type: 'string', description: 'Name of the page being navigated to' }
                },
                required: ['url', 'pageName']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'click_element',
            description: 'Click a button or element on the current page',
            parameters: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector of element to click' },
                    description: { type: 'string', description: 'What this element does' }
                },
                required: ['selector', 'description']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'scroll_to',
            description: 'Scroll to a section on the current page',
            parameters: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector of section to scroll to' },
                    description: { type: 'string', description: 'What section is being scrolled to' }
                },
                required: ['selector', 'description']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'highlight_element',
            description: 'Highlight a UI element to draw attention to it while explaining',
            parameters: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector of element to highlight' },
                    label: { type: 'string', description: 'Label to show on the highlight' }
                },
                required: ['selector', 'label']
            }
        }
    }
];

export async function think(transcript, language, knowledgeMap, conversationHistory, productName) {
    const lang = language || 'en';
    const langName = languageNames[lang] || 'English';
    const persona = culturalPersona[lang] || culturalPersona.en;

    const systemPrompt = `
You are Alex, an expert AI sales demo specialist for ${productName}.

LANGUAGE: You MUST respond ONLY in ${langName}. Never switch languages.
COMMUNICATION STYLE: ${persona}

PRODUCT KNOWLEDGE:
${JSON.stringify(knowledgeMap, null, 2)}

YOUR ROLE:
- Give an engaging, personalized live demo of this product
- Navigate to features proactively — always SHOW before you explain
- When visitor asks about anything, navigate there immediately then explain
- Sound like a confident, friendly salesperson — not a robot
- Keep responses SHORT — max 2-3 sentences per turn (you are on a live call)
- At the end of the demo, qualify the prospect and ask for their email

NAVIGATION RULES:
- Always use navigation tools when showing features
- Navigate FIRST, then speak about what you're showing
- Use highlight_element to draw attention to important UI elements

RULES:
- Never say you are an AI unless directly asked
- Never make up features that aren't in the knowledge map
- If asked something you don't know — say "great question, let me have someone follow up on that"
- Always be enthusiastic and engaging
`.trim();

    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: transcript }
    ];

    const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        tools: navigationTools,
        tool_choice: 'auto',
        max_tokens: 300,
        temperature: 0.7
    });

    return response.choices[0];
}
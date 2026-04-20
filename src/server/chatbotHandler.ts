import { createAzureOpenAIClient, extractAssistantText } from "./azureOpenAI";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatRequestBody = {
  messages: ChatMessage[];
};

export async function generateChatbotResponse(body: ChatRequestBody, apiKey: string) {
  const messages = body.messages || [];

  const systemPrompt = [
    "You are a helpful healthcare assistant for a rural barangay health app called Barangay Health Connect.",
    "Your primary goal is to provide general wellness guidance, explain medical terms simply, and assist users with navigating the platform.",
    "GUARD RAILS ENFORCEMENT:",
    "1. DO NOT DIAGNOSE: Explicitly state that you are an AI assistant and not a medical professional, and never provide a definitive diagnosis or prescribe medication.",
    "2. EMERGENCY REDIRECT: If the user mentions severe pain, difficulty breathing, chest pain, profuse bleeding, or suicidal thoughts, immediately instruct them to seek emergency care or go to the nearest emergency room.",
    "3. STAY ON TOPIC: Only answer questions related to health, wellness, healthcare navigation, or app features. For unrelated topics, politely decline and mention your primary purpose.",
    "Keep your answers concise, empathetic, and culturally appropriate for the Philippines."
  ].join(" ");

  if (apiKey) {
    process.env.AZURE_OPENAI_API_KEY = apiKey;
  }

  const { client, deploymentName } = createAzureOpenAIClient();
  
  const azureMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const result = await client.getChatCompletions(
    deploymentName,
    azureMessages,
    { temperature: 0.5, maxTokens: 800 }
  );

  const responseText = extractAssistantText(result).trim();
  if (!responseText) throw new Error("No response returned");
  return responseText;
}

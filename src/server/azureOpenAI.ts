import { AzureKeyCredential, OpenAIClient } from "@azure/openai";

type AzureOpenAIEnv = {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
};

type ChatCompletionChoiceLike = {
  message?: {
    content?: unknown;
  } | null;
};

type ChatCompletionResultLike = {
  choices?: ChatCompletionChoiceLike[] | null;
};

export function getAzureOpenAIEnv(): AzureOpenAIEnv {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim();
  const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim();
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME?.trim();

  if (!endpoint) {
    throw new Error("Missing AZURE_OPENAI_ENDPOINT");
  }
  if (!apiKey) {
    throw new Error("Missing AZURE_OPENAI_API_KEY");
  }
  if (!deploymentName) {
    throw new Error("Missing AZURE_OPENAI_DEPLOYMENT_NAME");
  }

  let parsedEndpoint: URL;
  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    throw new Error(
      "Invalid AZURE_OPENAI_ENDPOINT. Use your Azure resource base URL, for example: https://<resource>.openai.azure.com/"
    );
  }

  const isAzureOpenAIHost =
    parsedEndpoint.hostname.endsWith(".openai.azure.com") ||
    parsedEndpoint.hostname.endsWith(".cognitiveservices.azure.com");

  if (!isAzureOpenAIHost) {
    throw new Error(
      "Invalid AZURE_OPENAI_ENDPOINT host. Expected an Azure OpenAI resource host ending in .openai.azure.com or .cognitiveservices.azure.com"
    );
  }

  // Accept full target URI input and normalize to resource base endpoint.
  const normalizedEndpoint = parsedEndpoint.origin;

  return {
    endpoint: normalizedEndpoint,
    apiKey,
    deploymentName,
  };
}

export function createAzureOpenAIClient(): { client: OpenAIClient; deploymentName: string } {
  const env = getAzureOpenAIEnv();
  return {
    client: new OpenAIClient(env.endpoint, new AzureKeyCredential(env.apiKey)),
    deploymentName: env.deploymentName,
  };
}

export function extractAssistantText(result: unknown): string {
  const data = result as ChatCompletionResultLike | undefined;
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object" && "text" in item && typeof (item as { text?: unknown }).text === "string") {
          return (item as { text: string }).text;
        }
        return "";
      })
      .join("");
  }
  return "";
}

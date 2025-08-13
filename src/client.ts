import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import OpenAI from "openai";
import { z } from "zod"; // Import zod for schema validation

// Definir interfaces para tipos personalizados
interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface McpToolResult {
  content?: {
    type: string;
    text: string;
  }[];
}

class MyClient {
  private openai: OpenAI;
  private client: Client;
  constructor() {
    this.openai = new OpenAI({
      baseURL: "https://models.inference.ai.azure.com", // might need to change to this url in the future: https://models.github.ai/inference
      apiKey: process.env.GITHUB_TOKEN,
    });

    this.client = new Client(
      {
        name: "example-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {},
        },
      }
    );
  }

  async connectToServer(transport: Transport) {
    await this.client.connect(transport);
    this.run();
    console.error("MCPClient started on stdin/stdout");
  }

  openAiToolAdapter(tool: { name: string; description?: string; input_schema: any }) {
    // Create a zod schema based on the input_schema
    const schema = z.object(tool.input_schema);

    return {
      type: "function" as const, // Explicitly set type to "function"
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties: tool.input_schema.properties,
          required: tool.input_schema.required,
        },
      },
    };
  }

  async callTools(
    tool_calls: any[]
  ): Promise<OpenAI.Chat.Completions.ChatCompletionToolMessageParam[]> {
    const toolResults: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] = [];

    for (const tool_call of tool_calls) {
      const typedToolCall = tool_call as ToolCall;
      const fn = typedToolCall.function;
      const toolName = fn.name;
      const args = JSON.parse(fn.arguments);

      console.log(`⚡ Calling tool ${toolName} with args:`, args);

      // Llama a la herramienta y APLICA LA INTERFAZ que creamos usando "as"
      const toolResult = (await this.client.callTool({
        name: toolName,
        arguments: args,
      })) as McpToolResult; // <-- Type assertion

      // Como `toolResult` ahora tiene un tipo, TypeScript entiende `.content`,
      // solucionando el primer error.
      const resultText = toolResult?.content?.[0]?.text ?? "La herramienta no devolvió resultado.";
      console.log("✔️ Tool result:", resultText);

      toolResults.push({
        tool_call_id: tool_call.id,
        role: "tool",
        content: resultText,
      });
    }

    return toolResults;
  }

  // En client.ts, reemplaza tu método run() con este:

  async run() {
    console.log("Asking server for available tools");
    const toolsResult = await this.client.listTools();
    const tools = toolsResult.tools.map((tool) => {
      return this.openAiToolAdapter({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      });
    });

    // 1. Prepara el primer mensaje para el LLM
    const userQuestion = "Cuanto es la suma de 2 y 3?"; // <-- Define la pregunta aquí
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "Eres un asistente de calculadora simple. Solo debes usar las herramientas que se te proporcionan de forma explícita. No intentes simular funciones que no existen usando combinaciones de otras herramientas. Si no puedes realizar una operación directamente, debes indicar que no tienes la capacidad.",
      },
      {
        role: "user",
        content: userQuestion, // <-- Asegúrate de incluir la pregunta del usuario
      },
    ];

    // Log más claro que muestra la pregunta real del usuario
    console.log(`🤔 Querying LLM: "${userQuestion}"`);

    try {
      // <-- INICIA EL BLOQUE TRY PARA CAPTURAR ERRORES
      // 2. Primera llamada al LLM
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1000,
        messages,
        tools: tools,
      });

      const responseMessage = response.choices[0].message;

      // Si no hay herramientas que llamar, simplemente imprime la respuesta y termina.
      if (!responseMessage.tool_calls) {
        console.log("\n🤖 Final Answer from LLM:");
        console.log(responseMessage.content);
        return; // Termina la ejecución si no hay más que hacer
      }

      // 3. Si el LLM decide usar herramientas... (el resto del flujo)
      console.log("✅ LLM wants to make a tool call");
      messages.push(responseMessage);

      const toolResults = await this.callTools(responseMessage.tool_calls);
      messages.push(...toolResults);

      console.log("💬 Sending tool results back to LLM for final answer...");
      const finalResponse = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
      });

      console.log("\n🤖 Final Answer from LLM:");
      console.log(finalResponse.choices[0].message.content);
    } catch (error) {
      // <-- CAPTURA Y MUESTRA CUALQUIER ERROR DE LA API
      console.error("\n❌ An error occurred while calling the OpenAI API:");
      console.error(error);
    }
  }
}

let client = new MyClient();
const transport = new StdioClientTransport({
  command: "node",
  args: ["./build/server.js"],
});
client.connectToServer(transport);

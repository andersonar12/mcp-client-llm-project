// server.ts
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Crear un servidor MCP
const server = new McpServer({
  name: "Calculator MCP Server",
  version: "1.0.0",
});

// Herramienta 1: Suma
server.tool(
  "add",
  {
    description: "Suma dos números y devuelve el resultado",
    a: z.number().describe("Primer número a sumar"),
    b: z.number().describe("Segundo número a sumar"),
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: `${a} + ${b} = ${a + b}` }],
  })
);

// Herramienta 2: Resta
server.tool(
  "subtract",
  {
    description: "Resta el segundo número del primero",
    a: z.number().describe("Minuendo (número del cual se resta)"),
    b: z.number().describe("Sustraendo (número que se resta)"),
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: `${a} - ${b} = ${a - b}` }],
  })
);

// Herramienta 3: Multiplicación
server.tool(
  "multiply",
  {
    description: "Multiplica dos números",
    a: z.number().describe("Primer factor"),
    b: z.number().describe("Segundo factor"),
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: `${a} × ${b} = ${a * b}` }],
  })
);

// Herramienta 4: División
server.tool(
  "divide",
  {
    description: "Divide el primer número entre el segundo",
    a: z.number().describe("Dividendo (número a dividir)"),
    b: z.number().describe("Divisor (número entre el cual dividir)"),
  },
  async ({ a, b }) => {
    if (b === 0) {
      return {
        content: [{ type: "text", text: "Error: No se puede dividir por cero" }],
      };
    }
    return {
      content: [{ type: "text", text: `${a} ÷ ${b} = ${a / b}` }],
    };
  }
);

// Herramienta 5: Potencia
server.tool(
  "power",
  {
    description: "Calcula la potencia de un número (base elevada a un exponente)",
    base: z.number().describe("Número base"),
    exponent: z.number().describe("Exponente"),
  },
  async ({ base, exponent }) => ({
    content: [{ type: "text", text: `${base}^${exponent} = ${Math.pow(base, exponent)}` }],
  })
);

// Recurso: Saludo personalizado
server.resource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  async (uri, { name }) => ({
    contents: [
      {
        uri: uri.href,
        text: `¡Hola, ${name}! Bienvenido al servidor de calculadora MCP.`,
      },
    ],
  })
);

// Recurso: Información de ayuda
server.resource(
  "help",
  new ResourceTemplate("help://calculator", { list: undefined }),
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: `Calculadora MCP - Operaciones disponibles:
- add(a, b): Suma dos números
- subtract(a, b): Resta dos números  
- multiply(a, b): Multiplica dos números
- divide(a, b): Divide dos números
- power(base, exponent): Calcula potencia
      
Recursos disponibles:
- greeting://nombre: Saludo personalizado
- help://calculator: Esta ayuda`,
      },
    ],
  })
);

// Función principal para iniciar el servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Servidor MCP Calculator iniciado en stdin/stdout");
}

// Manejo de errores
main().catch((error) => {
  console.error("Error fatal: ", error);
  process.exit(1);
});

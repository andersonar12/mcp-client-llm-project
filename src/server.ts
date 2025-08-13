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
server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: "text", text: `${a} + ${b} = ${a + b}` }],
}));

// Herramienta 2: Resta
server.tool("subtract", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: "text", text: `${a} - ${b} = ${a - b}` }],
}));

// Herramienta 3: Multiplicación
server.tool("multiply", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: "text", text: `${a} × ${b} = ${a * b}` }],
}));

// Herramienta 4: División
server.tool("divide", { a: z.number(), b: z.number() }, async ({ a, b }) => {
  if (b === 0) {
    return {
      content: [{ type: "text", text: "Error: No se puede dividir por cero" }],
    };
  }
  return {
    content: [{ type: "text", text: `${a} ÷ ${b} = ${a / b}` }],
  };
});

// Herramienta 5: Potencia
server.tool("power", { base: z.number(), exponent: z.number() }, async ({ base, exponent }) => ({
  content: [{ type: "text", text: `${base}^${exponent} = ${Math.pow(base, exponent)}` }],
}));

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

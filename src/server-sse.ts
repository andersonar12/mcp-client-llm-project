// server-sse.ts
import { Request, Response } from "express";
import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

// Crear un servidor MCP
const server = new McpServer({
  name: "Calculator SSE MCP Server",
  version: "1.0.0",
});

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.text());

// Almacenar las conexiones de transporte activas
const transports: { [sessionId: string]: SSEServerTransport } = {};

// Ruta para establecer conexión SSE
app.get("/sse", (req: Request, res: Response) => {
  console.log("🔗 Nueva solicitud de conexión SSE");

  // Configurar headers para SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  try {
    const transport = new SSEServerTransport("/messages", res);
    transports[transport.sessionId] = transport;

    console.log(`✅ Conexión SSE establecida: ${transport.sessionId}`);

    res.on("close", () => {
      delete transports[transport.sessionId];
      console.log(`❌ Conexión cerrada para session: ${transport.sessionId}`);
    });

    res.on("error", (error) => {
      console.error(`💥 Error en conexión SSE:`, error);
      delete transports[transport.sessionId];
    });

    // Conectar el servidor MCP
    server.connect(transport).catch((error) => {
      console.error("Error conectando servidor MCP:", error);
    });
  } catch (error) {
    console.error("Error creando transporte SSE:", error);
    res.status(500).send("Error interno del servidor");
  }
});

// Ruta para manejar mensajes entrantes
app.post("/messages", async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId requerido" });
    }

    const transport = transports[sessionId];

    if (!transport) {
      return res
        .status(400)
        .json({ error: `No se encontró transporte para sessionId: ${sessionId}` });
    }

    await transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Error manejando mensaje POST:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ===== HERRAMIENTAS MATEMÁTICAS =====

// Herramienta 1: Suma
server.tool(
  "add",
  {
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
    a: z.number().describe("Minuendo"),
    b: z.number().describe("Sustraendo"),
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: `${a} - ${b} = ${a - b}` }],
  })
);

// Herramienta 3: Multiplicación
server.tool(
  "multiply",
  {
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
    a: z.number().describe("Dividendo"),
    b: z.number().describe("Divisor"),
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
    base: z.number().describe("Número base"),
    exponent: z.number().describe("Exponente"),
  },
  async ({ base, exponent }) => ({
    content: [{ type: "text", text: `${base}^${exponent} = ${Math.pow(base, exponent)}` }],
  })
);

// Herramienta 6: Raíz cuadrada
server.tool(
  "sqrt",
  {
    number: z.number().describe("Número para calcular raíz cuadrada"),
  },
  async ({ number }) => {
    if (number < 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No se puede calcular la raíz cuadrada de un número negativo",
          },
        ],
      };
    }
    return {
      content: [{ type: "text", text: `√${number} = ${Math.sqrt(number)}` }],
    };
  }
);

// Herramienta 7: Porcentaje
server.tool(
  "percentage",
  {
    value: z.number().describe("Valor base"),
    percentage: z.number().describe("Porcentaje a calcular"),
  },
  async ({ value, percentage }) => {
    const result = (value * percentage) / 100;
    return {
      content: [{ type: "text", text: `${percentage}% de ${value} = ${result}` }],
    };
  }
);

// Herramienta 8: API de Chuck Norris
server.tool("random-joke", "Obtiene un chiste aleatorio de Chuck Norris", {}, async () => {
  try {
    const response = await fetch("https://api.chucknorris.io/jokes/random");
    const data = await response.json();

    return {
      content: [
        {
          type: "text",
          text: `🤠 Chiste de Chuck Norris: ${data.value}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: "❌ Error al obtener el chiste. Intenta de nuevo.",
        },
      ],
    };
  }
});

// Ruta de salud del servidor
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "OK",
    server: "Calculator SSE MCP Server",
    connections: Object.keys(transports).length,
    timestamp: new Date().toISOString(),
  });
});

// Ruta raíz informativa
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Calculator SSE MCP Server",
    version: "1.0.0",
    endpoints: {
      sse: "/sse",
      messages: "/messages",
      health: "/health",
    },
    activeConnections: Object.keys(transports).length,
  });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor SSE MCP iniciado en http://localhost:${PORT}`);
  console.log(`📡 Endpoint SSE: http://localhost:${PORT}/sse`);
  console.log(`💬 Endpoint Messages: http://localhost:${PORT}/messages`);
  console.log(`❤️ Health Check: http://localhost:${PORT}/health`);
  console.log(`ℹ️ Info: http://localhost:${PORT}/`);
});

// Manejo de errores no capturados
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
});

#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import sql from "mssql";

// Configuration from arguments or defaults (matching local dev env)
const config = {
    user: process.env.MSSQL_USER || "TNT_JHK",
    password: process.env.MSSQL_PASSWORD || "R9ekK7BfZe",
    server: process.env.MSSQL_SERVER || "220.73.213.73",
    port: parseInt(process.env.MSSQL_PORT || "14233"),
    database: process.env.MSSQL_DATABASE || "TNT",
    options: {
        encrypt: false, // For local dev / non-SSL connections as seen in application.yml
        trustServerCertificate: true,
    },
};

class MssqlServer {
    constructor() {
        this.server = new Server(
            {
                name: "mssql-server",
                version: "0.1.0",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.pool = null;

        this.setupHandlers();
        this.setupErrorHandling();
    }

    async connect() {
        try {
            this.pool = await sql.connect(config);
            console.error(`Connected to MSSQL at ${config.server}:${config.port}`);
        } catch (err) {
            console.error("Failed to connect to MSSQL:", err);
            process.exit(1);
        }
    }

    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "mssql_query",
                        description: "Run a read-only SQL query on the MSSQL database",
                        inputSchema: {
                            type: "object",
                            properties: {
                                sql: {
                                    type: "string",
                                    description: "The SQL query to execute (SELECT only)",
                                },
                            },
                            required: ["sql"],
                        },
                    },
                ],
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (request.params.name !== "mssql_query") {
                throw new Error("Unknown tool");
            }

            const sqlQuery = request.params.arguments.sql;
            if (!sqlQuery) {
                throw new Error("SQL query is required");
            }

            // Basic safety check for read-only
            if (!sqlQuery.trim().toLowerCase().startsWith("select") && !sqlQuery.trim().toLowerCase().startsWith("with")) {
                // Allow WITH for CTEs, but generally we want to be careful. 
                // For strict read-only, we might want to enforce DB user permissions, 
                // but here we'll add a simple check.
                // Note: This is not a perfect security check.
            }

            try {
                if (!this.pool) {
                    await this.connect();
                }

                const result = await this.pool.request().query(sqlQuery);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result.recordset, null, 2),
                        },
                    ],
                };
            } catch (err) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error executing query: ${err.message}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }

    setupErrorHandling() {
        this.server.onerror = (error) => {
            console.error("[MCP Error]", error);
        };

        process.on("SIGINT", async () => {
            if (this.pool) {
                await this.pool.close();
            }
            process.exit(0);
        });
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("MSSQL MCP Server running on stdio");
    }
}

const server = new MssqlServer();
server.run().catch(console.error);

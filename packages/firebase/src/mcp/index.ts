import * as functions from "firebase-functions/v1";
import * as express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getFirestore, Transaction } from 'firebase-admin/firestore';

const ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === 'true' || process.env.NODE_ENV === 'production';

// GTIN-12 check digit calculation (Luhn-like algorithm)
function calculateGTINCheckDigit(payload: string): number {
    const digits = payload.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
        if ((i + 1) % 2 !== 0) {
            sum += digits[i]! * 3;
        } else {
            sum += digits[i]! * 1;
        }
    }
    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
}

// Generate GTIN-12 UPC from 11-digit sequence
function generateUPC(payload: string): string {
    const padded = payload.padStart(11, '0');
    if (!/^\d{11}$/.test(padded)) {
        throw new Error(`Invalid UPC payload: ${payload}`);
    }
    const checkDigit = calculateGTINCheckDigit(padded);
    return `${padded}${checkDigit}`;
}

// Get next UPC sequence from Firestore (atomic transaction)
async function getNextUPCSequence(): Promise<string> {
    const db = getFirestore();
    const seqDocRef = db.collection('system_sequences').doc('identifiers');

    const sequence = await db.runTransaction(async (transaction: Transaction) => {
        const seqDoc = await transaction.get(seqDocRef);

        if (!seqDoc.exists) {
            // Initialize with starting sequence
            const initialSeq = 10000000000;
            transaction.set(seqDocRef, { upc: { sequence: initialSeq } });
            return initialSeq;
        }

        const data = seqDoc.data();
        const upcData = data?.upc || { sequence: 10000000000 };
        const nextSeq = upcData.sequence + 1;
        transaction.update(seqDocRef, { 'upc.sequence': nextSeq });
        return nextSeq;
    });

    return generateUPC(sequence.toString());
}

const app = express.default();
app.use(cors({ origin: true }));

const server = new Server(
    {
        name: 'indiios-remote-mcp-server',
        version: '0.1.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Map to hold active SSE transports
const transports = new Map<string, SSEServerTransport>();

app.get('/sse', async (req, res) => {
    console.log(`[MCP Server] New SSE connection request`);

    // In production this endpoint URL should match what Cloud Run exposes.
    const messageUrl = `${req.baseUrl || ''}/message`;

    const transport = new SSEServerTransport(messageUrl, res);

    // The SDK generates its own UUID sessionId
    const sessionId = transport.sessionId;
    transports.set(sessionId, transport);

    console.log(`[MCP Server] SSE connection established: ${sessionId}`);

    // Cleanup on disconnect
    res.on('close', () => {
        console.log(`[MCP Server] SSE connection closed: ${sessionId}`);
        transports.delete(sessionId);
    });

    await server.connect(transport);
});

app.post('/message', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);

    if (!transport) {
        console.warn(`[MCP Server] Message received for unknown session: ${sessionId}`);
        res.status(404).send('Session not found');
        return;
    }

    await transport.handlePostMessage(req, res);
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'format_dsp_metadata',
                description: 'Format digital service provider metadata based on strict release requirements.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        releaseTitle: { type: 'string', description: 'The title of the release' },
                        artists: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'List of primary artists',
                        },
                        genre: { type: 'string' },
                    },
                    required: ['releaseTitle', 'artists', 'genre'],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'format_dsp_metadata') {
        const args = request.params.arguments as unknown as {
            releaseTitle: string;
            artists: string[];
            genre: string;
        };
        const { releaseTitle, artists, genre } = args;

        // Validate required fields
        if (!releaseTitle || !Array.isArray(artists) || artists.length === 0 || !genre) {
            throw new McpError(
                ErrorCode.InvalidParams,
                'Missing required fields: releaseTitle, artists (non-empty array), genre'
            );
        }

        try {
            // Generate real UPC from Firestore sequence
            const upc = await getNextUPCSequence();

            const formattedMetadata = {
                upc,
                dspTitle: `${releaseTitle} - Single`,
                primaryArtistString: artists.join(' & '),
                genreCategory: genre.toUpperCase(),
                formattedAt: new Date().toISOString(),
            };

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(formattedMetadata, null, 2),
                    },
                ],
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error formatting DSP metadata: ${errorMessage}`,
                    },
                ],
                isError: true,
            };
        }
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
});

export const mcpEndpoint = functions
    .runWith({ enforceAppCheck: ENFORCE_APP_CHECK })
    .https.onRequest(app);
export const expressApp = app;

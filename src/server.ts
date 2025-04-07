import express from 'express';
import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import cors from 'cors';
import mcp from '@modelcontextprotocol/sdk/server/mcp.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

const {
  SSEServerTransport,
} = require('@modelcontextprotocol/sdk/server/sse.js');
const { z } = require('zod');

dotenv.config(); // Ensure environment variables are loaded

const {
  ZENITH_API_URL,
  API_VERSION,
  ZENITH_API_KEY,
  // ... other variables if needed
} = process.env;

const ZENITH_API_BASE_PATH = `${ZENITH_API_URL}${API_VERSION}`;

// --- Store the fetched JWT token ---
let jwtToken: string | null = null;

// --- Function to fetch the JWT token ---
async function fetchAuthToken(): Promise<string> {
  const authUrl = `${ZENITH_API_BASE_PATH}/auth/token`;
  console.log(`Attempting to fetch auth token from: ${authUrl}`);
  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        serviceName: 'mcp-server', // As per curl example
        serviceKey: ZENITH_API_KEY,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text(); // Use text() first, might not be JSON
      console.error(
        `Auth token fetch failed (${response.status}): ${errorBody}`,
      );
      throw new Error(
        `Failed to fetch auth token: ${response.status} ${errorBody}`,
      );
    }

    const data = await response.json();
    // Use 'token' based on the API response structure
    if (!data || typeof data.token !== 'string') {
      console.error('Invalid auth token response:', data);
      throw new Error('Received invalid auth token response');
    }
    console.log('Successfully fetched auth token.');
    return data.token;
  } catch (error) {
    console.error('Error during auth token fetch:', error);
    // Rethrow to be handled by the caller or potentially crash if auth is critical
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// --- Function to ensure token is available ---
async function ensureAuthToken(): Promise<void> {
  if (jwtToken === null) {
    try {
      jwtToken = await fetchAuthToken();
    } catch (error) {
      console.error('Failed to ensure auth token:', error);
      // Decide how to handle failure: maybe retry, or prevent further requests
      // For now, we clear the token and let subsequent calls fail or retry
      jwtToken = null;
      throw new Error('Authentication failed, cannot proceed.'); // Make it explicit
    }
  }
  // Add token expiry check and refresh logic here if needed in the future
}

// --- Server Initialization ---
const server = new McpServer({
  name: 'Zenith Productivity Assistant MCP Adapter',
  version: '1.0.0',
});

// --- Transport Setup ---
const app = express();
app.use(cors()); // Enable CORS for client connections

const transports = {};

// --- Helper for API Requests ---
async function zenithApiRequest(endpoint, method, data = undefined) {
  const fullUrl = `${ZENITH_API_BASE_PATH}${endpoint}`;

  // Ensure token is available for non-auth requests
  if (endpoint !== '/auth/token') {
    try {
      await ensureAuthToken();
    } catch (authError) {
      // If authentication fails, we cannot make the intended request.
      console.error(
        `Authentication required for ${method} ${fullUrl}, but failed.`,
      );
      // Re-throw or return an error structure appropriate for your MCP server
      throw authError;
    }
  }

  try {
    console.log(`Attempting authenticated fetch: ${method} ${fullUrl}`);

    // Construct headers dynamically
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // Add Authorization header only if we have a token (i.e., not for the /auth/token request)
    if (endpoint !== '/auth/token' && jwtToken) {
      headers['Authorization'] = `Bearer ${jwtToken}`;
    } else if (endpoint !== '/auth/token' && !jwtToken) {
      // This case should ideally be prevented by ensureAuthToken throwing an error
      console.error(
        `Attempted ${method} ${fullUrl} without a token after auth check.`,
      );
      throw new Error('Internal error: Auth token missing after check.');
    }

    const response = await fetch(fullUrl, {
      method,
      headers: headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      // Keep existing error handling, but improve details slightly
      let errorMessage = `API request failed (${method} ${fullUrl}) with status ${response.status}`;
      let errorDetails = response.statusText; // Default
      try {
        // Attempt to read body for more details, prioritizing JSON
        const errorBodyText = await response.text();
        try {
          const errorBodyJson = JSON.parse(errorBodyText);
          errorDetails =
            typeof errorBodyJson === 'string'
              ? errorBodyJson
              : errorBodyJson.message ||
                errorBodyJson.error ||
                JSON.stringify(errorBodyJson);
        } catch (jsonError) {
          // If not JSON, use the raw text if not empty
          errorDetails = errorBodyText || errorDetails;
        }
        errorMessage = `${errorMessage}: ${errorDetails}`;
      } catch (readError) {
        // Ignore if reading response body fails
        console.warn(
          `Could not read error response body for ${method} ${fullUrl}: ${readError}`,
        );
      }
      console.error(`Zenith API Error: ${errorMessage}`);
      // Throw a more informative error, including the specific details found
      throw new Error(`Fetch failed: ${response.status} ${errorDetails}`);
    }

    // Handle potential empty responses
    const contentType = response.headers.get('content-type');
    if (response.status === 204 || !contentType) {
      // 204 No Content or no content type header
      return {}; // Return empty object for no content responses
    }
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else {
      // Handle other content types if necessary, or return raw text/blob
      console.warn(
        `Received non-JSON response from ${method} ${fullUrl} with Content-Type: ${contentType}`,
      );
      return response.text(); // Example: return text for non-JSON
    }
  } catch (fetchError) {
    // Log the raw error if it's not the one we threw above
    if (!fetchError.message.startsWith('Fetch failed:')) {
      console.error(`RAW FETCH ERROR during ${method} ${fullUrl}:`, fetchError);
    }
    // Rethrow the specific error or a generic one
    throw new Error(fetchError.message || 'fetch failed');
  }
}

// --- Resource Schemas (Define expected structure from your API) ---
// Adjust these schemas to match the actual structure of your Zenith API responses
const TaskSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    // Add other fields returned by GET /api/tasks/{id}
    status: z.string().optional(),
    project_id: z.string().optional(),
  })
  .passthrough(); // Use passthrough to allow extra fields from API

const ProjectSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    // Add other fields returned by your Project API
  })
  .passthrough();

// --- Resource Definitions (Mapping MCP to Zenith API GET endpoints) ---

server.resource(
  'tasks',
  new ResourceTemplate('zenith://tasks/{taskId?}', {
    list: async () => {
      const tasks = await zenithApiRequest('/tasks', 'GET');
      return {
        contents: tasks.map((task) => ({
          uri: `zenith://tasks/${task.id}`,
          json: task,
        })),
      };
    },
  }),
  async (uri, { taskId }) => {
    try {
      if (taskId) {
        // Fetch single task details from Zenith API
        const task = await zenithApiRequest(`/tasks/${taskId}`, 'GET');
        return {
          contents: [
            {
              uri: uri.href,
              json: task,
            },
          ],
        };
      } else {
        // Fetch list of all tasks from Zenith API
        const tasks = await zenithApiRequest('/tasks', 'GET');
        return {
          contents: [
            {
              uri: uri.href,
              json: tasks,
            },
          ],
        };
      }
    } catch (error) {
      console.error(`MCP Resource Error (tasks): ${error.message}`);
      return {
        contents: [
          {
            uri: uri.href,
            text: `Error fetching tasks from Zenith API: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// Add project resource definition
server.resource(
  'projects',
  new ResourceTemplate('zenith://projects/{projectId?}', {
    list: async () => {
      const projects = await zenithApiRequest('/projects', 'GET');
      return {
        contents: projects.map((project) => ({
          uri: `zenith://projects/${project.id}`,
          json: project,
        })),
      };
    },
  }),
  async (uri, { projectId }) => {
    try {
      if (projectId) {
        const project = await zenithApiRequest(`/projects/${projectId}`, 'GET');
        return {
          contents: [
            {
              uri: uri.href,
              json: project,
            },
          ],
        };
      } else {
        const projects = await zenithApiRequest('/projects', 'GET');
        return {
          contents: [
            {
              uri: uri.href,
              json: projects,
            },
          ],
        };
      }
    } catch (error) {
      console.error(`MCP Resource Error (projects): ${error.message}`);
      return {
        contents: [
          {
            uri: uri.href,
            text: `Error fetching projects from Zenith API: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// --- Tool Implementations (Mapping MCP Tools to Zenith API POST/PUT/DELETE endpoints) ---

// Tool to create a new task (maps to POST /api/tasks)
server.tool(
  'create-task',
  {
    title: z.string().describe('The main title or name of the task.'),
    description: z
      .string()
      .optional()
      .describe('A more detailed description of the task.'),
    project_id: z
      .string()
      .optional()
      .describe('ID of the project this task belongs to.'),
  },
  async (params) => {
    try {
      const createdTask = await zenithApiRequest('/tasks', 'POST', params);
      console.log('Task created successfully via API:', createdTask.id); // Log success on server
      // OLD Response with resource
      // return {
      //   content: [
      //     {
      //       type: 'resource',
      //       resource: {
      //         uri: `zenith://tasks/${createdTask.id}`,
      //         json: createdTask,
      //       },
      //     },
      //   ],
      // };
      // TODO: Remove this once we have a proper response structure

      // if (clientTransport) { //TODO Example Snippet for Server Push (Option 3 - Conceptual):
      //   // Check if transport is available
      //   try {
      //     await clientTransport.send({
      //       // Use the transport's send method
      //       type: 'message', // Standard message type
      //       message: {
      //         role: 'assistant', // Or 'system'/'tool' depending on context
      //         content: [
      //           {
      //             type: 'resource',
      //             resource: {
      //               uri: `zenith://tasks/${createdTask.id}`,
      //               json: createdTask,
      //             },
      //           },
      //         ],
      //       },
      //     });
      //     console.log(
      //       `Pushed resource update for task ${createdTask.id} to client.`,
      //     );
      //   } catch (sendError) {
      //     console.error(
      //       `Failed to push resource update to client: ${sendError}`,
      //     );
      //   }
      // } else {
      //   console.warn(
      //     'Could not find client transport to push resource update.',
      //   );
      // }
      // NEW Response structure: Simple text
      return {
        content: [
          {
            type: 'text', // Use type 'text'
            text: `Task "${createdTask.title || params.title}" (ID: ${createdTask.id}) created successfully.`, // Provide confirmation text
          },
        ],
        isError: false, // Explicitly set isError to false for clarity
      };
    } catch (error) {
      console.error(`MCP Tool Error (create-task): ${error.message}`);
      return {
        content: [
          {
            type: 'text',
            text: `Error creating task via Zenith API: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// Tool to create a new project (maps to POST /api/project)
server.tool(
  'create-project',
  {
    name: z.string().describe('The name of the new project.'),
    description: z
      .string()
      .optional()
      .describe('A description for the new project.'),
  },
  async (params) => {
    try {
      const createdProject = await zenithApiRequest(
        '/projects',
        'POST',
        params,
      );
      return {
        content: [
          {
            type: 'resource',
            resource: {
              uri: `zenith://projects/${createdProject.id}`,
              json: createdProject,
            },
          },
        ],
      };
    } catch (error) {
      console.error(`MCP Tool Error (create-project): ${error.message}`);
      return {
        content: [
          {
            type: 'text',
            text: `Error creating project via Zenith API: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// --- Productivity Prompts (Unchanged from previous example, adapt as needed) ---
server.prompt(
  'productivity-coach',
  {
    goal: z.string().optional().describe("The user's main productivity goal."),
    currentTasks: z
      .string()
      .optional()
      .describe(
        'Comma-separated list of tasks the user is currently working on.',
      ),
    timeframe: z
      .string()
      .optional()
      .describe(
        "The timeframe for achieving the goal (e.g., 'this week', 'next month').",
      ),
  },
  ({ goal, currentTasks, timeframe }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Act as a productivity coach for the Zenith app. ${goal ? `My primary goal is: ${goal}.` : ''} ${currentTasks ? `My current tasks are: ${currentTasks}.` : ''} ${timeframe ? `I'm aiming to achieve this within ${timeframe}.` : ''} Please provide actionable advice, strategies, and encouragement to help me stay focused, manage my tasks effectively within Zenith, and make progress towards my objectives. Consider techniques like time blocking, prioritization, and breaking down large tasks.`,
        },
      },
    ],
  }),
);

server.prompt(
  'project-planner',
  {
    projectName: z.string().describe('Name of the project to plan.'),
    objective: z
      .string()
      .describe('The main goal or desired outcome of the project.'),
    deadline: z
      .string()
      .optional()
      .describe('The target completion date or timeframe.'),
    resources: z
      .string()
      .optional()
      .describe(
        'Any known resources (people, budget, tools) available for the project.',
      ),
  },
  ({ projectName, objective, deadline, resources }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Help me plan the project "${projectName}" within the Zenith app. The main objective is: ${objective}. ${deadline ? `The deadline is ${deadline}.` : ''} ${resources ? `Available resources: ${resources}.` : ''} Break this project down into a series of specific, measurable, achievable, relevant, and time-bound (SMART) tasks suitable for tracking in Zenith. Provide a potential structure or list of initial tasks.`,
        },
      },
    ],
  }),
);

server.prompt(
  'pomodoro-assistant',
  {
    taskName: z
      .string()
      .describe('The specific task the user wants to focus on.'),
    focusTime: z
      .string()
      .default('25')
      .describe('Duration of the focus interval in minutes.'),
    breakTime: z
      .string()
      .default('5')
      .describe('Duration of the short break in minutes.'),
  },
  ({ taskName, focusTime, breakTime }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Guide me through a Pomodoro session for the task "${taskName}" using the Zenith app context. I plan to focus for ${focusTime} minutes and then take a ${breakTime}-minute break. Remind me when to start, when to take a break, and when to get back to work. Offer brief tips for maintaining focus during the work interval and making the most of the break.`,
        },
      },
    ],
  }),
);

// --- HTTP SSE Transport Setup ---
app.get('/sse', async (_, res) => {
  // Create a new transport for each connecting client
  const transport = new SSEServerTransport('/messages', res); // '/messages' is the endpoint for client->server POSTs
  transports[transport.sessionId] = transport; // Store transport by session ID

  // Clean up transport when client disconnects
  res.on('close', () => {
    console.log(`Client disconnected: ${transport.sessionId}`);
    delete transports[transport.sessionId];
    // Optionally, you might want to inform the server instance about disconnection
    // server.disconnectClient(transport.sessionId); // If server object supports this
  });

  console.log(`Client connected: ${transport.sessionId}`);
  // Connect the main server logic to this specific client transport
  await server.connect(transport);
});

// Endpoint for clients to send messages (requests/notifications) to the server
app.post('/messages', async (req, res) => {
  // Ensure express.json() middleware is used
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (transport) {
    try {
      // Let the specific client's transport handle the incoming message
      await transport.handlePostMessage(req, res);
    } catch (error) {
      console.error(
        `Error handling POST message for session ${sessionId}: ${error.message}`,
      );
      if (!res.headersSent) {
        res.status(500).send('Error processing message');
      }
    }
  } else {
    console.warn(`No active transport found for sessionId: ${sessionId}`);
    res.status(404).send('No active session found for this sessionId');
  }
});

// --- Start the Server ---
const PORT = process.env.MCP_PORT || 3002;
app.listen(PORT, () => {
  console.log(`Zenith MCP Adapter Server running on port ${PORT}`);
  console.log(`SSE connections on: http://localhost:${PORT}/sse`);
  console.log(
    `Client POST messages to: http://localhost:${PORT}/messages?sessionId=<sessionId>`,
  );
});

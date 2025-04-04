const express = require('express');
const cors = require('cors');
const mcp = require('@modelcontextprotocol/sdk/server/mcp.js');
const {
  SSEServerTransport,
} = require('@modelcontextprotocol/sdk/server/sse.js');
const { z } = require('zod');

// Assume Zenith API base URL and Key are in environment variables
const ZENITH_API_URL =
  process.env.ZENITH_API_URL || 'http://localhost:8000/api'; // Example default
const ZENITH_API_KEY = process.env.ZENITH_API_KEY || ''; // Provide your API key

// Update variable declarations to fix ResourceTemplate
const McpServer = mcp.McpServer;
const ResourceTemplate = mcp.ResourceTemplate;

// --- Server Initialization ---
const server = new McpServer({
  name: 'Zenith Productivity Assistant MCP Adapter',
  version: '1.0.0',
});

// --- Transport Setup ---
const app = express();
app.use(cors()); // Enable CORS for client connections
app.use(express.json()); // Needed for POST requests if the client sends JSON

const transports = {};

// --- Helper for API Requests ---
async function zenithApiRequest(endpoint, method, data = undefined) {
  const response = await fetch(`${ZENITH_API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ZENITH_API_KEY}`, // Adjust auth mechanism if needed
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `API request failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || errorMessage;
    } catch (e) {
      // Ignore if response body is not JSON
    }
    console.error(`Zenith API Error (${method} ${endpoint}): ${errorMessage}`);
    throw new Error(errorMessage);
  }

  // Handle potential empty responses for methods like DELETE or certain POSTs
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.indexOf('application/json') !== -1) {
    return response.json();
  } else {
    // Return an empty object or handle as appropriate for non-JSON responses
    return {};
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
      return {
        content: [
          {
            type: 'resource',
            resource: {
              uri: `zenith://tasks/${createdTask.id}`,
              json: createdTask,
            },
          },
        ],
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
app.post('/messages', express.json(), async (req, res) => {
  // Ensure express.json() middleware is used
  const sessionId = req.query.sessionId;
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
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Zenith MCP Adapter Server running on port ${PORT}`);
  console.log(`SSE connections on: http://localhost:${PORT}/sse`);
  console.log(
    `Client POST messages to: http://localhost:${PORT}/messages?sessionId=<sessionId>`,
  );
});

/**
 * MCP Types
 * Custom implementation of Model Context Protocol types
 */

// Resource schema definition
export interface Resource {
  type: string;
  properties: Record<string, PropertyDefinition>;
  relationships?: Record<string, RelationshipDefinition>;
  title?: string;
  description?: string;
}

// Property definition
export interface PropertyDefinition {
  type: string;
  format?: string;
  description?: string;
  enum?: string[];
  nullable?: boolean;
  required?: boolean;
  default?: any;
}

// Relationship definition
export interface RelationshipDefinition {
  resourceType: string;
  cardinality: 'one' | 'many';
  description?: string;
  required?: boolean;
}

// Resource instance
export interface ResourceInstance {
  id: string;
  type: string;
  properties: Record<string, any>;
  relationships?: Record<string, RelationshipValue>;
}

// Relationship value
export interface RelationshipValue {
  data: RelationshipData | RelationshipData[];
}

// Relationship data
export interface RelationshipData {
  id: string;
  type: string;
}

// Query parameters for resource retrieval
export interface ResourceQueryParams {
  filter?: Record<string, any>;
  include?: string[];
  sort?: string[];
  page?: {
    number?: number;
    size?: number;
  };
}

// MCP Action definition
export interface Action {
  name: string;
  description: string;
  parameters: Record<string, ActionParameterDefinition>;
  returns: ActionReturnDefinition;
}

// MCP Action parameter definition
export interface ActionParameterDefinition {
  type: string;
  description: string;
  required?: boolean;
}

// MCP Action return definition
export interface ActionReturnDefinition {
  type: string;
  description: string;
}

// MCP Action execution request
export interface ActionExecutionRequest {
  name: string;
  parameters: Record<string, any>;
}

// MCP Action execution response
export interface ActionExecutionResponse {
  data: any;
}

// MCP Tools response (collection of available actions)
export interface ToolsResponse {
  actions: Action[];
}

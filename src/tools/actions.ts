import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CustifyClient, CustifyApiError } from '../api/client.js';

export function registerActionTools(server: McpServer, client: CustifyClient): void {
  // create_note
  server.tool(
    'create_note',
    'Create a timeline note on one Custify account. Use this for human-readable account notes, not tasks or custom field updates.',
    {
      account_id: z.string().describe('The Custify company/account ID'),
      body: z.string().describe('The note content/body text'),
      subject: z.string().optional().describe('Optional note subject'),
    },
    async (params) => {
      try {
        const result = await client.createNote(
          {
            entity: params.account_id,
            entityModel: 'Company',
            text: params.body,
            subject: params.subject,
          },
          { toolName: 'create_note', toolCategory: 'actions' }
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                note: result,
              }),
            },
          ],
        };
      } catch (error) {
        if (error instanceof CustifyApiError) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: error.code, message: error.message, statusCode: error.statusCode }) }],
            isError: true,
          };
        }
        throw error;
      }
    }
  );

  // create_task
  server.tool(
    'create_task',
    'Create a task associated with one Custify account. Use list_task_filter_values to resolve assignee IDs; assignee_id must be a Custify user ObjectId, not an email address.',
    {
      account_id: z.string().describe('The Custify company/account ID'),
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      due_date: z.string().optional().describe('Due date in ISO format (e.g. 2024-12-31)'),
      assignee_id: z.string().optional().describe('Custify user ID to assign the task to (must be a valid user ObjectId, not an email)'),
      priority: z.enum(['low', 'medium', 'high']).default('medium').optional().describe('Task priority (default: medium)'),
    },
    async (params) => {
      try {
        const taskData: Record<string, unknown> = {
          name: params.title,
          company: params.account_id,
          priority: params.priority ?? 'medium',
          status: 'open',
        };

        if (params.due_date) taskData.dueDate = params.due_date;
        if (params.description) taskData.description = params.description;
        if (params.assignee_id) taskData.assignedTo = params.assignee_id;

        const result = await client.createTask(
          taskData,
          { toolName: 'create_task', toolCategory: 'actions' }
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                task: result,
              }),
            },
          ],
        };
      } catch (error) {
        if (error instanceof CustifyApiError) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: error.code, message: error.message, statusCode: error.statusCode }) }],
            isError: true,
          };
        }
        throw error;
      }
    }
  );

  // run_playbook
  server.tool(
    'run_playbook',
    'Trigger a manually-started Custify playbook on a specific account. Only playbooks with trigger type "manually started" can be triggered via the API; segment-based and event-based playbooks run automatically and cannot be triggered this way.',
    {
      playbook_id: z.string().describe('The Custify playbook ID'),
      account_id: z.string().describe('The Custify company/account ID to run the playbook on'),
    },
    async (params) => {
      try {
        const result = await client.runPlaybook(
          params.playbook_id,
          params.account_id,
          { toolName: 'run_playbook', toolCategory: 'actions' }
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                playbook_id: params.playbook_id,
                account_id: params.account_id,
                result,
              }),
            },
          ],
        };
      } catch (error) {
        if (error instanceof CustifyApiError) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: error.code, message: error.message, statusCode: error.statusCode }) }],
            isError: true,
          };
        }
        throw error;
      }
    }
  );

  // update_custom_fields
  server.tool(
    'update_custom_fields',
    'Update custom_attributes on one Custify account or contact by internal entity ID. Use list_attributes first to confirm field names and expected value types.',
    {
      entity_type: z.enum(['account', 'contact']).describe('Type of entity to update'),
      entity_id: z.string().describe('The entity ID (company ID or contact ID)'),
      fields: z.record(z.unknown()).describe('Key-value pairs of custom fields to set'),
    },
    async (params) => {
      try {
        let result: unknown;

        if (params.entity_type === 'account') {
          result = await client.updateCompany(
            params.entity_id,
            { custom_attributes: params.fields },
            { toolName: 'update_custom_fields', toolCategory: 'actions' }
          );
        } else {
          result = await client.updateCustomer(
            params.entity_id,
            { custom_attributes: params.fields },
            { toolName: 'update_custom_fields', toolCategory: 'actions' }
          );
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                entity_type: params.entity_type,
                entity_id: params.entity_id,
                updated_fields: params.fields,
                result,
              }),
            },
          ],
        };
      } catch (error) {
        if (error instanceof CustifyApiError) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: error.code, message: error.message, statusCode: error.statusCode }) }],
            isError: true,
          };
        }
        throw error;
      }
    }
  );
}

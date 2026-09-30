import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CustifyClient, CustifyApiError } from '../api/client.js';
import type { Task, TaskFilter } from '../api/types.js';
import { stripHtml, truncateText } from './text-utils.js';

// Backend status values: 'open', 'done', 'not relevant', 'overdue', 'on time', 'outstanding'.
// We expose snake_case to the MCP caller and map to the values the backend understands.
const STATUS_MAP: Record<string, string> = {
  open: 'open',
  done: 'done',
  not_relevant: 'not relevant',
  overdue: 'overdue',
  on_time: 'on time',
  outstanding: 'outstanding',
};

const TASK_STATUS_UPDATE_MAP = {
  open: 'open',
  done: 'done',
  not_relevant: 'not relevant',
} as const;

interface FormatTaskOptions {
  /** Include the description field at all. Default: false for list, true for get. */
  includeDescription?: boolean;
  /** Return description as plain text (HTML stripped). Default: true. */
  plaintextDescription?: boolean;
  /** Max characters for description (0 = unlimited). Default: 0. */
  descriptionMaxChars?: number;
}

function formatTask(t: Task, opts: FormatTaskOptions = {}) {
  const includeDescription = opts.includeDescription ?? true;
  const plaintextDescription = opts.plaintextDescription ?? true;
  const descriptionMaxChars = opts.descriptionMaxChars ?? 0;

  let description: string | null = null;
  if (includeDescription && t.description) {
    description = plaintextDescription ? stripHtml(t.description) : t.description;
    if (descriptionMaxChars > 0 && description.length > descriptionMaxChars) {
      description = truncateText(description, descriptionMaxChars);
    }
  }

  return {
    id: (t.id ?? t._id) ?? null,
    title: t.name ?? null,
    ...(includeDescription ? { description } : {}),
    status: t.status ?? null,
    priority: t.priority ?? null,
    due_date: t.dueDate ?? null,
    completed_at: t.completedAt ?? null,
    snoozed_until: t.snoozedUntilDate ?? null,
    account_id: t.company ?? null,
    company_id: t.company_id ?? null,
    contact_id: t.people ?? null,
    user_id: t.user_id ?? null,
    assignee_id: t.assignedTo ?? null,
    assignee_name: t.assignedToName ?? null,
    assignee_email: t.assignedToEmail ?? null,
    assignee_type: t.assignedToModel ?? null,
    tag_ids: t.tags ?? [],
    label_id: t.label ?? null,
    collaborator_ids: t.collaborators ?? [],
    created_by: t.createdBy ?? null,
    created_by_type: t.createdByType ?? null,
    created_at: t.created_at ?? null,
    updated_at: t.updated_at ?? null,
  };
}

function buildTaskFilters(params: {
  assignee_id?: string;
  tag_ids?: string[];
  account_id?: string;
  contact_id?: string;
  created_by?: string;
  status?: keyof typeof STATUS_MAP;
  priority?: 'low' | 'medium' | 'high';
  due?: 'past_due' | 'today' | 'this_week' | 'this_month' | 'later';
  due_after?: string;
  due_before?: string;
}): TaskFilter[] {
  const filters: TaskFilter[] = [];

  if (params.assignee_id) filters.push({ field: 'assignedTo', values: [params.assignee_id] });
  if (params.tag_ids && params.tag_ids.length > 0) filters.push({ field: 'tags', values: params.tag_ids });
  if (params.account_id) filters.push({ field: 'company', values: [params.account_id] });
  if (params.contact_id) filters.push({ field: 'people', values: [params.contact_id] });
  if (params.created_by) filters.push({ field: 'createdBy', values: [params.created_by] });
  if (params.priority) filters.push({ field: 'priority', values: [params.priority] });
  if (params.status) filters.push({ field: 'status', values: [STATUS_MAP[params.status]] });

  if (params.due) {
    filters.push({ field: 'dueOn', values: [params.due] });
  } else if (params.due_after && params.due_before) {
    filters.push({
      field: 'dueOn',
      startDate: params.due_after,
      endDate: params.due_before,
    });
  }

  return filters;
}

export function registerTaskTools(server: McpServer, client: CustifyClient): void {
  // list_tasks
  server.tool(
    'list_tasks',
    `List Custify tasks. Descriptions are included as plain text by default (HTML stripped). Set include_description=false to omit them for minimal payloads, or use get_task for the full raw HTML of a single task. Filters can be combined (AND). Common queries:
- My open tasks: {"assignee_id":"<user_id>","status":"open"}
- Overdue for an account: {"account_id":"<account_id>","status":"overdue"}
- Compact (no descriptions): {"include_description":false}
Use list_tags (category="task") to resolve tag names → IDs. Use list_task_filter_values to discover assignee, account, and creator IDs.`,
    {
      assignee_id: z.string().optional().describe('Custify user ID assigned to the task'),
      tag_ids: z.array(z.string()).optional().describe('Filter by tag IDs (matches tasks with ANY of the listed tags)'),
      account_id: z.string().optional().describe('Filter to tasks for one Custify company/account ID'),
      contact_id: z.string().optional().describe('Filter to tasks for one contact (customer) ID'),
      created_by: z.string().optional().describe('Filter by creator user ID'),
      status: z.enum(['open', 'done', 'not_relevant', 'overdue', 'on_time', 'outstanding']).optional().describe(
        'Status filter. "overdue" = open + dueDate <= yesterday. "on_time" = open + (no dueDate or dueDate > yesterday). "outstanding" = open + dueDate <= today.'
      ),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('Task priority'),
      due: z.enum(['past_due', 'today', 'this_week', 'this_month', 'later']).optional().describe(
        'Intuitive due-date shortcut. Mutually exclusive with due_after/due_before.'
      ),
      due_after: z.string().optional().describe('ISO date — start of due date range. Must be paired with due_before; passing only one is ignored (use the `due` shortcut for open-ended windows).'),
      due_before: z.string().optional().describe('ISO date — end of due date range. Must be paired with due_after.'),
      search: z.string().optional().describe('Free-text search across task name'),
      sort_by: z.enum(['dueDate', 'created_at', 'updated_at', 'name', 'priority', 'status']).default('dueDate').optional().describe('Sort field (default: dueDate)'),
      sort_direction: z.enum(['asc', 'desc']).default('asc').optional().describe('Sort direction (default: asc)'),
      limit: z.number().min(1).max(50).default(25).optional().describe('Number of results (1-50, default 25). Backend caps at 50 per page.'),
      offset: z.number().min(0).default(0).optional().describe('Pagination offset (default 0)'),
      include_description: z.boolean().default(true).optional().describe(
        'Include task descriptions in the response (as plain text by default). Set false to omit descriptions for minimal payloads. Use get_task for the full raw HTML description of a specific task.'
      ),
      plaintext_description: z.boolean().default(true).optional().describe(
        'When include_description is true, strip HTML tags and return plain text. Default true.'
      ),
      description_max_chars: z.number().min(0).default(0).optional().describe(
        'When include_description is true, truncate descriptions to this many characters (0 = no limit). Truncated descriptions end with "…".'
      ),
    },
    async (params) => {
      try {
        const limit = params.limit ?? 25;
        const offset = params.offset ?? 0;
        const page = Math.floor(offset / limit) + 1;

        const filters = buildTaskFilters(params);
        const sorting = {
          field: params.sort_by ?? 'dueDate',
          direction: params.sort_direction ?? 'asc',
        } as const;

        const result = await client.listTasks(
          { page, itemsPerPage: limit, filters, sorting, searchTerm: params.search },
          { toolName: 'list_tasks', toolCategory: 'tasks' }
        );

        const formatOpts: FormatTaskOptions = {
          includeDescription: params.include_description ?? true,
          plaintextDescription: params.plaintext_description ?? true,
          descriptionMaxChars: params.description_max_chars ?? 0,
        };
        const tasks = (result.tasks ?? []).map((t) => formatTask(t, formatOpts));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                tasks,
                total: result.total ?? tasks.length,
                page,
                limit,
                offset,
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

  // get_task
  server.tool(
    'get_task',
    'Fetch one Custify task by internal task ID. Use list_tasks first when you need to find task IDs by assignee, account, tag, status, due date, or priority.',
    {
      task_id: z.string().describe('The Custify task ID'),
    },
    async (params) => {
      try {
        const task = await client.getTask(params.task_id, {
          toolName: 'get_task',
          toolCategory: 'tasks',
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ task: formatTask(task, { includeDescription: true }) }) }],
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

  // update_task_status
  server.tool(
    'update_task_status',
    'Update only the status of one Custify task by internal task ID. Use this to mark a task as done, mark it as not relevant, or reopen it as open. Use list_tasks first when you need to find the task ID.',
    {
      task_id: z.string().describe('The Custify task ID to update. Use list_tasks or get_task to find this ID.'),
      status: z.enum(['open', 'done', 'not_relevant']).describe('New persisted task status. "not_relevant" maps to Custify API value "not relevant".'),
    },
    async (params) => {
      try {
        const task = await client.updateTaskStatus(
          params.task_id,
          TASK_STATUS_UPDATE_MAP[params.status],
          { toolName: 'update_task_status', toolCategory: 'tasks' }
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                task: formatTask(task, { includeDescription: true }),
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

  // list_task_filter_values
  server.tool(
    'list_task_filter_values',
    'Discover IDs that can be used as filters in list_tasks: assignees, creators and companies currently referenced by tasks. Returns names where available. Profile photos are stripped to keep payloads compact. Use the category parameter to request only the category you need. For tag-name → tag-id resolution, use list_tags with category="task" instead — this endpoint returns tag IDs without names.',
    {
      category: z.enum(['assignees', 'creators', 'companies', 'collaborators', 'tags']).optional().describe(
        'Return only one category of filter values. Omit to return all categories.'
      ),
    },
    async (params) => {
      try {
        const raw = await client.getTaskFilterValues({
          toolName: 'list_task_filter_values',
          toolCategory: 'tasks',
        });

        // Strip profile_photo data URIs — they are base64 images unusable by LLMs
        // and inflate the response from ~337k to ~15k characters.
        const stripPhotos = <T extends Record<string, unknown>>(arr: T[] | undefined): Omit<T, 'profile_photo'>[] | undefined => {
          if (!arr) return undefined;
          return arr.map(({ profile_photo, ...rest }) => rest) as Omit<T, 'profile_photo'>[];
        };

        const cleaned = {
          company: raw.company,
          assignedTo: stripPhotos(raw.assignedTo),
          collaborators: stripPhotos(raw.collaborators),
          createdBy: raw.createdBy,
          tags: raw.tags,
        };

        // If a specific category was requested, return only that.
        const categoryMap: Record<string, unknown> = {
          assignees: { assignedTo: cleaned.assignedTo },
          creators: { createdBy: cleaned.createdBy },
          companies: { company: cleaned.company },
          collaborators: { collaborators: cleaned.collaborators },
          tags: { tags: cleaned.tags },
        };

        const result = params.category ? categoryMap[params.category] : cleaned;

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
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

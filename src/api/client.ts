import type {
  CalculatedMetric,
  Company,
  Contact,
  Alert,
  Segment,
  Playbook,
  Lifecycle,
  Meeting,
  Note,
  Objective,
  Task,
  TaskFilter,
  TaskFilterValues,
  Tag,
  PaginatedResponse,
  HealthScoreDefinition,
  HealthScoreValue,
} from './types.js';

export interface ToolMeta {
  toolName: string;
  toolCategory: string;
}

export class CustifyApiError extends Error {
  public code: string;
  public statusCode: number;
  public retryAfterSeconds?: number;

  constructor(code: string, message: string, statusCode: number, retryAfterSeconds?: number) {
    super(message);
    this.name = 'CustifyApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class CustifyClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      query?: Record<string, string>;
      toolName?: string;
      toolCategory?: string;
    }
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (options?.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined && v !== '') url.searchParams.set(k, v);
      }
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'X-MCP-Source': 'custify-mcp-server',
    };
    if (options?.toolName) headers['X-MCP-Tool'] = options.toolName;
    if (options?.toolCategory) headers['X-MCP-Category'] = options.toolCategory;

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        throw new CustifyApiError(
          'rate_limited',
          `API rate limit exceeded. Try again in ${retryAfter || '10'} seconds.`,
          res.status,
          retryAfter ? parseInt(retryAfter, 10) : 10
        );
      }
      if (res.status === 401) {
        throw new CustifyApiError(
          'unauthorized',
          'Invalid API key. Check your CUSTIFY_API_KEY.',
          res.status
        );
      }
      if (res.status === 403) {
        throw new CustifyApiError(
          'forbidden',
          'Permission denied. Your API key may not have access to this resource.',
          res.status
        );
      }
      if (res.status === 404) {
        throw new CustifyApiError('not_found', 'Resource not found.', res.status);
      }
      throw new CustifyApiError(
        'api_error',
        `API request failed: ${res.status} ${errorBody}`,
        res.status
      );
    }

    return res.json() as Promise<T>;
  }

  // Company/Account methods

  async listCompanies(
    params: {
      page?: number;
      itemsPerPage?: number;
      filters?: unknown[];
      sorting?: unknown;
    },
    toolMeta?: ToolMeta
  ): Promise<PaginatedResponse<Company>> {
    const query: Record<string, string> = {};
    if (params.page !== undefined) query.page = String(params.page);
    if (params.itemsPerPage !== undefined) query.itemsPerPage = String(params.itemsPerPage);
    if (params.filters && params.filters.length > 0) query.filters = JSON.stringify(params.filters);
    if (params.sorting) query.sorting = JSON.stringify(params.sorting);

    return this.request<PaginatedResponse<Company>>('GET', '/company/all', {
      query,
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  async getCompany(id: string, toolMeta?: ToolMeta): Promise<Company> {
    // GET /company/:id returns {companies: [...], total} not a single object
    const result = await this.request<PaginatedResponse<Company>>('GET', `/company/${encodeURIComponent(id)}`, {
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
    const companies = result.companies || result.data || result.items || [];
    if (companies.length === 0) {
      throw new CustifyApiError('not_found', `Account ${id} not found.`, 404);
    }
    return companies[0];
  }

  async searchCompanies(
    query: string,
    limit?: number,
    toolMeta?: ToolMeta
  ): Promise<PaginatedResponse<Company>> {
    const nameFilters = [{ fieldName: 'name', fieldType: 'String', filterType: 'contains', filterValue: query }];
    const domainFilters = [{ fieldName: 'website', fieldType: 'String', filterType: 'contains', filterValue: query }];
    const requestLimit = String(limit || 25);

    const [nameResult, domainResult] = await Promise.all([
      this.request<PaginatedResponse<Company>>('GET', '/company/all', {
        query: { filters: JSON.stringify(nameFilters), itemsPerPage: requestLimit, page: '1' },
        toolName: toolMeta?.toolName,
        toolCategory: toolMeta?.toolCategory,
      }),
      this.request<PaginatedResponse<Company>>('GET', '/company/all', {
        query: { filters: JSON.stringify(domainFilters), itemsPerPage: requestLimit, page: '1' },
        toolName: toolMeta?.toolName,
        toolCategory: toolMeta?.toolCategory,
      }),
    ]);

    // Merge and deduplicate by company ID
    const nameCompanies = nameResult.companies || nameResult.data || nameResult.items || [];
    const domainCompanies = domainResult.companies || domainResult.data || domainResult.items || [];
    const seen = new Set<string>();
    const merged: Company[] = [];
    for (const c of [...nameCompanies, ...domainCompanies]) {
      const id = c.id || (c as unknown as Record<string, unknown>)._id as string;
      if (id && !seen.has(id)) {
        seen.add(id);
        merged.push(c);
      }
    }

    return {
      companies: merged.slice(0, limit || 25),
      total: merged.length,
      page: 1,
    } as PaginatedResponse<Company>;
  }

  // Contact/People methods

  async getContacts(
    companyId: string,
    params: { page?: number; itemsPerPage?: number },
    toolMeta?: ToolMeta
  ): Promise<PaginatedResponse<Contact> | PaginatedResponse<Contact>[]> {
    const query: Record<string, string> = {};
    if (params.page !== undefined) query.page = String(params.page);
    if (params.itemsPerPage !== undefined) query.itemsPerPage = String(params.itemsPerPage);

    return this.request<PaginatedResponse<Contact>>(
      'GET',
      `/company/people/${encodeURIComponent(companyId)}`,
      {
        query,
        toolName: toolMeta?.toolName,
        toolCategory: toolMeta?.toolCategory,
      }
    );
  }

  async listContacts(
    params: {
      page?: number;
      itemsPerPage?: number;
      filters?: unknown[];
      sorting?: unknown;
    },
    toolMeta?: ToolMeta
  ): Promise<PaginatedResponse<Contact> | PaginatedResponse<Contact>[]> {
    const query: Record<string, string> = {};
    if (params.page !== undefined) query.page = String(params.page);
    if (params.itemsPerPage !== undefined) query.itemsPerPage = String(params.itemsPerPage);
    if (params.filters && params.filters.length > 0) query.filters = JSON.stringify(params.filters);
    if (params.sorting) query.sorting = JSON.stringify(params.sorting);

    return this.request<PaginatedResponse<Contact> | PaginatedResponse<Contact>[]>('GET', '/people/all', {
      query,
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  async getContact(id: string, toolMeta?: ToolMeta): Promise<Contact> {
    return this.request<Contact>('GET', `/customer/${encodeURIComponent(id)}`, {
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  // Health & Usage

  async getHealthScores(companyId: string, toolMeta?: ToolMeta): Promise<Company> {
    // Reuse getCompany which handles the {companies:[...]} response unwrapping
    return this.getCompany(companyId, toolMeta);
  }

  async getUsageData(
    companyId: string,
    params: { type?: string; startDate?: string; endDate?: string; eventName?: string },
    toolMeta?: ToolMeta
  ): Promise<unknown> {
    const query: Record<string, string> = {};
    if (params.type) query.type = params.type;
    if (params.startDate) query.startDate = params.startDate;
    if (params.endDate) query.endDate = params.endDate;
    if (params.eventName) query.eventName = params.eventName;

    return this.request<unknown>('GET', `/company/usage/${encodeURIComponent(companyId)}`, {
      query,
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  async getHealthScoreValues(
    healthScoreId: string,
    params: { page?: number; itemsPerPage?: number; companyId?: string },
    toolMeta?: ToolMeta
  ): Promise<PaginatedResponse<HealthScoreValue>> {
    const query: Record<string, string> = {};
    if (params.page !== undefined) query.page = String(params.page);
    if (params.itemsPerPage !== undefined) query.itemsPerPage = String(params.itemsPerPage);
    if (params.companyId) query.companyId = params.companyId;

    return this.request<PaginatedResponse<HealthScoreValue>>(
      'GET',
      `/health_score/${encodeURIComponent(healthScoreId)}/values`,
      {
        query,
        toolName: toolMeta?.toolName,
        toolCategory: toolMeta?.toolCategory,
      }
    );
  }

  // Alerts/Signals

  async getAlerts(
    params: {
      entity?: string;
      entityModel?: string;
      page?: number;
      itemsPerPage?: number;
      filters?: unknown[];
      customerType?: string;
      customerId?: string;
    },
    toolMeta?: ToolMeta
  ): Promise<PaginatedResponse<Alert>> {
    const query: Record<string, string> = {};
    if (params.page !== undefined) query.page = String(params.page);
    if (params.itemsPerPage !== undefined) query.itemsPerPage = String(params.itemsPerPage);
    if (params.filters && params.filters.length > 0) query.filters = JSON.stringify(params.filters);
    if (params.customerType) query.customerType = params.customerType;
    if (params.customerId) query.customerId = params.customerId;

    return this.request<PaginatedResponse<Alert>>('GET', '/signal/entities', {
      query,
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  async getSegmentMembership(
    companyId: string,
    toolMeta?: ToolMeta
  ): Promise<PaginatedResponse<Segment>> {
    return this.request<PaginatedResponse<Segment>>(
      'GET',
      `/company/segments/${encodeURIComponent(companyId)}`,
      {
        query: { page: '1', itemsPerPage: '100' },
        toolName: toolMeta?.toolName,
        toolCategory: toolMeta?.toolCategory,
      }
    );
  }

  // Actions

  async createNote(
    params: { entity: string; entityModel: string; text: string; subject?: string },
    toolMeta?: ToolMeta
  ): Promise<Note> {
    return this.request<Note>('POST', '/note', {
      body: params,
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  // Note list methods

  async listNotes(
    params: { entityId?: string; page?: number; itemsPerPage?: number },
    toolMeta?: ToolMeta
  ): Promise<{ total?: number; notes?: Note[] }> {
    const query: Record<string, string> = {};
    if (params.page !== undefined) query.page = String(params.page);
    if (params.itemsPerPage !== undefined) query.itemsPerPage = String(params.itemsPerPage);

    const path = params.entityId ? `/note/${encodeURIComponent(params.entityId)}` : '/note';
    return this.request<{ total?: number; notes?: Note[] }>('GET', path, {
      query,
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  // Meeting methods

  async listMeetings(
    params: { companyId?: string; page?: number; itemsPerPage?: number },
    toolMeta?: ToolMeta
  ): Promise<{ total?: number; meetings?: Meeting[] }> {
    const query: Record<string, string> = {};
    if (params.page !== undefined) query.page = String(params.page);
    if (params.itemsPerPage !== undefined) query.itemsPerPage = String(params.itemsPerPage);

    const path = params.companyId
      ? `/calendar/meeting/company/${encodeURIComponent(params.companyId)}`
      : '/calendar/meeting';
    return this.request<{ total?: number; meetings?: Meeting[] }>('GET', path, {
      query,
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  async createTask(
    params: Record<string, unknown>,
    toolMeta?: ToolMeta
  ): Promise<Task> {
    return this.request<Task>('POST', '/task', {
      body: params,
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  // Task list/get methods

  async listTasks(
    params: {
      page?: number;
      itemsPerPage?: number;
      filters?: TaskFilter[];
      sorting?: { field: string; direction: 'asc' | 'desc' };
      searchTerm?: string;
      enhanceCompany?: boolean;
    },
    toolMeta?: ToolMeta
  ): Promise<{ total?: number; tasks?: Task[] }> {
    const query: Record<string, string> = {};
    if (params.page !== undefined) query.page = String(params.page);
    if (params.itemsPerPage !== undefined) query.itemsPerPage = String(params.itemsPerPage);
    if (params.filters && params.filters.length > 0) query.filters = JSON.stringify(params.filters);
    if (params.sorting) query.sorting = JSON.stringify(params.sorting);
    if (params.searchTerm) query.searchTerm = params.searchTerm;
    if (params.enhanceCompany) query.enhanceCompany = 'true';

    return this.request<{ total?: number; tasks?: Task[] }>('GET', '/task', {
      query,
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  async getTask(id: string, toolMeta?: ToolMeta): Promise<Task> {
    const result = await this.request<{ total?: number; tasks?: Task[] }>(
      'GET',
      `/task/${encodeURIComponent(id)}`,
      {
        toolName: toolMeta?.toolName,
        toolCategory: toolMeta?.toolCategory,
      }
    );
    const tasks = result.tasks || [];
    if (tasks.length === 0) {
      throw new CustifyApiError('not_found', `Task ${id} not found.`, 404);
    }
    return tasks[0];
  }

  async updateTaskStatus(
    id: string,
    status: 'open' | 'done' | 'not relevant',
    toolMeta?: ToolMeta
  ): Promise<Task> {
    return this.request<Task>('PUT', `/task/${encodeURIComponent(id)}`, {
      body: { status },
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  async getTaskFilterValues(toolMeta?: ToolMeta): Promise<TaskFilterValues> {
    return this.request<TaskFilterValues>('GET', '/task/filtersAvailableValues', {
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  // Tag methods

  async listTags(
    params: { category?: string; page?: number; itemsPerPage?: number },
    toolMeta?: ToolMeta
  ): Promise<{ total?: number; tags?: Tag[] }> {
    const query: Record<string, string> = {};
    if (params.category) query.category = params.category;
    if (params.page !== undefined) query.page = String(params.page);
    if (params.itemsPerPage !== undefined) query.itemsPerPage = String(params.itemsPerPage);

    return this.request<{ total?: number; tags?: Tag[] }>('GET', '/tag', {
      query,
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  async updateTagsForEntities(
    params: { ids: string[]; type: 'add' | 'remove'; category: 'company' | 'people'; tag: string },
    toolMeta?: ToolMeta
  ): Promise<unknown> {
    return this.request<unknown>('PATCH', '/tag/entity', {
      body: params,
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  async runPlaybook(
    playbookId: string,
    entityId: string,
    toolMeta?: ToolMeta
  ): Promise<unknown> {
    return this.request<unknown>(
      'POST',
      `/playbook/entity/${encodeURIComponent(playbookId)}`,
      {
        body: { entityId, type: 'companies' },
        toolName: toolMeta?.toolName,
        toolCategory: toolMeta?.toolCategory,
      }
    );
  }

  async updateCompany(
    companyId: string,
    data: Record<string, unknown>,
    toolMeta?: ToolMeta
  ): Promise<Company> {
    return this.request<Company>('POST', '/company', {
      body: { id: companyId, ...data },
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  async updateCustomer(
    customerId: string,
    data: Record<string, unknown>,
    toolMeta?: ToolMeta
  ): Promise<Contact> {
    return this.request<Contact>('POST', '/customer', {
      body: { id: customerId, ...data },
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  // Attributes

  async getCompanyAttributes(toolMeta?: ToolMeta): Promise<unknown[]> {
    return this.request<unknown[]>('GET', '/company/attributes', {
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  async getContactAttributes(toolMeta?: ToolMeta): Promise<unknown[]> {
    return this.request<unknown[]>('GET', '/customer/attributes', {
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  // Resources

  async listSegments(toolMeta?: ToolMeta): Promise<PaginatedResponse<Segment>> {
    return this.request<PaginatedResponse<Segment>>('GET', '/segment', {
      query: { type: 'companies', page: '1', itemsPerPage: '100' },
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  async listPlaybooks(toolMeta?: ToolMeta): Promise<PaginatedResponse<Playbook>> {
    return this.request<PaginatedResponse<Playbook>>('GET', '/playbook', {
      query: { type: 'companies', page: '1', itemsPerPage: '100' },
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  async listHealthScoreDefinitions(toolMeta?: ToolMeta): Promise<HealthScoreDefinition[]> {
    return this.request<HealthScoreDefinition[]>('GET', '/health_score/simple', {
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  async listCalculatedMetrics(
    params: { type?: 'company' | 'people'; page?: number; itemsPerPage?: number },
    toolMeta?: ToolMeta
  ): Promise<PaginatedResponse<CalculatedMetric>> {
    const query: Record<string, string> = {};
    if (params.type) query.type = params.type;
    if (params.page !== undefined) query.page = String(params.page);
    if (params.itemsPerPage !== undefined) query.itemsPerPage = String(params.itemsPerPage);

    return this.request<PaginatedResponse<CalculatedMetric>>('GET', '/calculated_metric', {
      query,
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  async listLifecycles(
    params: { page?: number; itemsPerPage?: number } = {},
    toolMeta?: ToolMeta
  ): Promise<PaginatedResponse<Lifecycle>> {
    const query: Record<string, string> = {};
    if (params.page !== undefined) query.page = String(params.page);
    if (params.itemsPerPage !== undefined) query.itemsPerPage = String(params.itemsPerPage);

    return this.request<PaginatedResponse<Lifecycle>>('GET', '/lifecycle', {
      query,
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }

  async listObjectives(
    params: {
      company?: string;
      company_id?: string;
      page?: number;
      itemsPerPage?: number;
      filters?: unknown[];
      sort?: string;
      order?: 'asc' | 'desc';
    },
    toolMeta?: ToolMeta
  ): Promise<PaginatedResponse<Objective>> {
    const query: Record<string, string> = {};
    if (params.company) query.company = params.company;
    if (params.company_id) query.company_id = params.company_id;
    if (params.page !== undefined) query.page = String(params.page);
    if (params.itemsPerPage !== undefined) query.itemsPerPage = String(params.itemsPerPage);
    if (params.filters && params.filters.length > 0) query.filters = JSON.stringify(params.filters);
    if (params.sort) query.sort = params.sort;
    if (params.order) query.order = params.order;

    return this.request<PaginatedResponse<Objective>>('GET', '/objective', {
      query,
      toolName: toolMeta?.toolName,
      toolCategory: toolMeta?.toolCategory,
    });
  }
}

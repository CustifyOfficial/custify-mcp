import { z } from 'zod';

const TAG_ID_PATTERN = /^[a-fA-F0-9]{24}$/;
const TAG_FILTER_TYPES = ['is_any_of', 'is_all_of', 'is_none_of', 'is_unknown', 'any_value'] as const;

export const custifyFilterSchema = z.object({
  fieldName: z.string().describe('Custify field name, e.g. "name", "email", "tags", "signed_up_at", or "metrics.health_scores.<id>".'),
  fieldType: z.string().describe('Custify field type, e.g. String, Number, Boolean, Date, Dropdown, User, Segment, Tag, Company, Currency.'),
  filterType: z.string().describe('Custify filter operator for the field type.'),
  filterValue: z.unknown().optional().describe('Filter value. Type depends on fieldType and filterType.'),
});

export const tagIdsSchema = z
  .array(z.string().regex(TAG_ID_PATTERN, 'Tag IDs must be 24-character Custify ObjectIds.'))
  .min(1)
  .optional()
  .describe('Filter by Custify tag IDs. Use list_tags first to resolve tag names to IDs.');

export const tagMatchSchema = z
  .enum(['any', 'all', 'none_of'])
  .default('any')
  .optional()
  .describe('How tag_ids should match: any = has at least one listed tag, all = has every listed tag, none_of = has none of the listed tags.');

export type CustifyFilter = z.infer<typeof custifyFilterSchema>;
export type TagMatch = z.infer<typeof tagMatchSchema>;

function isValidTagId(value: unknown): value is string {
  return typeof value === 'string' && TAG_ID_PATTERN.test(value);
}

function isTagFilter(filter: CustifyFilter): boolean {
  return filter.fieldName === 'tags' || filter.fieldType === 'Tag';
}

function validateTagFilter(filter: CustifyFilter, index: number): string | null {
  if (filter.fieldName !== 'tags' || filter.fieldType !== 'Tag') {
    return `filters[${index}] is a tag filter and must use fieldName "tags" with fieldType "Tag".`;
  }

  if (!(TAG_FILTER_TYPES as readonly string[]).includes(filter.filterType)) {
    return `filters[${index}] has invalid tag filterType "${filter.filterType}". Use one of: ${TAG_FILTER_TYPES.join(', ')}.`;
  }

  if (filter.filterType === 'is_unknown' || filter.filterType === 'any_value') {
    return null;
  }

  if (!Array.isArray(filter.filterValue) || filter.filterValue.length === 0) {
    return `filters[${index}] tag filterValue must be a non-empty array of tag IDs.`;
  }

  const invalid = filter.filterValue.find((value) => !isValidTagId(value));
  if (invalid !== undefined) {
    return `filters[${index}] contains invalid tag ID "${String(invalid)}"; tag IDs must be 24-character Custify ObjectIds.`;
  }

  return null;
}

function validateTagIds(tagIds?: string[]): string | null {
  if (!tagIds || tagIds.length === 0) return null;

  const invalid = tagIds.find((tagId) => !isValidTagId(tagId));
  if (invalid) {
    return `tag_ids contains invalid tag ID "${invalid}"; tag IDs must be 24-character Custify ObjectIds.`;
  }

  return null;
}

export function buildTagFilter(tagIds: string[], tagMatch: TagMatch = 'any'): CustifyFilter {
  const filterTypeByMatch: Record<NonNullable<TagMatch>, string> = {
    any: 'is_any_of',
    all: 'is_all_of',
    none_of: 'is_none_of',
  };

  return {
    fieldName: 'tags',
    fieldType: 'Tag',
    filterType: filterTypeByMatch[tagMatch ?? 'any'],
    filterValue: tagIds,
  };
}

export function prepareEntityFilters(params: {
  filters?: CustifyFilter[];
  tagIds?: string[];
  tagMatch?: TagMatch;
}): { filters: CustifyFilter[]; error?: never } | { filters?: never; error: string } {
  const filters = [...(params.filters ?? [])];
  const manualTagFilterIndex = filters.findIndex(isTagFilter);

  for (let index = 0; index < filters.length; index += 1) {
    if (!isTagFilter(filters[index])) continue;
    const error = validateTagFilter(filters[index], index);
    if (error) return { error };
  }

  const tagIdsError = validateTagIds(params.tagIds);
  if (tagIdsError) return { error: tagIdsError };

  if (params.tagIds && params.tagIds.length > 0) {
    if (manualTagFilterIndex !== -1) {
      return {
        error: 'Use either tag_ids/tag_match or a manual Tag filter in filters, not both.',
      };
    }
    filters.push(buildTagFilter(params.tagIds, params.tagMatch));
  }

  return { filters };
}

export function toolInputError(error: string) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          error: 'invalid_input',
          message: error,
        }),
      },
    ],
    isError: true,
  };
}

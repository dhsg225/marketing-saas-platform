# Challenge: Database Check Constraint Violation - Hyphen vs Underscore

## Date
October 20, 2025

## Challenge Summary
Persistent `500 Internal Server Error` when saving draft content due to PostgreSQL check constraint violation on `posts.creation_mode` column.

## Error Message
```
error: new row for relation "posts" violates check constraint "posts_creation_mode_check"
```

## Root Cause
**Hyphen vs Underscore mismatch in enum values**

The database schema defined the check constraint as:
```sql
creation_mode VARCHAR(20) NOT NULL CHECK (creation_mode IN ('all_at_once', 'by_parts'))
```

But the backend code was using:
```javascript
'by-parts'  // ❌ WRONG - uses hyphen
```

Instead of:
```javascript
'by_parts'  // ✅ CORRECT - uses underscore
```

## Debugging Process

### Attempt 1: Used `null`
- **Error**: `null value in column "creation_mode" violates not-null constraint`
- **Lesson**: Column has NOT NULL constraint

### Attempt 2: Used `'by-parts'` (with hyphen)
- **Error**: `violates check constraint "posts_creation_mode_check"`
- **Lesson**: Value doesn't match allowed enum values

### Attempt 3: Searched codebase for constraint definition
- **Tool**: `grep` for `posts_creation_mode_check|CHECK.*creation_mode`
- **Found**: Valid values are `'all_at_once'` and `'by_parts'` (with underscores)
- **Solution**: Changed `'by-parts'` to `'by_parts'`

## Solution
Changed line in `/content-engine/backend/routes/posts.js`:

```javascript
// BEFORE (line ~693)
'by-parts',

// AFTER
'by_parts',
```

## Key Lessons
1. **Database constraints are strict** - enum values must match exactly (including hyphen vs underscore)
2. **Grep is your friend** - search for constraint definitions when you get constraint violation errors
3. **Read error messages carefully** - the `detail` field shows the failing row values
4. **Check constraint naming conventions** - SQL typically uses underscores, not hyphens
5. **Don't assume** - verify the actual constraint definition in the schema

## Prevention
- Always check the database schema before hardcoding enum values
- Use constants/enums in code that reference the actual database values
- Add comments in code linking to schema definitions
- Consider using TypeScript enums that match database constraints

## Files Modified
- `/Users/admin/Dropbox/Development/Marketing SaaS Platform/content-engine/backend/routes/posts.js` (line ~693)

## Time to Resolve
~15 minutes across multiple iterations

## Final Verification
✅ Draft saved successfully: `e9153407-b33f-4973-bd02-54d5ca42a76d`

## Follow-Up: Browse Assets Button Fix
After the draft save was working, discovered another issue with the "Browse Assets" button returning `500 (Internal Server Error)` with message: `column ci.image_prompt does not exist`.

**Root Cause**: The `/api/posts/image-prompts` endpoint was querying both `posts` and `content_ideas` tables for image prompts, but `content_ideas` table didn't have an `image_prompt` column.

**Solution**: Removed the `UNION ALL` part that queried `content_ideas` table and kept only the `posts` table query in `posts.js`.

This demonstrates another common pattern: **cascading issues** where fixing one problem reveals another unrelated problem that was masked by the first error.

## Next Implementation: Image Asset Picker
Successfully added image asset picker below the Generated Caption section in Content Generator:
- Created collapsible UI showing asset library with project images in a 3-column grid
- Added preview of selected asset with metadata (filename, tags)
- Integrated with `handleSaveDraft` and `handleMarkAsReady` to save `attached_asset_id` and `attached_asset_url`
- Allows completing posts with caption + existing asset image without generating new images

## Another Constraint Issue: posts_status_check
After fixing the `creation_mode` constraint, encountered another similar issue with the `status` field:

**Error**: `new row for relation "posts" violates check constraint "posts_status_check"`

**Root Cause**: The `posts` table had an old or incorrect constraint that didn't include `'ready_to_publish'` as a valid status value.

**Valid status values** (from setup.js line 306):
- `'draft'`
- `'ready_to_publish'` (with underscore)
- `'published'`
- `'archived'`

**Solution**: Created migration endpoint in `setup.js`:
```javascript
router.post('/fix-posts-status-constraint', async (req, res) => {
  // Drop old constraint
  await query('ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check');
  
  // Add correct constraint
  await query(`
    ALTER TABLE posts 
    ADD CONSTRAINT posts_status_check 
    CHECK (status IN ('draft', 'ready_to_publish', 'published', 'archived'))
  `);
});
```

Ran: `curl -X POST "http://localhost:5001/api/setup/fix-posts-status-constraint"`

Result: ✅ `{"success":true,"message":"Posts status constraint fixed"}`

## Key Pattern: Cascading Database Constraints
This challenge demonstrates how database constraints can cascade - fixing one (`creation_mode`) reveals another (`status`). When migrating or updating table schemas, it's important to:
1. Check ALL constraints that might have changed
2. Create migration endpoints for constraint updates
3. Use `DROP CONSTRAINT IF EXISTS` for idempotent migrations
4. Test with actual data to reveal constraint violations

## The Real Root Cause: content_ideas_status_check
After fixing the `posts` table constraint, discovered the **actual** problem was in the `content_ideas` table!

**Error**: `error: new row for relation "content_ideas" violates check constraint "content_ideas_status_check"`

**Root Cause**: When "Mark as Ready" was clicked, the code tried to update the `content_ideas.status` to `'ready_to_publish'`, but the `content_ideas` table still had the OLD constraint from before the two-stage workflow was implemented:
- **Old values**: `'draft'`, `'scheduled'`, `'approved'`, `'in_progress'`, `'completed'`, `'cancelled'`
- **New values needed**: `'draft'`, `'concept_approved'`, `'in_development'`, `'ready_to_publish'`, `'published'`, `'cancelled'`

**Solution**: Created comprehensive migration that:
1. Drops old constraint
2. **Migrates existing data** (critical step that was missing):
   - `approved` → `concept_approved`
   - `completed` → `published`
   - `in_progress` → `in_development`
   - `scheduled` → `draft`
3. Adds new constraint with correct status values

```javascript
// Update existing status values to match new workflow
await query(`UPDATE content_ideas SET status = 'concept_approved' WHERE status = 'approved'`);
await query(`UPDATE content_ideas SET status = 'published' WHERE status = 'completed'`);
await query(`UPDATE content_ideas SET status = 'in_development' WHERE status = 'in_progress'`);
await query(`UPDATE content_ideas SET status = 'draft' WHERE status = 'scheduled'`);

// Then add constraint
await query(`
  ALTER TABLE content_ideas 
  ADD CONSTRAINT content_ideas_status_check 
  CHECK (status IN ('draft', 'concept_approved', 'in_development', 'ready_to_publish', 'published', 'cancelled'))
`);
```

Ran: `curl -X POST "http://localhost:5001/api/setup/fix-content-ideas-status-constraint"`

Result: ✅ `{"success":true,"message":"Content ideas status constraint fixed and data migrated"}`

## Lesson Learned: Multi-Table Constraint Dependencies
When implementing a new workflow that spans multiple tables (`posts` AND `content_ideas`), you must:
1. Identify ALL tables that reference the workflow statuses
2. Update constraints in the correct order (child tables first if there are foreign keys)
3. **Migrate existing data** before adding constraints
4. Test the full workflow end-to-end, not just individual table operations

This bug was only revealed when trying to UPDATE an existing `content_ideas` row (not INSERT a new one), showing the importance of testing with real data in various states.


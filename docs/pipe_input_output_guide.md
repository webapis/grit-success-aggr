# Pipe Pattern: Input & Output Handling Guide

## Table of Contents
1. [Overview](#overview)
2. [Basic Input/Output Flow](#basic-inputoutput-flow)
3. [Context Object Pattern](#context-object-pattern)
4. [Input Handling](#input-handling)
5. [Output Handling](#output-handling)
6. [Real-World Examples](#real-world-examples)
7. [Common Patterns](#common-patterns)
8. [Visual Diagrams](#visual-diagrams)

---

## Overview

In the Pipe Pattern, **input and output are managed through a context object** that flows through each stage. Each stage receives the context, processes it, and returns an updated context.

```
Initial Input → Stage 1 → Stage 2 → Stage 3 → Final Output
                 (add)      (add)      (add)
                Context   Context   Context
```

---

## Basic Input/Output Flow

### Simple Example

```javascript
// Initial Input (starting context)
const initialInput = {
  userId: 123,
  name: 'John Doe'
};

// Stage 1: Receives input, adds new properties
const stage1 = async (context) => {
  console.log('Stage 1 receives:', context);
  // { userId: 123, name: 'John Doe' }
  
  return {
    ...context,
    age: 30  // Stage 1 output (adds new property)
  };
};

// Stage 2: Receives output from Stage 1
const stage2 = async (context) => {
  console.log('Stage 2 receives:', context);
  // { userId: 123, name: 'John Doe', age: 30 }
  
  return {
    ...context,
    email: 'john@example.com'  // Stage 2 output
  };
};

// Stage 3: Receives output from Stage 2
const stage3 = async (context) => {
  console.log('Stage 3 receives:', context);
  // { userId: 123, name: 'John Doe', age: 30, email: 'john@example.com' }
  
  return {
    ...context,
    verified: true  // Stage 3 output
  };
};

// Compose pipeline
const pipeline = pipe(stage1, stage2, stage3);

// Execute with initial input
const finalOutput = await pipeline(initialInput);

console.log('Final Output:', finalOutput);
// {
//   userId: 123,
//   name: 'John Doe',
//   age: 30,
//   email: 'john@example.com',
//   verified: true
// }
```

---

## Context Object Pattern

The **context object** is the carrier of data through the pipeline.

### How It Works

```javascript
const pipe = (...fns) => async (initialValue) =>
  fns.reduce(async (acc, fn) => fn(await acc), Promise.resolve(initialValue));
```

**Breaking it down:**

1. **Initial Value**: The input you pass to the pipeline
   ```javascript
   const input = { userId: 123 };
   const result = await pipeline(input); // input is the initialValue
   ```

2. **Accumulator**: Starts as `initialValue`, then becomes the output of each stage
   ```javascript
   // After stage 1: accumulator = { userId: 123, newProp: 'value' }
   // After stage 2: accumulator = { userId: 123, newProp: 'value', anotherProp: 'value2' }
   ```

3. **Each Function Receives & Returns Context**
   ```javascript
   stage(accumulator) → returns new accumulator → passed to next stage
   ```

### Context Evolution Example

```javascript
console.log('=== Context Evolution ===');

const stage1 = async (ctx) => {
  console.log('Stage 1 Input:', ctx);  // { id: 1 }
  return { ...ctx, processed: true };
};

const stage2 = async (ctx) => {
  console.log('Stage 2 Input:', ctx);  // { id: 1, processed: true }
  return { ...ctx, validated: true };
};

const stage3 = async (ctx) => {
  console.log('Stage 3 Input:', ctx);  // { id: 1, processed: true, validated: true }
  return { ...ctx, saved: true };
};

const pipeline = pipe(stage1, stage2, stage3);
const result = await pipeline({ id: 1 });

console.log('Final Output:', result);
// { id: 1, processed: true, validated: true, saved: true }
```

---

## Input Handling

### 1. Initial Input (Starting Value)

```javascript
// The initial input is passed when calling the pipeline
const result = await pipeline(initialInput);
```

**Examples:**

```javascript
// Empty object - build up context gradually
await pipeline({});

// With initial data
await pipeline({ userId: 123 });

// Complex initial object
await pipeline({
  userId: 123,
  config: { timeout: 5000 },
  credentials: { apiKey: 'secret' }
});
```

### 2. Accessing Input in Stages

Each stage receives the context as a parameter:

```javascript
const myStage = async (context) => {
  // Access any property from the context
  const { userId, config, credentials } = context;
  
  // Use it
  console.log(`Processing user ${userId} with config:`, config);
  
  // Return updated context
  return {
    ...context,
    result: 'processed'
  };
};
```

### 3. Extracting Specific Input

```javascript
// Input validation stage
const validateInput = async (context) => {
  const { userId, email } = context;
  
  if (!userId || !email) {
    throw new Error('Missing required fields: userId, email');
  }
  
  return context;
};

// Input transformation stage
const transformInput = async (context) => {
  const { name, email } = context;
  
  return {
    ...context,
    name: name.trim().toLowerCase(),
    email: email.toLowerCase()
  };
};
```

### 4. Input from Multiple Sources

```javascript
// Combine different input sources into initial context
async function main() {
  const initialInput = {
    // From environment
    apiKey: process.env.API_KEY,
    nodeEnv: process.env.NODE_ENV,
    
    // From command line arguments
    userId: process.argv[2],
    action: process.argv[3],
    
    // From config file
    config: loadConfig(),
    
    // From database
    user: await fetchUser(userId),
    
    // Metadata
    startTime: Date.now(),
    requestId: generateId()
  };
  
  const result = await pipeline(initialInput);
}
```

---

## Output Handling

### 1. Returning Context Updates

Each stage must return an updated context:

```javascript
const stage = async (context) => {
  // Process something
  const result = await processData(context.data);
  
  // Always return context with updates
  return {
    ...context,                    // Keep all existing properties
    result,                        // Add new properties
    processedAt: new Date()
  };
};
```

### 2. Extracting Final Output

The pipeline returns the final context. Extract what you need:

```javascript
const finalContext = await pipeline(initialInput);

// Extract specific outputs
const { result, error, processedAt } = finalContext;

// Or use entire context
console.log(finalContext);
```

### 3. Output Transformation Stage

Create a final stage to format the output:

```javascript
const formatOutput = async (context) => {
  return {
    success: !context.error,
    data: context.result,
    metadata: {
      processedAt: context.processedAt,
      duration: Date.now() - context.startTime
    },
    errors: context.errors || []
  };
};

const pipeline = pipe(
  stage1,
  stage2,
  stage3,
  formatOutput  // Final stage formats output
);

const output = await pipeline(input);
// Output shape:
// {
//   success: true,
//   data: {...},
//   metadata: { processedAt: '...', duration: 1234 },
//   errors: []
// }
```

### 4. Conditional Output

```javascript
const stage = async (context) => {
  try {
    const result = await operation(context);
    return {
      ...context,
      result,
      success: true,
      error: null
    };
  } catch (error) {
    return {
      ...context,
      result: null,
      success: false,
      error: error.message
    };
  }
};
```

### 5. Selective Output (Whitelist)

```javascript
// Only return specific properties
const filterOutput = async (context) => {
  return {
    userId: context.userId,
    result: context.result,
    status: context.status
  };
};

// Only return public properties (hide secrets)
const sanitizeOutput = async (context) => {
  const { apiKey, credentials, ...safeContext } = context;
  return safeContext;
};

const pipeline = pipe(
  stage1,
  stage2,
  stage3,
  sanitizeOutput,    // Remove secrets
  filterOutput       // Only public data
);
```

---

## Real-World Examples

### Example 1: Crawler Pipeline (From Your Code)

```javascript
// INPUT: Empty object
const initialInput = {};

// Each stage adds to context
const stage1 = async (ctx) => ({
  ...ctx,
  site: process.env.site,
  githubRunUrl: getGitHubActionsRunUrl()
});
// Output: { site: 'mysite', githubRunUrl: 'https://...' }

const stage2 = async (ctx) => ({
  ...ctx,
  siteConfig: await getConfig(ctx.site)
});
// Output: { ..., siteConfig: {...} }

const stage3 = async (ctx) => ({
  ...ctx,
  urlsToScrape: prepareUrls(ctx.siteConfig, ctx.site)
});
// Output: { ..., urlsToScrape: [...] }

const stage4 = async (ctx) => ({
  ...ctx,
  router: await createRouter(ctx.siteConfig),
  crawler: initializeCrawler(router)
});
// Output: { ..., router, crawler }

const stage5 = async (ctx) => {
  await runCrawler(ctx.crawler, ctx.urlsToScrape, ctx.site);
  return {
    ...ctx,
    completed: true,
    endTime: Date.now()
  };
};
// Output: { ..., completed: true, endTime: ... }

const pipeline = pipe(stage1, stage2, stage3, stage4, stage5);

// EXECUTION
const result = await pipeline({});

// FINAL OUTPUT
console.log('Pipeline Results:');
console.log(`Site: ${result.site}`);
console.log(`Crawler completed: ${result.completed}`);
console.log(`Duration: ${result.endTime - result.startTime}ms`);
```

### Example 2: User Registration Pipeline

```javascript
// INPUT
const input = {
  email: 'user@example.com',
  password: 'securePass123',
  name: 'John Doe'
};

// STAGES
const validateInput = async (ctx) => {
  if (!ctx.email || !ctx.password) {
    throw new Error('Missing required fields');
  }
  return ctx;
};

const normalizeInput = async (ctx) => ({
  ...ctx,
  email: ctx.email.toLowerCase(),
  name: ctx.name.trim()
});

const checkDuplicateEmail = async (ctx) => {
  const exists = await User.findOne({ email: ctx.email });
  if (exists) {
    throw new Error('Email already registered');
  }
  return ctx;
};

const hashPassword = async (ctx) => ({
  ...ctx,
  hashedPassword: await bcrypt.hash(ctx.password, 10),
  password: undefined  // Remove plain password
});

const createUser = async (ctx) => {
  const user = await User.create({
    email: ctx.email,
    password: ctx.hashedPassword,
    name: ctx.name
  });
  return {
    ...ctx,
    userId: user.id,
    created: true
  };
};

const sendWelcomeEmail = async (ctx) => {
  await sendEmail(ctx.email, 'Welcome!');
  return {
    ...ctx,
    emailSent: true
  };
};

const formatOutput = async (ctx) => ({
  userId: ctx.userId,
  email: ctx.email,
  message: 'User registered successfully'
});

// PIPELINE
const registrationPipeline = pipe(
  validateInput,
  normalizeInput,
  checkDuplicateEmail,
  hashPassword,
  createUser,
  sendWelcomeEmail,
  formatOutput
);

// EXECUTION
const result = await registrationPipeline(input);

// FINAL OUTPUT
console.log(result);
// {
//   userId: '12345',
//   email: 'user@example.com',
//   message: 'User registered successfully'
// }
```

### Example 3: Parallel Input/Output

```javascript
// INPUT
const input = {
  userIds: [1, 2, 3, 4, 5]
};

// Parallel stages
const fetchUserDetails = async (ctx) =>
  ({ ...ctx, details: await Promise.all(ctx.userIds.map(fetchUser)) });

const fetchUserPosts = async (ctx) =>
  ({ ...ctx, posts: await Promise.all(ctx.userIds.map(fetchPosts)) });

const fetchUserComments = async (ctx) =>
  ({ ...ctx, comments: await Promise.all(ctx.userIds.map(fetchComments)) });

// Run parallel tasks
const parallelFetch = parallel(
  fetchUserDetails,
  fetchUserPosts,
  fetchUserComments
);

// Combine and format
const combineData = async (ctx) => {
  const [details, posts, comments] = ctx.parallelResults;
  return {
    ...ctx,
    userData: ctx.userIds.map((id, i) => ({
      id,
      details: details[i],
      postCount: posts[i].length,
      commentCount: comments[i].length
    }))
  };
};

// OUTPUT
const pipeline = pipe(parallelFetch, combineData);
const result = await pipeline(input);

console.log(result.userData);
// [
//   { id: 1, details: {...}, postCount: 5, commentCount: 12 },
//   { id: 2, details: {...}, postCount: 3, commentCount: 8 },
//   ...
// ]
```

---

## Common Patterns

### Pattern 1: Accumulating Results

```javascript
const stage = async (context) => {
  const newResult = await process(context.currentData);
  
  return {
    ...context,
    results: [
      ...(context.results || []),  // Accumulate
      newResult
    ]
  };
};
```

### Pattern 2: Error Collection

```javascript
const stage = async (context) => {
  try {
    const result = await operation();
    return { ...context, result };
  } catch (error) {
    return {
      ...context,
      errors: [
        ...(context.errors || []),
        { stage: 'myStage', message: error.message }
      ]
    };
  }
};
```

### Pattern 3: Metadata Tracking

```javascript
const stage = async (context) => {
  const startTime = Date.now();
  
  const result = await operation();
  
  return {
    ...context,
    result,
    metadata: {
      ...context.metadata,
      [stageName]: {
        duration: Date.now() - startTime,
        timestamp: new Date(),
        status: 'success'
      }
    }
  };
};
```

### Pattern 4: State Transitions

```javascript
const stage = async (context) => {
  const result = await operation(context.data);
  
  return {
    ...context,
    state: context.state === 'pending' ? 'processing' : 'completed',
    result
  };
};
```

### Pattern 5: Nested Processing

```javascript
const stage = async (context) => {
  const processedItems = await Promise.all(
    context.items.map(item => processItem(item))
  );
  
  return {
    ...context,
    items: processedItems
  };
};
```

---

## Visual Diagrams

### Single Input → Multiple Outputs

```
Initial Input: { id: 1 }
      ↓
  Stage 1: Fetch user
      ↓
  { id: 1, user: {...} }
      ↓
  Stage 2: Fetch posts
      ↓
  { id: 1, user: {...}, posts: [...] }
      ↓
  Stage 3: Format
      ↓
Final Output: { userId: 1, userName: '...', postCount: 5 }
```

### Multiple Inputs in Context

```
Initial Context
  ├─ userId: 123
  ├─ action: 'update'
  └─ payload: {...}
      ↓
  Stage 1: Validate
      ↓
  Context (no change to inputs)
      ↓
  Stage 2: Authenticate
      ├─ + authenticated: true
      └─ + userRole: 'admin'
      ↓
  Stage 3: Execute Action
      ├─ + result: {...}
      └─ + executedAt: Date
      ↓
  Stage 4: Format Output
      ↓
Output: { success: true, data: {...} }
```

### Error Handling

```
Initial Input: { data: 'invalid' }
      ↓
  Stage 1: Validate
      ├─ Success? NO
      └─ Return: { ...context, error: 'Invalid', success: false }
      ↓
  Stage 2: Handle Error
      ├─ Check success flag
      ├─ Return fallback data
      └─ { ...context, recovery: 'applied' }
      ↓
Final Output: { success: false, data: 'fallback', recovery: 'applied' }
```

---

## Key Takeaways

| Aspect | Details |
|--------|---------|
| **Initial Input** | Passed to `pipeline(input)` |
| **Input Access** | Each stage receives full context as parameter |
| **Output** | Each stage returns updated context |
| **Data Flow** | Output of stage N = Input of stage N+1 |
| **Immutability** | Use `{ ...context, newProp: value }` |
| **Final Output** | Last stage's return value |
| **Extraction** | Destructure or filter final context |
| **Error Output** | Include error flags in context for next stage |
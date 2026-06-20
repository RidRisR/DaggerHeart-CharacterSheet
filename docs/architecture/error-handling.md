# Error Handling

## Must

- Default to fast failure for internal invariant violations.
- Discuss and justify every fallback, compatibility path, or parallel logic chain before implementation.
- For any approved fallback, document its trigger, protected data or user experience, diagnostic/error shape, tests, and removal condition.

## Should

- Use structured diagnostics or typed results at import and validation boundaries.
- Keep user-facing copy separate from diagnostic codes.

## Avoid

- Do not add silent fallback to make code appear safer.
- Do not use empty arrays, empty objects, or default values to hide invalid business state.

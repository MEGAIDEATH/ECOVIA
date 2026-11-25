/**
 * Serializable result of a form Server Action (consumed by `useActionState`).
 * Client-safe: imported by forms; produced by `src/server/actions/*`.
 */
export type FieldErrorMap = Partial<Record<string, string>>;

export type ActionState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string; fieldErrors?: FieldErrorMap };

export const IDLE_STATE: ActionState = { status: 'idle' };

export type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function fieldError(state: ActionState, name: string): string | undefined {
  return state.status === 'error' ? state.fieldErrors?.[name] : undefined;
}

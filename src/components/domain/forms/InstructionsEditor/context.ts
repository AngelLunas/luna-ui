import { createContext } from 'react'
import type { ChipValidator } from './validation'

/**
 * Passes the active chip validator from {@link InstructionsEditor} down to
 * each {@link ContextRefNodeView}. Tiptap's NodeViewRenderer doesn't take
 * custom props, but React NodeViews render inside the EditorContent's
 * React subtree, so they can read context.
 */
export const ChipValidatorContext = createContext<ChipValidator | null>(null)

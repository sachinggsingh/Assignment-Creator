import { toast } from 'sonner'

export const ERROR_TOAST_MESSAGE = 'An error occurred'

export function showErrorToast() {
  toast.error(ERROR_TOAST_MESSAGE)
}

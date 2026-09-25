import { createSignal } from 'solid-js'

export type FormValidationMessage<TValues> =
  | string
  | ((value: unknown, values: TValues) => string)

export interface FormValidationRule<TValues> {
  /** Return true when the value is valid. */
  validate: (value: unknown, values: TValues) => boolean
  message: FormValidationMessage<TValues>
}

export interface FormFieldValidation<TValues> {
  /** A required field rejects empty strings, null, undefined, and empty arrays. */
  required?: string
  rules?: FormValidationRule<TValues>[]
}

export type FormValidationSchema<TValues extends object> = Partial<
  Record<keyof TValues, FormFieldValidation<TValues>>
>

export interface UseFormValidationOptions<TValues extends object> {
  getValues: () => TValues
  schema: FormValidationSchema<TValues>
  /** Re-run field validation when values change after the first submit attempt. */
  validateOnChange?: boolean
}

export interface ValidatedFieldState {
  error: () => string
  status: () => 'error' | undefined
}

/** Configurable schema based form validation, independent from any editor framework. */
export function useFormValidation<TValues extends object>(
  options: UseFormValidationOptions<TValues>,
) {
  const [submitted, setSubmitted] = createSignal(false)
  const [errors, setErrors] = createSignal<Partial<Record<keyof TValues, string>>>({})

  function validateField(field: keyof TValues) {
    const values = options.getValues()
    const value = values[field]
    const config = options.schema[field]

    if (!config) {
      setErrors(current => ({ ...current, [field]: undefined }))
      return true
    }

    let message: string | undefined
    if (config.required && isEmpty(value)) {
      message = config.required
    } else {
      for (const rule of config.rules ?? []) {
        if (!rule.validate(value, values)) {
          message = typeof rule.message === 'function'
            ? rule.message(value, values)
            : rule.message
          break
        }
      }
    }

    setErrors(current => ({ ...current, [field]: message }))
    return !message
  }

  function validate() {
    setSubmitted(true)
    const fields = Object.keys(options.schema) as (keyof TValues)[]
    return fields.map(validateField).every(Boolean)
  }

  function revalidate() {
    if (submitted() || options.validateOnChange) validateFieldForAll()
  }

  function validateFieldForAll() {
    const fields = Object.keys(options.schema) as (keyof TValues)[]
    fields.forEach(validateField)
  }

  function clear() {
    setSubmitted(false)
    setErrors({})
  }

  function field(name: keyof TValues): ValidatedFieldState {
    const error = () => (submitted() ? errors()[name] : '') ?? ''
    return {
      error,
      status: () => (error() ? 'error' : undefined),
    }
  }

  return {
    clear,
    errors,
    field,
    isValid: () => Object.values(errors()).every(error => !error),
    revalidate,
    submitted,
    validate,
    validateField,
  }
}

function isEmpty(value: unknown) {
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  return value === null || value === undefined
}

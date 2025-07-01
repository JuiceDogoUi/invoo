'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { validateSpanishTaxId } from '@/lib/spanish-tax-validation'

interface NIFInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
}

export function NIFInput({ value, onChange, placeholder, className, required = false }: NIFInputProps) {
  const [validation, setValidation] = useState<{
    isValid: boolean
    type: string
    errors: string[]
    showValidation: boolean
  }>({
    isValid: true,
    type: '',
    errors: [],
    showValidation: false
  })

  const handleChange = (inputValue: string) => {
    onChange(inputValue)
    
    // Only validate if field is not empty or if required
    if (inputValue.trim()) {
      const validationResult = validateSpanishTaxId(inputValue)
      setValidation({
        isValid: validationResult.isValid,
        type: validationResult.type,
        errors: validationResult.errors,
        showValidation: true
      })
    } else {
      // Reset validation when empty
      setValidation({
        isValid: !required, // Invalid if required and empty
        type: '',
        errors: required ? ['El NIF es obligatorio'] : [],
        showValidation: required
      })
    }
  }

  return (
    <div>
      <Input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder || "Ej: A15022510, 12345678Z, B75777847"}
        className={`${className || ''} ${
          validation.showValidation
            ? validation.isValid
              ? 'border-green-500 focus:border-green-500'
              : 'border-red-500 focus:border-red-500'
            : ''
        }`}
        required={required}
      />
      {validation.showValidation && (
        <div className="mt-1">
          {validation.isValid ? (
            <p className="text-sm text-green-600 flex items-center">
              <span className="mr-1">✅</span>
              NIF {validation.type} válido
            </p>
          ) : (
            <div className="text-sm text-red-600">
              {validation.errors.map((error, index) => (
                <p key={index} className="flex items-center">
                  <span className="mr-1">❌</span>
                  {error}
                </p>
              ))}
              {!required && (
                <p className="mt-1 text-xs text-gray-600">
                  💡 Tip: Usa A15022510 (test) o déjalo vacío para facturas bajo 3000€
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
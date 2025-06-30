/**
 * Spanish Tax ID validation utilities
 * Supports NIF, NIE, and CIF validation according to Spanish regulations
 */

interface TaxIdValidationResult {
  isValid: boolean
  type: 'NIF' | 'NIE' | 'CIF' | 'UNKNOWN'
  formatted?: string
  errors: string[]
}

export function validateSpanishTaxId(taxId: string): TaxIdValidationResult {
  if (!taxId) {
    return {
      isValid: false,
      type: 'UNKNOWN',
      errors: ['Tax ID is required']
    }
  }

  // Clean the tax ID
  const cleanTaxId = taxId.trim().toUpperCase().replace(/[-.\s]/g, '')

  // Validate NIF (National Identity Document)
  if (isNIF(cleanTaxId)) {
    const isValid = validateNIF(cleanTaxId)
    return {
      isValid,
      type: 'NIF',
      formatted: formatTaxId(cleanTaxId),
      errors: isValid ? [] : ['Invalid NIF checksum']
    }
  }

  // Validate NIE (Foreigner Identity Number)
  if (isNIE(cleanTaxId)) {
    const isValid = validateNIE(cleanTaxId)
    return {
      isValid,
      type: 'NIE',
      formatted: formatTaxId(cleanTaxId),
      errors: isValid ? [] : ['Invalid NIE checksum']
    }
  }

  // Validate CIF (Company Tax ID)
  if (isCIF(cleanTaxId)) {
    const isValid = validateCIF(cleanTaxId)
    return {
      isValid,
      type: 'CIF',
      formatted: formatTaxId(cleanTaxId),
      errors: isValid ? [] : ['Invalid CIF checksum']
    }
  }

  return {
    isValid: false,
    type: 'UNKNOWN',
    errors: ['Invalid Spanish tax ID format']
  }
}

function isNIF(taxId: string): boolean {
  return /^[0-9]{8}[A-Z]$/.test(taxId)
}

function isNIE(taxId: string): boolean {
  return /^[XYZ][0-9]{7}[A-Z]$/.test(taxId)
}

function isCIF(taxId: string): boolean {
  return /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/.test(taxId)
}

function validateNIF(nif: string): boolean {
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE'
  const number = parseInt(nif.slice(0, 8))
  const expectedLetter = letters[number % 23]
  return nif[8] === expectedLetter
}

function validateNIE(nie: string): boolean {
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE'
  const niePrefix = { 'X': '0', 'Y': '1', 'Z': '2' }
  const prefix = niePrefix[nie[0] as keyof typeof niePrefix]
  const number = parseInt(prefix + nie.slice(1, 8))
  const expectedLetter = letters[number % 23]
  return nie[8] === expectedLetter
}

function validateCIF(cif: string): boolean {
  const organizationTypes = 'ABCDEFGHJNPQRSUVW'
  const letter = cif[0]
  const number = cif.slice(1, 8)
  const control = cif[8]

  if (!organizationTypes.includes(letter)) {
    return false
  }

  // Calculate control digit
  let sum = 0
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(number[i])
    if (i % 2 === 0) {
      // Even positions: multiply by 2
      const doubled = digit * 2
      sum += doubled > 9 ? doubled - 9 : doubled
    } else {
      // Odd positions: add directly
      sum += digit
    }
  }

  const controlDigit = (10 - (sum % 10)) % 10

  // Some organization types use letters for control
  if (['N', 'P', 'Q', 'R', 'S', 'W'].includes(letter)) {
    const controlLetters = 'JABCDEFGHI'
    return control === controlLetters[controlDigit]
  }

  return control === controlDigit.toString()
}

function formatTaxId(taxId: string): string {
  // Add hyphens for better readability
  if (taxId.length === 9) {
    return `${taxId.slice(0, -1)}-${taxId.slice(-1)}`
  }
  return taxId
}

export function isSpanishCompany(taxId: string): boolean {
  const validation = validateSpanishTaxId(taxId)
  return validation.isValid && validation.type === 'CIF'
}

export function isSpanishIndividual(taxId: string): boolean {
  const validation = validateSpanishTaxId(taxId)
  return validation.isValid && (validation.type === 'NIF' || validation.type === 'NIE')
}

export function getInvoiceTypeRecommendation(
  clientTaxId: string,
  total: number
): 'F1' | 'F2' {
  // F2 for simplified invoices under 400€ and individuals
  if (total < 400) {
    return 'F2'
  }

  // For companies, always use F1
  if (isSpanishCompany(clientTaxId)) {
    return 'F1'
  }

  // For individuals over 400€, use F1
  return 'F1'
}
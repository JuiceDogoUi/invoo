/**
 * VeriFactu NIF Management API
 * Handles NIF registration, activation, and lifecycle management
 */

export interface NIFData {
  nif: string
  entorno: 'test' | 'prod'
  nombre: string
  direccion?: string
  municipio?: string
  provincia?: string
  codigo_postal?: string
  pais?: string
  tipo_entidad?: 'fisica' | 'juridica'
  webhooks?: string[]
  autoridad_fiscal?: string
}

export interface NIFResponse {
  nif: string
  entorno: string
  nombre: string
  estado: 'active' | 'inactive'
  fecha_creacion: string
  fecha_modificacion?: string
  direccion?: string
  municipio?: string
  provincia?: string
  codigo_postal?: string
  pais?: string
  tipo_entidad?: 'fisica' | 'juridica'
  webhooks?: string[]
  autoridad_fiscal?: string
}

export interface NIFListResponse {
  nifs: NIFResponse[]
  total: number
  pagina: number
  por_pagina: number
}

export interface NIFValidationResponse {
  nif: string
  valido: boolean
  existe_censo: boolean
  nombre?: string
  errores?: string[]
}

export interface RepresentationModel {
  tipo_entidad: 'fisica' | 'juridica'
  
  // For physical persons
  nombre?: string
  municipio?: string
  calle?: string
  numero?: string
  
  // For legal entities
  nombre_entidad?: string
  municipio_entidad?: string
  calle_entidad?: string
  numero_entidad?: string
  
  // Representative information (for legal entities)
  nombre_representante?: string
  nif_representante?: string
  municipio_representante?: string
  calle_representante?: string
  numero_representante?: string
}

export class NIFManagementAPI {
  private apiKey: string
  private baseUrl: string
  private isProduction: boolean

  constructor(apiKey: string, isProduction = false) {
    this.apiKey = apiKey
    this.baseUrl = isProduction 
      ? 'https://api.verifacti.com' 
      : 'https://api-test.verifacti.com'
    this.isProduction = isProduction
  }

  private async makeRequest<T>(endpoint: string, method = 'GET', data?: any): Promise<T> {
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    }

    if (data) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, options)
    const result = await response.json()

    if (!response.ok) {
      throw new Error(`NIF API Error: ${result.error || response.statusText}`)
    }

    return result
  }

  // NIF Management Operations
  async addNIF(nifData: NIFData): Promise<NIFResponse> {
    return this.makeRequest<NIFResponse>('/nifs', 'POST', nifData)
  }

  async addMultipleNIFs(nifs: NIFData[]): Promise<NIFResponse[]> {
    if (nifs.length > 400) {
      throw new Error('Maximum 400 NIFs can be added in a single request')
    }
    return this.makeRequest<NIFResponse[]>('/nifs', 'POST', nifs)
  }

  async listNIFs(page = 1, perPage = 50): Promise<NIFListResponse> {
    return this.makeRequest<NIFListResponse>(`/nifs?pagina=${page}&por_pagina=${perPage}`)
  }

  async getNIF(entorno: 'test' | 'prod', nif: string): Promise<NIFResponse> {
    return this.makeRequest<NIFResponse>(`/nifs/${entorno}/${nif}`)
  }

  async updateNIF(entorno: 'test' | 'prod', nif: string, data: Partial<NIFData>): Promise<NIFResponse> {
    return this.makeRequest<NIFResponse>(`/nifs/${entorno}/${nif}`, 'PUT', data)
  }

  async deactivateNIF(entorno: 'test' | 'prod', nif: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(`/nifs/${entorno}/${nif}`, 'DELETE')
  }

  async activateNIF(entorno: 'test' | 'prod', nif: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(`/nifs/activate/${entorno}/${nif}`, 'PUT')
  }

  // NIF Validation
  async validateNIF(nif: string): Promise<NIFValidationResponse> {
    return this.makeRequest<NIFValidationResponse>(`/nifs/validar/${nif}`)
  }

  async validateVIES(vatNumber: string): Promise<NIFValidationResponse> {
    return this.makeRequest<NIFValidationResponse>(`/nifs/validar/vies/${vatNumber}`)
  }

  // Representation Model (BETA)
  async setRepresentationModel(
    entorno: 'test' | 'prod', 
    nif: string, 
    model: RepresentationModel
  ): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(
      `/nifs/${entorno}/${nif}/representacion`, 
      'PUT', 
      model
    )
  }

  async getRepresentationModel(entorno: 'test' | 'prod', nif: string): Promise<RepresentationModel> {
    return this.makeRequest<RepresentationModel>(`/nifs/${entorno}/${nif}/representacion`)
  }

  // Utility methods
  validateNIFData(nifData: NIFData): string[] {
    const errors: string[] = []

    if (!nifData.nif || !nifData.nif.trim()) {
      errors.push('NIF is required')
    }

    if (!nifData.entorno || !['test', 'prod'].includes(nifData.entorno)) {
      errors.push('Environment must be "test" or "prod"')
    }

    if (!nifData.nombre || !nifData.nombre.trim()) {
      errors.push('Name is required')
    }

    if (nifData.tipo_entidad && !['fisica', 'juridica'].includes(nifData.tipo_entidad)) {
      errors.push('Entity type must be "fisica" or "juridica"')
    }

    return errors
  }

  validateRepresentationModel(model: RepresentationModel): string[] {
    const errors: string[] = []

    if (!model.tipo_entidad || !['fisica', 'juridica'].includes(model.tipo_entidad)) {
      errors.push('Entity type must be "fisica" or "juridica"')
    }

    if (model.tipo_entidad === 'fisica') {
      // Physical person requirements
      if (!model.nombre) errors.push('Name is required for physical persons')
      if (!model.municipio) errors.push('Municipality is required for physical persons')
      if (!model.calle) errors.push('Street is required for physical persons')
      if (!model.numero) errors.push('Street number is required for physical persons')
    }

    if (model.tipo_entidad === 'juridica') {
      // Legal entity requirements
      if (!model.nombre_entidad) errors.push('Entity name is required for legal entities')
      if (!model.municipio_entidad) errors.push('Entity municipality is required for legal entities')
      if (!model.calle_entidad) errors.push('Entity street is required for legal entities')
      if (!model.numero_entidad) errors.push('Entity street number is required for legal entities')
      
      // Representative requirements
      if (!model.nombre_representante) errors.push('Representative name is required for legal entities')
      if (!model.nif_representante) errors.push('Representative NIF is required for legal entities')
      if (!model.municipio_representante) errors.push('Representative municipality is required for legal entities')
      if (!model.calle_representante) errors.push('Representative street is required for legal entities')
      if (!model.numero_representante) errors.push('Representative street number is required for legal entities')
    }

    return errors
  }
}

export const nifManagementAPI = new NIFManagementAPI(
  process.env.VERIFACTU_NIFS_API_KEY || '',
  process.env.NODE_ENV === 'production'
)
// Public browser configuration. These values do not grant database privileges.
// Never put passwords, service_role keys or secret API keys in this file.
export interface PublicConfig {
  mode: 'supabase' | 'demo'
  supabaseUrl: string
  supabasePublishableKey: string
  googleMapsApiKey: string
}

export const publicConfig: Readonly<PublicConfig> = {
  "mode": "supabase",
  "supabaseUrl": "https://ovnvoodmxuygkxgczeka.supabase.co",
  "supabasePublishableKey": "sb_publishable_vIZSqnv2VSJic_WRpdXYKg_-vu38qH7",
  "googleMapsApiKey": ""
}
